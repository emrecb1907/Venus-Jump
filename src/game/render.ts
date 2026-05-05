import {
  COLLECTIBLE_DRAW_SIZE,
  GAME_HEIGHT,
  GAME_WIDTH,
  MOVING_PLATFORM_DRAW_HEIGHT,
  MOVING_PLATFORM_DRAW_WIDTH,
  ROOM_SCORE_SPAN,
  ROOM_TRANSITION_START
} from "./constants";
import type { GameAssets, GameState } from "./types";
import { clamp } from "./utils";

export function drawGame(ctx: CanvasRenderingContext2D, assets: GameAssets, state: GameState): void {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  drawBackground(ctx, assets, state);

  if (state.screen === "menu" || state.screen === "controls" || state.screen === "about") {
    drawMenuBackdrop(ctx);
    return;
  }

  drawPlatforms(ctx, assets, state);
  drawCollectibles(ctx, assets, state);
  if (state.screen !== "gameOver") {
    drawPlayer(ctx, assets, state);
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, assets: GameAssets, state: GameState): void {
  const cycle = Math.max(0, state.score) / ROOM_SCORE_SPAN;
  const currentIndex = Math.floor(cycle) % assets.roomImages.length;
  const nextIndex = (currentIndex + 1) % assets.roomImages.length;
  const cycleProgress = cycle - Math.floor(cycle);
  const transitionAmount = cycleProgress <= ROOM_TRANSITION_START ? 0 : (cycleProgress - ROOM_TRANSITION_START) / (1 - ROOM_TRANSITION_START);
  const current = assets.roomImages[currentIndex];
  const next = assets.roomImages[nextIndex];

  if (current.complete && current.naturalWidth > 0) {
    const transitionY = Math.round(transitionAmount * GAME_HEIGHT);
    drawRoomImage(ctx, current, 0.5, transitionY);
    if (transitionAmount > 0 && next.complete && next.naturalWidth > 0) {
      drawRoomImage(ctx, next, 0.5, transitionY - GAME_HEIGHT);
    }
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, "#08122a");
    gradient.addColorStop(1, "#17264f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  ctx.fillStyle = "rgba(6, 13, 30, 0.26)";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawRoomImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, pan: number, dy: number): void {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = GAME_WIDTH / GAME_HEIGHT;
  let sx = 0;
  let sy = 0;
  let sw = image.naturalWidth;
  let sh = image.naturalHeight;

  if (sourceRatio > targetRatio) {
    sw = image.naturalHeight * targetRatio;
    sx = (image.naturalWidth - sw) * clamp(pan, 0, 1);
  } else {
    sh = image.naturalWidth / targetRatio;
    sy = (image.naturalHeight - sh) * 0.5;
  }

  ctx.drawImage(image, sx, sy, sw, sh, 0, dy, GAME_WIDTH, GAME_HEIGHT);
}

function drawMenuBackdrop(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "rgba(3, 8, 22, 0.34)";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawPlatforms(ctx: CanvasRenderingContext2D, assets: GameAssets, state: GameState): void {
  for (const platform of state.platforms) {
    const y = platform.y - state.cameraY;
    if (y < -70 || y > GAME_HEIGHT + 70) {
      continue;
    }

    const isSoftPlatform = platform.kind === "cushion" || platform.kind === "cracked";
    const platformHeight = isSoftPlatform ? 70 : MOVING_PLATFORM_DRAW_HEIGHT;
    const platformY = isSoftPlatform ? y - 31 : y - 24;
    const platformWidth = platform.kind === "moving" ? MOVING_PLATFORM_DRAW_WIDTH : platform.width + 16;
    const platformX = platform.kind === "moving" ? platform.x + platform.width / 2 - platformWidth / 2 : platform.x - 8;
    drawPlatformShadow(ctx, platformX, platformY + platformHeight - 14, platformWidth, 18);
    drawImageAsset(ctx, assets.platformImages[platform.kind], platformX, platformY, platformWidth, platformHeight);
  }
}

function drawPlatformShadow(ctx: CanvasRenderingContext2D, dx: number, dy: number, dw: number, dh: number): void {
  ctx.save();
  ctx.fillStyle = "rgba(7, 9, 18, 0.36)";
  ctx.beginPath();
  ctx.ellipse(dx + dw / 2, dy + dh / 2, dw * 0.46, dh * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCollectibles(ctx: CanvasRenderingContext2D, assets: GameAssets, state: GameState): void {
  for (const collectible of state.collectibles) {
    const y = collectible.y - state.cameraY;
    if (y < -80 || y > GAME_HEIGHT + 80) {
      continue;
    }

    const drawX = collectible.x + 18 - COLLECTIBLE_DRAW_SIZE / 2;
    const drawY = y + 18 - COLLECTIBLE_DRAW_SIZE / 2;
    drawImageAsset(ctx, assets.collectibleImages[collectible.kind], drawX, drawY, COLLECTIBLE_DRAW_SIZE, COLLECTIBLE_DRAW_SIZE);
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, assets: GameAssets, state: GameState): void {
  const player = state.player;
  const y = player.y - state.cameraY;

  if (state.screen === "playing") {
    const isFalling = player.vy > 120;
    const image = isFalling
      ? player.facing > 0
        ? assets.playerImages.fallRight
        : assets.playerImages.fallLeft
      : player.facing > 0
        ? assets.playerImages.jumpRight
        : assets.playerImages.jumpLeft;
    const breathe = Math.sin(performance.now() / 130) * 1.5;
    const drawSize = isFalling ? 148 : 154;
    const drawX = player.x + player.width / 2 - drawSize / 2;
    const drawY = y + player.height / 2 - drawSize * 0.58 + breathe;
    const safeDrawX = clamp(drawX, 0, GAME_WIDTH - drawSize);
    drawImageAsset(ctx, image, safeDrawX, drawY, drawSize, drawSize);
    drawShield(ctx, state, y);
    return;
  }

  const frame = assets.playerImages.idle[Math.floor(performance.now() / 110) % assets.playerImages.idle.length];
  const idleSize = 126;
  drawMirroredImageAsset(ctx, frame, player.x + player.width / 2 - idleSize / 2, y - 40, idleSize, idleSize, player.facing, "#d9bd83");

  drawShield(ctx, state, y);
}

function drawShield(ctx: CanvasRenderingContext2D, state: GameState, y: number): void {
  const player = state.player;
  if (player.shieldTimer > 0) {
    ctx.strokeStyle = "rgba(255, 209, 92, 0.82)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(player.x + player.width / 2, y + player.height / 2, 46, 50, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawMirroredImageAsset(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  facing: -1 | 1,
  fallbackStyle = "#ffd15c"
): void {
  ctx.save();
  if (facing < 0) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    drawImageAsset(ctx, image, 0, 0, dw, dh, fallbackStyle);
  } else {
    drawImageAsset(ctx, image, dx, dy, dw, dh, fallbackStyle);
  }
  ctx.restore();
}

function drawImageAsset(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  fallbackStyle = "#ffd15c"
): void {
  if (!image.complete || image.naturalWidth === 0) {
    ctx.fillStyle = fallbackStyle;
    ctx.fillRect(dx, dy, dw, dh);
    return;
  }

  ctx.drawImage(image, dx, dy, dw, dh);
}
