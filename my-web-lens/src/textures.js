// src/textures.js
// Procedural Canvas & Texture Generation for PlayCanvas Tile Faces & Back Emblems
import * as pc from 'playcanvas';

const textureCache = new Map();

/**
 * Draw procedural swatch onto a 2D canvas
 */
function drawSwatchCanvas(ctx, width, height, swatch) {
  ctx.clearRect(0, 0, width, height);

  // Background pattern rendering
  if (swatch.type === 'solid') {
    ctx.fillStyle = swatch.colorA || '#FF1E42';
    ctx.fillRect(0, 0, width, height);
  } else if (swatch.type === 'gradient') {
    // 45° diagonal gradient (top-left to bottom-right)
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, swatch.colorA);
    grad.addColorStop(1, swatch.colorB);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (swatch.type === 'glow') {
    const cx = width / 2;
    const cy = height / 2;
    const r = width * 0.52;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, swatch.coreColor);
    grad.addColorStop(0.55, swatch.coreColor);
    grad.addColorStop(1, swatch.rimColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (swatch.type === 'split') {
    const { colorA, colorB, split } = swatch;

    if (split === 'vertical') {
      ctx.fillStyle = colorA;
      ctx.fillRect(0, 0, width / 2, height);
      ctx.fillStyle = colorB;
      ctx.fillRect(width / 2, 0, width / 2, height);
    } else if (split === 'horizontal') {
      ctx.fillStyle = colorA;
      ctx.fillRect(0, 0, width, height / 2);
      ctx.fillStyle = colorB;
      ctx.fillRect(0, height / 2, width, height / 2);
    } else {
      // 45° diagonal (triangle A and triangle B)
      ctx.fillStyle = colorA;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = colorB;
      ctx.beginPath();
      ctx.moveTo(width, 0);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Inner tactile bevel / ambient sheen
  const bevel = ctx.createLinearGradient(0, 0, 0, height);
  bevel.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
  bevel.addColorStop(0.12, 'rgba(255, 255, 255, 0.05)');
  bevel.addColorStop(0.85, 'rgba(0, 0, 0, 0.05)');
  bevel.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = bevel;
  ctx.fillRect(0, 0, width, height);

  // Subtle rounded tile border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, width - 6, height - 6);
}

/**
 * Get or create PlayCanvas Texture for a given swatch
 */
export function getSwatchTexture(app, swatch) {
  const cacheKey = `swatch_${swatch.id || swatch.name}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  drawSwatchCanvas(ctx, 256, 256, swatch);

  const texture = new pc.Texture(app.graphicsDevice, {
    width: 256,
    height: 256,
    format: pc.PIXELFORMAT_RGBA8,
    mipmaps: true,
    minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR,
    magFilter: pc.FILTER_LINEAR,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE,
    addressV: pc.ADDRESS_CLAMP_TO_EDGE,
  });
  texture.setSource(canvas);
  texture.upload();

  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Draw cosmetic tile back emblem
 */
function drawEmblemCanvas(ctx, width, height, skinId, bitmojiImageElement) {
  ctx.clearRect(0, 0, width, height);

  // Base background for tile back
  ctx.fillStyle = '#11141C';
  ctx.fillRect(0, 0, width, height);

  // Subtle tactile carbon / brushed grid texture
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  const step = 16;
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const cx = width / 2;
  const cy = height / 2;

  if (skinId === 0) {
    // 1. Classic Snap Emblem
    // Yellow glowing Ghost-style crest
    ctx.fillStyle = 'rgba(255, 252, 0, 0.15)';
    ctx.beginPath();
    ctx.arc(cx, cy, 64, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FFFC00';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.stroke();

    // Ghost body silhouette
    ctx.fillStyle = '#FFFC00';
    ctx.beginPath();
    ctx.arc(cx, cy - 14, 26, Math.PI, 0, false);
    ctx.lineTo(cx + 26, cy + 22);
    // Wavy bottom
    ctx.bezierCurveTo(cx + 18, cy + 30, cx + 8, cy + 22, cx, cy + 28);
    ctx.bezierCurveTo(cx - 8, cy + 22, cx - 18, cy + 30, cx - 26, cy + 22);
    ctx.closePath();
    ctx.fill();
  } else if (skinId === 1) {
    // 2. Neon Prism Crest (5 Wins)
    // Cyan & Magenta neon diamond crest
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(cx, cy - 65);
    ctx.lineTo(cx + 65, cy);
    ctx.lineTo(cx, cy + 65);
    ctx.lineTo(cx - 65, cy);
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = '#FF00A0';
    ctx.shadowColor = '#FF00A0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 40);
    ctx.lineTo(cx + 40, cy);
    ctx.lineTo(cx, cy + 40);
    ctx.lineTo(cx - 40, cy);
    ctx.closePath();
    ctx.stroke();

    ctx.shadowBlur = 0;
  } else if (skinId === 2) {
    // 3. 24K Gold Foil Emblem (≤18 Flips)
    const goldGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 75);
    goldGrad.addColorStop(0, '#FFE875');
    goldGrad.addColorStop(0.6, '#D4AF37');
    goldGrad.addColorStop(1, '#996515');

    ctx.fillStyle = goldGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 64, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FFF3A3';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 5-Pointed Star in gold center
    ctx.fillStyle = '#1A1406';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const x = cx + Math.cos(angle) * 32;
      const y = cy + Math.sin(angle) * 32;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  } else if (skinId === 3) {
    // 4. Bitmoji Stamp (Cleared Level 5 Mixed)
    // Draw Bitmoji avatar headshot in a circular badge
    ctx.fillStyle = '#FFFC00';
    ctx.beginPath();
    ctx.arc(cx, cy, 66, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.stroke();

    if (bitmojiImageElement && bitmojiImageElement.complete) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 60, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(bitmojiImageElement, cx - 60, cy - 60, 120, 120);
      ctx.restore();
    } else {
      // Silhouette placeholder
      ctx.fillStyle = '#0B0C10';
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 24, 0, Math.PI * 2);
      ctx.arc(cx, cy + 45, 38, Math.PI, 0, false);
      ctx.fill();
    }
  }

  // Outer border & corner accents
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, width - 12, height - 12);
}

/**
 * Get or create PlayCanvas Texture for a tile back emblem
 */
export function getEmblemTexture(app, skinId = 0, bitmojiImg = null) {
  const cacheKey = `emblem_${skinId}`;
  if (skinId !== 3 && textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  drawEmblemCanvas(ctx, 256, 256, skinId, bitmojiImg);

  const texture = new pc.Texture(app.graphicsDevice, {
    width: 256,
    height: 256,
    format: pc.PIXELFORMAT_RGBA8,
    mipmaps: true,
    minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR,
    magFilter: pc.FILTER_LINEAR,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE,
    addressV: pc.ADDRESS_CLAMP_TO_EDGE,
  });
  texture.setSource(canvas);
  texture.upload();

  textureCache.set(cacheKey, texture);
  return texture;
}
