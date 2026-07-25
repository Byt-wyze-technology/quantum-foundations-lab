import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

import { useLabStore } from "../store/labStore";
import { ket0 } from "../math";

// jsdom has no canvas implementation; the Bloch sphere must still mount and
// expose its accessible description, which is what the tests assert on.
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as never;
}

afterEach(() => {
  cleanup();
  useLabStore.getState().setInitialState(ket0());
  useLabStore.getState().setMeasurementAxis({ theta: 0, phi: 0 });
  useLabStore.getState().setSeed(null);
});
