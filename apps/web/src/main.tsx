import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App, AppErrorBoundary } from "./App";
import { AuthProvider } from "./lib/auth-context";

const root = document.getElementById("root");
if (!root) throw new Error("Elemen utama aplikasi tidak ditemukan.");
const bootWindow = window as typeof window & { __hafizBootTimer?: number };
if (bootWindow.__hafizBootTimer) clearTimeout(bootWindow.__hafizBootTimer);
createRoot(root).render(<StrictMode><AppErrorBoundary><AuthProvider><App/></AuthProvider></AppErrorBoundary></StrictMode>);
