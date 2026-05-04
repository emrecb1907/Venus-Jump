const WIDTH = 390;
const MAX_JUMP_HEIGHT = 150;
const PLAYER_WIDTH = 58;
const MAX_AIR_CONTROL_DISTANCE = 290;

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function platformWidth(score) {
  return Math.max(72, 106 - Math.floor(score / 900) * 4);
}

function nextPlatform(previous, index, score, random) {
  const width = platformWidth(score);
  const difficulty = Math.min(score / 6000, 1);
  const minGap = 70 + difficulty * 10;
  const maxGap = Math.min(MAX_JUMP_HEIGHT - 22, 108 + difficulty * 18);
  const verticalGap = minGap + random() * (maxGap - minGap);
  const maxHorizontal = Math.min(MAX_AIR_CONTROL_DISTANCE, 110 + difficulty * 60);
  const center = previous.x + previous.width / 2;
  const targetCenter = Math.max(
    width / 2 + 16,
    Math.min(WIDTH - width / 2 - 16, center + (random() * 2 - 1) * maxHorizontal)
  );
  return {
    id: index,
    x: targetCenter - width / 2,
    y: previous.y - verticalGap,
    width,
    height: 18
  };
}

function validate(seed) {
  const random = mulberry32(seed);
  const platforms = [{ id: 0, x: 142, y: 650, width: 116, height: 18 }];
  for (let i = 1; i < 180; i += 1) {
    platforms.push(nextPlatform(platforms[i - 1], i, i * 85, random));
  }

  for (let i = 1; i < platforms.length; i += 1) {
    const previous = platforms[i - 1];
    const current = platforms[i];
    const verticalGap = previous.y - current.y;
    const previousCenter = previous.x + previous.width / 2;
    const currentCenter = current.x + current.width / 2;
    const horizontalGap = Math.abs(previousCenter - currentCenter);
    const reachableWidthBonus = previous.width / 2 + current.width / 2 + PLAYER_WIDTH;

    if (verticalGap > MAX_JUMP_HEIGHT - 16) {
      throw new Error(`Vertical gap too large at ${i}: ${verticalGap.toFixed(2)}`);
    }

    if (horizontalGap > MAX_AIR_CONTROL_DISTANCE + reachableWidthBonus) {
      throw new Error(`Horizontal gap too large at ${i}: ${horizontalGap.toFixed(2)}`);
    }
  }
}

for (let seed = 1; seed <= 120; seed += 1) {
  validate(seed);
}

console.log("Platform reachability checks passed for 120 deterministic seeds.");
