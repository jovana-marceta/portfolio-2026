import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Global styles first, so component styles (imported by App) can override them
import "./styles/tokens.css";
import "./styles/base.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
