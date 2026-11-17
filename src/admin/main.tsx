import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/prose.css";
import "../components/layout/Navigation.css"; // logo mark + theme toggle
import "./admin.css";
import { AdminApp } from "./AdminApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>
);
