// src/board3d.js
// PlayCanvas 3D Board & Tile Architecture for Color Flip
import * as pc from 'playcanvas';
import { getSwatchTexture, getEmblemTexture, getPlayTrayTexture, shadeHex } from './textures.js';
import { LEVELS, SOLID_SWATCHES, generateBoardPairs } from './palette.js';

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
    this.tintBodies = true; // Lobby showcase: tile sides take the face colour
    this.idleTime = 0;
    this.boardBaseY = 0.15;

    // Camera target angles tuned for 9:16 portrait mobile
    this.cameraPresets = {
      preview: { pos: new pc.Vec3(0, 6.3, 4.6), rot: new pc.Vec3(-53, 0, 0) },
      play: { pos: new pc.Vec3(0, 6.9, 2.5), rot: new pc.Vec3(-70, 0, 0) },
    };
    this.currentCamMode = 'preview';

    this.initEngine();
  }

  initEngine() {
    this.app = new pc.Application(this.canvas, {
      elementInput: new pc.ElementInput(this.canvas),
      // Transparent drawing buffer so the CSS neon backdrop shows behind the board
      graphicsDeviceOptions: { alpha: true, antialias: true },
    });

    // Expose devtools hook
    if (typeof window !== 'undefined') {
      window.pc = pc;
      window.app = this.app;
    }

    // CSS owns the layout. Application.resizeCanvas writes inline pixel sizes,
    // which freeze the canvas at its previous lobby / viewport dimensions.
    this.app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const handleResize = () => {
      if (!this.app || !this.canvas) return;
      const { width, height } = this.canvas.getBoundingClientRect();
      if (width > 0 && height > 0) {
        this.app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        this.app.graphicsDevice.resizeCanvas(width, height);
        this.app.graphicsDevice.updateClientRect();
      }
    };

    // Observe CSS changes as well as mobile browser chrome / orientation changes.
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(this.canvas);
    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    const resizeFrame = requestAnimationFrame(handleResize);
    this.app.on('destroy', () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    });

    this.setupScene();
    this.setupInput();
    this.app.start();
  }

  setupScene() {
    const root = this.app.root;

    // 1. Camera with horizontal FOV for consistent mobile framing
    this.cameraEntity = new pc.Entity('MainCamera');
    this.cameraEntity.addComponent('camera', {
      clearColor: new pc.Color(0, 0, 0, 0),
      horizontalFov: true,
      fov: 36,
      nearClip: 0.1,
      farClip: 100,
    });
    this.setCameraPreset('preview', 0); // instant
    root.addChild(this.cameraEntity);

    // Ambient scene lighting (cool arcade navy)
    this.app.scene.ambientColor = new pc.Color(0.42, 0.45, 0.62);

    // 2. Directional Key Light
    this.lightEntity = new pc.Entity('KeyLight');
    this.lightEntity.addComponent('light', {
      type: 'directional',
      color: new pc.Color(1, 1, 1),
      intensity: 1.35,
      castShadows: false,
    });
    this.lightEntity.setEulerAngles(50, 20, 0);
    root.addChild(this.lightEntity);

    // 3. Blue rim light from behind for neon edge highlights
    const fillLight = new pc.Entity('FillLight');
    fillLight.addComponent('light', {
      type: 'directional',
      color: new pc.Color(0.35, 0.55, 1.0),
      intensity: 0.9,
      castShadows: false,
    });
    fillLight.setEulerAngles(-60, 160, 0);
    root.addChild(fillLight);

    // 4. Board Hierarchy Root
    this.boardEntity = new pc.Entity('BoardRoot');
    this.boardEntity.setLocalPosition(0, this.boardBaseY, 0);
    root.addChild(this.boardEntity);

    // Shared rounded neon frame follows the board's lobby sway and gameplay pose.
    this.trayEntity = new pc.Entity('BoardTray');
    this.trayEntity.addComponent('render', { type: 'plane' });
    this.trayEntity.setLocalScale(4.06, 1, 4.18);
    this.trayEntity.setLocalPosition(0, -0.1, 0);
    const playTrayMat = new pc.StandardMaterial();
    playTrayMat.diffuse.set(0, 0, 0);
    playTrayMat.emissive.set(1, 1, 1);
    playTrayMat.emissiveMap = getPlayTrayTexture(this.app);
    playTrayMat.opacityMap = playTrayMat.emissiveMap;
    playTrayMat.opacityMapChannel = 'a';
    playTrayMat.alphaTest = 0.5;
    playTrayMat.update();
    this.trayEntity.render.meshInstances[0].material = playTrayMat;
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

    // Main tile body box (inset so the rounded face texture hides its square corners)
    const body = new pc.Entity(`Body_${index}`);
    body.addComponent('render', { type: 'box' });
    body.setLocalScale(size * 0.9, 0.16, size * 0.9);
    tileRoot.addChild(body);

    // Emblem Face (Top: emblem when face-down at rotationX = 0)
    const emblemFace = new pc.Entity(`EmblemFace_${index}`);
    emblemFace.addComponent('render', { type: 'plane' });
    emblemFace.setLocalScale(size, 1, size);
    emblemFace.setLocalPosition(0, 0.082, 0);
    emblemFace.setLocalEulerAngles(0, 0, 0);
    tileRoot.addChild(emblemFace);

    // Swatch Face (Bottom when rotationX = 0, Top when flipped to rotationX = 180)
    const swatchFace = new pc.Entity(`SwatchFace_${index}`);
    swatchFace.addComponent('render', { type: 'plane' });
    swatchFace.setLocalScale(size, 1, size);
    swatchFace.setLocalPosition(0, -0.082, 0);
    swatchFace.setLocalEulerAngles(180, 180, 0);
    tileRoot.addChild(swatchFace);

    // Material holders (alphaTest cuts the transparent rounded corners)
    const swatchMat = new pc.StandardMaterial();
    swatchMat.useMetalness = false;
    swatchMat.diffuse = new pc.Color(1, 1, 1);
    swatchMat.emissive = new pc.Color(1, 1, 1);
    swatchMat.emissiveIntensity = 0.45;
    swatchMat.specular = new pc.Color(0.5, 0.5, 0.5);
    swatchMat.gloss = 0.88;
    swatchMat.alphaTest = 0.5;
    swatchFace.render.meshInstances[0].material = swatchMat;

    const emblemMat = new pc.StandardMaterial();
    emblemMat.useMetalness = false;
    emblemMat.diffuse = new pc.Color(1, 1, 1);
    emblemMat.emissive = new pc.Color(1, 1, 1);
    emblemMat.emissiveIntensity = 0.3;
    emblemMat.gloss = 0.85;
    emblemMat.alphaTest = 0.5;
    emblemFace.render.meshInstances[0].material = emblemMat;

    const bodyMat = new pc.StandardMaterial();
    bodyMat.useMetalness = false;
    bodyMat.diffuse = new pc.Color(0.06, 0.08, 0.2);
    bodyMat.gloss = 0.6;
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

  applyLevelStyle(levelId = 1) {
    this.activeLevelId = 1;

    // 1. Transparent clear so the CSS neon stage backdrop is visible
    this.cameraEntity.camera.clearColor = new pc.Color(0, 0, 0, 0);

    this.app.scene.ambientColor = new pc.Color(0.42, 0.45, 0.62);
    this.lightEntity.light.color = new pc.Color(1, 1, 1);
    this.lightEntity.light.intensity = 1.35;

    // 4. Lobby showcase: 8 matching pairs randomly shuffled across the 16 tiles
    this.setLobbyTint(true);
    const welcomePairs = generateBoardPairs();
    for (let i = 0; i < 16; i++) {
      this.setTileSwatch(i, welcomePairs[i]);
    }

    // 5. Refresh tile back emblem
    this.applySkin(this.activeSkinId);
  }

  /**
   * In the lobby the tile sides take a darker shade of the face colour (candy look).
   * During play the sides must stay neutral so they never leak a hidden colour.
   */
  setLobbyTint(enabled) {
    this.tintBodies = enabled;
    const neutral = new pc.Color().fromString(LEVELS[0].tileEdgeColor);
    this.tiles.forEach((t) => {
      t.bodyMat.diffuse = enabled && t.swatch ? new pc.Color().fromString(shadeHex(t.swatch.colorA, -0.4)) : neutral;
      t.bodyMat.update();
    });
  }

  applySkin(skinId, bitmojiImg = null) {
    this.activeSkinId = skinId;
    if (bitmojiImg) this.bitmojiImage = bitmojiImg;

    const emblemTex = getEmblemTexture(this.app, skinId, this.bitmojiImage);

    this.tiles.forEach((tile) => {
      tile.emblemMat.diffuseMap = emblemTex;
      tile.emblemMat.emissiveMap = emblemTex;
      tile.emblemMat.opacityMap = emblemTex;
      tile.emblemMat.opacityMapChannel = 'a';
      tile.emblemMat.update();
    });
  }

  setTileSwatch(index, swatch) {
    const tile = this.tiles[index];
    if (!tile) return;

    tile.swatch = swatch;
    const swatchTex = getSwatchTexture(this.app, swatch);
    tile.swatchMat.diffuseMap = swatchTex;
    tile.swatchMat.emissiveMap = swatchTex;
    tile.swatchMat.opacityMap = swatchTex;
    tile.swatchMat.opacityMapChannel = 'a';
    tile.swatchMat.update();

    if (this.tintBodies) {
      tile.bodyMat.diffuse = new pc.Color().fromString(shadeHex(swatch.colorA, -0.4));
      tile.bodyMat.update();
    }
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
    this.boardEntity.setLocalPosition(vx, this.boardBaseY, vz);
    setTimeout(() => {
      if (this.boardEntity) this.boardEntity.setLocalPosition(0, this.boardBaseY, 0);
    }, 50);
  }

  onUpdate(dt) {
    // 0. Gentle idle sway in the lobby preview; settle flat during play
    this.idleTime += dt;
    if (this.boardEntity) {
      const cur = this.boardEntity.getLocalEulerAngles();
      const targetY = this.currentCamMode === 'preview' ? Math.sin(this.idleTime * 0.6) * 4 : 0;
      const targetX = this.currentCamMode === 'preview' ? Math.sin(this.idleTime * 0.45) * 1.5 : 0;
      const k = Math.min(dt * 3, 1);
      this.boardEntity.setLocalEulerAngles(pc.math.lerp(cur.x, targetX, k), pc.math.lerp(cur.y, targetY, k), 0);
    }

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
