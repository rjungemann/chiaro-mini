import { StrictMode } from 'react'
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider"
import Home from './Home'
import './globals.css'
import { SynthProvider } from 'src/state/use-synth';

const basename = import.meta.env.VITE_BASE_ROUTE ?? '/chiaro-mini/'
const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
], {
  basename
});
const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <SynthProvider>
        <RouterProvider router={router} />
      </SynthProvider>
    </ThemeProvider>
  </StrictMode>
)
createRoot(root).render(app);
