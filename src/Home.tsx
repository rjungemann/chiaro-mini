import { useRef, MutableRefObject, useEffect, useState } from 'react';
import { createDevice, Device, MIDIByte, MIDIEvent } from "@rnbo/js";
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"

const sections = {
  osc1: 'synth/harm-1 synth/shaper-x-1 synth/shaper-y-1 synth/shaper-gain-1 synth/a-1 synth/d-1 synth/s-1 synth/r-1 synth/gain-1'.split(' '),
  osc2: 'synth/harm-2 synth/shaper-x-2 synth/shaper-y-2 synth/shaper-gain-2 synth/a-2 synth/d-2 synth/s-2 synth/r-2 synth/gain-2'.split(' '),
  osc3: 'synth/harm-3 synth/shaper-x-3 synth/shaper-y-3 synth/shaper-gain-3 synth/a-3 synth/d-3 synth/s-3 synth/r-3 synth/gain-3'.split(' '),
  global: 'synth/vel-amt synth/gain-mix effect-level'.split(' '),
  chorus: 'chorus/center chorus/bw chorus/rate chorus/fb'.split(' '),
  reverb: 'reverb/drywet reverb/decay reverb/damping reverb/predelay reverb/inbandwidth reverb/indiffusion1 reverb/indiffusion2 reverb/decaydiffusion1 reverb/decaydiffusion2'.split(' '),
}

const names = {
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
    if (param.id.match(/^chorus\//)) return;
    if (param.id.match(/^reverb\//)) return;
    // Shaper settings
    if (param.id.match(/^synth\/shaper-[xy]-/)) {
      param.value = Math.floor(Math.random() * 2.0);
      return;
    }
    if (param.id.match(/^synth\/shaper-gain-/)) {
      param.value = Math.random() * 0.25;
      return;
    }
    if (param.id.match(/^synth\/shaper-gain-/)) {
      param.value = Math.random() * 3.0;
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

  const name = names[param.id]

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

function Home() {
  const contextRef: MutableRefObject<AudioContext | null> = useRef(null);
  useEffect(() => {
    contextRef.current = new AudioContext();
  }, []);

  const [device, setDevice] = useState<Device | null>(null)

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

  return (
    <main className="p-4">
      <h1 className="text-2xl font-semibold leading-none tracking-tight pb-4">
        Chiaro
      </h1>

      {!device && <div>
        <Button onClick={startClicked}>Start</Button>
      </div>}

      {device && <>
        <div className="pb-4">
          <h2 className="text-xl font-semibold leading-none tracking-tight pb-4">Keyboard</h2>
          <Keyboard device={device} />
        </div>

        <div className="pb-4">
          <h2 className="text-xl font-semibold leading-none tracking-tight pb-4">Parameters</h2>

          <Button variant="outline" onClick={randomizeClicked}>Randomize</Button>

          <div className="grid flex-1 items-start gap-8 pt-4 pb-4 grid-cols-4">
            <div>
              <h3 className="text-l font-semibold leading-none tracking-tight pb-4">OSC 1</h3>
              {
                sections['osc1']
                .map((id) => device.parameters.find((param) => id === param.id))
                .map((param) => (
                  <Param key={param.id} device={device} param={param} />
                ))
              }
            </div>

            <div>
              <h3 className="text-l font-semibold leading-none tracking-tight pb-4">OSC 2</h3>
              {
                sections['osc2']
                .map((id) => device.parameters.find((param) => id === param.id))
                .map((param) => (
                  <Param key={param.id} device={device} param={param} />
                ))
              }
            </div>

            <div>
              <h3 className="text-l font-semibold leading-none tracking-tight pb-4">OSC 3</h3>
              {
                sections['osc3']
                .map((id) => device.parameters.find((param) => id === param.id))
                .map((param) => (
                  <Param key={param.id} device={device} param={param} />
                ))
              }
            </div>

            <div>
              <h3 className="text-l font-semibold leading-none tracking-tight pb-4">Global</h3>
              {
                sections['global']
                .map((id) => device.parameters.find((param) => id === param.id))
                .map((param) => (
                  <Param key={param.id} device={device} param={param} />
                ))
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
      </>}
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
