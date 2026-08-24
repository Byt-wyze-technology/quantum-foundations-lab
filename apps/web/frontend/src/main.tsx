import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { applySharedStateFromUrl } from "./store/shareLink";
import "./styles.css";

applySharedStateFromUrl(window.location.search);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename="/quantum-foundations-lab/">
      <App />
    </BrowserRouter>
  </StrictMode>,
);
