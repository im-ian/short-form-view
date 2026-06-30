import '@testing-library/jest-dom/vitest'

// jsdom lacks matchMedia; provide a no-match default.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

// jsdom may not provide requestAnimationFrame timing; fall back to setTimeout.
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 0) as unknown as number) as typeof globalThis.requestAnimationFrame
  globalThis.cancelAnimationFrame = ((id: number) =>
    clearTimeout(id as unknown as ReturnType<typeof setTimeout>)) as typeof globalThis.cancelAnimationFrame
}

// jsdom lacks PointerEvent; shim a minimal one over MouseEvent.
if (typeof globalThis.PointerEvent === 'undefined') {
  class PE extends MouseEvent {
    pointerId: number
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 0
    }
  }
  globalThis.PointerEvent = PE as unknown as typeof PointerEvent
}

// jsdom does not implement pointer capture; make them no-ops.
if (typeof Element !== 'undefined') {
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => {}
  if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {}
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false
}
