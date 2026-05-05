export type Screen = "menu" | "playing" | "paused" | "controls" | "about" | "gameOver";
export type PlatformKind = "normal" | "cushion" | "cracked" | "moving";
export type CollectibleKind = "food" | "yarn" | "feather" | "bell";

export type Platform = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: PlatformKind;
  direction: number;
  speed: number;
  touched: boolean;
};

export type Collectible = {
  id: number;
  x: number;
  y: number;
  kind: CollectibleKind;
  collected: boolean;
};

export type Player = {
  x: number;
  y: number;
  previousY: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  facing: -1 | 1;
  lives: number;
  shieldTimer: number;
  controlTimer: number;
  springTimer: number;
};

export type GameState = {
  screen: Screen;
  inputDirection: number;
  cameraY: number;
  score: number;
  highScore: number;
  platformId: number;
  collectibleId: number;
  rng: () => number;
  platforms: Platform[];
  collectibles: Collectible[];
  lastSafePlatform: Platform | undefined;
  player: Player;
  debugMode: boolean;
};

export type GameAssets = {
  roomImages: HTMLImageElement[];
  platformImages: Record<PlatformKind, HTMLImageElement>;
  collectibleImages: Record<CollectibleKind, HTMLImageElement>;
  playerImages: {
    jumpRight: HTMLImageElement;
    jumpLeft: HTMLImageElement;
    fallRight: HTMLImageElement;
    fallLeft: HTMLImageElement;
    idle: HTMLImageElement[];
  };
};
