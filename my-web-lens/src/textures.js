// src/textures.js
// Procedural Canvas & Texture Generation for PlayCanvas Tile Faces & Back Emblems
import * as pc from 'playcanvas';

const textureCache = new Map();

/**
 * Mix a hex colour toward black (amt < 0) or white (amt > 0). amt in [-1, 1].
 */
export function shadeHex(hex, amt) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round((t - r) * p + r);
  g = Math.round((t - g) * p + g);
  b = Math.round((t - b) * p + b);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Draw procedural swatch onto a 2D canvas as a glossy rounded "candy" tile.
 * Corners are left transparent so the 3D plane reads as a rounded tile (alphaTest).
 */
function drawSwatchCanvas(ctx, width, height, swatch) {
  ctx.clearRect(0, 0, width, height);
  const base = swatch.colorA || '#FF1E42';
  const pad = 4;
  const radius = 34;

  // 1. Outer bevel (darker rim reads as the tile's extruded edge)
  roundRectPath(ctx, pad, pad, width - pad * 2, height - pad * 2, radius);
  ctx.fillStyle = shadeHex(base, -0.38);
  ctx.fill();

  // 2. Raised top face (shifted up slightly so the bottom lip is thicker)
  const inset = 12;
  const faceX = inset;
  const faceY = inset - 4;
  const faceW = width - inset * 2;
  const faceH = height - inset * 2 - 4;
  roundRectPath(ctx, faceX, faceY, faceW, faceH, radius - 8);
  const faceGrad = ctx.createLinearGradient(0, faceY, 0, faceY + faceH);
  faceGrad.addColorStop(0, shadeHex(base, 0.22));
  faceGrad.addColorStop(0.45, base);
  faceGrad.addColorStop(1, shadeHex(base, -0.12));
  ctx.fillStyle = faceGrad;
  ctx.fill();

  // 3. Glossy top highlight band
  ctx.save();
  roundRectPath(ctx, faceX, faceY, faceW, faceH, radius - 8);
  ctx.clip();
  const gloss = ctx.createLinearGradient(0, faceY, 0, faceY + faceH * 0.5);
  gloss.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
  gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gloss;
  roundRectPath(ctx, faceX + 10, faceY + 6, faceW - 20, faceH * 0.42, radius - 14);
  ctx.fill();
  ctx.restore();

  // 4. Crisp inner edge highlight
  roundRectPath(ctx, faceX + 1.5, faceY + 1.5, faceW - 3, faceH - 3, radius - 9);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();
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
  const pad = 4;
  const radius = 34;

  // Base: deep navy rounded tile back with a lighter raised face
  roundRectPath(ctx, pad, pad, width - pad * 2, height - pad * 2, radius);
  ctx.fillStyle = '#0B1030';
  ctx.fill();

  const inset = 12;
  roundRectPath(ctx, inset, inset - 4, width - inset * 2, height - inset * 2 - 4, radius - 8);
  const backGrad = ctx.createLinearGradient(0, 0, 0, height);
  backGrad.addColorStop(0, '#26337A');
  backGrad.addColorStop(1, '#151C4A');
  ctx.fillStyle = backGrad;
  ctx.fill();

  // Neon inner outline
  roundRectPath(ctx, inset + 2, inset - 2, width - inset * 2 - 4, height - inset * 2 - 8, radius - 10);
  ctx.strokeStyle = 'rgba(110, 165, 255, 0.45)';
  ctx.lineWidth = 3;
  ctx.stroke();

  const cx = width / 2;
  const cy = height / 2 - 2;

  // Default: Classic Snap Ghost Emblem
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

  // Soft top gloss over the tile back
  ctx.save();
  roundRectPath(ctx, inset, inset - 4, width - inset * 2, height - inset * 2 - 4, radius - 8);
  ctx.clip();
  const gloss = ctx.createLinearGradient(0, 0, 0, height * 0.45);
  gloss.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
  gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, width, height * 0.45);
  ctx.restore();
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
