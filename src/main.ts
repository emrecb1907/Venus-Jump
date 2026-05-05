import "./styles/app.css";

import { loadGameAssets } from "./game/assets";
import { setupDebug } from "./game/debug";
import { setupInput } from "./game/input";
import { updateGame } from "./game/physics";
import { drawGame } from "./game/render";
import { createGameState } from "./game/state";
import type { OverlayActions } from "./game/ui";
import { initializeApp, setDebugOutput, updateHud, updateOverlay } from "./game/ui";
import { seedWorld } from "./game/world";

const ui = initializeApp();
const assets = loadGameAssets();
const state = createGameState();

function refreshOverlay(): void {
  updateOverlay(ui, state, overlayActions);
}

function refreshHud(): void {
  updateHud(ui, state);
}

function startGame(): void {
  seedWorld(state);
  state.screen = "playing";
  refreshOverlay();
  refreshHud();
}

function goToMenu(): void {
  state.screen = "menu";
  refreshOverlay();
}

function showInfo(kind: "controls" | "about"): void {
  state.screen = kind;
  refreshOverlay();
}

const overlayActions: OverlayActions = {
  startGame,
  goToMenu,
  showControls: () => showInfo("controls"),
  showAbout: () => showInfo("about")
};

setupInput(ui.canvas, state, {
  debugMode: state.debugMode,
  setDebugOutput: (message) => setDebugOutput(ui, message)
});

setupDebug(state, ui, {
  startGame,
  updateOverlay: refreshOverlay,
  updateHud: refreshHud
});

seedWorld(state);
refreshOverlay();
refreshHud();

let lastTime = performance.now();

function gameLoop(now: number): void {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;

  const previousScreen = state.screen;
  updateGame(state, dt);
  if (state.screen !== previousScreen) {
    refreshOverlay();
  }
  refreshHud();
  drawGame(ui.ctx, assets, state);
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
