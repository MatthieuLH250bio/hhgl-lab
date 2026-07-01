import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.css";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { logError } from "./lib/errorLogger";

window.addEventListener("error", (e) => {
  logError(e.error ?? new Error(e.message), "unhandled");
});
window.addEventListener("unhandledrejection", (e) => {
  logError(e.reason, "promise");
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
