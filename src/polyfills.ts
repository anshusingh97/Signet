import { Buffer } from "buffer";

interface PolyfilledWindow {
  Buffer?: typeof Buffer;
  process?: { env: Record<string, string | undefined> };
}

if (typeof window !== "undefined") {
  const win = window as unknown as PolyfilledWindow;
  const g = globalThis as unknown as PolyfilledWindow;

  if (!win.Buffer) {
    win.Buffer = Buffer;
  }
  if (!g.Buffer) {
    g.Buffer = Buffer;
  }
  if (!win.process) {
    win.process = { env: {} };
  }
}

export { Buffer };
