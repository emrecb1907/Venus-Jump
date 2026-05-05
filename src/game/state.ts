import { BASE_JUMP, GAME_HEIGHT, GAME_WIDTH, PLAYER_WIDTH } from "./constants";
import { mulberry32 } from "./random";
import { readHighScore } from "./storage";
import type { GameState, Player } from "./types";

export function createPlayer(): Player {
  return {
    x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2,
    y: GAME_HEIGHT - 160,
    previousY: GAME_HEIGHT - 160,
    width: PLAYER_WIDTH,
    height: 62,
    vx: 0,
    vy: BASE_JUMP,
    facing: 1,
    lives: 0,
    shieldTimer: 0,
    controlTimer: 0,
    springTimer: 0
  };
}

export function createGameState(): GameState {
  return {
    screen: "menu",
    inputDirection: 0,
    cameraY: 0,
    score: 0,
    highScore: readHighScore(),
    platformId: 1,
    collectibleId: 1,
    rng: mulberry32(Date.now()),
    platforms: [],
    collectibles: [],
    lastSafePlatform: undefined,
    player: createPlayer(),
    debugMode: new URLSearchParams(window.location.search).has("debug")
  };
}
