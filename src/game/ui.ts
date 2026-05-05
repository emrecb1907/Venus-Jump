import { GAME_HEIGHT, GAME_WIDTH } from "./constants";
import type { GameState } from "./types";

export type UiElements = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  overlay: HTMLDivElement;
  scoreNode: HTMLDivElement;
  highScoreNode: HTMLDivElement;
  livesNode: HTMLDivElement;
  bonusNode: HTMLDivElement;
  hudNode: HTMLDivElement;
  debugPanel: HTMLDivElement | null;
  debugOutput: HTMLPreElement | null;
};

export type OverlayActions = {
  startGame: () => void;
  goToMenu: () => void;
  showControls: () => void;
  showAbout: () => void;
};

export function initializeApp(): UiElements {
  const app = document.querySelector<HTMLDivElement>("#app");

  if (!app) {
    throw new Error("App root not found");
  }

  app.innerHTML = `
    <main class="shell">
      <section class="game-frame" aria-label="Venus Jump oyun alanı">
        <canvas width="${GAME_WIDTH}" height="${GAME_HEIGHT}" data-testid="game-canvas" aria-label="Venus Jump canvas"></canvas>
        <div class="hud" aria-live="polite">
          <div class="hud-bar">
            <div class="hud-stats" aria-label="Skor bilgileri">
              <div class="hud-stat hud-stat--score" aria-label="Skor">
                <span class="hud-icon hud-icon--score" aria-hidden="true"></span>
                <div class="hud-value" data-testid="score">0</div>
              </div>
              <div class="hud-stat hud-stat--highscore" aria-label="Rekor">
                <span class="hud-icon hud-icon--highscore" aria-hidden="true"></span>
                <div class="hud-value hud-value--highscore" data-testid="highscore">0</div>
              </div>
            </div>
            <div class="hud-items" aria-label="Eşyalar">
              <div class="hud-food" aria-label="Mama">
                <span class="hud-food-icon" aria-hidden="true"></span>
                <div class="hud-value hud-value--food" data-testid="lives">0</div>
              </div>
              <div class="hud-bonuses" data-testid="bonus" aria-label="Aktif bonus yok">
                <span class="bonus-slot" data-bonus-slot="yarn" aria-label="Yün">
                  <span class="bonus-icon bonus-icon--yarn" aria-hidden="true"></span>
                </span>
                <span class="bonus-slot" data-bonus-slot="feather" aria-label="Tüy">
                  <span class="bonus-icon bonus-icon--feather" aria-hidden="true"></span>
                </span>
                <span class="bonus-slot" data-bonus-slot="bell" aria-label="Zil">
                  <span class="bonus-icon bonus-icon--bell" aria-hidden="true"></span>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="overlay" data-testid="menu-overlay" data-visible="true">
          <div class="screen">
            <div class="logo" aria-label="Venus Jump logosu"></div>
            <div class="menu-cat" aria-label="Venus"></div>
            <nav class="menu-actions" aria-label="Ana menü">
              <button class="menu-button" type="button" data-testid="start-button">Oyunu Başlat</button>
              <button class="menu-button menu-button--secondary" type="button" data-testid="controls-button">Kontroller</button>
              <button class="menu-button menu-button--secondary" type="button" data-testid="about-button">Hakkında</button>
            </nav>
          </div>
        </div>
        <div class="debug-panel" data-testid="debug-panel">
          <div class="debug-actions">
            <button type="button" data-testid="debug-generator">Platform Testi</button>
            <button type="button" data-testid="debug-bonus">Bonus Testi</button>
            <button type="button" data-testid="debug-highscore">Highscore Testi</button>
            <button type="button" data-testid="debug-gameover">Game Over Testi</button>
            <button type="button" data-testid="debug-mobile">Mobil Dar Görünüm</button>
          </div>
          <pre class="debug-output" data-testid="debug-output">Hazır</pre>
        </div>
      </section>
    </main>
  `;

  const canvas = document.querySelector<HTMLCanvasElement>("[data-testid='game-canvas']");
  const overlay = document.querySelector<HTMLDivElement>("[data-testid='menu-overlay']");
  const scoreNode = document.querySelector<HTMLDivElement>("[data-testid='score']");
  const highScoreNode = document.querySelector<HTMLDivElement>("[data-testid='highscore']");
  const livesNode = document.querySelector<HTMLDivElement>("[data-testid='lives']");
  const bonusNode = document.querySelector<HTMLDivElement>("[data-testid='bonus']");
  const hudNode = document.querySelector<HTMLDivElement>(".hud");
  const debugPanel = document.querySelector<HTMLDivElement>("[data-testid='debug-panel']");
  const debugOutput = document.querySelector<HTMLPreElement>("[data-testid='debug-output']");

  if (!canvas || !overlay || !scoreNode || !highScoreNode || !livesNode || !bonusNode || !hudNode) {
    throw new Error("Required UI nodes are missing");
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is unavailable");
  }
  ctx.imageSmoothingEnabled = false;

  return { canvas, ctx, overlay, scoreNode, highScoreNode, livesNode, bonusNode, hudNode, debugPanel, debugOutput };
}

export function updateOverlay(ui: UiElements, state: GameState, actions: OverlayActions): void {
  const { overlay, hudNode } = ui;
  const isVisible = state.screen !== "playing" && state.screen !== "paused";
  overlay.dataset.visible = String(isVisible);
  hudNode.dataset.visible = String(state.screen === "playing" || state.screen === "paused");

  if (state.screen === "menu") {
    overlay.innerHTML = `
      <div class="screen">
        <div class="logo" aria-label="Venus Jump logosu"></div>
        <div class="menu-cat" aria-label="Venus"></div>
        <nav class="menu-actions" aria-label="Ana menü">
          <button class="menu-button" type="button" data-testid="start-button">Oyunu Başlat</button>
          <button class="menu-button menu-button--secondary" type="button" data-testid="controls-button">Kontroller</button>
          <button class="menu-button menu-button--secondary" type="button" data-testid="about-button">Hakkında</button>
        </nav>
      </div>
    `;
  }

  if (state.screen === "controls") {
    overlay.innerHTML = `
      <div class="screen screen--wide pixel-panel">
        <h1 class="screen-title">Kontroller</h1>
        <ul class="screen-list">
          <li>Bilgisayar: Sol ve sağ yön tuşlarıyla Venus'u yönlendir.</li>
          <li>Telefon: Ekranda sola veya sağa kaydır.</li>
          <li>Venus kendi zıplar; sen sadece güvenli rotayı seçersin.</li>
        </ul>
        <button class="menu-button" type="button" data-testid="back-button">Geri</button>
      </div>
    `;
  }

  if (state.screen === "about") {
    overlay.innerHTML = `
      <div class="screen screen--wide pixel-panel">
        <h1 class="screen-title">Hakkında</h1>
        <p class="screen-copy">Venus Jump, mavi gözlü minik Venus'un mama, oyuncak ve altın ziller toplayarak yukarı tırmandığı tatlı bir arcade oyunu.</p>
        <button class="menu-button" type="button" data-testid="back-button">Geri</button>
      </div>
    `;
  }

  if (state.screen === "gameOver") {
    overlay.innerHTML = `
      <div class="screen pixel-panel">
        <h1 class="screen-title">Venus biraz dinleniyor</h1>
        <p class="screen-copy" data-testid="final-score">Skor ${Math.floor(state.score)} · Rekor ${state.highScore}</p>
        <div class="game-over-cat" aria-label="Dinlenen Venus"></div>
        <button class="menu-button" type="button" data-testid="restart-button">Tekrar Oyna</button>
        <button class="menu-button menu-button--secondary" type="button" data-testid="menu-button">Menü</button>
      </div>
    `;
  }

  wireMenuButtons(overlay, actions);
}

export function updateHud(ui: UiElements, state: GameState): void {
  const { scoreNode, highScoreNode, livesNode, bonusNode } = ui;
  const player = state.player;
  scoreNode.textContent = String(Math.floor(state.score));
  highScoreNode.textContent = String(state.highScore);
  livesNode.textContent = String(player.lives);

  const bonusStates = {
    yarn: player.springTimer > 0,
    feather: player.controlTimer > 0,
    bell: player.shieldTimer > 0
  };
  const activeLabels = [
    bonusStates.yarn ? "Yün" : "",
    bonusStates.feather ? "Tüy" : "",
    bonusStates.bell ? "Zil" : ""
  ].filter(Boolean);

  for (const [kind, isActive] of Object.entries(bonusStates)) {
    const slot = bonusNode.querySelector<HTMLElement>(`[data-bonus-slot="${kind}"]`);
    if (slot) {
      slot.dataset.active = String(isActive);
    }
  }

  bonusNode.setAttribute("aria-label", activeLabels.length > 0 ? `Aktif bonus: ${activeLabels.join(", ")}` : "Aktif bonus yok");
}

export function setDebugOutput(ui: UiElements, message: string): void {
  if (ui.debugOutput) {
    ui.debugOutput.textContent = message;
  }
}

function wireMenuButtons(overlay: HTMLDivElement, actions: OverlayActions): void {
  overlay.querySelector<HTMLButtonElement>("[data-testid='start-button']")?.addEventListener("click", actions.startGame);
  overlay.querySelector<HTMLButtonElement>("[data-testid='restart-button']")?.addEventListener("click", actions.startGame);
  overlay.querySelector<HTMLButtonElement>("[data-testid='controls-button']")?.addEventListener("click", actions.showControls);
  overlay.querySelector<HTMLButtonElement>("[data-testid='about-button']")?.addEventListener("click", actions.showAbout);
  overlay.querySelector<HTMLButtonElement>("[data-testid='back-button']")?.addEventListener("click", actions.goToMenu);
  overlay.querySelector<HTMLButtonElement>("[data-testid='menu-button']")?.addEventListener("click", actions.goToMenu);
}
