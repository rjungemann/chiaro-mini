import { StrictMode } from 'react'
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider"
import Home from './Home'
import './globals.css'

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>
);

