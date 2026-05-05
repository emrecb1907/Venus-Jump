import {
  COLLECTIBLE_SPAWN_CHANCE,
  FOOD_COLLECTIBLE_CHANCE,
  GAME_HEIGHT,
  GAME_WIDTH,
  MAX_AIR_CONTROL_DISTANCE,
  MAX_FOOD_LIVES,
  MAX_JUMP_HEIGHT,
  PLATFORM_SIDE_PADDING
} from "./constants";
import { mulberry32 } from "./random";
import { createPlayer } from "./state";
import type { Collectible, CollectibleKind, GameState, Platform, PlatformKind } from "./types";
import { clamp } from "./utils";

export function platformWidth(currentScore: number): number {
  return Math.max(72, 106 - Math.floor(currentScore / 900) * 4);
}

export function createPlatform(state: GameState, x: number, y: number, width: number, kind: PlatformKind = "normal"): Platform {
  return {
    id: state.platformId++,
    x,
    y,
    width,
    height: 18,
    kind,
    direction: state.rng() > 0.5 ? 1 : -1,
    speed: kind === "moving" ? 36 + state.rng() * 28 : 0,
    touched: false
  };
}

export function createNextPlatform(state: GameState, previous: Platform, index: number, currentScore: number, random = state.rng): Platform {
  const width = platformWidth(currentScore);
  const difficulty = Math.min(currentScore / 6000, 1);
  const minGap = 70 + difficulty * 10;
  const maxGap = Math.min(MAX_JUMP_HEIGHT - 22, 108 + difficulty * 18);
  const verticalGap = minGap + random() * (maxGap - minGap);
  const maxHorizontal = Math.min(MAX_AIR_CONTROL_DISTANCE, 110 + difficulty * 60);
  const center = previous.x + previous.width / 2;
  const roomSweep = Math.sin((index + currentScore / 180) * 0.72);
  const roomTarget = GAME_WIDTH / 2 + roomSweep * GAME_WIDTH * 0.28;
  const centerPull = (roomTarget - center) * (0.18 + difficulty * 0.1);
  const jitter = (random() * 2 - 1) * maxHorizontal * 0.68;
  const minHorizontalShift = 34 + difficulty * 34;
  let nextDelta = clamp(centerPull + jitter, -maxHorizontal, maxHorizontal);
  if (Math.abs(nextDelta) < minHorizontalShift) {
    const inwardDirection = center < GAME_WIDTH * 0.38 ? 1 : center > GAME_WIDTH * 0.62 ? -1 : random() > 0.5 ? 1 : -1;
    nextDelta = inwardDirection * minHorizontalShift;
  }
  const targetCenter = clamp(
    center + nextDelta,
    width / 2 + PLATFORM_SIDE_PADDING,
    GAME_WIDTH - width / 2 - PLATFORM_SIDE_PADDING
  );
  const kindRoll = random();
  const kind: PlatformKind =
    index < 6
      ? "normal"
      : kindRoll > 0.88
        ? "moving"
        : kindRoll > 0.78
          ? "cracked"
          : kindRoll > 0.58
            ? "cushion"
            : "normal";
  return createPlatform(state, targetCenter - width / 2, previous.y - verticalGap, width, kind);
}

export function maybeCreateCollectible(
  state: GameState,
  platform: Platform,
  index: number,
  random = state.rng
): Collectible | undefined {
  if (index < 4 || random() > COLLECTIBLE_SPAWN_CHANCE) {
    return undefined;
  }

  const kind = chooseCollectibleKind(state, random);
  return {
    id: state.collectibleId++,
    kind,
    x: platform.x + platform.width / 2 - 18,
    y: platform.y - 70,
    collected: false
  };
}

export function chooseCollectibleKind(state: GameState, random = state.rng): CollectibleKind {
  if (canSpawnFoodCollectible(state) && random() < FOOD_COLLECTIBLE_CHANCE) {
    return "food";
  }

  const roll = random();
  return roll > 0.66 ? "bell" : roll > 0.33 ? "yarn" : "feather";
}

export function canSpawnFoodCollectible(state: GameState): boolean {
  const activeFoodCount = state.collectibles.filter((collectible) => !collectible.collected && collectible.kind === "food").length;
  return state.player.lives + activeFoodCount < MAX_FOOD_LIVES;
}

export function seedWorld(state: GameState): void {
  state.platformId = 1;
  state.collectibleId = 1;
  state.cameraY = 0;
  state.score = 0;
  state.rng = mulberry32(Date.now());
  state.player = createPlayer();
  state.collectibles = [];
  state.platforms = [createPlatform(state, GAME_WIDTH / 2 - 58, GAME_HEIGHT - 82, 116, "normal")];
  state.lastSafePlatform = state.platforms[0];

  for (let i = 1; i < 16; i += 1) {
    const platform = createNextPlatform(state, state.platforms[i - 1], i, i * 85);
    state.platforms.push(platform);
    const collectible = maybeCreateCollectible(state, platform, i);
    if (collectible) {
      state.collectibles.push(collectible);
    }
  }
}

export function updatePlatforms(state: GameState, dt: number): void {
  for (const platform of state.platforms) {
    if (platform.kind !== "moving") {
      continue;
    }

    platform.x += platform.direction * platform.speed * dt;
    if (platform.x < PLATFORM_SIDE_PADDING) {
      platform.x = PLATFORM_SIDE_PADDING;
      platform.direction = 1;
    }
    if (platform.x + platform.width > GAME_WIDTH - PLATFORM_SIDE_PADDING) {
      platform.x = GAME_WIDTH - PLATFORM_SIDE_PADDING - platform.width;
      platform.direction = -1;
    }
  }
}

export function recycleWorld(state: GameState): void {
  const bottom = state.cameraY + GAME_HEIGHT + 90;
  state.platforms = state.platforms.filter(
    (platform) => platform.y < bottom && !(platform.kind === "cracked" && platform.touched && platform.y > state.cameraY + 120)
  );
  state.collectibles = state.collectibles.filter((collectible) => !collectible.collected && collectible.y < bottom);

  let topPlatform = state.platforms.reduce((top, platform) => (platform.y < top.y ? platform : top), state.platforms[0]);
  while (topPlatform.y > state.cameraY - 120) {
    const next = createNextPlatform(state, topPlatform, state.platformId, state.score);
    state.platforms.push(next);
    const collectible = maybeCreateCollectible(state, next, state.platformId);
    if (collectible) {
      state.collectibles.push(collectible);
    }
    topPlatform = next;
  }
}
