#!/usr/bin/env node
// Generates PWA icons as simple colored squares with "GH" text
// Run: node infra/scripts/generate-icons.mjs
// Requires: pnpm --filter web add -D canvas  (remove after generating)
import { createCanvas } from "canvas";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const SIZES = [16, 32, 64, 192, 512];
const BG = "#080b12";
const ACCENT = "#00e5ff";
const OUT = "apps/web/public";

mkdirSync(OUT, { recursive: true });

for (const size of SIZES) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, size, size);

  // Rounded corners via clip
  const r = size * 0.18;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();

  // Subtle border
  ctx.strokeStyle = ACCENT + "40";
  ctx.lineWidth = size * 0.015;
  ctx.stroke();

  // "GH" text
  const fontSize = size * 0.38;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = ACCENT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Glow effect
  ctx.shadowColor = ACCENT;
  ctx.shadowBlur = size * 0.08;
  ctx.fillText("GH", size / 2, size / 2);

  const suffix = size === 192 ? "pwa-192x192"
               : size === 512 ? "pwa-512x512"
               : size === 32  ? "favicon-32x32"
               : size === 16  ? "favicon-16x16"
               : `icon-${size}`;

  writeFileSync(join(OUT, `${suffix}.png`), canvas.toBuffer("image/png"));
  console.log(`Created ${suffix}.png`);
}

// apple-touch-icon.png = 180x180
const atCanvas = createCanvas(180, 180);
const atCtx = atCanvas.getContext("2d");
atCtx.fillStyle = BG;
atCtx.fillRect(0, 0, 180, 180);
atCtx.font = "bold 68px sans-serif";
atCtx.fillStyle = ACCENT;
atCtx.textAlign = "center";
atCtx.textBaseline = "middle";
atCtx.shadowColor = ACCENT;
atCtx.shadowBlur = 14;
atCtx.fillText("GH", 90, 90);
writeFileSync(join(OUT, "apple-touch-icon.png"), atCanvas.toBuffer("image/png"));
console.log("Created apple-touch-icon.png");
