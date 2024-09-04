import { useRef, useEffect } from "react"
import { useSynth } from "@/state/use-synth"
import { Point2 } from "@/types"

export const Slider2 = ({ onChange, value }: { onChange: (value: Point2) => void, value: Point2 }) => {
  const { state, state: { isChangingRef }, setState } = useSynth()
  const width = 100
  const height = 100
  const defaultX = 50
  const defaultY = 50
  // const valRef = useRef<Point2 | null>(null)
  // const [val, setVal] = useState<{ x: number, y: number }>({ x: defaultX, y: defaultY })
  const svgRef = useRef<SVGSVGElement | null>(null)
  const ellipseRef = useRef<SVGEllipseElement | null>(null)

  useEffect(() => {
    if (!ellipseRef.current) return;
    const loc = { x: value.x * width, y: value.y * height }
    const elem: SVGElement = ellipseRef.current
    elem.setAttribute("cx", loc.x.toFixed(1))
    elem.setAttribute("cy", loc.y.toFixed(1))
    // setVal(value)
  }, [value])

  const onMouseDown = (ev: any) => {
    if (!isChangingRef) return
    ev.preventDefault()
    isChangingRef.current = true
  }
  const onMouseMove = (ev: any) => {
    if (!svgRef.current) return;
    if (!ellipseRef.current) return;
    if (!isChangingRef) return;
    if (!isChangingRef.current) return;
    ev.preventDefault()
    const pt = svgRef.current.createSVGPoint();
    pt.x = 'clientX' in ev ? ev.clientX : ev.touches[0].clientX
    pt.y = 'clientY' in ev ? ev.clientY : ev.touches[0].clientY
    const loc = pt.matrixTransform(svgRef.current.getScreenCTM()!.inverse());
    const elem: SVGElement = ellipseRef.current
    const x = Math.max(Math.min(loc.x, width), 0.0)
    const y = Math.max(Math.min(loc.y, height), 0.0)
    elem.setAttribute("cx", x.toFixed(1))
    elem.setAttribute("cy", y.toFixed(1))
    const newValue = { x, y }
    onChange(newValue)
  }
  useEffect(() => {
    const onMouseUp = (ev: any): any => {
      if (!isChangingRef) return
      ev.preventDefault()
      isChangingRef.current = false
    }
    svgRef.current?.addEventListener('mousedown', onMouseDown, { passive: false })
    svgRef.current?.addEventListener('mousemove', onMouseMove, { passive: false })
    document.body.addEventListener('mouseup', onMouseUp, { passive: false })
    svgRef.current?.addEventListener('touchstart', onMouseDown, { passive: false })
    svgRef.current?.addEventListener('touchmove', onMouseMove, { passive: false })
    svgRef.current?.addEventListener('touchend', onMouseUp, { passive: false })
    return () => {
      svgRef.current?.removeEventListener('mousedown', onMouseDown)
      svgRef.current?.removeEventListener('mousemove', onMouseMove)
      document.body.removeEventListener('mouseup', onMouseUp)
      svgRef.current?.removeEventListener('touchstart', onMouseDown)
      svgRef.current?.removeEventListener('touchmove', onMouseMove)
      svgRef.current?.removeEventListener('touchend', onMouseUp)
    }
  }, [])

  return (
    <div className="w-full aspect-square bg-secondary mt-4 mb-4 p-4">
      <svg ref={svgRef} className="w-full h-full cursor-pointer overflow-hidden" xmlns="http://www.w3.org/2000/svg" viewBox={[0, 0, width, height].join(' ')}>
        <ellipse ref={ellipseRef} stroke="currentColor" fill="none" strokeWidth="1" cx={defaultX} cy={defaultY} rx="4" ry="4" />
      </svg>
    </div>
  )
}
