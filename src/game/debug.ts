import {
  BASE_JUMP,
  GAME_HEIGHT,
  GAME_WIDTH,
  MAX_AIR_CONTROL_DISTANCE,
  MAX_FOOD_LIVES,
  MAX_JUMP_HEIGHT,
  PLAYER_WIDTH,
  RESPAWN_DROP_HEIGHT,
  RESPAWN_FALL_SPEED,
  RESPAWN_PLATFORM_CLEARANCE,
  STORAGE_KEY
} from "./constants";
import {
  checkFall,
  chooseRecoveryPlatform,
  resolveCollectibles,
  resolvePlatformCollisions,
  resolvePlayerBounds,
  respawnPlayerAbovePlatform
} from "./physics";
import { mulberry32 } from "./random";
import { readHighScore } from "./storage";
import type { Collectible, CollectibleKind, GameState, Platform } from "./types";
import type { UiElements } from "./ui";
import { setDebugOutput } from "./ui";
import { canSpawnFoodCollectible, createNextPlatform, createPlatform, maybeCreateCollectible, seedWorld } from "./world";

export type DebugActions = {
  startGame: () => void;
  updateOverlay: () => void;
  updateHud: () => void;
};

export function setupDebug(state: GameState, ui: UiElements, actions: DebugActions): void {
  if (ui.debugPanel && state.debugMode) {
    ui.debugPanel.dataset.visible = "true";
  }

  document.querySelector<HTMLButtonElement>("[data-testid='debug-generator']")?.addEventListener("click", () => {
    try {
      setDebugOutput(ui, validateGenerator(state));
    } catch (error) {
      setDebugOutput(ui, error instanceof Error ? error.message : String(error));
    }
  });

  document.querySelector<HTMLButtonElement>("[data-testid='debug-bonus']")?.addEventListener("click", () => {
    try {
      setDebugOutput(ui, runBonusSelfTest(state));
    } catch (error) {
      setDebugOutput(ui, error instanceof Error ? error.message : String(error));
    }
  });

  document.querySelector<HTMLButtonElement>("[data-testid='debug-highscore']")?.addEventListener("click", () => {
    try {
      setDebugOutput(ui, runHighScoreSelfTest(state));
    } catch (error) {
      setDebugOutput(ui, error instanceof Error ? error.message : String(error));
    }
  });

  document.querySelector<HTMLButtonElement>("[data-testid='debug-gameover']")?.addEventListener("click", () => {
    state.score = Math.max(state.score, 1305);
    state.screen = "gameOver";
    actions.updateOverlay();
    actions.updateHud();
    setDebugOutput(ui, "OK game over paneli gösteriliyor.");
  });

  document.querySelector<HTMLButtonElement>("[data-testid='debug-mobile']")?.addEventListener("click", () => {
    document.querySelector<HTMLElement>(".game-frame")?.style.setProperty("width", "390px");
    document.querySelector<HTMLElement>(".game-frame")?.style.setProperty("height", "720px");
    setDebugOutput(ui, "OK mobil dar görünüm simülasyonu aktif.");
  });

  window.venusDebug = {
    validateGenerator: () => validateGenerator(state),
    runBonusSelfTest: () => runBonusSelfTest(state),
    runHighScoreSelfTest: () => runHighScoreSelfTest(state),
    runFoodSpawnSelfTest: () => runFoodSpawnSelfTest(state),
    runWallSelfTest: () => runWallSelfTest(state),
    runRespawnSelfTest: () => runRespawnSelfTest(state),
    runShieldRecoverySelfTest: () => runShieldRecoverySelfTest(state),
    runRecoveryPlatformSelfTest: () => runRecoveryPlatformSelfTest(state),
    runFallBoundarySelfTest: () => runFallBoundarySelfTest(state),
    startGame: actions.startGame
  };
}

export function validateGenerator(state: GameState, seed = 42): string {
  const random = mulberry32(seed);
  const generated: Platform[] = [{ id: 0, x: 142, y: 650, width: 116, height: 18, kind: "normal", direction: 1, speed: 0, touched: false }];

  for (let i = 1; i < 180; i += 1) {
    generated.push(createNextPlatformForTest(state, generated[i - 1], i, i * 85, random));
  }

  for (let i = 1; i < generated.length; i += 1) {
    const previous = generated[i - 1];
    const current = generated[i];
    const verticalGap = previous.y - current.y;
    const horizontalGap = Math.abs(previous.x + previous.width / 2 - (current.x + current.width / 2));
    const widthHelp = previous.width / 2 + current.width / 2 + PLAYER_WIDTH;

    if (verticalGap > MAX_JUMP_HEIGHT - 16) {
      throw new Error(`Dikey boşluk fazla: ${i}`);
    }
    if (horizontalGap > MAX_AIR_CONTROL_DISTANCE + widthHelp) {
      throw new Error(`Yatay boşluk fazla: ${i}`);
    }
  }

  return `OK platform generator: ${generated.length} platform, seed ${seed}`;
}

function createNextPlatformForTest(
  state: GameState,
  previous: Platform,
  index: number,
  currentScore: number,
  random: () => number
): Platform {
  const originalRng = state.rng;
  state.rng = random;
  const platform = createNextPlatform(state, previous, index, currentScore, random);
  state.rng = originalRng;
  return platform;
}

export function runBonusSelfTest(state: GameState): string {
  seedWorld(state);
  state.player.lives = 0;
  state.player.shieldTimer = 0;
  state.player.controlTimer = 0;
  state.player.springTimer = 0;
  const samples: CollectibleKind[] = ["food", "yarn", "feather", "bell"];

  for (const kind of samples) {
    const collectible: Collectible = {
      id: state.collectibleId++,
      x: state.player.x + 10,
      y: state.player.y + 10,
      kind,
      collected: false
    };
    state.collectibles = [collectible];
    resolveCollectibles(state);
  }

  const ok = state.player.lives === 1 && state.player.springTimer > 0 && state.player.controlTimer > 0 && state.player.shieldTimer > 0;
  if (!ok) {
    throw new Error("Bonus etkileri beklenen duruma geçmedi.");
  }
  return `OK bonuslar: mama=${state.player.lives}, yün=${state.player.springTimer.toFixed(1)}, tüy=${state.player.controlTimer.toFixed(1)}, zil=${state.player.shieldTimer.toFixed(1)}`;
}

export function runHighScoreSelfTest(state: GameState): string {
  const previous = localStorage.getItem(STORAGE_KEY);
  localStorage.setItem(STORAGE_KEY, "3210");
  state.highScore = readHighScore();
  const ok = state.highScore === 3210;
  if (previous === null) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, previous);
  }
  state.highScore = readHighScore();

  if (!ok) {
    throw new Error("Highscore localStorage okuma testi başarısız.");
  }
  return "OK highscore localStorage okunuyor ve geri yükleniyor.";
}

export function runFoodSpawnSelfTest(state: GameState): string {
  seedWorld(state);
  state.player.lives = MAX_FOOD_LIVES;
  state.collectibles = [];
  const platform = createPlatform(state, 120, 420, 96);
  const collectible = maybeCreateCollectible(state, platform, 12, () => 0);

  if (collectible?.kind === "food") {
    throw new Error("Mama 3 iken yeni mama tası üretildi.");
  }

  state.player.lives = 0;
  state.collectibles = [
    { id: state.collectibleId++, x: 120, y: 320, kind: "food", collected: false },
    { id: state.collectibleId++, x: 160, y: 240, kind: "food", collected: false },
    { id: state.collectibleId++, x: 200, y: 160, kind: "food", collected: false }
  ];

  if (canSpawnFoodCollectible(state)) {
    throw new Error("Sahada 3 mama varken yeni mama izni açık kaldı.");
  }

  return "OK mama üretimi 3 sınırına uyuyor.";
}

export function runWallSelfTest(state: GameState): string {
  seedWorld(state);
  state.player.x = -24;
  state.player.vx = -180;
  resolvePlayerBounds(state);
  const leftOk = state.player.x === 0 && state.player.vx === 0;

  state.player.x = GAME_WIDTH + 12;
  state.player.vx = 180;
  resolvePlayerBounds(state);
  const rightOk = state.player.x === GAME_WIDTH - state.player.width && state.player.vx === 0;

  if (!leftOk || !rightOk) {
    throw new Error("Duvar sınırı Venus'u oyun alanında tutamadı.");
  }

  return "OK kenarlar duvar gibi çalışıyor.";
}

export function runRespawnSelfTest(state: GameState): string {
  seedWorld(state);
  state.cameraY = 0;
  const platform = createPlatform(state, 120, 420, 96);
  respawnPlayerAbovePlatform(state, platform);

  const gap = platform.y - (state.player.y + state.player.height);
  const centeredX = platform.x + platform.width / 2 - state.player.width / 2;
  const ok =
    Math.abs(state.player.x - centeredX) < 0.01 &&
    gap >= RESPAWN_PLATFORM_CLEARANCE &&
    gap <= RESPAWN_DROP_HEIGHT &&
    state.player.vy === RESPAWN_FALL_SPEED;

  if (!ok) {
    throw new Error("Respawn düşüş konumu beklenen aralıkta değil.");
  }

  return `OK respawn platformun ${Math.round(gap)}px üstünden düşüyor.`;
}

export function runShieldRecoverySelfTest(state: GameState): string {
  seedWorld(state);
  state.screen = "playing";
  state.player.lives = 2;
  state.player.shieldTimer = 3;
  state.player.y = state.cameraY + GAME_HEIGHT + 100;
  checkFall(state);

  const gap = state.lastSafePlatform ? state.lastSafePlatform.y - (state.player.y + state.player.height) : 0;
  const ok =
    state.screen === "playing" && state.player.lives === 2 && state.player.vy === RESPAWN_FALL_SPEED && gap > RESPAWN_PLATFORM_CLEARANCE;

  if (!ok) {
    throw new Error("Zil kurtarması yukarıdan düşüş davranışına geçmedi.");
  }

  return `OK zil kurtarması ${Math.round(gap)}px üstten düşürüyor.`;
}

export function runRecoveryPlatformSelfTest(state: GameState): string {
  seedWorld(state);
  state.screen = "playing";
  state.player.lives = 1;
  state.player.shieldTimer = 0;
  state.cameraY = 0;

  const lowerSafe = createPlatform(state, 220, 620, 96, "normal");
  const brokenBridge = createPlatform(state, 150, 520, 96, "cracked");
  brokenBridge.touched = true;
  const upperSafe = createPlatform(state, 120, 430, 96, "normal");
  state.platforms = [lowerSafe, brokenBridge, upperSafe];
  state.lastSafePlatform = lowerSafe;
  state.player.y = state.cameraY + GAME_HEIGHT + 100;

  const recoveryTarget = chooseRecoveryPlatform(state, lowerSafe);
  checkFall(state);

  const gap = upperSafe.y - (state.player.y + state.player.height);
  const ok =
    recoveryTarget.id === upperSafe.id &&
    state.player.lives === 0 &&
    state.player.vy === RESPAWN_FALL_SPEED &&
    gap >= RESPAWN_PLATFORM_CLEARANCE &&
    gap <= RESPAWN_DROP_HEIGHT;

  if (!ok) {
    throw new Error("Düşüş kurtarması son güvenli platformun bir üstündeki sağlam platformu seçmedi.");
  }

  return `OK recovery hedefi üst sağlam platform: ${Math.round(gap)}px üstten düşürüyor.`;
}

export function runFallBoundarySelfTest(state: GameState): string {
  seedWorld(state);
  state.screen = "playing";
  state.player.lives = 0;
  state.player.shieldTimer = 0;

  const belowScreenPlatform = createPlatform(state, 120, state.cameraY + GAME_HEIGHT + 48, 116);
  state.platforms = [belowScreenPlatform];
  state.lastSafePlatform = undefined;
  state.player.x = belowScreenPlatform.x + 20;
  state.player.y = belowScreenPlatform.y - state.player.height;
  state.player.previousY = state.player.y - 18;
  state.player.vx = 0;
  state.player.vy = 360;

  const handledFall = checkFall(state);
  resolvePlatformCollisions(state);

  if (!handledFall || state.player.vy === BASE_JUMP) {
    throw new Error("Alt sınırdaki platform Venus'u düşmeden sonra tekrar zıplattı.");
  }

  return "OK alt sınır düşüşü platform zıplamasından önce yakalanıyor.";
}

declare global {
  interface Window {
    venusDebug?: {
      validateGenerator: () => string;
      runBonusSelfTest: () => string;
      runHighScoreSelfTest: () => string;
      runFoodSpawnSelfTest: () => string;
      runWallSelfTest: () => string;
      runRespawnSelfTest: () => string;
      runShieldRecoverySelfTest: () => string;
      runRecoveryPlatformSelfTest: () => string;
      runFallBoundarySelfTest: () => string;
      startGame: () => void;
    };
  }
}
