import type { GameState } from "./types";

type InputOptions = {
  debugMode: boolean;
  setDebugOutput: (message: string) => void;
};

export function setupInput(canvas: HTMLCanvasElement, state: GameState, options: InputOptions): void {
  let touchStartX = 0;
  let touchStartY = 0;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerActive = false;

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
      state.inputDirection = -1;
    }
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
      state.inputDirection = 1;
    }
    if (event.key === "Escape" && (state.screen === "playing" || state.screen === "paused")) {
      state.screen = state.screen === "playing" ? "paused" : "playing";
      state.inputDirection = 0;
    }
  });

  document.addEventListener("keyup", (event) => {
    const leftReleased = event.key === "ArrowLeft" || event.key.toLowerCase() === "a";
    const rightReleased = event.key === "ArrowRight" || event.key.toLowerCase() === "d";
    if ((leftReleased && state.inputDirection < 0) || (rightReleased && state.inputDirection > 0)) {
      state.inputDirection = 0;
    }
  });

  canvas.addEventListener(
    "touchstart",
    (event) => {
      preventCanvasDefault(event);
      const touch = event.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    },
    { passive: false }
  );

  canvas.addEventListener(
    "touchmove",
    (event) => {
      preventCanvasDefault(event);
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      if (Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy)) {
        state.inputDirection = dx > 0 ? 1 : -1;
      }
    },
    { passive: false }
  );

  canvas.addEventListener(
    "touchend",
    (event) => {
      preventCanvasDefault(event);
      state.inputDirection = 0;
    },
    { passive: false }
  );

  canvas.addEventListener(
    "touchcancel",
    (event) => {
      preventCanvasDefault(event);
      state.inputDirection = 0;
    },
    { passive: false }
  );

  canvas.addEventListener("pointerdown", (event) => {
    preventCanvasDefault(event);
    pointerActive = true;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    preventCanvasDefault(event);
    if (!pointerActive) {
      return;
    }

    const dx = event.clientX - pointerStartX;
    const dy = event.clientY - pointerStartY;
    if (Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy)) {
      state.inputDirection = dx > 0 ? 1 : -1;
      if (options.debugMode) {
        options.setDebugOutput(`OK swipe ${state.inputDirection > 0 ? "sağ" : "sol"} algılandı.`);
      }
    }
  });

  canvas.addEventListener("pointerup", (event) => {
    preventCanvasDefault(event);
    pointerActive = false;
    state.inputDirection = 0;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  });

  canvas.addEventListener("pointercancel", (event) => {
    preventCanvasDefault(event);
    pointerActive = false;
    state.inputDirection = 0;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  });

  canvas.addEventListener("contextmenu", preventCanvasDefault);
  canvas.addEventListener("selectstart", preventCanvasDefault);
  canvas.addEventListener("dragstart", preventCanvasDefault);
}

function preventCanvasDefault(event: Event): void {
  if (event.cancelable) {
    event.preventDefault();
  }
}
