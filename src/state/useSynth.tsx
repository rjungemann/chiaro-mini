import { createContext, MutableRefObject, ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { createDevice, Device, MIDIByte, MIDIData, MIDIEvent, TimeNow } from '@rnbo/js';

type SynthState = {
  context: AudioContext | null
  device: Device | null
  startDevice: () => void
  isChangingRef: MutableRefObject<boolean> | null
  midi: MIDIAccess | null
  inports: Record<string, MIDIInput>
  inport: string | null
}

type SynthContextState = {
  state: SynthState
  setState: (state: SynthState) => void
}

const defaultSynthState = {
  context: null,
  device: null,
  startDevice: () => { throw new Error('Not implemented') },
  isChangingRef: null,
  setIsChanging: (value: boolean) => {},
  midi: null,
  inports: {},
  inport: null,
}

const defaultSynthContextState = {
  state: defaultSynthState,
  setState: () => {}
}

const basename = import.meta.env.VITE_BASE_ROUTE ?? '/chiaro-mini/'

const fetchPatcher = () => (
  fetch(`${basename}export/patch.export.json`)
  .then((response) => response.json())
);

const fetchDeps = () => (
  fetch(`${basename}export/dependencies.json`)
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

const SynthContext = createContext<SynthContextState>(defaultSynthContextState)

export const SynthProvider = ({ children }: { children: ReactNode }) => {
  const isChangingRef = useRef<boolean>(false)
  const [state, setState] = useState<SynthState>({ ...defaultSynthState, isChangingRef })

  useEffect(() => {
    if (!state) return
    if (!state.device) return
    if (state.midi) return
    
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
  }, [state.midi])

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
  }, [state.inport])

  useEffect(() => {
    if (state.context && state.device) return;
    
    const startDevice = async () => {
      const context = new AudioContext();
      const device = await startAudio(context)
      setState({
        ...state,
        context,
        device,
      })
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