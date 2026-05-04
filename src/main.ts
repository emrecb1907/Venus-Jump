import "./styles/app.css";

type Screen = "menu" | "playing" | "paused" | "controls" | "about" | "gameOver";
type PlatformKind = "normal" | "cushion" | "cracked" | "moving";
type CollectibleKind = "food" | "yarn" | "feather" | "bell";

type Platform = {
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

type Collectible = {
  id: number;
  x: number;
  y: number;
  kind: CollectibleKind;
  collected: boolean;
};

type Player = {
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

const GAME_WIDTH = 390;
const GAME_HEIGHT = 720;
const GRAVITY = 980;
const BASE_JUMP = -545;
const SPRING_JUMP = -700;
const MOVE_ACCEL = 2350;
const AIR_DRAG = 0.88;
const MAX_SPEED = 250;
const MAX_CONTROL_SPEED = 320;
const STORAGE_KEY = "venusJump.highScore.v1";
const PLAYER_WIDTH = 58;
const MAX_JUMP_HEIGHT = 150;
const MAX_AIR_CONTROL_DISTANCE = 290;
const ROOM_SCORE_SPAN = 1500;
const ROOM_TRANSITION_START = 0.84;
const COLLECTIBLE_DRAW_SIZE = 62;
const PLATFORM_SIDE_PADDING = 28;
const MOVING_PLATFORM_DRAW_HEIGHT = 60;
const MOVING_PLATFORM_DRAW_WIDTH = 160;

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found");
}

app.innerHTML = `
  <main class="shell">
    <section class="game-frame" aria-label="Venus Jump oyun alanı">
      <canvas width="${GAME_WIDTH}" height="${GAME_HEIGHT}" data-testid="game-canvas" aria-label="Venus Jump canvas"></canvas>
      <div class="hud" aria-live="polite">
        <div class="hud-group">
          <div class="pill" data-testid="score">Skor 0</div>
          <div class="pill" data-testid="highscore">Rekor 0</div>
        </div>
        <div class="hud-group">
          <div class="pill" data-testid="lives">Mama 0</div>
          <div class="pill" data-testid="bonus">Bonus yok</div>
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

const canvasNode = document.querySelector<HTMLCanvasElement>("[data-testid='game-canvas']");
const overlayNode = document.querySelector<HTMLDivElement>("[data-testid='menu-overlay']");
const scoreNodeElement = document.querySelector<HTMLDivElement>("[data-testid='score']");
const highScoreNodeElement = document.querySelector<HTMLDivElement>("[data-testid='highscore']");
const livesNodeElement = document.querySelector<HTMLDivElement>("[data-testid='lives']");
const bonusNodeElement = document.querySelector<HTMLDivElement>("[data-testid='bonus']");
const hudNodeElement = document.querySelector<HTMLDivElement>(".hud");
const debugPanel = document.querySelector<HTMLDivElement>("[data-testid='debug-panel']");
const debugOutput = document.querySelector<HTMLPreElement>("[data-testid='debug-output']");

if (!canvasNode || !overlayNode || !scoreNodeElement || !highScoreNodeElement || !livesNodeElement || !bonusNodeElement || !hudNodeElement) {
  throw new Error("Required UI nodes are missing");
}

const canvas = canvasNode;
const overlay = overlayNode;
const scoreNode = scoreNodeElement;
const highScoreNode = highScoreNodeElement;
const livesNode = livesNodeElement;
const bonusNode = bonusNodeElement;
const hudNode = hudNodeElement;

const canvasContext = canvas.getContext("2d");

if (!canvasContext) {
  throw new Error("Canvas 2D context is unavailable");
}

const ctx = canvasContext;

ctx.imageSmoothingEnabled = false;

const assetRoot = "/assets";
const roomImages = [
  loadImage(`${assetRoot}/rooms/bedroom.png`),
  loadImage(`${assetRoot}/rooms/sunroom.png`),
  loadImage(`${assetRoot}/rooms/attic.png`)
];

const platformImages = {
  normal: loadImage(`${assetRoot}/platforms/normal-shelf.png`),
  cushion: loadImage(`${assetRoot}/platforms/bouncy-cushion.png`),
  cracked: loadImage(`${assetRoot}/platforms/cracked-shelf.png`),
  moving: loadImage(`${assetRoot}/platforms/moving-shelf.png`)
} satisfies Record<PlatformKind, HTMLImageElement>;

const collectibleImages = {
  food: loadImage(`${assetRoot}/collectibles/cat-food.png`),
  yarn: loadImage(`${assetRoot}/collectibles/yarn-ball.png`),
  feather: loadImage(`${assetRoot}/collectibles/feather.png`),
  bell: loadImage(`${assetRoot}/collectibles/gold-bell.png`)
} satisfies Record<CollectibleKind, HTMLImageElement>;

const playerImages = {
  jumpRight: loadImage(`${assetRoot}/player/jump-right.png`),
  jumpLeft: loadImage(`${assetRoot}/player/jump-left.png`),
  fallRight: loadImage(`${assetRoot}/player/fall-right.png`),
  fallLeft: loadImage(`${assetRoot}/player/fall-left.png`),
  idle: [
    loadImage(`${assetRoot}/player/idle/idle-01.png`),
    loadImage(`${assetRoot}/player/idle/idle-02.png`),
    loadImage(`${assetRoot}/player/idle/idle-03.png`)
  ]
};

let screen: Screen = "menu";
let inputDirection = 0;
let touchStartX = 0;
let touchStartY = 0;
let pointerStartX = 0;
let pointerStartY = 0;
let pointerActive = false;
let lastTime = performance.now();
let cameraY = 0;
let score = 0;
let highScore = readHighScore();
let platformId = 1;
let collectibleId = 1;
let rng = mulberry32(Date.now());
let platforms: Platform[] = [];
let collectibles: Collectible[] = [];
let lastSafePlatform: Platform | undefined;
let player: Player = createPlayer();
let debugMode = new URLSearchParams(window.location.search).has("debug");

if (debugPanel && debugMode) {
  debugPanel.dataset.visible = "true";
}

function loadImage(src: string): HTMLImageElement {
  const image = new Image();
  image.src = src;
  return image;
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createPlayer(): Player {
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

function platformWidth(currentScore: number): number {
  return Math.max(72, 106 - Math.floor(currentScore / 900) * 4);
}

function createPlatform(x: number, y: number, width: number, kind: PlatformKind = "normal"): Platform {
  return {
    id: platformId++,
    x,
    y,
    width,
    height: 18,
    kind,
    direction: rng() > 0.5 ? 1 : -1,
    speed: kind === "moving" ? 36 + rng() * 28 : 0,
    touched: false
  };
}

function createNextPlatform(previous: Platform, index: number, currentScore: number, random = rng): Platform {
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
  const nextDelta = clamp(centerPull + jitter, -maxHorizontal, maxHorizontal);
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
  return createPlatform(targetCenter - width / 2, previous.y - verticalGap, width, kind);
}

function maybeCreateCollectible(platform: Platform, index: number, random = rng): Collectible | undefined {
  if (index < 4 || random() > 0.24) {
    return undefined;
  }

  const roll = random();
  const kind: CollectibleKind = roll > 0.82 ? "food" : roll > 0.58 ? "bell" : roll > 0.3 ? "yarn" : "feather";
  return {
    id: collectibleId++,
    kind,
    x: platform.x + platform.width / 2 - 18,
    y: platform.y - 70,
    collected: false
  };
}

function seedWorld(): void {
  platformId = 1;
  collectibleId = 1;
  cameraY = 0;
  score = 0;
  rng = mulberry32(Date.now());
  player = createPlayer();
  platforms = [createPlatform(GAME_WIDTH / 2 - 58, GAME_HEIGHT - 82, 116, "normal")];
  lastSafePlatform = platforms[0];

  for (let i = 1; i < 16; i += 1) {
    const platform = createNextPlatform(platforms[i - 1], i, i * 85);
    platforms.push(platform);
    const collectible = maybeCreateCollectible(platform, i);
    if (collectible) {
      collectibles.push(collectible);
    }
  }
}

function startGame(): void {
  seedWorld();
  screen = "playing";
  updateOverlay();
}

function goToMenu(): void {
  screen = "menu";
  updateOverlay();
}

function showInfo(kind: "controls" | "about"): void {
  screen = kind;
  updateOverlay();
}

function updateOverlay(): void {
  const isVisible = screen !== "playing" && screen !== "paused";
  overlay.dataset.visible = String(isVisible);
  hudNode.dataset.visible = String(screen === "playing" || screen === "paused");

  if (screen === "menu") {
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

  if (screen === "controls") {
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

  if (screen === "about") {
    overlay.innerHTML = `
      <div class="screen screen--wide pixel-panel">
        <h1 class="screen-title">Hakkında</h1>
        <p class="screen-copy">Venus Jump, mavi gözlü minik Venus'un mama, oyuncak ve altın ziller toplayarak yukarı tırmandığı tatlı bir arcade oyunu.</p>
        <button class="menu-button" type="button" data-testid="back-button">Geri</button>
      </div>
    `;
  }

  if (screen === "gameOver") {
    overlay.innerHTML = `
      <div class="screen pixel-panel">
        <h1 class="screen-title">Venus biraz dinleniyor</h1>
        <p class="screen-copy" data-testid="final-score">Skor ${Math.floor(score)} · Rekor ${highScore}</p>
        <div class="game-over-cat" aria-label="Dinlenen Venus"></div>
        <button class="menu-button" type="button" data-testid="restart-button">Tekrar Oyna</button>
        <button class="menu-button menu-button--secondary" type="button" data-testid="menu-button">Menü</button>
      </div>
    `;
  }

  wireMenuButtons();
}

function wireMenuButtons(): void {
  overlay.querySelector<HTMLButtonElement>("[data-testid='start-button']")?.addEventListener("click", startGame);
  overlay.querySelector<HTMLButtonElement>("[data-testid='restart-button']")?.addEventListener("click", startGame);
  overlay.querySelector<HTMLButtonElement>("[data-testid='controls-button']")?.addEventListener("click", () => showInfo("controls"));
  overlay.querySelector<HTMLButtonElement>("[data-testid='about-button']")?.addEventListener("click", () => showInfo("about"));
  overlay.querySelector<HTMLButtonElement>("[data-testid='back-button']")?.addEventListener("click", goToMenu);
  overlay.querySelector<HTMLButtonElement>("[data-testid='menu-button']")?.addEventListener("click", goToMenu);
}

function update(dt: number): void {
  if (screen !== "playing") {
    return;
  }

  const controlMultiplier = player.controlTimer > 0 ? 1.28 : 1;
  const maxSpeed = player.controlTimer > 0 ? MAX_CONTROL_SPEED : MAX_SPEED;
  player.vx += inputDirection * MOVE_ACCEL * controlMultiplier * dt;
  player.vx *= Math.pow(AIR_DRAG, dt * 60);
  player.vx = clamp(player.vx, -maxSpeed, maxSpeed);
  player.vy += GRAVITY * dt;
  player.previousY = player.y;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  if (inputDirection !== 0) {
    player.facing = inputDirection > 0 ? 1 : -1;
  }

  if (player.x + player.width < 0) {
    player.x = GAME_WIDTH;
  } else if (player.x > GAME_WIDTH) {
    player.x = -player.width;
  }

  player.shieldTimer = Math.max(0, player.shieldTimer - dt);
  player.controlTimer = Math.max(0, player.controlTimer - dt);
  player.springTimer = Math.max(0, player.springTimer - dt);

  updatePlatforms(dt);
  resolvePlatformCollisions();
  resolveCollectibles();
  updateCamera();
  recycleWorld();
  checkFall();
  updateHud();
}

function updatePlatforms(dt: number): void {
  for (const platform of platforms) {
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

function resolvePlatformCollisions(): void {
  if (player.vy < 0) {
    return;
  }

  const footY = player.y + player.height;
  const previousFootY = player.previousY + player.height;

  for (const platform of platforms) {
    if (platform.kind === "cracked" && platform.touched) {
      continue;
    }

    const overlapsX = player.x + player.width * 0.76 > platform.x && player.x + player.width * 0.24 < platform.x + platform.width;
    const crossesTop = previousFootY <= platform.y + 8 && footY >= platform.y;

    if (overlapsX && crossesTop) {
      player.y = platform.y - player.height;
      player.vy = player.springTimer > 0 || platform.kind === "cushion" ? SPRING_JUMP : BASE_JUMP;
      platform.touched = true;
      lastSafePlatform = platform.kind === "cracked" ? lastSafePlatform : platform;
      break;
    }
  }
}

function resolveCollectibles(): void {
  for (const collectible of collectibles) {
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
    score += 95;

    if (collectible.kind === "food") {
      player.lives = Math.min(3, player.lives + 1);
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

function updateCamera(): void {
  const target = player.y - GAME_HEIGHT * 0.38;
  if (target < cameraY) {
    cameraY += (target - cameraY) * 0.12;
  }

  score = Math.max(score, Math.floor(Math.max(0, -cameraY)));
  if (score > highScore) {
    highScore = Math.floor(score);
    localStorage.setItem(STORAGE_KEY, String(highScore));
  }
}

function recycleWorld(): void {
  const bottom = cameraY + GAME_HEIGHT + 90;
  platforms = platforms.filter((platform) => platform.y < bottom && !(platform.kind === "cracked" && platform.touched && platform.y > cameraY + 120));
  collectibles = collectibles.filter((collectible) => !collectible.collected && collectible.y < bottom);

  let topPlatform = platforms.reduce((top, platform) => (platform.y < top.y ? platform : top), platforms[0]);
  while (topPlatform.y > cameraY - 120) {
    const next = createNextPlatform(topPlatform, platformId, score);
    platforms.push(next);
    const collectible = maybeCreateCollectible(next, platformId);
    if (collectible) {
      collectibles.push(collectible);
    }
    topPlatform = next;
  }
}

function checkFall(): void {
  if (player.y < cameraY + GAME_HEIGHT + 80) {
    return;
  }

  if ((player.lives > 0 || player.shieldTimer > 0) && lastSafePlatform) {
    if (player.lives > 0) {
      player.lives -= 1;
    }
    player.x = clamp(lastSafePlatform.x + lastSafePlatform.width / 2 - player.width / 2, 0, GAME_WIDTH - player.width);
    player.y = lastSafePlatform.y - player.height - 8;
    player.previousY = player.y;
    player.vx = 0;
    player.vy = BASE_JUMP;
    player.shieldTimer = Math.max(player.shieldTimer, 1.4);
    return;
  }

  screen = "gameOver";
  updateOverlay();
}

function draw(): void {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  drawBackground();

  if (screen === "menu" || screen === "controls" || screen === "about") {
    drawMenuBackdrop();
    return;
  }

  drawPlatforms();
  drawCollectibles();
  if (screen !== "gameOver") {
    drawPlayer();
  }
}

function drawBackground(): void {
  const cycle = Math.max(0, score) / ROOM_SCORE_SPAN;
  const currentIndex = Math.floor(cycle) % roomImages.length;
  const nextIndex = (currentIndex + 1) % roomImages.length;
  const cycleProgress = cycle - Math.floor(cycle);
  const transitionAmount = cycleProgress <= ROOM_TRANSITION_START ? 0 : (cycleProgress - ROOM_TRANSITION_START) / (1 - ROOM_TRANSITION_START);
  const current = roomImages[currentIndex];
  const next = roomImages[nextIndex];

  if (current.complete && current.naturalWidth > 0) {
    const transitionY = Math.round(transitionAmount * GAME_HEIGHT);
    drawRoomImage(current, 0.5, transitionY);
    if (transitionAmount > 0 && next.complete && next.naturalWidth > 0) {
      drawRoomImage(next, 0.5, transitionY - GAME_HEIGHT);
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

function drawRoomImage(image: HTMLImageElement, pan: number, dy: number): void {
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

function drawMenuBackdrop(): void {
  ctx.fillStyle = "rgba(3, 8, 22, 0.34)";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawPlatforms(): void {
  for (const platform of platforms) {
    const y = platform.y - cameraY;
    if (y < -70 || y > GAME_HEIGHT + 70) {
      continue;
    }

    const isSoftPlatform = platform.kind === "cushion" || platform.kind === "cracked";
    const platformHeight = isSoftPlatform ? 70 : MOVING_PLATFORM_DRAW_HEIGHT;
    const platformY = isSoftPlatform ? y - 31 : y - 24;
    const platformWidth = platform.kind === "moving" ? MOVING_PLATFORM_DRAW_WIDTH : platform.width + 16;
    const platformX = platform.kind === "moving" ? platform.x + platform.width / 2 - platformWidth / 2 : platform.x - 8;
    drawPlatformShadow(platformX, platformY + platformHeight - 14, platformWidth, 18);
    drawImageAsset(platformImages[platform.kind], platformX, platformY, platformWidth, platformHeight);
  }
}

function drawPlatformShadow(dx: number, dy: number, dw: number, dh: number): void {
  ctx.save();
  ctx.fillStyle = "rgba(7, 9, 18, 0.36)";
  ctx.beginPath();
  ctx.ellipse(dx + dw / 2, dy + dh / 2, dw * 0.46, dh * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCollectibles(): void {
  for (const collectible of collectibles) {
    const y = collectible.y - cameraY;
    if (y < -80 || y > GAME_HEIGHT + 80) {
      continue;
    }

    const drawX = collectible.x + 18 - COLLECTIBLE_DRAW_SIZE / 2;
    const drawY = y + 18 - COLLECTIBLE_DRAW_SIZE / 2;
    drawImageAsset(collectibleImages[collectible.kind], drawX, drawY, COLLECTIBLE_DRAW_SIZE, COLLECTIBLE_DRAW_SIZE);
  }
}

function drawPlayer(): void {
  const y = player.y - cameraY;

  if (screen === "playing") {
    const isFalling = player.vy > 120;
    const image = isFalling
      ? player.facing > 0
        ? playerImages.fallRight
        : playerImages.fallLeft
      : player.facing > 0
        ? playerImages.jumpRight
        : playerImages.jumpLeft;
    const breathe = Math.sin(performance.now() / 130) * 1.5;
    const drawSize = isFalling ? 148 : 154;
    const drawX = player.x + player.width / 2 - drawSize / 2;
    const drawY = y + player.height / 2 - drawSize * 0.58 + breathe;
    const safeDrawX = clamp(drawX, 0, GAME_WIDTH - drawSize);
    drawImageAsset(image, safeDrawX, drawY, drawSize, drawSize);
    drawShield(y);
    return;
  }

  const frame = playerImages.idle[Math.floor(performance.now() / 110) % playerImages.idle.length];
  const idleSize = 126;
  drawMirroredImageAsset(frame, player.x + player.width / 2 - idleSize / 2, y - 40, idleSize, idleSize, player.facing, "#d9bd83");

  drawShield(y);
}

function drawShield(y: number): void {
  if (player.shieldTimer > 0) {
    ctx.strokeStyle = "rgba(255, 209, 92, 0.82)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(player.x + player.width / 2, y + player.height / 2, 46, 50, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawMirroredImageAsset(image: HTMLImageElement, dx: number, dy: number, dw: number, dh: number, facing: -1 | 1, fallbackStyle = "#ffd15c"): void {
  ctx.save();
  if (facing < 0) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    drawImageAsset(image, 0, 0, dw, dh, fallbackStyle);
  } else {
    drawImageAsset(image, dx, dy, dw, dh, fallbackStyle);
  }
  ctx.restore();
}

function drawImageAsset(image: HTMLImageElement, dx: number, dy: number, dw: number, dh: number, fallbackStyle = "#ffd15c"): void {
  if (!image.complete || image.naturalWidth === 0) {
    ctx.fillStyle = fallbackStyle;
    ctx.fillRect(dx, dy, dw, dh);
    return;
  }

  ctx.drawImage(image, dx, dy, dw, dh);
}

function updateHud(): void {
  scoreNode.textContent = `Skor ${Math.floor(score)}`;
  highScoreNode.textContent = `Rekor ${highScore}`;
  livesNode.textContent = `Mama ${player.lives}`;

  const active = [
    player.springTimer > 0 ? "Yün" : "",
    player.controlTimer > 0 ? "Tüy" : "",
    player.shieldTimer > 0 ? "Zil" : ""
  ].filter(Boolean);
  bonusNode.textContent = active.length > 0 ? active.join(" + ") : "Bonus yok";
}

function readHighScore(): number {
  const stored = Number(localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(stored) && stored > 0 ? Math.floor(stored) : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function gameLoop(now: number): void {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

function validateGenerator(seed = 42): string {
  const random = mulberry32(seed);
  const generated: Platform[] = [{ id: 0, x: 142, y: 650, width: 116, height: 18, kind: "normal", direction: 1, speed: 0, touched: false }];

  for (let i = 1; i < 180; i += 1) {
    generated.push(createNextPlatformForTest(generated[i - 1], i, i * 85, random));
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

function createNextPlatformForTest(previous: Platform, index: number, currentScore: number, random: () => number): Platform {
  const originalRng = rng;
  rng = random;
  const platform = createNextPlatform(previous, index, currentScore, random);
  rng = originalRng;
  return platform;
}

function runBonusSelfTest(): string {
  seedWorld();
  player.lives = 0;
  player.shieldTimer = 0;
  player.controlTimer = 0;
  player.springTimer = 0;
  const samples: CollectibleKind[] = ["food", "yarn", "feather", "bell"];

  for (const kind of samples) {
    const collectible: Collectible = {
      id: collectibleId++,
      x: player.x + 10,
      y: player.y + 10,
      kind,
      collected: false
    };
    collectibles = [collectible];
    resolveCollectibles();
  }

  const ok = player.lives === 1 && player.springTimer > 0 && player.controlTimer > 0 && player.shieldTimer > 0;
  if (!ok) {
    throw new Error("Bonus etkileri beklenen duruma geçmedi.");
  }
  return `OK bonuslar: mama=${player.lives}, yün=${player.springTimer.toFixed(1)}, tüy=${player.controlTimer.toFixed(1)}, zil=${player.shieldTimer.toFixed(1)}`;
}

function runHighScoreSelfTest(): string {
  const previous = localStorage.getItem(STORAGE_KEY);
  localStorage.setItem(STORAGE_KEY, "3210");
  highScore = readHighScore();
  const ok = highScore === 3210;
  if (previous === null) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, previous);
  }
  highScore = readHighScore();

  if (!ok) {
    throw new Error("Highscore localStorage okuma testi başarısız.");
  }
  return "OK highscore localStorage okunuyor ve geri yükleniyor.";
}

function setDebugOutput(message: string): void {
  if (debugOutput) {
    debugOutput.textContent = message;
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    inputDirection = -1;
  }
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    inputDirection = 1;
  }
  if (event.key === "Escape" && screen === "playing") {
    screen = "paused";
  }
});

document.addEventListener("keyup", (event) => {
  const leftReleased = event.key === "ArrowLeft" || event.key.toLowerCase() === "a";
  const rightReleased = event.key === "ArrowRight" || event.key.toLowerCase() === "d";
  if ((leftReleased && inputDirection < 0) || (rightReleased && inputDirection > 0)) {
    inputDirection = 0;
  }
});

canvas.addEventListener(
  "touchstart",
  (event) => {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  },
  { passive: true }
);

canvas.addEventListener(
  "touchmove",
  (event) => {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    if (Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy)) {
      inputDirection = dx > 0 ? 1 : -1;
    }
  },
  { passive: true }
);

canvas.addEventListener(
  "touchend",
  () => {
    inputDirection = 0;
  },
  { passive: true }
);

canvas.addEventListener("pointerdown", (event) => {
  pointerActive = true;
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!pointerActive) {
    return;
  }

  const dx = event.clientX - pointerStartX;
  const dy = event.clientY - pointerStartY;
  if (Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy)) {
    inputDirection = dx > 0 ? 1 : -1;
    if (debugMode) {
      setDebugOutput(`OK swipe ${inputDirection > 0 ? "sağ" : "sol"} algılandı.`);
    }
  }
});

canvas.addEventListener("pointerup", (event) => {
  pointerActive = false;
  inputDirection = 0;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
});

document.querySelector<HTMLButtonElement>("[data-testid='debug-generator']")?.addEventListener("click", () => {
  try {
    setDebugOutput(validateGenerator());
  } catch (error) {
    setDebugOutput(error instanceof Error ? error.message : String(error));
  }
});

document.querySelector<HTMLButtonElement>("[data-testid='debug-bonus']")?.addEventListener("click", () => {
  try {
    setDebugOutput(runBonusSelfTest());
  } catch (error) {
    setDebugOutput(error instanceof Error ? error.message : String(error));
  }
});

document.querySelector<HTMLButtonElement>("[data-testid='debug-highscore']")?.addEventListener("click", () => {
  try {
    setDebugOutput(runHighScoreSelfTest());
  } catch (error) {
    setDebugOutput(error instanceof Error ? error.message : String(error));
  }
});

document.querySelector<HTMLButtonElement>("[data-testid='debug-gameover']")?.addEventListener("click", () => {
  score = Math.max(score, 1305);
  screen = "gameOver";
  updateOverlay();
  updateHud();
  setDebugOutput("OK game over paneli gösteriliyor.");
});

document.querySelector<HTMLButtonElement>("[data-testid='debug-mobile']")?.addEventListener("click", () => {
  document.querySelector<HTMLElement>(".game-frame")?.style.setProperty("width", "390px");
  document.querySelector<HTMLElement>(".game-frame")?.style.setProperty("height", "720px");
  setDebugOutput("OK mobil dar görünüm simülasyonu aktif.");
});

updateOverlay();
updateHud();
seedWorld();
requestAnimationFrame(gameLoop);

declare global {
  interface Window {
    venusDebug?: {
      validateGenerator: () => string;
      runBonusSelfTest: () => string;
      runHighScoreSelfTest: () => string;
      startGame: () => void;
    };
  }
}

window.venusDebug = {
  validateGenerator,
  runBonusSelfTest,
  runHighScoreSelfTest,
  startGame
};
