import type { CollectibleKind, GameAssets, PlatformKind } from "./types";

const assetRoot = "/assets";

function loadImage(src: string): HTMLImageElement {
  const image = new Image();
  image.src = src;
  return image;
}

export function loadGameAssets(): GameAssets {
  return {
    roomImages: [
      loadImage(`${assetRoot}/rooms/bedroom.png`),
      loadImage(`${assetRoot}/rooms/city-passage.png`),
      loadImage(`${assetRoot}/rooms/sunroom.png`),
      loadImage(`${assetRoot}/rooms/city-courtyard.png`),
      loadImage(`${assetRoot}/rooms/attic.png`),
      loadImage(`${assetRoot}/rooms/city-backstreet.png`)
    ],
    platformImages: {
      normal: loadImage(`${assetRoot}/platforms/normal-shelf.png`),
      cushion: loadImage(`${assetRoot}/platforms/bouncy-cushion.png`),
      cracked: loadImage(`${assetRoot}/platforms/cracked-shelf.png`),
      moving: loadImage(`${assetRoot}/platforms/moving-shelf.png`)
    } satisfies Record<PlatformKind, HTMLImageElement>,
    collectibleImages: {
      food: loadImage(`${assetRoot}/collectibles/cat-food.png`),
      yarn: loadImage(`${assetRoot}/collectibles/yarn-ball.png`),
      feather: loadImage(`${assetRoot}/collectibles/feather.png`),
      bell: loadImage(`${assetRoot}/collectibles/gold-bell.png`)
    } satisfies Record<CollectibleKind, HTMLImageElement>,
    playerImages: {
      jumpRight: loadImage(`${assetRoot}/player/jump-right.png`),
      jumpLeft: loadImage(`${assetRoot}/player/jump-left.png`),
      fallRight: loadImage(`${assetRoot}/player/fall-right.png`),
      fallLeft: loadImage(`${assetRoot}/player/fall-left.png`),
      idle: [
        loadImage(`${assetRoot}/player/idle/idle-01.png`),
        loadImage(`${assetRoot}/player/idle/idle-02.png`),
        loadImage(`${assetRoot}/player/idle/idle-03.png`)
      ]
    }
  };
}
