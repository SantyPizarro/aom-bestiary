import React from "react";
import ReactDOM from "react-dom/client";
import { BestiaryScreen } from "./screens/BestiaryScreen";
import "./styles.css";

// TextureLoader is more reliable for PNGs embedded in GLBs under restrictive CSP headers.
if (typeof window.createImageBitmap === "function") {
  Object.defineProperty(window, "createImageBitmap", {
    configurable: true,
    value: undefined,
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BestiaryScreen />
  </React.StrictMode>,
);
