const ATTACK_MIN = 5.0
const ATTACK_MAX = 5000.0
const DECAY_MIN = 5.0
const DECAY_MAX = 5000.0
const RELEASE_MIN = 5.0
const RELEASE_MAX = 5000.0

const scale = (n: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
  const ratio = (n - inMin) / (inMax - inMin)
  return (outMax - outMin) * ratio + outMin
}

export const Adsr = ({ attack, decay, sustain, release }: { attack: number, decay: number, sustain: number, release: number }) => {
  const width = 100
  const height = 50
  const segmentWidth = width * 0.25
  const attackX = 0.0
  const attackY = height;
  const decayX = attackX + scale(attack, ATTACK_MIN, ATTACK_MAX, 0.0, segmentWidth)
  const decayY = 0.0
  const sustainX1 = decayX + scale(decay, DECAY_MIN, DECAY_MAX, 0.0, segmentWidth)
  const sustainY1 = (1.0 - sustain) * height
  const sustainX2 = sustainX1 + segmentWidth
  const sustainY2 = sustainY1
  const releaseX = sustainX2 + scale(release, RELEASE_MIN, RELEASE_MAX, 0.0, segmentWidth)
  const releaseY = height
    
  return (
    <div className="w-full mt-4 mb-0 p-4 md:p-0">
      <div className="w-full bg-secondary p-4">
        <svg className="w-full cursor-pointer overflow-visible" xmlns="http://www.w3.org/2000/svg" viewBox={[0, 0, width, height].join(' ')}>
          <line stroke="currentColor" strokeWidth="1" x1={attackX} y1={attackY} x2={decayX} y2={decayY} />
          <line stroke="currentColor" strokeWidth="1" x1={decayX} y1={decayY} x2={sustainX1} y2={sustainY1} />
          <line stroke="currentColor" strokeWidth="1" x1={sustainX1} y1={sustainY1} x2={sustainX2} y2={sustainY2} />
          <line stroke="currentColor" strokeWidth="1" x1={sustainX2} y1={sustainY2} x2={releaseX} y2={releaseY} />
        </svg>
      </div>
    </div>
  )
}
