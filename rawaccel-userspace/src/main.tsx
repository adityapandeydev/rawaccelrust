import React from "react";
import ReactDOM from "react-dom/client";
import "./fonts";
import App from "./App";
import { MouseTelemetryProvider } from './components/MouseTelemetry';

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MouseTelemetryProvider><App /></MouseTelemetryProvider>
  </React.StrictMode>,
);
