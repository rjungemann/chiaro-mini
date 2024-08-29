import { StrictMode } from 'react'
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider"
import Home from './Home'
import './globals.css'
import { SynthProvider } from '@/state/useSynth';

const basename = import.meta.env.VITE_BASE_ROUTE ?? '/chiaro-mini/'
const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
], {
  basename
});


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <SynthProvider>
        <RouterProvider router={router} />
      </SynthProvider>
    </ThemeProvider>
  </StrictMode>
);

