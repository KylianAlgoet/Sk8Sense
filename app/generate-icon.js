// Run with: node generate-icon.js
const { createCanvas } = require('canvas');
const fs = require('fs');

function generateIcon(size, outputPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, size, size);

  // Outer circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = size * 0.04;
  ctx.stroke();

  // Inner circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = '#e94560';
  ctx.fill();

  // "S8" text
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${size * 0.22}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S8', size / 2, size / 2);

  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  console.log(`Generated: ${outputPath}`);
}

generateIcon(1024, './assets/icon.png');
generateIcon(1024, './assets/adaptive-icon.png');
generateIcon(1024, './assets/splash-icon.png');
console.log('Done!');
