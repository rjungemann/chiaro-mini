import { createContext, MutableRefObject, ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { createDevice, Device } from '@rnbo/js';

type SynthState = {
  context: AudioContext | null
  device: Device | null
  startDevice: () => void
  isChangingRef: MutableRefObject<boolean> | null
  midi: MIDIAccess | null // TODO: Remove any
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
  midi: null
}

const defaultSynthContextState = {
  state: defaultSynthState,
  setState: () => {}
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
  return (
    <SynthContext.Provider value={{ state, setState }}>
      {children}
    </SynthContext.Provider>
  )
}

export const useSynth = () => {
  const { state, setState } = useContext(SynthContext)

  useEffect(() => {
    if (!state) return
    if (!state.device) return
    if (state.midi) return
    
    navigator.requestMIDIAccess()
    .then((midi: MIDIAccess) => {
      setState({ ...state, midi })
      console.info("Initialized MIDI", midi);
    })
    .catch((err: Error) => {
      console.error(`Failed to get MIDI access`, err);
    });
  }, [state])

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

  return { state, setState }
}