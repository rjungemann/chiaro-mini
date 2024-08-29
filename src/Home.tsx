import { useRef, MutableRefObject, useEffect, useState, ReactSVGElement } from 'react';
import { createDevice, Device, MIDIByte, MIDIEvent } from "@rnbo/js";
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { ModeToggle } from './components/mode-toggle';

type Preset = {
  __presetid: "rnbo",
  __sps: {
    chorus: Record<string, string>
    reverb: Record<string, string>
    synth: Record<string, string>[] // gain-1, harm-1, etc.
  }
}

// // TODO: Presets
// // https://gist.github.com/rjungemann/add040e2062218bb6e5e2a587907ffa1
// device.getPreset()
// .then((p) => console.log(JSON.stringify(p, null, 2)))

// TODO: MIDI

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

  'synth/harm-3': 'Harmonics',
  'synth/shaper-x-3': 'Shaper X',
  'synth/shaper-y-3': 'Shaper Y',
  'synth/shaper-gain-3': 'Shaper Gain',
  'synth/a-3': 'Attack',
  'synth/d-3': 'Decay',
  'synth/s-3': 'Sustain',
  'synth/r-3': 'Release',
  'synth/gain-3': 'Gain',

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

const fetchPatcher = () => (
  fetch("/export/patch.export.json")
  .then((response) => response.json())
);

const fetchDeps = () => (
  fetch("export/dependencies.json")
  .then((response) => response.json())
  .then((deps) => (
    // TODO: Remove any
    deps.map((dep: any) => ({ ...dep, ...(dep.file ? { file: "export/" + dep.file } : {}) }))
  ))
);

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
  // TODO: Remove any
  const onSliderChange = ([value]: [number]) => {
    setValue(value)
    param.value = value
  }
  // TODO: Remove any
  const onTextChange = (ev: any) => {
    setValue(ev.target.value)
    param.value = Number.parseFloat(ev.target.value)
  }
  const steps = (
    (param.steps > 1)
    ? (param.max - param.min) / (param.steps - 1)
    : (param.max - param.min) / 1000.0
  )

  // Listen for updates from device
  useEffect(() => {
    // TODO: Remove any
    const callback = (updatedParam: any) => {
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

  const id = param.id
  const name = names[id]
  if (!name) {

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

  let channel = 0;
  let port = 0;
  const onMouseDownFn = (index: number, note: number) => () => {
    let noteOnMessage = makeNoteOn(channel, note, 100);
    let noteOnEvent = new MIDIEvent(device.context.currentTime * 1000, port, noteOnMessage);
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
    document.body.addEventListener('mouseup', onMouseUp)
    return () => {
      document.body.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div className="pt-4 pb-4">
      <div className="grid flex-1 items-start gap-4 grid-cols-8">
        <Button variant={variant} onMouseDown={onMouseDownFn(8, 60)}></Button>
        <Button variant={variant} onMouseDown={onMouseDownFn(9, 62)}></Button>
        <Button variant={variant} onMouseDown={onMouseDownFn(10, 64)}></Button>
        <Button variant={variant} onMouseDown={onMouseDownFn(11, 65)}></Button>
        <Button variant={variant} onMouseDown={onMouseDownFn(12, 67)}></Button>
        <Button variant={variant} onMouseDown={onMouseDownFn(13, 69)}></Button>
        <Button variant={variant} onMouseDown={onMouseDownFn(14, 71)}></Button>
        <Button variant={variant} onMouseDown={onMouseDownFn(15, 72)}></Button>

        <Button variant={variant} onMouseDown={onMouseDownFn(0, 48)}></Button>
        <Button variant={variant} onMouseDown={onMouseDownFn(1, 50)}></Button>
        <Button variant={variant} onMouseDown={onMouseDownFn(2, 52)}></Button>
        <Button variant={variant} onMouseDown={onMouseDownFn(3, 53)}></Button>
        <Button variant={variant} onMouseDown={onMouseDownFn(4, 55)}></Button>
        <Button variant={variant} onMouseDown={onMouseDownFn(5, 57)}></Button>
        <Button variant={variant} onMouseDown={onMouseDownFn(6, 59)}></Button>
        <Button variant={variant} onMouseDown={onMouseDownFn(7, 60)}></Button>
      </div>
    </div>
  )
}

const startAudio = async (context: AudioContext) => {
  // Start audio processing
  context.resume()
  // Create gain node and connect it to audio output
  const outputNode = context.createGain();
  outputNode.connect(context.destination);
  // Create the device
  const patcher = await fetchPatcher()
  const deps = await fetchDeps()
  const device: Device = await createDevice({ patcher, context })
  // Attach samples the device depends on, to the device
  if (deps.length) {
    await device.loadDataBufferDependencies(deps);
  }
  // Connect the device to the output
  device.node.connect(outputNode);
  return device
}

type Point2 = {
  x: number
  y: number
}

const Slider2 = ({ onChange, value, isChangingRef }: { onChange: (value: Point2) => void, value: Point2, isChangingRef: MutableRefObject<boolean> }) => {
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

  const onMouseDown = (ev: React.MouseEvent) => {
    isChangingRef.current = true
  }
  const onMouseMove = (ev: React.MouseEvent) => {
    if (!svgRef.current) return;
    if (!ellipseRef.current) return;
    if (!isChangingRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    const loc = pt.matrixTransform(svgRef.current.getScreenCTM()!.inverse());
    const elem: SVGElement = ellipseRef.current
    elem.setAttribute("cx", loc.x.toFixed(1))
    elem.setAttribute("cy", loc.y.toFixed(1))
    const newValue = { x: loc.x / width, y: loc.y / height }
    // valRef.current = newValue
    onChange(newValue)
  }
  useEffect(() => {
    const onMouseUp = (ev: MouseEvent) => {
      isChangingRef.current = false
    }
    document.body.addEventListener('mouseup', onMouseUp)
    return () => {
      document.body.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <svg ref={svgRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} className="w-full aspect-square bg-secondary mt-4 mb-4 cursor-pointer" xmlns="http://www.w3.org/2000/svg" viewBox={[0, 0, width, height].join(' ')}>
      <ellipse ref={ellipseRef} stroke="currentColor" fill="none" strokeWidth="1" cx={defaultX} cy={defaultY} rx="4" ry="4" />
    </svg>
  )
}

function Home() {
  const isChangingRef = useRef(false)

  const contextRef: MutableRefObject<AudioContext | null> = useRef(null);
  useEffect(() => {
    contextRef.current = new AudioContext();
  }, []);

  const [device, setDevice] = useState<Device | null>(null)
  const [osc1Loc, setOsc1Loc] = useState<Point2>({ x: 0, y: 0 })
  const [osc2Loc, setOsc2Loc] = useState<Point2>({ x: 0, y: 0 })
  const [osc3Loc, setOsc3Loc] = useState<Point2>({ x: 0, y: 0 })

  // Outport events
  useEffect(() => {
    if (!device) return
    // TODO: Remove any
    const callback = (ev: any) => {
      // Ignore message events that don't belong to an outport
      if (device.outports.findIndex(elt => elt.tag === ev.tag) < 0) return
      console.info('Outport event', ev)
    }
    device.messageEvent.subscribe(callback)
    return () => {
      device.messageEvent.unsubscribe(callback)
    }
  }, [device])

  const startClicked = async () => {
    if (!contextRef.current) {
      throw new Error('No audio context exists. Cannot start Chiaro.')
    }
    const device = await startAudio(contextRef.current)
    setDevice(device)
  }

  const randomizeClicked = () => {
    if (!device) return
    randomizeParams({ device })
  }

  // Listen for updates from device
  useEffect(() => {
    if (!device) return
    // TODO: Remove any
    const callback = (updatedParam: any) => {
      if (isChangingRef.current) return
      // console.info('Received param update from device', updatedParam)
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
    return (
      <main className="flex flex-col items-center justify-center w-full h-full bg-secondary">
        <h1 className="text-2xl font-semibold leading-none tracking-tight pb-4">
          Chiaro
          {' '}
          <span className="font-normal">Mini</span>
        </h1>
        <p className="text-sm text-muted-foreground pb-4">
          A unique vocal synth, rebuilt
        </p>
        <div>
          <Button onClick={startClicked}>Start</Button>
        </div>
      </main>
    )
  }

  return (
    <main className="p-4">
      <div className="flex justify-between items-baseline">
        <h1 className="text-2xl font-semibold leading-none tracking-tight pb-4">
          Chiaro
          {' '}
          <span className="font-normal">Mini</span>
        </h1>
        <ModeToggle />
      </div>
      
      <div className="pb-4">
        <h2 className="text-xl font-semibold leading-none tracking-tight pb-4">Keyboard</h2>
        <Keyboard device={device} />
      </div>

      <div className="pb-4">
        <div className="flex justify-between items-baseline">
          <h2 className="text-xl font-semibold leading-none tracking-tight pb-4">Parameters</h2>

          <Button variant="outline" onClick={randomizeClicked}>Randomize</Button>
        </div>

        <div className="grid flex-1 items-start gap-8 pt-4 pb-4 grid-cols-4">
          <div className="text-red-500">
            <h3 className="text-l font-semibold leading-none tracking-tight pb-4">OSC 1</h3>
            <Param device={device} param={device.parameters.find((param) => `synth/harm-1` === param.id)} />
            <Param device={device} param={device.parameters.find((param) => `synth/shaper-gain-1` === param.id)} />
            <Param device={device} param={device.parameters.find((param) => `synth/gain-1` === param.id)} />
            <Slider2 value={osc1Loc} onChange={onSlider2ChangeFn(1)} isChangingRef={isChangingRef} />
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
            <Slider2 value={osc2Loc} onChange={onSlider2ChangeFn(2)} isChangingRef={isChangingRef} />
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
            <Slider2 value={osc3Loc} onChange={onSlider2ChangeFn(3)} isChangingRef={isChangingRef} />
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
                console.log(param)
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
      </div>
    </main>
  )
}

export default Home

// Device messages correspond to inlets/outlets or inports/outports
// You can filter for one or the other using the "type" of the message

// // Handle inports
// const inports = device.messages.filter(message => message.type === RNBO.MessagePortType.Inport);
// // An inport has a tag, value

// // TODO: Send events to device
// // Turn the text into a list of numbers (RNBO messages must be numbers, not text)
// const values = [1.0, 2.0, 3.0];
// // Send the message event to the RNBO device
// let messageEvent = new RNBO.MessageEvent(RNBO.TimeNow, inportTag, values);
// device.scheduleEvent(messageEvent);

// // TODO: Render different inports for selection
// inports.forEach(inport => {
//     // ...
// });

// // Load a preset
// const preset = patcher.presets[0]
// // A preset has a preset and an index
// device.setPreset(preset.preset);
