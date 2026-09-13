import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";

import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "./styles/index.css";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { applyTheme, getStoredTheme } from "./lib/device";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });
applyTheme(getStoredTheme());

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
