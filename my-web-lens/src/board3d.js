// src/board3d.js
// PlayCanvas 3D Board & Tile Architecture for Color Flip
import * as pc from 'playcanvas';
import { getSwatchTexture, getEmblemTexture } from './textures.js';
import { LEVELS, SOLID_SWATCHES, GRADIENT_SWATCHES, GLOW_SWATCHES, SPLIT_SWATCHES } from './palette.js';

export class Board3D {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.app = null;
    this.cameraEntity = null;
    this.lightEntity = null;
    this.boardEntity = null;
    this.trayEntity = null;
    this.tiles = []; // 16 tile controllers
    this.activeLevelId = 1;
    this.activeSkinId = 0;
    this.bitmojiImage = null;
    this.isInputLocked = true;
    this.onTileTapped = null;

    // Camera target angles tuned for 9:16 portrait mobile
    this.cameraPresets = {
      preview: { pos: new pc.Vec3(0, 4.8, 3.6), rot: new pc.Vec3(-52, 0, 0) },
      play: { pos: new pc.Vec3(0, 6.4, 0.4), rot: new pc.Vec3(-86, 0, 0) },
    };
    this.currentCamMode = 'preview';

    this.initEngine();
  }

  initEngine() {
    this.app = new pc.Application(this.canvas, {
      elementInput: new pc.ElementInput(this.canvas),
    });

    // Expose devtools hook
    if (typeof window !== 'undefined') {
      window.pc = pc;
      window.app = this.app;
    }

    // Use FILLMODE_NONE so CSS controls canvas dimensions within #lens-stage
    this.app.setCanvasFillMode(pc.FILLMODE_NONE);
    this.app.setCanvasResolution(pc.RESOLUTION_AUTO);
    this.app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    const handleResize = () => {
      if (!this.app || !this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        this.app.resizeCanvas(rect.width, rect.height);
      }
    };

    window.addEventListener('resize', handleResize);
    requestAnimationFrame(handleResize);

    this.setupScene();
    this.setupInput();
    this.app.start();
  }

  setupScene() {
    const root = this.app.root;

    // 1. Camera with horizontal FOV for consistent mobile framing
    this.cameraEntity = new pc.Entity('MainCamera');
    this.cameraEntity.addComponent('camera', {
      clearColor: new pc.Color(0.08, 0.09, 0.12),
      horizontalFov: true,
      fov: 36,
      nearClip: 0.1,
      farClip: 100,
    });
    this.setCameraPreset('preview', 0); // instant
    root.addChild(this.cameraEntity);

    // Ambient scene lighting
    this.app.scene.ambientColor = new pc.Color(0.65, 0.65, 0.7);

    // 2. Directional Key Light
    this.lightEntity = new pc.Entity('KeyLight');
    this.lightEntity.addComponent('light', {
      type: 'directional',
      color: new pc.Color(1, 1, 1),
      intensity: 1.3,
      castShadows: false,
    });
    this.lightEntity.setEulerAngles(45, 30, 0);
    root.addChild(this.lightEntity);

    // 3. Fill Light (Soft upward bounce)
    const fillLight = new pc.Entity('FillLight');
    fillLight.addComponent('light', {
      type: 'directional',
      color: new pc.Color(0.8, 0.85, 1.0),
      intensity: 0.5,
      castShadows: false,
    });
    fillLight.setEulerAngles(-60, -120, 0);
    root.addChild(fillLight);

    // 4. Board Hierarchy Root
    this.boardEntity = new pc.Entity('BoardRoot');
    this.boardEntity.setLocalPosition(0, 0.15, 0);
    root.addChild(this.boardEntity);

    // 5. Tray Base (pedestal underneath tiles)
    this.trayEntity = new pc.Entity('TrayBase');
    this.trayEntity.addComponent('render', { type: 'box' });
    this.trayEntity.setLocalScale(3.9, 0.16, 3.9);
    this.trayEntity.setLocalPosition(0, -0.11, 0);
    this.boardEntity.addChild(this.trayEntity);

    // 6. Build 4x4 Tiles Grid (16 tiles)
    this.buildGrid();

    // 7. Apply initial Level 1 styling
    this.applyLevelStyle(1);

    // 8. Update loop for smooth camera and tile tweens
    this.app.on('update', (dt) => this.onUpdate(dt));
  }

  buildGrid() {
    // 4x4 Grid layout
    const tileSize = 0.72;
    const spacing = 0.86;
    const offsets = [-1.5 * spacing, -0.5 * spacing, 0.5 * spacing, 1.5 * spacing];

    this.tiles = [];

    let index = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const x = offsets[c];
        const z = offsets[r];

        const tileObj = this.createTileEntity(index, r, c, x, z, tileSize);
        this.boardEntity.addChild(tileObj.root);
        this.tiles.push(tileObj);
        index++;
      }
    }
  }

  createTileEntity(index, row, col, x, z, size) {
    const tileRoot = new pc.Entity(`Tile_${index}`);
    tileRoot.setLocalPosition(x, 0, z);

    // Main tile body box
    const body = new pc.Entity(`Body_${index}`);
    body.addComponent('render', { type: 'box' });
    body.setLocalScale(size, 0.12, size);
    tileRoot.addChild(body);

    // Emblem Face (Top: emblem when face-down at rotationX = 0)
    const emblemFace = new pc.Entity(`EmblemFace_${index}`);
    emblemFace.addComponent('render', { type: 'plane' });
    emblemFace.setLocalScale(size * 0.94, 1, size * 0.94);
    emblemFace.setLocalPosition(0, 0.062, 0);
    emblemFace.setLocalEulerAngles(0, 0, 0);
    tileRoot.addChild(emblemFace);

    // Swatch Face (Bottom when rotationX = 0, Top when flipped to rotationX = 180)
    const swatchFace = new pc.Entity(`SwatchFace_${index}`);
    swatchFace.addComponent('render', { type: 'plane' });
    swatchFace.setLocalScale(size * 0.94, 1, size * 0.94);
    swatchFace.setLocalPosition(0, -0.062, 0);
    swatchFace.setLocalEulerAngles(180, 0, 0);
    tileRoot.addChild(swatchFace);

    // Material holders
    const swatchMat = new pc.StandardMaterial();
    swatchMat.useMetalness = false;
    swatchMat.diffuse = new pc.Color(1, 1, 1);
    swatchMat.gloss = 0.85;
    swatchFace.render.meshInstances[0].material = swatchMat;

    const emblemMat = new pc.StandardMaterial();
    emblemMat.useMetalness = false;
    emblemMat.diffuse = new pc.Color(1, 1, 1);
    emblemMat.gloss = 0.8;
    emblemFace.render.meshInstances[0].material = emblemMat;

    const bodyMat = new pc.StandardMaterial();
    bodyMat.useMetalness = false;
    bodyMat.diffuse = new pc.Color(0.85, 0.88, 0.92);
    body.render.meshInstances[0].material = bodyMat;

    return {
      index,
      row,
      col,
      root: tileRoot,
      body,
      emblemFace,
      swatchFace,
      emblemMat,
      swatchMat,
      bodyMat,
      swatch: null,
      isFlipped: false,
      isMatched: false,
      rotationX: 180, // Face-up in lobby to showcase preview!
      targetRotX: 180,
      scaleY: 1,
      targetScaleY: 1,
      shakeAngle: 0,
    };
  }

  setupInput() {
    const onPointerDown = (event) => {
      if (this.isInputLocked) return;

      // Ignore clicks on UI elements like buttons and modals
      if (event.target && event.target.closest('button, .glass-card, .bottom-sheet-drawer, .flex-card-modal, .user-best-pill, .phase-banner-toast')) {
        return;
      }

      const rect = this.canvas.getBoundingClientRect();
      const clientX = event.clientX !== undefined ? event.clientX : (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY !== undefined ? event.clientY : (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      this.pickTile(x, y);
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
  }

  pickTile(screenX, screenY) {
    if (this.isInputLocked || !this.cameraEntity) return;

    const camera = this.cameraEntity.camera;
    const ray = new pc.Ray();
    camera.screenToWorld(screenX, screenY, camera.nearClip, ray.origin);
    const farPoint = new pc.Vec3();
    camera.screenToWorld(screenX, screenY, camera.farClip, farPoint);
    ray.direction.sub2(farPoint, ray.origin).normalize();

    // Plane intersection at tile height y = 0.15
    if (Math.abs(ray.direction.y) < 0.001) return;

    const t = (0.15 - ray.origin.y) / ray.direction.y;
    if (t < 0) return;

    const hitX = ray.origin.x + ray.direction.x * t;
    const hitZ = ray.origin.z + ray.direction.z * t;

    // Check hit on 16 tiles
    let picked = null;
    for (const tile of this.tiles) {
      const pos = tile.root.getLocalPosition();
      const dx = Math.abs(hitX - pos.x);
      const dz = Math.abs(hitZ - pos.z);
      if (dx <= 0.44 && dz <= 0.44) {
        picked = tile;
        break;
      }
    }

    if (picked && !picked.isFlipped && !picked.isMatched) {
      if (this.onTileTapped) {
        this.onTileTapped(picked.index);
      }
    }
  }

  setCameraPreset(mode, speed = 4) {
    this.currentCamMode = mode;
    this.camTargetPos = this.cameraPresets[mode].pos.clone();
    this.camTargetRot = this.cameraPresets[mode].rot.clone();
    this.camTransitionSpeed = speed;

    if (speed === 0) {
      this.cameraEntity.setPosition(this.camTargetPos);
      this.cameraEntity.setEulerAngles(this.camTargetRot);
    }
  }

  pulseCamera() {
    if (!this.cameraEntity) return;
    const cam = this.cameraEntity.camera;
    const origFov = cam.fov;
    cam.fov = origFov - 3.5;
    setTimeout(() => {
      cam.fov = origFov;
    }, 180);
  }

  applyLevelStyle(levelId) {
    this.activeLevelId = levelId;
    const lvl = LEVELS.find((l) => l.id === levelId) || LEVELS[0];

    // 1. Camera Clear Color & Ambient Lighting
    const clearHex = lvl.boardBg;
    const clearCol = new pc.Color().fromString(clearHex);
    this.cameraEntity.camera.clearColor = clearCol;

    if (levelId === 1) {
      this.app.scene.ambientColor = new pc.Color(0.7, 0.7, 0.72);
      this.lightEntity.light.color = new pc.Color(1, 1, 1);
      this.lightEntity.light.intensity = 1.3;
    } else if (levelId === 2) {
      this.app.scene.ambientColor = new pc.Color(0.62, 0.52, 0.45);
      this.lightEntity.light.color = new pc.Color(1.0, 0.92, 0.82);
      this.lightEntity.light.intensity = 1.25;
    } else if (levelId === 3) {
      this.app.scene.ambientColor = new pc.Color(0.38, 0.45, 0.6);
      this.lightEntity.light.color = new pc.Color(0.7, 0.9, 1.0);
      this.lightEntity.light.intensity = 1.4;
    } else if (levelId === 4) {
      this.app.scene.ambientColor = new pc.Color(0.52, 0.54, 0.56);
      this.lightEntity.light.color = new pc.Color(0.95, 0.95, 1.0);
      this.lightEntity.light.intensity = 1.35;
    } else if (levelId === 5) {
      this.app.scene.ambientColor = new pc.Color(0.58, 0.48, 0.68);
      this.lightEntity.light.color = new pc.Color(1.0, 0.85, 1.0);
      this.lightEntity.light.intensity = 1.45;
    }

    // 2. Tray material & lighting
    const trayMat = this.trayEntity.render.meshInstances[0].material;
    trayMat.diffuse = new pc.Color().fromString(lvl.trayColor);
    trayMat.useMetalness = true;
    trayMat.metalness = levelId === 3 || levelId === 4 ? 0.6 : 0.2;
    trayMat.gloss = levelId === 5 ? 0.95 : 0.8;
    trayMat.update();

    // 3. Tile body edge styling
    const edgeCol = new pc.Color().fromString(lvl.tileEdgeColor);
    this.tiles.forEach((t) => {
      t.bodyMat.diffuse = edgeCol;
      t.bodyMat.update();
    });

    // 4. Sample swatch preview in lobby
    let pool = SOLID_SWATCHES;
    if (levelId === 2) pool = GRADIENT_SWATCHES;
    else if (levelId === 3) pool = GLOW_SWATCHES;
    else if (levelId === 4) pool = SPLIT_SWATCHES;
    else if (levelId === 5) pool = [...SOLID_SWATCHES, ...GRADIENT_SWATCHES, ...GLOW_SWATCHES, ...SPLIT_SWATCHES];

    for (let i = 0; i < 16; i++) {
      this.setTileSwatch(i, pool[i % pool.length]);
    }

    // 5. Refresh tile back emblem
    this.applySkin(this.activeSkinId);
  }

  applySkin(skinId, bitmojiImg = null) {
    this.activeSkinId = skinId;
    if (bitmojiImg) this.bitmojiImage = bitmojiImg;

    const emblemTex = getEmblemTexture(this.app, skinId, this.bitmojiImage);

    this.tiles.forEach((tile) => {
      tile.emblemMat.diffuseMap = emblemTex;
      tile.emblemMat.update();
    });
  }

  setTileSwatch(index, swatch) {
    const tile = this.tiles[index];
    if (!tile) return;

    tile.swatch = swatch;
    const swatchTex = getSwatchTexture(this.app, swatch);
    tile.swatchMat.diffuseMap = swatchTex;
    tile.swatchMat.update();
  }

  flipTile(index, faceUp) {
    const tile = this.tiles[index];
    if (!tile) return;

    tile.isFlipped = faceUp;
    tile.targetRotX = faceUp ? 180 : 0;
  }

  setTileMatched(index) {
    const tile = this.tiles[index];
    if (!tile) return;

    tile.isMatched = true;
    tile.isFlipped = true;
    tile.targetRotX = 180;

    // 3D Spring-Pop bounce
    tile.scaleY = 1.35;
    tile.targetScaleY = 1.0;
  }

  shakeTile(index) {
    const tile = this.tiles[index];
    if (!tile) return;

    let shakes = 0;
    const interval = setInterval(() => {
      tile.shakeAngle = (shakes % 2 === 0 ? 1 : -1) * 12;
      shakes++;
      if (shakes >= 6) {
        clearInterval(interval);
        tile.shakeAngle = 0;
      }
    }, 40);
  }

  // Rapid diagonal cascade flip-down across all 16 tiles
  cascadeFlipDown(onComplete) {
    this.tiles.forEach((tile) => {
      const delay = (tile.row + tile.col) * 45; // diagonal wave (0 to ~270ms)
      setTimeout(() => {
        tile.isFlipped = false;
        tile.targetRotX = 0;
      }, delay);
    });

    setTimeout(() => {
      if (onComplete) onComplete();
    }, 450);
  }

  // Turn all tiles face-up instantly (for shuffle / peek)
  allFaceUp() {
    this.tiles.forEach((tile) => {
      tile.isFlipped = true;
      tile.isMatched = false;
      tile.targetRotX = 180;
    });
  }

  // Turn all tiles face-down instantly
  allFaceDown() {
    this.tiles.forEach((tile) => {
      tile.isFlipped = false;
      tile.isMatched = false;
      tile.targetRotX = 0;
    });
  }

  vibrateBoard(intensity = 0.04) {
    if (!this.boardEntity) return;
    const vx = (Math.random() - 0.5) * intensity;
    const vz = (Math.random() - 0.5) * intensity;
    this.boardEntity.setLocalPosition(vx, 0, vz);
    setTimeout(() => {
      if (this.boardEntity) this.boardEntity.setLocalPosition(0, 0, 0);
    }, 50);
  }

  onUpdate(dt) {
    // 1. Camera smooth interpolation
    if (this.camTargetPos && this.camTransitionSpeed > 0) {
      const curPos = this.cameraEntity.getPosition();
      curPos.lerp(curPos, this.camTargetPos, Math.min(dt * this.camTransitionSpeed, 1.0));
      this.cameraEntity.setPosition(curPos);

      const curRot = this.cameraEntity.getEulerAngles();
      const rx = pc.math.lerp(curRot.x, this.camTargetRot.x, Math.min(dt * this.camTransitionSpeed, 1.0));
      const ry = pc.math.lerp(curRot.y, this.camTargetRot.y, Math.min(dt * this.camTransitionSpeed, 1.0));
      const rz = pc.math.lerp(curRot.z, this.camTargetRot.z, Math.min(dt * this.camTransitionSpeed, 1.0));
      this.cameraEntity.setEulerAngles(rx, ry, rz);
    }

    // 2. Tile rotational flip & spring animation
    for (const tile of this.tiles) {
      // Rotation lerp
      if (Math.abs(tile.rotationX - tile.targetRotX) > 0.1) {
        tile.rotationX = pc.math.lerp(tile.rotationX, tile.targetRotX, Math.min(dt * 14, 1.0));
      } else {
        tile.rotationX = tile.targetRotX;
      }

      // Scale lerp (for match pop bounce)
      if (Math.abs(tile.scaleY - tile.targetScaleY) > 0.01) {
        tile.scaleY = pc.math.lerp(tile.scaleY, tile.targetScaleY, Math.min(dt * 12, 1.0));
        tile.root.setLocalScale(1, tile.scaleY, 1);
      }

      tile.root.setLocalEulerAngles(tile.rotationX, tile.shakeAngle, 0);
    }
  }
}
