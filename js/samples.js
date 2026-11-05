/**
 * Sample Images Generator for Instant Retouch Demo
 * Generates realistic high-quality scenes with typical watermarks and unwanted objects
 */

const SampleGenerator = {
  getSamples() {
    return [
      {
        id: 'gemini_logo',
        title: 'Gemini Logo Watermark',
        category: 'AI Watermark Specialist',
        description: 'Fabric & wooden chair with Gemini sparkle watermark',
        generate: () => (typeof USER_SAMPLE_DATAURL !== 'undefined' ? USER_SAMPLE_DATAURL : this.generateSunsetLandscape()),
        defaultMask: (w, h) => {
          return {
            type: 'rect',
            x: 215,
            y: 235,
            width: 105,
            height: 110
          };
        }
      },
      {
        id: 'timestamp',
        title: 'Camera Timestamp',
        category: 'Timestamp & Date',
        description: 'Sunset landscape with bright digital camera date & time stamp',
        generate: () => this.generateSunsetLandscape(),
        defaultMask: (w, h) => {
          // Bottom right box covering red dot and timestamp
          return {
            type: 'rect',
            x: Math.round(w - 250),
            y: Math.round(h - 80),
            width: 245,
            height: 75
          };
        }
      },
      {
        id: 'stockmark',
        title: 'Stock Photo Watermark',
        category: 'Copyright Watermark',
        description: 'Studio ceramic aesthetic with diagonal translucent stock watermark',
        generate: () => this.generateStudioVase(),
        defaultMask: (w, h) => {
          // Diagonal banner across center
          return {
            type: 'diagonal',
            x: Math.round(w * 0.2),
            y: Math.round(h * 0.4),
            width: Math.round(w * 0.6),
            height: Math.round(h * 0.2)
          };
        }
      },
      {
        id: 'beach',
        title: 'Beach Photobomber',
        category: 'Object Removal',
        description: 'Tropical beach with unwanted distant figure on shoreline',
        generate: () => this.generateBeachScene(),
        defaultMask: (w, h) => {
          // Mask over the person on the shore
          return {
            type: 'circle',
            x: Math.round(w * 0.62),
            y: Math.round(h * 0.54),
            radius: Math.round(h * 0.1)
          };
        }
      },
      {
        id: 'logo',
        title: 'Brand Logo & Tag',
        category: 'Logo & Text',
        description: 'Aesthetic modern architecture with corner logo watermark',
        generate: () => this.generateArchitectureScene(),
        defaultMask: (w, h) => {
          return {
            type: 'rect',
            x: 25,
            y: Math.round(h - 85),
            width: 210,
            height: 60
          };
        }
      }
    ];
  },

  /**
   * Sample 1: Mountain Sunset Landscape with Camera Timestamp
   */
  generateSunsetLandscape() {
    const w = 800;
    const h = 540;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    sky.addColorStop(0, '#1c1b3d');
    sky.addColorStop(0.3, '#4d2d63');
    sky.addColorStop(0.6, '#b84358');
    sky.addColorStop(0.85, '#e87348');
    sky.addColorStop(1, '#ffba59');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Glowing sun
    const sunGrad = ctx.createRadialGradient(w * 0.5, h * 0.62, 5, w * 0.5, h * 0.62, 120);
    sunGrad.addColorStop(0, '#fff4cc');
    sunGrad.addColorStop(0.2, '#ffcc66');
    sunGrad.addColorStop(0.6, 'rgba(255, 140, 60, 0.4)');
    sunGrad.addColorStop(1, 'rgba(255, 100, 50, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.62, 120, 0, Math.PI * 2);
    ctx.fill();

    // Distant soft mountains
    this.drawMountainRidge(ctx, w, h * 0.52, 110, '#532959', 0.9);
    this.drawMountainRidge(ctx, w, h * 0.60, 85, '#3b1c43', 0.95);
    this.drawMountainRidge(ctx, w, h * 0.68, 65, '#22112e', 1.0);

    // Lake / Valley reflection
    const lakeGrad = ctx.createLinearGradient(0, h * 0.68, 0, h);
    lakeGrad.addColorStop(0, '#2a1638');
    lakeGrad.addColorStop(0.4, '#6b2d49');
    lakeGrad.addColorStop(0.7, '#a85049');
    lakeGrad.addColorStop(1, '#1b1228');
    ctx.fillStyle = lakeGrad;
    ctx.fillRect(0, h * 0.68, w, h * 0.32);

    // Sun reflection streaks
    ctx.fillStyle = 'rgba(255, 200, 100, 0.25)';
    for (let i = 0; i < 20; i++) {
      const rw = 40 + Math.random() * 80;
      const rx = w * 0.5 - rw / 2 + (Math.random() - 0.5) * 40;
      const ry = h * 0.70 + Math.random() * (h * 0.28);
      ctx.fillRect(rx, ry, rw, 2.5);
    }

    // Foreground pine trees silhouette
    this.drawPineForest(ctx, w, h);

    // Realistic Digital Camera Timestamp in bottom-right
    const tx = w - 225;
    const ty = h - 35;

    // Red REC circle
    ctx.fillStyle = '#ff2a2a';
    ctx.beginPath();
    ctx.arc(tx - 18, ty - 18, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#ff3333';
    ctx.fillText('REC', tx - 8, ty - 14);

    // Yellow/Orange digital camera timestamp font
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = '#ffb300';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText('2024.08.14', tx, ty - 8);
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText('18:42:09 PM', tx + 8, ty + 14);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    return canvas.toDataURL('image/png');
  },

  drawMountainRidge(ctx, w, baseH, variance, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, baseH + 40);

    let x = 0;
    let prevY = baseH;
    while (x <= w) {
      const step = 40 + Math.random() * 50;
      const y = baseH - Math.sin(x * 0.008) * variance + (Math.random() - 0.5) * 20;
      ctx.lineTo(x, y);
      x += step;
      prevY = y;
    }
    ctx.lineTo(w, baseH + 40);
    ctx.lineTo(w, 540);
    ctx.lineTo(0, 540);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  drawPineForest(ctx, w, h) {
    ctx.fillStyle = '#100a18';
    for (let x = -20; x < w + 30; x += 18 + Math.random() * 15) {
      const treeH = 70 + Math.random() * 80;
      const treeY = h - 10 - Math.random() * 30;
      this.drawTree(ctx, x, treeY, treeH);
    }
  },

  drawTree(ctx, x, y, h) {
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + h * 0.16, y);
    ctx.lineTo(x - h * 0.16, y);
    ctx.closePath();
    ctx.fill();
  },

  /**
   * Sample 2: Studio Aesthetic with Stock Watermark
   */
  generateStudioVase() {
    const w = 800;
    const h = 540;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Warm minimalist studio background
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#f2ece4');
    bg.addColorStop(0.5, '#e5dad0');
    bg.addColorStop(1, '#cbbeb2');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Warm spotlight
    const spot = ctx.createRadialGradient(w * 0.45, h * 0.4, 30, w * 0.45, h * 0.4, 380);
    spot.addColorStop(0, 'rgba(255, 250, 240, 0.7)');
    spot.addColorStop(1, 'rgba(255, 250, 240, 0)');
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, w, h);

    // Table surface line
    const tableGrad = ctx.createLinearGradient(0, h * 0.65, 0, h);
    tableGrad.addColorStop(0, '#beafa3');
    tableGrad.addColorStop(0.08, '#a8988b');
    tableGrad.addColorStop(1, '#7f7064');
    ctx.fillStyle = tableGrad;
    ctx.fillRect(0, h * 0.65, w, h * 0.35);

    // Ceramic Vase Shadow
    ctx.fillStyle = 'rgba(70, 55, 45, 0.35)';
    ctx.beginPath();
    ctx.ellipse(w * 0.46, h * 0.67, 110, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ceramic Vase Body
    const vaseX = w * 0.45;
    const vaseY = h * 0.42;

    const vaseGrad = ctx.createLinearGradient(vaseX - 70, 0, vaseX + 80, 0);
    vaseGrad.addColorStop(0, '#8c7665');
    vaseGrad.addColorStop(0.3, '#d4c3b5');
    vaseGrad.addColorStop(0.65, '#f5ebe1');
    vaseGrad.addColorStop(1, '#9b8675');
    ctx.fillStyle = vaseGrad;

    ctx.beginPath();
    ctx.ellipse(vaseX, vaseY + 70, 75, 95, 0, 0, Math.PI * 2);
    ctx.fill();

    // Vase neck
    ctx.beginPath();
    ctx.moveTo(vaseX - 25, vaseY - 10);
    ctx.bezierCurveTo(vaseX - 22, vaseY - 45, vaseX - 28, vaseY - 70, vaseX - 20, vaseY - 90);
    ctx.lineTo(vaseX + 20, vaseY - 90);
    ctx.bezierCurveTo(vaseX + 28, vaseY - 70, vaseX + 22, vaseY - 45, vaseX + 25, vaseY - 10);
    ctx.closePath();
    ctx.fill();

    // Vase lip
    ctx.fillStyle = '#e4d3c4';
    ctx.beginPath();
    ctx.ellipse(vaseX, vaseY - 90, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dried palm branch
    ctx.strokeStyle = '#5a4638';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(vaseX, vaseY - 90);
    ctx.bezierCurveTo(vaseX - 40, vaseY - 160, vaseX - 90, vaseY - 210, vaseX - 140, vaseY - 240);
    ctx.stroke();

    // Leaves
    for (let t = 0.2; t <= 1.0; t += 0.08) {
      const lx = vaseX - t * 140;
      const ly = vaseY - 90 - t * 150;
      ctx.fillStyle = '#8f7b68';
      ctx.beginPath();
      ctx.ellipse(lx - 12, ly - 5, 20, 5, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Prominent Stock Watermark across center
    ctx.save();
    ctx.translate(w * 0.48, h * 0.48);
    ctx.rotate(-0.35);

    // Diagonal translucent banner
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.font = 'bold 36px "Inter", "Helvetica", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('STOCK PHOTO PREVIEW', 0, 0);

    ctx.font = '600 15px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillText('© 2024 PHOTOSTOCK • DO NOT DISTRIBUTE', 0, 32);

    // Grid watermark lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-350, -40);
    ctx.lineTo(350, -40);
    ctx.moveTo(-350, 60);
    ctx.lineTo(350, 60);
    ctx.stroke();

    ctx.restore();

    return canvas.toDataURL('image/png');
  },

  /**
   * Sample 3: Tropical Beach Scene with Photobomber
   */
  generateBeachScene() {
    const w = 800;
    const h = 540;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.45);
    sky.addColorStop(0, '#4aa5e8');
    sky.addColorStop(0.65, '#91d1f7');
    sky.addColorStop(1, '#daf0ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * 0.45);

    // Fluffy clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.drawCloud(ctx, 120, 80, 70);
    this.drawCloud(ctx, 550, 110, 85);
    this.drawCloud(ctx, 350, 60, 55);

    // Ocean gradient
    const ocean = ctx.createLinearGradient(0, h * 0.42, 0, h * 0.65);
    ocean.addColorStop(0, '#105282');
    ocean.addColorStop(0.4, '#1b8ea6');
    ocean.addColorStop(0.85, '#35c4bf');
    ocean.addColorStop(1, '#81e6d9');
    ctx.fillStyle = ocean;
    ctx.fillRect(0, h * 0.42, w, h * 0.23);

    // Gentle surf wave foam
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.64);
    for (let x = 0; x <= w; x += 30) {
      ctx.lineTo(x, h * 0.64 + Math.sin(x * 0.05) * 4);
    }
    ctx.lineTo(w, h * 0.67);
    ctx.lineTo(0, h * 0.67);
    ctx.closePath();
    ctx.fill();

    // Sand gradient
    const sand = ctx.createLinearGradient(0, h * 0.65, 0, h);
    sand.addColorStop(0, '#dfc59e');
    sand.addColorStop(0.3, '#f1deb9');
    sand.addColorStop(0.8, '#ecd4a9');
    sand.addColorStop(1, '#d8bc8f');
    ctx.fillStyle = sand;
    ctx.fillRect(0, h * 0.65, w, h * 0.35);

    // Peaceful sun umbrella on left
    const ux = 170, uy = h * 0.72;
    ctx.strokeStyle = '#c49b66';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(ux, uy + 60);
    ctx.lineTo(ux + 15, uy - 35);
    ctx.stroke();

    // Umbrella top (striped)
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(ux + 15, uy - 35, 65, Math.PI * 1.05, Math.PI * 1.95);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f8f9fa';
    ctx.beginPath();
    ctx.moveTo(ux + 15, uy - 35);
    ctx.arc(ux + 15, uy - 35, 65, Math.PI * 1.35, Math.PI * 1.65);
    ctx.closePath();
    ctx.fill();

    // Photobomber figure on the beach (person standing in the distance)
    const px = Math.round(w * 0.62);
    const py = Math.round(h * 0.54);

    // Cast shadow on wet sand
    ctx.fillStyle = 'rgba(80, 70, 60, 0.4)';
    ctx.beginPath();
    ctx.ellipse(px + 6, py + 38, 12, 3, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#d29676';
    ctx.beginPath();
    ctx.arc(px, py - 18, 5, 0, Math.PI * 2);
    ctx.fill();

    // Dark hair / hat
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(px, py - 20, 5, Math.PI, 0);
    ctx.fill();

    // Bright neon yellow shirt (stands out as unwanted tourist)
    ctx.fillStyle = '#facc15';
    ctx.fillRect(px - 6, py - 13, 12, 22);

    // Blue shorts
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(px - 5, py + 9, 10, 14);

    // Legs
    ctx.fillStyle = '#d29676';
    ctx.fillRect(px - 4, py + 23, 3, 14);
    ctx.fillRect(px + 1, py + 23, 3, 14);

    // Raised arm waving
    ctx.strokeStyle = '#d29676';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(px + 6, py - 8);
    ctx.lineTo(px + 14, py - 20);
    ctx.stroke();

    return canvas.toDataURL('image/png');
  },

  drawCloud(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.6, y - r * 0.2, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x - r * 0.6, y - r * 0.1, r * 0.6, 0, Math.PI * 2);
    ctx.arc(x + r * 1.1, y + r * 0.1, r * 0.5, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  },

  /**
   * Sample 4: Modern Architecture with Brand Logo Watermark
   */
  generateArchitectureScene() {
    const w = 800;
    const h = 540;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Deep blue modern gradient
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(0.5, '#1e293b');
    bg.addColorStop(1, '#334155');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Geometric architectural glass lines
    ctx.fillStyle = '#1e3a5f';
    ctx.beginPath();
    ctx.moveTo(w * 0.3, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, h * 0.85);
    ctx.lineTo(w * 0.45, h);
    ctx.closePath();
    ctx.fill();

    // Glass reflections
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.3 + i * 40, 0);
      ctx.lineTo(w * 0.45 + i * 40, h);
      ctx.stroke();
    }

    // Warm interior light beam
    const glow = ctx.createRadialGradient(w * 0.7, h * 0.4, 20, w * 0.7, h * 0.4, 260);
    glow.addColorStop(0, 'rgba(251, 191, 36, 0.4)');
    glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Corner Watermark / Logo Card in bottom-left
    const lx = 35;
    const ly = h - 75;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, lx, ly, 190, 48, 8);
    ctx.fill();
    ctx.stroke();

    // Logo icon
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(lx + 24, ly + 24, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Inter", sans-serif';
    ctx.fillText('LUMEN LABS', lx + 44, ly + 22);

    ctx.font = '500 9px "Inter", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('WATERMARK SAMPLE', lx + 44, ly + 36);

    return canvas.toDataURL('image/png');
  },

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SampleGenerator };
} else if (typeof window !== 'undefined') {
  window.SampleGenerator = SampleGenerator;
}
