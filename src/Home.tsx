import { useRef, MutableRefObject, useEffect, useState, ReactSVGElement, ChangeEvent } from 'react';
import { createDevice, Device, IPreset, MessagePortType, MIDIByte, MIDIEvent } from "@rnbo/js";
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { ModeToggle } from '@/components/mode-toggle';
import { useSynth } from '@/state/useSynth';
import { Textarea } from './components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from './components/ui/dropdown-menu';

// // TODO: Presets
// // https://gist.github.com/rjungemann/add040e2062218bb6e5e2a587907ffa1
// device.getPreset()
// .then((p) => console.log(JSON.stringify(p, null, 2)))

// TODO: Scales

// TODO: Copy preset to clipboard

// // TODO: Send events to device
// // Turn the text into a list of numbers (RNBO messages must be numbers, not text)
// const values = [1.0, 2.0, 3.0];
// // Send the message event to the RNBO device
// let messageEvent = new RNBO.MessageEvent(RNBO.TimeNow, inportTag, values);
// device.scheduleEvent(messageEvent);

// // Load a preset
// const preset = patcher.presets[0]
// // A preset has a preset and an index
// device.setPreset(preset.preset);

// type Preset = {
//   __presetid: "rnbo",
//   __sps: {
//     chorus: Record<string, string>
//     reverb: Record<string, string>
//     synth: Record<string, string>[] // gain-1, harm-1, etc.
//   }
// }

type DeviceParam = {
  id: string
  name: string
  min: number
  max: number
  steps: number
  value: number
  initialValue: number
  displayName: string
  unit: string
  exponent: number
  index: number
}

type Point2 = {
  x: number
  y: number
}

const sections = {
  global: 'synth/vel-amt synth/gain-mix synth/slop-amt synth/vibrato-amt synth/vibrato-freq synth/vibrato-ms effect-level'.split(' '),
  chorus: 'chorus/center chorus/bw chorus/rate chorus/fb'.split(' '),
  reverb: 'reverb/drywet reverb/decay reverb/damping reverb/predelay reverb/inbandwidth reverb/indiffusion1 reverb/indiffusion2 reverb/decaydiffusion1 reverb/decaydiffusion2'.split(' '),
}

const names: Record<string, string> = {
  'synth/harm-1': 'Harmonics',
  'synth/shaper-x-1': 'Shaper X',
  'synth/shaper-y-1': 'Shaper Y',
  'synth/shaper-gain-1': 'Shaper Gain',
  'synth/a-1': 'Attack',
  'synth/d-1': 'Decay',
  'synth/s-1': 'Sustain',
  'synth/r-1': 'Release',
  'synth/gain-1': 'Gain',

  'synth/harm-2': 'Harmonics',
  'synth/shaper-x-2': 'Shaper X',
  'synth/shaper-y-2': 'Shaper Y',
  'synth/shaper-gain-2': 'Shaper Gain',
  'synth/a-2': 'Attack',
  'synth/d-2': 'Decay',
  'synth/s-2': 'Sustain',
  'synth/r-2': 'Release',
  'synth/gain-2': 'Gain',
  'synth/coarse-2': 'Coarse',

  'synth/harm-3': 'Harmonics',
  'synth/shaper-x-3': 'Shaper X',
  'synth/shaper-y-3': 'Shaper Y',
  'synth/shaper-gain-3': 'Shaper Gain',
  'synth/a-3': 'Attack',
  'synth/d-3': 'Decay',
  'synth/s-3': 'Sustain',
  'synth/r-3': 'Release',
  'synth/gain-3': 'Gain',
  'synth/coarse-3': 'Coarse',

  'synth/vel-amt': 'Velocity Amount',
  'synth/gain-mix': 'Gain Mix',
  'synth/slop-amt': 'Slop Amount',
  'synth/vibrato-amt': 'Vibrato Amount',
  'synth/vibrato-freq': 'Vibrato Frequency',
  'synth/vibrato-ms': 'Vibrato Speed (ms)',
  'effect-level': 'Effect Level',

  'chorus/center': 'Center',
  'chorus/bw': 'Bandwidth',
  'chorus/rate': 'Rate',
  'chorus/fb': 'Feedback',

  'reverb/drywet': 'Dry/Wet',
  'reverb/decay': 'Decay',
  'reverb/damping': 'Damping',
  'reverb/predelay': 'Predelay',
  'reverb/inbandwidth': 'In Bandwidth',
  'reverb/indiffusion1': 'In Diffusion I',
  'reverb/indiffusion2': 'In Diffusion II',
  'reverb/decaydiffusion1': 'Decay Diffusion I',
  'reverb/decaydiffusion2': 'Decay Diffusion II',
}

const makeNoteOn = (channel: number, note: number, velocity: number): [MIDIByte, MIDIByte, MIDIByte] => ([144 + channel, note, velocity])
const makeNoteOff = (channel: number, note: number): [MIDIByte, MIDIByte, MIDIByte] => ([128 + channel, note, 0])

const scale = (x: number, min: number, max: number, a: number, b: number): number => (
  (((b - a) * (x - min)) / (max - min)) + a
)

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const envLengths = [5, 20, 200, 2000, 12000]

const randomizeParams = ({ device }: { device: Device }) => {
  device.parameters.forEach((param) => {
    // Settings to ignore
    if (param.id === 'effect-level') return;
    if (param.id === 'synth/vel-amt') return;
    if (param.id.match(/^synth\/gain-/)) return;
    if (param.id.match(/^synth\/vibrato-/)) return;
    if (param.id.match(/^synth\/slop-/)) return;
    if (param.id.match(/^synth\/coarse-/)) return;
    if (param.id.match(/^chorus\//)) return;
    if (param.id.match(/^reverb\//)) return;
    // Shaper settings
    if (param.id.match(/^synth\/shaper-[xy]-/)) {
      param.value = Math.floor(Math.random() * 2.0);
      return;
    }
    if (param.id.match(/^synth\/shaper-gain-/)) {
      param.value = scale(Math.random(), 0.0, 1.0, 1.0, 1.5);
      return;
    }
    // Harmonics
    if (param.id.match(/^synth\/harm-/)) {
      param.value = Math.random() * 6.0;
      return;
    }
    // Envelope settings
    if (param.id.match(/^synth\/a-/)) {
      param.value = pick(envLengths);
      return;
    }
    if (param.id.match(/^synth\/d-/)) {
      param.value = pick(envLengths);
      return;
    }
    if (param.id.match(/^synth\/d-/)) {
      param.value = Math.random();
      return;
    }
    if (param.id.match(/^synth\/r-/)) {
      param.value = pick(envLengths);
      return;
    }
    // Everything else
    param.value = scale(Math.random(), 0.0, 1.0, param.min, param.max)
  })
}

const Param = ({ device, param }: { device: Device, param: DeviceParam }) => {
  const [value, setValue] = useState<number>(param.initialValue)
  const onSliderChange = ([value]: [number]) => {
    setValue(value)
    param.value = value
  }
  const onTextChange = (ev: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(ev.target.value)
    setValue(value)
    param.value = value
  }
  const steps = (
    (param.steps > 1)
    ? (param.max - param.min) / (param.steps - 1)
    : (param.max - param.min) / 1000.0
  )

  // Listen for updates from device
  useEffect(() => {
    const callback = (updatedParam: DeviceParam) => {
      if (param.id === updatedParam.id) {
        console.info('Received param update from device', param)
        setValue(updatedParam.value)
      }
    }
    device.parameterChangeEvent.subscribe(callback)
    return () => {
      device.parameterChangeEvent.unsubscribe(callback)
    }
  }, [])

  const name = names[param.id]
  if (!name) {
    throw new Error(`Could not find a name for param with id ${param.id}`)
  }
  return (
    <div className="grid flex-1 items-start gap-2 pt-1 pb-1 grid-cols-3 items-center">
      <label className="param-label" htmlFor={param.name}>{name}</label>
      <Slider className="param-slider" id={param.id} value={[value]} onValueChange={onSliderChange} step={steps} min={param.min} max={param.max} />
      <Input value={value} onChange={onTextChange}></Input>
    </div>
  )
}

const Keyboard = ({ device }: { device: Device }) => {
  let heldNotes = useRef<number[]>([])
  const [currentKey, setCurrentKey] = useState<string>('C')
  const [currentScale, setCurrentScale] = useState<string>('major')

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
  const variant = 'secondary'

  useEffect(() => {
    document.body.addEventListener('pointerup', onMouseUp)
    return () => {
      document.body.removeEventListener('pointerup', onMouseUp)
    }
  }, [])

  const baseNote = 60
  const indices4 = [12, 13, 14, 15, 8, 9, 10, 11, 4, 5, 6, 7, 0, 1, 2, 3]
  // const notes4 = [67, 69, 71, 72, 60, 62, 64, 65, 55, 57, 59, 60, 48, 50, 52, 53]
  const indices8 = [8, 9, 10, 11, 12, 13, 14, 15, 0, 1, 2, 3, 4, 5, 6, 7]
  // const notes8 = [60, 62, 64, 65, 67, 69, 71, 72, 48, 50, 52, 53, 55, 57, 59, 60]

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

  // const index4Notes = indices4.map((n, i) => [n, notes4[i]])
  // const index8Notes = indices8.map((n, i) => [n, notes8[i]])
  const index4Notes = indices4.map((n, i) => {
    const keyOffset = keyMap[currentKey]
    if (keyOffset === undefined) throw new Error(`Could not find key offset for key of ${currentKey}`)
    const scaleIndex = indices4[i]
    if (scaleIndex === undefined) throw new Error('Could not find scale index')
    const scaleIndices = scaleMap[currentScale]
    if (!scaleIndices) throw new Error(`Could not find scale ${currentScale}`)
    const scaleOffset = scaleIndices[scaleIndex]
    if (scaleOffset === undefined) throw new Error('Could not find scale offset')
    const value: number = baseNote + keyOffset + scaleOffset
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
    const value: number = baseNote + keyOffset + scaleOffset
    return [n, value]
  })

  const onKeyChangeFn = (keyName: string) => () => {
    setCurrentKey(keyName)
  }
  const onScaleChangeFn = (scaleName: string) => () => {
    setCurrentScale(scaleName)
  }

  return (
    <div className="pt-4 pb-4">
      <div className="grid flex-1 items-start gap-4 grid-cols-4 md:hidden">
        {index4Notes.map(([index, note]) => (
          <Button className="h-36" key={index} variant="secondary" onPointerDown={onMouseDownFn(index, note)}>
          </Button>
        ))}
      </div>

      <div className="grid flex-1 items-start gap-4 grid-cols-8 hidden md:grid">
        {index8Notes.map(([index, note]) => (
          <Button className="h-36" key={index} variant="secondary" onPointerDown={onMouseDownFn(index, note)}>
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Key</Button>
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
            <Button variant="outline">Scale</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={undefined}>
              {Object.keys(scaleMap).map((scaleName: string) => {
                const scaleValue = scaleMap[scaleName]
                return (
                  <DropdownMenuRadioItem  onSelect={onScaleChangeFn(scaleName)} key={scaleName} value={scaleName}>{scaleTitles[scaleName]}</DropdownMenuRadioItem>
                )
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

const Slider2 = ({ onChange, value }: { onChange: (value: Point2) => void, value: Point2 }) => {
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
    elem.setAttribute("cx", loc.x.toFixed(1))
    elem.setAttribute("cy", loc.y.toFixed(1))
    const newValue = { x: loc.x / width, y: loc.y / height }
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
    document.body.addEventListener('mouseend', onMouseUp, { passive: false })
    svgRef.current?.addEventListener('touchstart', onMouseDown, { passive: false })
    svgRef.current?.addEventListener('touchmove', onMouseMove, { passive: false })
    document.body.addEventListener('touchend', onMouseUp, { passive: false })
    return () => {
      svgRef.current?.removeEventListener('mousedown', onMouseDown)
      svgRef.current?.removeEventListener('mousemove', onMouseMove)
      document.body.removeEventListener('mouseend', onMouseUp)
      svgRef.current?.removeEventListener('touchstart', onMouseDown)
      svgRef.current?.removeEventListener('touchmove', onMouseMove)
      document.body.removeEventListener('touchend', onMouseUp)
    }
  }, [])

  return (
    <svg ref={svgRef} className="w-full aspect-square bg-secondary mt-4 mb-4 cursor-pointer" xmlns="http://www.w3.org/2000/svg" viewBox={[0, 0, width, height].join(' ')}>
      <ellipse ref={ellipseRef} stroke="currentColor" fill="none" strokeWidth="1" cx={defaultX} cy={defaultY} rx="4" ry="4" />
    </svg>
  )
}

const Params = () => {
  const { state: { device, isChangingRef } } = useSynth()

  // TODO: Lift to synth state
  const [osc1Loc, setOsc1Loc] = useState<Point2>({ x: 0, y: 0 })
  const [osc2Loc, setOsc2Loc] = useState<Point2>({ x: 0, y: 0 })
  const [osc3Loc, setOsc3Loc] = useState<Point2>({ x: 0, y: 0 })

  // Listen for updates from device
  useEffect(() => {
    if (!device) return
    // TODO: Remove any
    const callback = (updatedParam: any) => {
      if (!isChangingRef) return
      if (isChangingRef.current) return
      if (updatedParam.id === 'synth/shaper-x-1') setOsc1Loc({ ...osc1Loc, x: updatedParam.value })
      if (updatedParam.id === 'synth/shaper-y-1') setOsc1Loc({ ...osc1Loc, y: updatedParam.value })
      if (updatedParam.id === 'synth/shaper-x-2') setOsc2Loc({ ...osc2Loc, x: updatedParam.value })
      if (updatedParam.id === 'synth/shaper-y-2') setOsc2Loc({ ...osc2Loc, y: updatedParam.value })
      if (updatedParam.id === 'synth/shaper-x-3') setOsc3Loc({ ...osc3Loc, x: updatedParam.value })
      if (updatedParam.id === 'synth/shaper-y-3') setOsc3Loc({ ...osc3Loc, y: updatedParam.value })
    }
    device.parameterChangeEvent.subscribe(callback)
    return () => {
      device.parameterChangeEvent.unsubscribe(callback)
    }
  }, [device])

  const onSlider2ChangeFn = (index: number) => (point: Point2) => {
    if (!device) return
    const xparam = device.parameters.find((param) => param.id === `synth/shaper-x-${index}`)
    const yparam = device.parameters.find((param) => param.id === `synth/shaper-y-${index}`)
    xparam.value = scale(point.x, 0.0, 1.0, xparam.min, xparam.max)
    yparam.value = scale(point.y, 0.0, 1.0, yparam.min, yparam.max)
  }

  if (!device) {
    return null
  }
  
  return (
    <div className="grid flex-1 items-start gap-8 pt-4 pb-4 grid-cols-1 md:grid-cols-4">
      <div className="text-red-500">
        <h3 className="text-l font-semibold leading-none tracking-tight pb-4">OSC 1</h3>
        <Param device={device} param={device.parameters.find((param) => `synth/harm-1` === param.id)} />
        <Param device={device} param={device.parameters.find((param) => `synth/shaper-gain-1` === param.id)} />
        <Param device={device} param={device.parameters.find((param) => `synth/gain-1` === param.id)} />
        <Slider2 value={osc1Loc} onChange={onSlider2ChangeFn(1)} />
        <Param device={device} param={device.parameters.find((param) => `synth/a-1` === param.id)} />
        <Param device={device} param={device.parameters.find((param) => `synth/d-1` === param.id)} />
        <Param device={device} param={device.parameters.find((param) => `synth/s-1` === param.id)} />
        <Param device={device} param={device.parameters.find((param) => `synth/r-1` === param.id)} />
      </div>

      <div className="text-orange-500">
        <h3 className="text-l font-semibold leading-none tracking-tight pb-4">OSC 2</h3>
        <Param device={device} param={device.parameters.find((param) => `synth/harm-2` === param.id)} />
        <Param device={device} param={device.parameters.find((param) => `synth/shaper-gain-2` === param.id)} />
        <Param device={device} param={device.parameters.find((param) => `synth/gain-2` === param.id)} />
        <Slider2 value={osc2Loc} onChange={onSlider2ChangeFn(2)} />
        <Param device={device} param={device.parameters.find((param) => `synth/coarse-2` === param.id)} />
        <Param device={device} param={device.parameters.find((param) => `synth/a-2` === param.id)} />
        <Param device={device} param={device.parameters.find((param) => `synth/d-2` === param.id)} />
        <Param device={device} param={device.parameters.find((param) => `synth/s-2` === param.id)} />
        <Param device={device} param={device.parameters.find((param) => `synth/r-2` === param.id)} />
      </div>

      <div className="text-amber-500">
        <h3 className="text-l font-semibold leading-none tracking-tight pb-4">OSC 3</h3>
        <Param device={device} param={device.parameters.find((param) => `synth/harm-3` === param.id)} />
        <Param device={device} param={device.parameters.find((param) => `synth/shaper-gain-3` === param.id)} />
        <Param device={device} param={device.parameters.find((param) => `synth/gain-3` === param.id)} />
        <Slider2 value={osc3Loc} onChange={onSlider2ChangeFn(3)} />
        <Param device={device} param={device.parameters.find((param) => `synth/coarse-3` === param.id)} />
        <Param device={device} param={device.parameters.find((param) => `synth/a-3` === param.id)} />
        <Param device={device} param={device.parameters.find((param) => `synth/d-3` === param.id)} />
        <Param device={device} param={device.parameters.find((param) => `synth/s-3` === param.id)} />
        <Param device={device} param={device.parameters.find((param) => `synth/r-3` === param.id)} />
      </div>

      <div>
        <h3 className="text-l font-semibold leading-none tracking-tight pb-4">Global</h3>
        {
          sections['global']
          .map((id) => device.parameters.find((param) => id === param.id))
          .map((param) => {
            return (
              <Param key={param.id} device={device} param={param} />
            )
          })
        }
      </div>

      <div>
        <h3 className="text-l font-semibold leading-none tracking-tight pb-4">Chorus</h3>
        {
          sections['chorus']
          .map((id) => device.parameters.find((param) => id === param.id))
          .map((param) => (
            <Param key={param.id} device={device} param={param} />
          ))
        }
      </div>

      <div>
        <h3 className="text-l font-semibold leading-none tracking-tight pb-4">Reverb</h3>
        {
          sections['reverb']
          .map((id) => device.parameters.find((param) => id === param.id))
          .map((param) => (
            <Param key={param.id} device={device} param={param} />
          ))
        }
      </div>
    </div>
  )
}

function Home() {
  const { state, state: { device, startDevice }, setState } = useSynth()
  const [isImportingPatch, setIsImportingPatch] = useState<boolean>(false)
  const [patchToImport, setPatchToImport] = useState<string | null>(null)
  const [patch, setPatch] = useState<IPreset | null>(null)

  const randomizeClicked = () => {
    if (!device) return
    randomizeParams({ device })
  }

  const importPatchClicked = () => {
    setIsImportingPatch(true)
  }

  const exportPatchClicked = () => {
    if (!device) return
    device.getPreset()
    .then((preset) => {
      setPatch(preset)
    })
  }

  const clearPatch = () => {
    setPatch(null)
  }

  const patchToImportChanged = (ev: ChangeEvent<HTMLTextAreaElement>) => {
    setPatchToImport(ev.target.value)
  }

  const cancelImportPatch = () => {
    setIsImportingPatch(false)
    setPatchToImport(null)
  }

  const finishImportPatch = () => {
    if (!device) return
    if (!patchToImport) return
    const patch = JSON.parse(patchToImport)
    device.setPreset(patch)
    setIsImportingPatch(false)
    setPatchToImport(null)
  }

  if (!device) {
    return (
      <main className="flex items-center justify-center w-full h-full bg-secondary">
        <div className="flex flex-col">
          <h1 className="bebas-neue text-4xl leading-none">
            <span className="text-red-500">Chiaro</span>
            {' '}
            <span className="text-orange-500">Mini</span>
          </h1>
          <h2 className="bebas-neue text-muted-foreground text-xl leading-none pb-2 mb-2">
            By Phasor Space
          </h2>
          <p className="text-sm text-muted-foreground pb-4 mb-2">
            A unique vocal synth, rebuilt
          </p>
          <div className="flex items-center justify-center">
            <Button onClick={startDevice}>Start</Button>
          </div>
        </div>
      </main>
    )
  }

  const onInputChangeFn = (id: string) => () => {
    console.log('Input changed', id)
    setState({ ...state, inport: id })
  }

  return (
    <div className="relative w-full h-full">
      <div className="absolute w-full h-full">
        <main className="p-4">
          <div className="flex justify-between items-baseline">
            <h1 className="bebas-neue text-4xl leading-none pb-2">
              <span className="text-red-500">Chiaro</span>
              {' '}
              <span className="text-orange-500">Mini</span>
              {' '}
              <span className="text-muted-foreground text-xl ml-1">By Phasor Space</span>
            </h1>
            <ModeToggle />
          </div>
          
          <div className="pb-4">
            <div className="flex justify-between items-baseline">
              <h2 className="text-xl font-semibold leading-none tracking-tight pb-4">Keyboard</h2>

              {state.midi && (
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">Input Ports</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuRadioGroup value={state.inport || undefined}>
                        {Object.values(state.inports).map((port: MIDIInput) => {
                          return (
                            <DropdownMenuRadioItem onSelect={onInputChangeFn(port.id)} key={port.id} value={port.id}>{port.name}</DropdownMenuRadioItem>
                          )
                        })}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
            
            <Keyboard device={device} />
          </div>

          <div className="pb-4">
            <div className="flex justify-between items-baseline">
              <h2 className="text-xl font-semibold leading-none tracking-tight pb-4">Parameters</h2>

              <div className="flex gap-2">
                <Button variant="outline" onClick={randomizeClicked}>Randomize</Button>
                <Button variant="outline" onClick={importPatchClicked}>Import Patch</Button>
                <Button variant="outline" onClick={exportPatchClicked}>Export Patch</Button>
              </div>
            </div>

            <Params />
          </div>
        </main>
      </div>

      {patch && (
        <>
          <div className="absolute left-0 w-full h-full bg-secondary opacity-50"></div>
          <div className="absolute left-0 w-full h-full flex justify-center items-center">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm lg:max-w-md">
              <div className="flex flex-col p-6 space-y-0 pb-6 gap-2">
                <h3 className="font-semibold tracking-tight text-2xl pb-2">Export Patch</h3>
                <div className="pb-2">
                  <Textarea onClick={(ev) => (ev.currentTarget as unknown as any).select()} className="w-96">
                    {JSON.stringify(patch)}
                  </Textarea>
                </div>
                <Button onClick={clearPatch}>Done</Button>
              </div>
            </div>
          </div>
        </>
      )}

      {isImportingPatch && (
        <>
          <div className="absolute left-0 w-full h-full bg-secondary opacity-50"></div>
          <div className="absolute left-0 w-full h-full flex justify-center items-center">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm lg:max-w-md">
              <div className="flex flex-col p-6 space-y-0 pb-6 gap-2">
                <h3 className="font-semibold tracking-tight text-2xl pb-2">Import Patch</h3>
                <div className="pb-2">
                  <Textarea className="w-96" onChange={patchToImportChanged}>
                    {patchToImport}
                  </Textarea>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={cancelImportPatch} variant="outline">Cancel</Button>
                  <Button onClick={finishImportPatch}>Done</Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Home
