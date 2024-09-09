import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu"
import { MIDIByte, Device, MIDIEvent } from "@rnbo/js"
import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"


const makeNoteOn = (channel: number, note: number, velocity: number): [MIDIByte, MIDIByte, MIDIByte] => ([144 + channel, note, velocity])
const makeNoteOff = (channel: number, note: number): [MIDIByte, MIDIByte, MIDIByte] => ([128 + channel, note, 0])

const baseNote = 60
const indices4 = [12, 13, 14, 15, 8, 9, 10, 11, 4, 5, 6, 7, 0, 1, 2, 3]
const indices8 = [8, 9, 10, 11, 12, 13, 14, 15, 0, 1, 2, 3, 4, 5, 6, 7]
const keyMap: Record<string, number> = {
  'C': 0,
  'C#': 1,
  'D': 2,
  'D#': 3,
  'E': 4,
  'F': 5,
  'F#': 6,
  'G': 7,
  'G#': 8,
  'A': 9,
  'A#': 10,
  'B': 11
}
const scaleMap: Record<string, number[]> = {
  'major': [0, 2, 4, 5, 7, 9, 11, 12, 12, 14, 16, 17, 19, 21, 23, 24],
  'minor': [0, 2, 3, 5, 7, 8, 10, 12, 12, 14, 15, 17, 19, 20, 22, 24]
}
const scaleTitles: Record<string, string> = {
  'major': 'Major', 
  'minor': 'Minor'
}
const noteNames: string[] = 'C C# D D# E F F# G G# A A# B'.split(' ')

export const Keyboard = ({ device }: { device: Device }) => {
  let heldNotes = useRef<number[]>([])
  const [currentKey, setCurrentKey] = useState<string>('C')
  const [currentScale, setCurrentScale] = useState<string>('major')
  const [currentOctave, setCurrentOctave] = useState<number>(0)

  let channel = 0;
  let port = 0;
  const onMouseDownFn = (index: number, note: number) => (ev: React.MouseEvent) => {
    const el = ev.currentTarget as HTMLElement
    const ratiox = (ev.pageX - el.offsetLeft) / el.offsetWidth
    const ratioy = (ev.pageY - el.offsetTop) / el.offsetHeight
    const velocity = Math.floor((1.0 - ratioy) * 128.0)
    const noteOnMessage = makeNoteOn(channel, note, velocity);
    const noteOnEvent = new MIDIEvent(device.context.currentTime * 1000, port, noteOnMessage);
    device.scheduleEvent(noteOnEvent);
    heldNotes.current.push(note);
  }
  const onMouseUp = () => {
    heldNotes.current.forEach((note) => {
      const noteOffMessage = makeNoteOff(channel, note);
      const noteOffEvent = new MIDIEvent(device.context.currentTime * 1000, port, noteOffMessage);
      device.scheduleEvent(noteOffEvent);
    })
    heldNotes.current = []
  }

  useEffect(() => {
    document.body.addEventListener('pointerup', onMouseUp)
    return () => {
      document.body.removeEventListener('pointerup', onMouseUp)
    }
  }, [])

  const index4Notes = indices4.map((n, i) => {
    const keyOffset = keyMap[currentKey]
    if (keyOffset === undefined) throw new Error(`Could not find key offset for key of ${currentKey}`)
    const scaleIndex = indices4[i]
    if (scaleIndex === undefined) throw new Error('Could not find scale index')
    const scaleIndices = scaleMap[currentScale]
    if (!scaleIndices) throw new Error(`Could not find scale ${currentScale}`)
    const scaleOffset = scaleIndices[scaleIndex]
    if (scaleOffset === undefined) throw new Error('Could not find scale offset')
    const value: number = baseNote + keyOffset + scaleOffset + (currentOctave * 12)
    return [n, value]
  })
  const index8Notes = indices8.map((n, i) => {
    const keyOffset = keyMap[currentKey]
    if (keyOffset === undefined) throw new Error(`Could not find key offset for key of ${currentKey}`)
    const scaleIndex = indices8[i]
    if (scaleIndex === undefined) throw new Error('Could not find scale index')
    const scaleIndices = scaleMap[currentScale]
    if (!scaleIndices) throw new Error(`Could not find scale ${currentScale}`)
    const scaleOffset = scaleIndices[scaleIndex]
    if (scaleOffset === undefined) throw new Error('Could not find scale offset')
    const value: number = baseNote + keyOffset + scaleOffset + (currentOctave * 12)
    return [n, value]
  })

  const onKeyChangeFn = (keyName: string) => () => {
    setCurrentKey(keyName)
  }
  const onScaleChangeFn = (scaleName: string) => () => {
    setCurrentScale(scaleName)
  }
  const onOctaveChangeFn = (octave: number) => () => {
    setCurrentOctave(octave)
  }

  return (
    <div className="pt-4 pb-4">
      <div className="grid flex-1 items-start gap-4 grid-cols-4 md:hidden pb-4">
        {index4Notes.map(([index, note]) => (
          <Button className="h-24 text-stone-500 text-xl" key={index} variant="secondary" onPointerDown={onMouseDownFn(index, note)}>
            {noteNames[note % 12]}{Math.floor(note / 12)}
          </Button>
        ))}
      </div>

      <div className="grid flex-1 items-start gap-4 grid-cols-8 hidden md:grid pb-4">
        {index8Notes.map(([index, note]) => (
          <Button className="h-24 text-stone-500 text-xl" key={index} variant="secondary" onPointerDown={onMouseDownFn(index, note)}>
            {noteNames[note % 12]}{Math.floor(note / 12)}
          </Button>
        ))}
      </div>

      <div className="flex gap-2 items-baseline justify-end">
        <span className="font-semibold tracking-tight">Key</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">{currentKey}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={undefined}>
              {Object.keys(keyMap).map((keyName: string) => {
                const keyValue = keyMap[keyName]
                return (
                  <DropdownMenuRadioItem onSelect={onKeyChangeFn(keyName)} key={keyName} value={keyName}>{keyName}</DropdownMenuRadioItem>
                )
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">{scaleTitles[currentScale]}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={undefined}>
              {Object.keys(scaleMap).map((scaleName: string) => {
                const scaleValue = scaleMap[scaleName]
                return (
                  <DropdownMenuRadioItem onSelect={onScaleChangeFn(scaleName)} key={scaleName} value={scaleName}>{scaleTitles[scaleName]}</DropdownMenuRadioItem>
                )
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="font-semibold tracking-tight">Octave</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">{currentOctave >= 0 ? `+${currentOctave}` : currentOctave}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={undefined}>
              {[-4, -3, -2, -1, 0, 1, 2].reverse().map((octave: number) => {
                return (
                  <DropdownMenuRadioItem onSelect={onOctaveChangeFn(octave)} key={octave} value={octave}>{octave >= 0 ? `+${octave}` : octave}</DropdownMenuRadioItem>
                )
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
