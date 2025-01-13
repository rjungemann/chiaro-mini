import { createContext, MutableRefObject, ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { createDevice, Device, MIDIByte, MIDIData, MIDIEvent, TimeNow } from '@rnbo/js';

const defaultGain = 0.25;

export type SynthState = {
  context: AudioContext | null
  device: Device | null
  startDevice: () => void
  analyser: AnalyserNode | null,
  isChangingRef: MutableRefObject<boolean> | null
  midi: MIDIAccess | null
  inports: Record<string, MIDIInput>
  inport: string | null
  presets: SynthPreset[]
}

export type SynthPreset = {
  name: string
  preset: any
}

type SynthContextState = {
  state: SynthState
  setState: (state: SynthState) => void
}

const defaultSynthState = {
  context: null,
  device: null,
  startDevice: () => { throw new Error('Not implemented') },
  analyser: null,
  isChangingRef: null,
  setIsChanging: (value: boolean) => {},
  midi: null,
  inports: {},
  inport: null,
  presets: [],
}

const defaultSynthContextState = {
  state: defaultSynthState,
  setState: () => {}
}

const BASE_PATH = '/chiaro-mini'

const fetchPatcher = () => (
  fetch(`${BASE_PATH}/export/patch.export.json`)
  .then((response) => response.json())
);

const fetchDeps = () => (
  fetch(`${BASE_PATH}/export/dependencies.json`)
  .then((response) => response.json())
  .then((deps) => (
    // TODO: Remove any
    deps.map((dep: any) => ({ ...dep, ...(dep.file ? { file: "export/" + dep.file } : {}) }))
  ))
);

const startAudio = async (context: AudioContext) => {
  // Start audio processing
  context.resume()
  // Create gain node and connect it to audio output
  const outputNode = context.createGain();
  outputNode.gain.value = defaultGain;
  outputNode.connect(context.destination);
  // Create the device
  const patcher = await fetchPatcher()
  const deps = await fetchDeps()
  const device: Device = await createDevice({ patcher, context })
  // Attach samples the device depends on, to the device
  if (deps.length) {
    await device.loadDataBufferDependencies(deps);
  }
  // Create analyser for the oscilloscope
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  // Connect the device to the analyser, and the analyser to the output
  device.node.connect(analyser);
  analyser.connect(outputNode);
  // device.node.connect(outputNode);
  return { patcher, deps, device, analyser }
}

const SynthContext = createContext<SynthContextState>(defaultSynthContextState)

export const SynthProvider = ({ children }: { children: ReactNode }) => {
  const isChangingRef = useRef<boolean>(false)
  const [state, setState] = useState<SynthState>({ ...defaultSynthState, isChangingRef })

  useEffect(() => {
    if (!state) return
    if (!state.device) return
    if (state.midi) return
    try {
      navigator.requestMIDIAccess()
      .then((midi: MIDIAccess) => {
        const inports: Record<string, MIDIInput> = {}
        midi.inputs.forEach((value: MIDIInput, key: string) => {
          inports[value.id] = value
        })
        setState({
          ...state,
          midi,
          inports,
          inport: Object.keys(inports)[0],
        })
        console.info("Initialized MIDI", midi);
      })
      .catch((err: Error) => {
        console.error(`Failed to get MIDI access`, err);
      });
    } catch (err) {
      console.error(err)
    }
  }, [state])

  useEffect(() => {
    if (!state) return
    if (!state.midi) return
    const callback = (ev: Event) => {
      const event = ev as MIDIConnectionEvent
      if (!event.port) return
      if (event.type !== "input") return
      if (event.port.state === "disconnected") {
        const { [event.port.id]: id, ...inports } = state.inports
        setState({ ...state, inports })
      } else {
        const inport = event.port as MIDIInput
        const inports = { ...state.inports, [event.port.id]: inport }
        setState({ ...state, inports })
      }
    }
    state.midi.addEventListener("statechange", callback)
    return () => {
      if (!state) return
      if (!state.midi) return
      state.midi.removeEventListener("statechange", callback)
    }
  }, [state])

  useEffect(() => {
    if (!state) return
    if (!state.inport) return
    const inport = state.inports[state.inport]
    const callback = (message: MIDIMessageEvent) => {
      if (!state.device) return
      if (!message.data) return
      const timestamp = state.device.context.currentTime * 1000
      const port = 0
      const evt: MIDIEvent = new MIDIEvent(timestamp, port, [message.data[0], message.data[1], message.data[2]])
      console.log('MIDI Input event sent to Chiaro', evt)
      state.device.scheduleEvent(evt)
    }
    inport.addEventListener("midimessage", callback)
    return () => {
      inport.removeEventListener("midimessage", callback)
    }
  }, [state])

  useEffect(() => {
    if (state.context && state.device) return;
    
    const startDevice = async () => {
      const context = new AudioContext();
      const { patcher, deps, device, analyser } = await startAudio(context)
      setState({
        ...state,
        context,
        device,
        analyser,
        presets: patcher.presets,
      })

      console.info('Loading the initial preset')
      device.setPreset(patcher.presets[0].preset)
    }
    setState({
      ...state,
      startDevice,
    })
  }, [])

  return (
    <SynthContext.Provider value={{ state, setState }}>
      {children}
    </SynthContext.Provider>
  )
}

export const useSynth = () => {
  const { state, setState } = useContext(SynthContext)

  return { state, setState }
}