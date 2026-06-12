import React from "react";
import ReactDOM from "react-dom/client";
import { BestiaryScreen } from "./screens/BestiaryScreen";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BestiaryScreen />
  </React.StrictMode>,
);
