import {
  AIR_DRAG,
  BASE_JUMP,
  FALL_RECOVERY_BUFFER,
  GAME_HEIGHT,
  GAME_WIDTH,
  GRAVITY,
  MAX_CONTROL_SPEED,
  MAX_FOOD_LIVES,
  MAX_SPEED,
  MOVE_ACCEL,
  RESPAWN_DROP_HEIGHT,
  RESPAWN_FALL_SPEED,
  RESPAWN_PLATFORM_CLEARANCE,
  RESPAWN_TOP_PADDING,
  SPRING_JUMP
} from "./constants";
import { writeHighScore } from "./storage";
import type { GameState, Platform } from "./types";
import { clamp } from "./utils";
import { recycleWorld, updatePlatforms } from "./world";

export function updateGame(state: GameState, dt: number): void {
  if (state.screen !== "playing") {
    return;
  }

  const player = state.player;
  const controlMultiplier = player.controlTimer > 0 ? 1.28 : 1;
  const maxSpeed = player.controlTimer > 0 ? MAX_CONTROL_SPEED : MAX_SPEED;
  player.vx += state.inputDirection * MOVE_ACCEL * controlMultiplier * dt;
  player.vx *= Math.pow(AIR_DRAG, dt * 60);
  player.vx = clamp(player.vx, -maxSpeed, maxSpeed);
  player.vy += GRAVITY * dt;
  player.previousY = player.y;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  if (state.inputDirection !== 0) {
    player.facing = state.inputDirection > 0 ? 1 : -1;
  }

  resolvePlayerBounds(state);

  player.shieldTimer = Math.max(0, player.shieldTimer - dt);
  player.controlTimer = Math.max(0, player.controlTimer - dt);
  player.springTimer = Math.max(0, player.springTimer - dt);

  updatePlatforms(state, dt);
  if (checkFall(state)) {
    return;
  }

  resolvePlatformCollisions(state);
  resolveCollectibles(state);
  updateCamera(state);
  recycleWorld(state);
  checkFall(state);
}

export function resolvePlayerBounds(state: GameState): void {
  const player = state.player;
  if (player.x < 0) {
    player.x = 0;
    player.vx = Math.max(0, player.vx);
  }

  if (player.x + player.width > GAME_WIDTH) {
    player.x = GAME_WIDTH - player.width;
    player.vx = Math.min(0, player.vx);
  }
}

export function resolvePlatformCollisions(state: GameState): void {
  const player = state.player;
  if (player.vy < 0) {
    return;
  }

  const footY = player.y + player.height;
  const previousFootY = player.previousY + player.height;

  for (const platform of state.platforms) {
    if (platform.kind === "cracked" && platform.touched) {
      continue;
    }

    const overlapsX = player.x + player.width * 0.76 > platform.x && player.x + player.width * 0.24 < platform.x + platform.width;
    const crossesTop = previousFootY <= platform.y + 8 && footY >= platform.y;

    if (overlapsX && crossesTop) {
      player.y = platform.y - player.height;
      player.vy = player.springTimer > 0 || platform.kind === "cushion" ? SPRING_JUMP : BASE_JUMP;
      platform.touched = true;
      state.lastSafePlatform = platform.kind === "cracked" ? state.lastSafePlatform : platform;
      break;
    }
  }
}

export function resolveCollectibles(state: GameState): void {
  const player = state.player;
  for (const collectible of state.collectibles) {
    if (collectible.collected) {
      continue;
    }

    const hit =
      player.x < collectible.x + 34 &&
      player.x + player.width > collectible.x &&
      player.y < collectible.y + 34 &&
      player.y + player.height > collectible.y;

    if (!hit) {
      continue;
    }

    collectible.collected = true;
    state.score += 95;

    if (collectible.kind === "food") {
      player.lives = Math.min(MAX_FOOD_LIVES, player.lives + 1);
    }
    if (collectible.kind === "yarn") {
      player.springTimer = 8;
      player.vy = Math.min(player.vy, SPRING_JUMP);
    }
    if (collectible.kind === "feather") {
      player.controlTimer = 9;
    }
    if (collectible.kind === "bell") {
      player.shieldTimer = 7;
    }
  }
}

export function updateCamera(state: GameState): void {
  const target = state.player.y - GAME_HEIGHT * 0.38;
  if (target < state.cameraY) {
    state.cameraY += (target - state.cameraY) * 0.12;
  }

  state.score = Math.max(state.score, Math.floor(Math.max(0, -state.cameraY)));
  if (state.score > state.highScore) {
    state.highScore = Math.floor(state.score);
    writeHighScore(state.highScore);
  }
}

export function checkFall(state: GameState): boolean {
  if (!isPlayerBelowFallLine(state)) {
    return false;
  }

  if (recoverFromFall(state)) {
    return true;
  }

  state.screen = "gameOver";
  return true;
}

export function isPlayerBelowFallLine(state: GameState): boolean {
  return state.player.y + state.player.height > state.cameraY + GAME_HEIGHT + FALL_RECOVERY_BUFFER;
}

export function recoverFromFall(state: GameState): boolean {
  const player = state.player;
  if (!state.lastSafePlatform || (player.lives <= 0 && player.shieldTimer <= 0)) {
    return false;
  }

  const usedShield = player.shieldTimer > 0;
  if (!usedShield) {
    player.lives -= 1;
  }

  const recoveryPlatform = chooseRecoveryPlatform(state, state.lastSafePlatform);
  respawnPlayerAbovePlatform(state, recoveryPlatform);
  player.shieldTimer = 1.4;
  return true;
}

export function chooseRecoveryPlatform(state: GameState, referencePlatform: Platform): Platform {
  const oneStepAbove = state.platforms
    .filter((platform) => platform.kind !== "cracked" && platform.y < referencePlatform.y - RESPAWN_PLATFORM_CLEARANCE)
    .sort((a, b) => b.y - a.y)[0];

  if (oneStepAbove) {
    return oneStepAbove;
  }

  return state.platforms.find((platform) => platform.id === referencePlatform.id && platform.kind !== "cracked") ?? referencePlatform;
}

export function respawnPlayerAbovePlatform(state: GameState, platform: Platform): void {
  const player = state.player;
  const targetY = platform.y - player.height - RESPAWN_DROP_HEIGHT;
  const visibleY = state.cameraY + RESPAWN_TOP_PADDING;
  const highestSafeY = platform.y - player.height - RESPAWN_PLATFORM_CLEARANCE;

  player.x = clamp(platform.x + platform.width / 2 - player.width / 2, 0, GAME_WIDTH - player.width);
  player.y = Math.min(Math.max(targetY, visibleY), highestSafeY);
  player.previousY = player.y;
  player.vx = 0;
  player.vy = RESPAWN_FALL_SPEED;
}
