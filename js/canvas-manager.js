/**
 * Canvas Manager for Retouch & Inpainting Studio
 * Handles zoom, pan, brush painting, mask overlays, undo/redo, and before/after split slider
 */

class CanvasManager {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;

    // Canvases
    this.mainCanvas = document.createElement('canvas');
    this.mainCtx = this.mainCanvas.getContext('2d', { willReadFrequently: true });

    this.maskCanvas = document.createElement('canvas');
    this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: true });

    this.cursorCanvas = document.createElement('canvas');
    this.cursorCtx = this.cursorCanvas.getContext('2d');

    // Visual neon overlay canvas
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCtx = this.overlayCanvas.getContext('2d');
    this.overlayCanvas.style.position = 'absolute';
    this.overlayCanvas.style.left = '0';
    this.overlayCanvas.style.top = '0';
    this.overlayCanvas.style.pointerEvents = 'none';

    // Split curtain comparison canvas
    this.splitCanvas = document.createElement('canvas');
    this.splitCtx = this.splitCanvas.getContext('2d');

    // Canvas container wrapper
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'canvas-stage';
    this.wrapper.style.position = 'relative';
    this.wrapper.style.width = '100%';
    this.wrapper.style.height = '100%';
    this.wrapper.style.overflow = 'hidden';
    this.wrapper.style.userSelect = 'none';
    this.wrapper.style.touchAction = 'none';

    this.layerContainer = document.createElement('div');
    this.layerContainer.className = 'canvas-layers';
    this.layerContainer.style.position = 'absolute';
    this.layerContainer.style.transformOrigin = '0 0';

    this.mainCanvas.style.display = 'block';
    this.mainCanvas.style.position = 'absolute';
    this.mainCanvas.style.left = '0';
    this.mainCanvas.style.top = '0';

    this.cursorCanvas.style.position = 'absolute';
    this.cursorCanvas.style.left = '0';
    this.cursorCanvas.style.top = '0';
    this.cursorCanvas.style.pointerEvents = 'none';

    this.splitCanvas.style.position = 'absolute';
    this.splitCanvas.style.left = '0';
    this.splitCanvas.style.top = '0';
    this.splitCanvas.style.pointerEvents = 'none';
    this.splitCanvas.style.display = 'none';

    this.layerContainer.appendChild(this.mainCanvas);
    this.layerContainer.appendChild(this.overlayCanvas);
    this.layerContainer.appendChild(this.splitCanvas);
    this.layerContainer.appendChild(this.cursorCanvas);
    this.wrapper.appendChild(this.layerContainer);
    this.container.appendChild(this.wrapper);

    // State
    this.imgWidth = 0;
    this.imgHeight = 0;
    this.originalImg = null; // Original image element / bitmap
    this.currentImg = null;  // Current (retouched) image element / bitmap
    this.retouchedHistory = []; // Past retouched states for full undo
    this.retouchedRedo = [];

    // Transform State
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.isSpacePressed = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // Tool State
    this.currentTool = 'brush'; // 'brush', 'eraser', 'box', 'lasso'
    this.brushSize = 32;
    this.isDrawing = false;
    this.lastDrawX = 0;
    this.lastDrawY = 0;
    this.startDrawX = 0;
    this.startDrawY = 0;
    this.lassoPoints = [];

    // Mask History
    this.maskHistory = [];
    this.maskRedo = [];
    this.maxHistory = 25;

    // Comparison Mode
    this.isComparing = false; // Hold to compare
    this.splitSliderActive = false; // Split slider mode
    this.splitPosition = 0.5; // 0.0 to 1.0 (divider x position)
    this.isDraggingSplit = false;

    // Visual Settings
    this.maskColor = 'rgba(236, 72, 153, 0.48)'; // Sleek neon rose/fuchsia mask
    this.maskBorderColor = 'rgba(244, 114, 182, 0.9)';

    this.bindEvents();
    this.onStateChange = null; // Callback for UI button states (undo/redo disabled, etc)
  }

  bindEvents() {
    // Pointer Events on wrapper
    this.wrapper.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    window.addEventListener('pointermove', this.handlePointerMove.bind(this));
    window.addEventListener('pointerup', this.handlePointerUp.bind(this));
    this.wrapper.addEventListener('pointerleave', () => {
      this.clearCursor();
    });

    // Zoom on Wheel
    this.wrapper.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

    // Keyboard shortcuts (Space for Pan, [ and ] for brush size)
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space' && !this.isSpacePressed) {
        this.isSpacePressed = true;
        this.wrapper.style.cursor = 'grab';
        e.preventDefault();
      } else if (e.key === '[') {
        this.setBrushSize(Math.max(4, this.brushSize - 4));
        this.renderCursor(this.lastMouseX, this.lastMouseY);
      } else if (e.key === ']') {
        this.setBrushSize(Math.min(150, this.brushSize + 4));
        this.renderCursor(this.lastMouseX, this.lastMouseY);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.redo();
        } else {
          this.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.redo();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.isSpacePressed = false;
        this.wrapper.style.cursor = this.currentTool === 'pan' ? 'grab' : 'crosshair';
      }
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (this.currentImg) {
        this.updateTransform();
      }
    });
    ro.observe(this.wrapper);
  }

  /**
   * Load an image into the studio
   */
  async loadImage(source) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.imgWidth = img.naturalWidth || img.width;
        this.imgHeight = img.naturalHeight || img.height;

        // Set dimensions
        this.mainCanvas.width = this.imgWidth;
        this.mainCanvas.height = this.imgHeight;
        this.maskCanvas.width = this.imgWidth;
        this.maskCanvas.height = this.imgHeight;
        this.overlayCanvas.width = this.imgWidth;
        this.overlayCanvas.height = this.imgHeight;
        this.cursorCanvas.width = this.imgWidth;
        this.cursorCanvas.height = this.imgHeight;
        this.splitCanvas.width = this.imgWidth;
        this.splitCanvas.height = this.imgHeight;

        this.originalImg = img;
        this.currentImg = img;

        // Reset history
        this.maskHistory = [];
        this.maskRedo = [];
        this.retouchedHistory = [];
        this.retouchedRedo = [];

        // Save initial empty mask snapshot
        this.pushMaskState();

        // Clear masks
        this.clearMask();

        // Fit to viewport
        this.fitToScreen();
        this.render();

        if (this.onStateChange) this.onStateChange();
        resolve(img);
      };
      img.onerror = reject;

      if (typeof source === 'string') {
        img.src = source;
      } else if (source instanceof File || source instanceof Blob) {
        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target.result; };
        reader.readAsDataURL(source);
      }
    });
  }

  fitToScreen() {
    if (!this.imgWidth || !this.imgHeight) return;

    const rect = this.wrapper.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : (window.innerWidth || 1000);
    const h = rect.height > 0 ? rect.height : (window.innerHeight - 70 || 600);
    const margin = 48; // padding around image
    const availW = Math.max(100, w - margin * 2);
    const availH = Math.max(100, h - margin * 2);

    const scaleX = availW / this.imgWidth;
    const scaleY = availH / this.imgHeight;
    this.zoom = Math.min(1.0, Math.min(scaleX, scaleY));

    // Center
    this.panX = Math.round((w - this.imgWidth * this.zoom) / 2);
    this.panY = Math.round((h - this.imgHeight * this.zoom) / 2);

    this.updateTransform();

    if (rect.width === 0) {
      requestAnimationFrame(() => {
        this.fitToScreen();
      });
    }
  }

  setZoom(newZoom, centerX = null, centerY = null) {
    const minZoom = 0.1;
    const maxZoom = 6.0;
    const clamped = Math.max(minZoom, Math.min(maxZoom, newZoom));

    if (centerX !== null && centerY !== null) {
      // Zoom toward focal point
      const rect = this.wrapper.getBoundingClientRect();
      const mouseX = centerX - rect.left;
      const mouseY = centerY - rect.top;

      const imgX = (mouseX - this.panX) / this.zoom;
      const imgY = (mouseY - this.panY) / this.zoom;

      this.zoom = clamped;
      this.panX = mouseX - imgX * this.zoom;
      this.panY = mouseY - imgY * this.zoom;
    } else {
      // Zoom toward center of viewport
      const rect = this.wrapper.getBoundingClientRect();
      const midX = rect.width / 2;
      const midY = rect.height / 2;

      const imgX = (midX - this.panX) / this.zoom;
      const imgY = (midY - this.panY) / this.zoom;

      this.zoom = clamped;
      this.panX = midX - imgX * this.zoom;
      this.panY = midY - imgY * this.zoom;
    }

    this.updateTransform();
  }

  updateTransform() {
    this.layerContainer.style.width = `${this.imgWidth}px`;
    this.layerContainer.style.height = `${this.imgHeight}px`;
    this.layerContainer.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    if (this.onStateChange) this.onStateChange();
  }

  setTool(tool) {
    this.currentTool = tool;
    if (tool === 'pan') {
      this.wrapper.style.cursor = 'grab';
    } else {
      this.wrapper.style.cursor = 'crosshair';
    }
    if (this.onStateChange) this.onStateChange();
  }

  setBrushSize(size) {
    this.brushSize = Math.max(2, Math.min(200, size));
    if (this.onStateChange) this.onStateChange();
  }

  clientToImageCoords(clientX, clientY) {
    const rect = this.wrapper.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const x = (mouseX - this.panX) / this.zoom;
    const y = (mouseY - this.panY) / this.zoom;
    return { x, y };
  }

  handlePointerDown(e) {
    if (!this.currentImg) return;

    // Check if dragging split comparison divider
    if (this.splitSliderActive) {
      const rect = this.wrapper.getBoundingClientRect();
      const imgCoords = this.clientToImageCoords(e.clientX, e.clientY);
      const splitX = this.imgWidth * this.splitPosition;

      // If near divider line
      if (Math.abs(imgCoords.x - splitX) < (20 / this.zoom)) {
        this.isDraggingSplit = true;
        this.wrapper.setPointerCapture(e.pointerId);
        return;
      }
    }

    // Pan with spacebar, middle click, or pan tool
    if (this.isSpacePressed || e.button === 1 || this.currentTool === 'pan') {
      this.isPanning = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.wrapper.style.cursor = 'grabbing';
      this.wrapper.setPointerCapture(e.pointerId);
      return;
    }

    // Left click drawing
    if (e.button === 0) {
      const coords = this.clientToImageCoords(e.clientX, e.clientY);
      if (coords.x < 0 || coords.x > this.imgWidth || coords.y < 0 || coords.y > this.imgHeight) {
        // Outside image bounds, allow panning
        this.isPanning = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.wrapper.style.cursor = 'grabbing';
        this.wrapper.setPointerCapture(e.pointerId);
        return;
      }

      this.isDrawing = true;
      this.lastDrawX = coords.x;
      this.lastDrawY = coords.y;
      this.startDrawX = coords.x;
      this.startDrawY = coords.y;

      if (this.currentTool === 'lasso') {
        this.lassoPoints = [{ x: coords.x, y: coords.y }];
      } else if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
        this.paintStroke(coords.x, coords.y, coords.x, coords.y);
      }

      this.wrapper.setPointerCapture(e.pointerId);
    }
  }

  handlePointerMove(e) {
    const coords = this.clientToImageCoords(e.clientX, e.clientY);
    this.lastMouseX = coords.x;
    this.lastMouseY = coords.y;

    // Dragging split comparison slider
    if (this.isDraggingSplit) {
      this.splitPosition = Math.max(0.01, Math.min(0.99, coords.x / this.imgWidth));
      this.renderSplitSlider();
      return;
    }

    // Panning
    if (this.isPanning) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.panX += dx;
      this.panY += dy;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.updateTransform();
      return;
    }

    // Drawing
    if (this.isDrawing) {
      if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
        this.paintStroke(this.lastDrawX, this.lastDrawY, coords.x, coords.y);
        this.lastDrawX = coords.x;
        this.lastDrawY = coords.y;
      } else if (this.currentTool === 'box') {
        // Draw box preview on cursorCanvas
        this.renderBoxPreview(this.startDrawX, this.startDrawY, coords.x, coords.y);
      } else if (this.currentTool === 'lasso') {
        this.lassoPoints.push({ x: coords.x, y: coords.y });
        this.renderLassoPreview();
      }
    } else {
      // Normal hover cursor
      this.renderCursor(coords.x, coords.y);
    }
  }

  handlePointerUp(e) {
    if (this.isDraggingSplit) {
      this.isDraggingSplit = false;
      try { this.wrapper.releasePointerCapture(e.pointerId); } catch (_) {}
      return;
    }

    if (this.isPanning) {
      this.isPanning = false;
      this.wrapper.style.cursor = this.isSpacePressed || this.currentTool === 'pan' ? 'grab' : 'crosshair';
      try { this.wrapper.releasePointerCapture(e.pointerId); } catch (_) {}
      return;
    }

    if (this.isDrawing) {
      this.isDrawing = false;
      try { this.wrapper.releasePointerCapture(e.pointerId); } catch (_) {}

      const coords = this.clientToImageCoords(e.clientX, e.clientY);

      if (this.currentTool === 'box') {
        // Commit box to mask & overlay
        const bx = Math.min(this.startDrawX, coords.x);
        const by = Math.min(this.startDrawY, coords.y);
        const bw = Math.abs(coords.x - this.startDrawX);
        const bh = Math.abs(coords.y - this.startDrawY);

        if (bw > 2 && bh > 2) {
          this.maskCtx.fillStyle = '#ffffff';
          this.maskCtx.fillRect(bx, by, bw, bh);

          this.overlayCtx.fillStyle = 'rgba(244, 63, 94, 0.52)';
          this.overlayCtx.fillRect(bx, by, bw, bh);

          this.pushMaskState();
        }
        this.clearCursor();
      } else if (this.currentTool === 'lasso') {
        // Commit lasso polygon to mask & overlay
        if (this.lassoPoints.length > 2) {
          this.maskCtx.fillStyle = '#ffffff';
          this.maskCtx.beginPath();
          this.maskCtx.moveTo(this.lassoPoints[0].x, this.lassoPoints[0].y);
          for (let i = 1; i < this.lassoPoints.length; i++) {
            this.maskCtx.lineTo(this.lassoPoints[i].x, this.lassoPoints[i].y);
          }
          this.maskCtx.closePath();
          this.maskCtx.fill();

          this.overlayCtx.fillStyle = 'rgba(244, 63, 94, 0.52)';
          this.overlayCtx.beginPath();
          this.overlayCtx.moveTo(this.lassoPoints[0].x, this.lassoPoints[0].y);
          for (let i = 1; i < this.lassoPoints.length; i++) {
            this.overlayCtx.lineTo(this.lassoPoints[i].x, this.lassoPoints[i].y);
          }
          this.overlayCtx.closePath();
          this.overlayCtx.fill();

          this.pushMaskState();
        }
        this.lassoPoints = [];
        this.clearCursor();
      } else {
        // Brush or Eraser stroke finished
        this.pushMaskState();
      }
    }
  }

  handleWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    this.setZoom(this.zoom * zoomFactor, e.clientX, e.clientY);
  }

  /**
   * Paint continuous stroke on mask canvas
   */
  paintStroke(x0, y0, x1, y1) {
    const isEraser = this.currentTool === 'eraser';

    // 1. Paint onto binary mask
    this.maskCtx.save();
    if (isEraser) {
      this.maskCtx.globalCompositeOperation = 'destination-out';
    } else {
      this.maskCtx.globalCompositeOperation = 'source-over';
      this.maskCtx.fillStyle = '#ffffff';
      this.maskCtx.strokeStyle = '#ffffff';
    }
    this.maskCtx.lineWidth = this.brushSize;
    this.maskCtx.lineCap = 'round';
    this.maskCtx.lineJoin = 'round';
    this.maskCtx.beginPath();
    this.maskCtx.moveTo(x0, y0);
    this.maskCtx.lineTo(x1, y1);
    this.maskCtx.stroke();
    this.maskCtx.restore();

    // 2. Paint onto visual neon overlay
    this.overlayCtx.save();
    if (isEraser) {
      this.overlayCtx.globalCompositeOperation = 'destination-out';
    } else {
      this.overlayCtx.globalCompositeOperation = 'source-over';
      this.overlayCtx.fillStyle = 'rgba(244, 63, 94, 0.52)';
      this.overlayCtx.strokeStyle = 'rgba(244, 63, 94, 0.52)';
    }
    this.overlayCtx.lineWidth = this.brushSize;
    this.overlayCtx.lineCap = 'round';
    this.overlayCtx.lineJoin = 'round';
    this.overlayCtx.beginPath();
    this.overlayCtx.moveTo(x0, y0);
    this.overlayCtx.lineTo(x1, y1);
    this.overlayCtx.stroke();
    this.overlayCtx.restore();

    if (this.onStateChange) this.onStateChange();
  }

  renderCursor(x, y) {
    this.cursorCtx.clearRect(0, 0, this.imgWidth, this.imgHeight);

    if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
      this.cursorCtx.save();
      // Outer subtle glow
      this.cursorCtx.strokeStyle = this.currentTool === 'eraser' ? 'rgba(56, 189, 248, 0.9)' : 'rgba(236, 72, 153, 0.95)';
      this.cursorCtx.lineWidth = 1.8;
      this.cursorCtx.beginPath();
      this.cursorCtx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
      this.cursorCtx.stroke();

      // Inner contrasting ring
      this.cursorCtx.strokeStyle = '#ffffff';
      this.cursorCtx.lineWidth = 0.8;
      this.cursorCtx.beginPath();
      this.cursorCtx.arc(x, y, Math.max(1, this.brushSize / 2 - 1), 0, Math.PI * 2);
      this.cursorCtx.stroke();

      // Center dot
      this.cursorCtx.fillStyle = '#ffffff';
      this.cursorCtx.beginPath();
      this.cursorCtx.arc(x, y, 1.5, 0, Math.PI * 2);
      this.cursorCtx.fill();

      this.cursorCtx.restore();
    }
  }

  renderBoxPreview(x0, y0, x1, y1) {
    this.cursorCtx.clearRect(0, 0, this.imgWidth, this.imgHeight);
    const bx = Math.min(x0, x1);
    const by = Math.min(y0, y1);
    const bw = Math.abs(x1 - x0);
    const bh = Math.abs(y1 - y0);

    this.cursorCtx.save();
    this.cursorCtx.fillStyle = this.maskColor;
    this.cursorCtx.strokeStyle = this.maskBorderColor;
    this.cursorCtx.lineWidth = 2;
    this.cursorCtx.setLineDash([6, 4]);
    this.cursorCtx.fillRect(bx, by, bw, bh);
    this.cursorCtx.strokeRect(bx, by, bw, bh);
    this.cursorCtx.restore();
  }

  renderLassoPreview() {
    this.cursorCtx.clearRect(0, 0, this.imgWidth, this.imgHeight);
    if (this.lassoPoints.length < 2) return;

    this.cursorCtx.save();
    this.cursorCtx.strokeStyle = this.maskBorderColor;
    this.cursorCtx.lineWidth = 2;
    this.cursorCtx.setLineDash([5, 3]);
    this.cursorCtx.beginPath();
    this.cursorCtx.moveTo(this.lassoPoints[0].x, this.lassoPoints[0].y);
    for (let i = 1; i < this.lassoPoints.length; i++) {
      this.cursorCtx.lineTo(this.lassoPoints[i].x, this.lassoPoints[i].y);
    }
    this.cursorCtx.stroke();
    this.cursorCtx.restore();
  }

  clearCursor() {
    this.cursorCtx.clearRect(0, 0, this.imgWidth, this.imgHeight);
  }

  /**
   * Main render: draw active image and sync overlay visibility
   */
  render() {
    if (!this.currentImg) return;

    // Draw base image (original or current retouched)
    const activeImg = this.isComparing ? this.originalImg : this.currentImg;
    this.mainCtx.clearRect(0, 0, this.imgWidth, this.imgHeight);
    this.mainCtx.drawImage(activeImg, 0, 0);

    // If split slider active, render curtain comparison
    if (this.splitSliderActive) {
      this.overlayCanvas.style.display = 'none';
      this.renderSplitSlider();
      return;
    }

    // Toggle overlay visibility
    this.overlayCanvas.style.display = this.isComparing ? 'none' : 'block';
  }

  /**
   * Render Split View (Before / After curtain divider with handle)
   */
  renderSplitSlider() {
    this.splitCanvas.style.display = 'block';
    this.splitCtx.clearRect(0, 0, this.imgWidth, this.imgHeight);

    const splitX = Math.round(this.imgWidth * this.splitPosition);

    // Draw Original on left side
    this.splitCtx.save();
    this.splitCtx.beginPath();
    this.splitCtx.rect(0, 0, splitX, this.imgHeight);
    this.splitCtx.clip();
    this.splitCtx.drawImage(this.originalImg, 0, 0);
    this.splitCtx.restore();

    // Draw Retouched on right side
    this.splitCtx.save();
    this.splitCtx.beginPath();
    this.splitCtx.rect(splitX, 0, this.imgWidth - splitX, this.imgHeight);
    this.splitCtx.clip();
    this.splitCtx.drawImage(this.currentImg, 0, 0);
    this.splitCtx.restore();

    // Draw divider line and glowing handle
    this.splitCtx.save();
    this.splitCtx.strokeStyle = '#ffffff';
    this.splitCtx.lineWidth = Math.max(2, 2.5 / this.zoom);
    this.splitCtx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    this.splitCtx.shadowBlur = 6;
    this.splitCtx.beginPath();
    this.splitCtx.moveTo(splitX, 0);
    this.splitCtx.lineTo(splitX, this.imgHeight);
    this.splitCtx.stroke();

    // Handle circle in middle
    const midY = this.imgHeight * 0.5;
    const handleR = Math.max(14, 18 / this.zoom);
    this.splitCtx.fillStyle = '#ffffff';
    this.splitCtx.beginPath();
    this.splitCtx.arc(splitX, midY, handleR, 0, Math.PI * 2);
    this.splitCtx.fill();

    // Arrows in handle
    this.splitCtx.fillStyle = '#0f172a';
    this.splitCtx.font = `bold ${Math.round(handleR * 0.9)}px sans-serif`;
    this.splitCtx.textAlign = 'center';
    this.splitCtx.textBaseline = 'middle';
    this.splitCtx.fillText('‹ ›', splitX, midY);

    // Pill Labels: "ORIGINAL" on left, "RETOUCHED" on right
    this.splitCtx.shadowColor = 'transparent';
    this.splitCtx.font = `600 ${Math.max(12, 14 / this.zoom)}px "Inter", sans-serif`;
    if (splitX > 90) {
      this.drawPillBadge(this.splitCtx, 24, 24, 'ORIGINAL', 'rgba(15, 23, 42, 0.75)');
    }
    if (this.imgWidth - splitX > 90) {
      this.drawPillBadge(this.splitCtx, this.imgWidth - 110, 24, 'RETOUCHED', 'rgba(16, 185, 129, 0.85)');
    }

    this.splitCtx.restore();
  }

  drawPillBadge(ctx, x, y, text, bg) {
    ctx.save();
    const metrics = ctx.measureText(text);
    const pw = metrics.width + 18;
    const ph = 26;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, pw, ph, 13) : ctx.rect(x, y, pw, ph);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + pw / 2, y + ph / 2);
    ctx.restore();
  }

  setSplitSliderMode(active) {
    this.splitSliderActive = active;
    if (!active) {
      this.splitCanvas.style.display = 'none';
    }
    this.render();
  }

  setHoldCompare(compare) {
    this.isComparing = compare;
    this.render();
  }

  hasMask() {
    if (!this.imgWidth || !this.imgHeight) return false;
    const pixels = this.maskCtx.getImageData(0, 0, this.imgWidth, this.imgHeight).data;
    for (let i = 0; i < pixels.length; i += 16) {
      if (pixels[i] > 20) return true;
    }
    return false;
  }

  clearMask() {
    this.maskCtx.clearRect(0, 0, this.imgWidth, this.imgHeight);
    this.overlayCtx.clearRect(0, 0, this.imgWidth, this.imgHeight);
    this.pushMaskState();
    if (this.onStateChange) this.onStateChange();
  }

  /**
   * Apply an automatic preset mask (e.g. for samples)
   */
  applyPresetMask(preset) {
    if (!preset) return;
    this.maskCtx.fillStyle = '#ffffff';
    this.overlayCtx.fillStyle = 'rgba(244, 63, 94, 0.52)';

    if (preset.type === 'rect') {
      this.maskCtx.fillRect(preset.x, preset.y, preset.width, preset.height);
      this.overlayCtx.fillRect(preset.x, preset.y, preset.width, preset.height);
    } else if (preset.type === 'circle') {
      this.maskCtx.beginPath();
      this.maskCtx.arc(preset.x, preset.y, preset.radius, 0, Math.PI * 2);
      this.maskCtx.fill();

      this.overlayCtx.beginPath();
      this.overlayCtx.arc(preset.x, preset.y, preset.radius, 0, Math.PI * 2);
      this.overlayCtx.fill();
    } else if (preset.type === 'diagonal') {
      [this.maskCtx, this.overlayCtx].forEach((ctx) => {
        ctx.save();
        ctx.translate(this.imgWidth * 0.48, this.imgHeight * 0.48);
        ctx.rotate(-0.35);
        ctx.fillRect(-280, -35, 560, 95);
        ctx.restore();
      });
    }

    this.pushMaskState();
    if (this.onStateChange) this.onStateChange();
  }

  syncOverlayFromMask() {
    this.overlayCtx.clearRect(0, 0, this.imgWidth, this.imgHeight);
    const maskData = this.maskCtx.getImageData(0, 0, this.imgWidth, this.imgHeight).data;
    const overlayImg = this.overlayCtx.createImageData(this.imgWidth, this.imgHeight);
    const out = overlayImg.data;
    for (let i = 0; i < maskData.length; i += 4) {
      if (maskData[i] > 10) {
        out[i] = 244;
        out[i + 1] = 63;
        out[i + 2] = 94;
        out[i + 3] = 135;
      }
    }
    this.overlayCtx.putImageData(overlayImg, 0, 0);
  }

  /**
   * Snapshot mask state for Undo / Redo
   */
  pushMaskState() {
    if (!this.imgWidth || !this.imgHeight) return;
    const imgData = this.maskCtx.getImageData(0, 0, this.imgWidth, this.imgHeight);
    this.maskHistory.push(imgData);
    if (this.maskHistory.length > this.maxHistory) {
      this.maskHistory.shift();
    }
    this.maskRedo = [];
    if (this.onStateChange) this.onStateChange();
  }

  undo() {
    if (this.maskHistory.length > 1) {
      const current = this.maskHistory.pop();
      this.maskRedo.push(current);
      const prev = this.maskHistory[this.maskHistory.length - 1];
      this.maskCtx.putImageData(prev, 0, 0);
      this.syncOverlayFromMask();
      if (this.onStateChange) this.onStateChange();
    }
  }

  redo() {
    if (this.maskRedo.length > 0) {
      const next = this.maskRedo.pop();
      this.maskHistory.push(next);
      this.maskCtx.putImageData(next, 0, 0);
      this.syncOverlayFromMask();
      if (this.onStateChange) this.onStateChange();
    }
  }

  canUndo() {
    return this.maskHistory.length > 1;
  }

  canRedo() {
    return this.maskRedo.length > 0;
  }

  /**
   * Commit inpainting result
   */
  applyInpaintResult(newImageData) {
    // Save current image in history for full image undo
    this.retouchedHistory.push(this.currentImg);

    // Create an ImageBitmap or HTMLImageElement from newImageData
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.imgWidth;
    tempCanvas.height = this.imgHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(newImageData, 0, 0);

    const img = new Image();
    img.src = tempCanvas.toDataURL();
    img.onload = () => {
      this.currentImg = img;
      // Clear mask after successful retouch
      this.clearMask();
      this.render();
      if (this.onStateChange) this.onStateChange();
    };
  }

  undoRetouch() {
    if (this.retouchedHistory.length > 0) {
      this.retouchedRedo.push(this.currentImg);
      this.currentImg = this.retouchedHistory.pop();
      this.render();
      if (this.onStateChange) this.onStateChange();
    }
  }

  canUndoRetouch() {
    return this.retouchedHistory.length > 0;
  }

  /**
   * Export image
   */
  exportImage(format = 'image/png', quality = 0.95) {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.imgWidth;
    exportCanvas.height = this.imgHeight;
    const ctx = exportCanvas.getContext('2d');
    ctx.drawImage(this.currentImg, 0, 0);
    return exportCanvas.toDataURL(format, quality);
  }

  getMaskBinary() {
    const raw = this.maskCtx.getImageData(0, 0, this.imgWidth, this.imgHeight).data;
    const mask = new Uint8Array(this.imgWidth * this.imgHeight);
    for (let i = 0, j = 0; i < raw.length; i += 4, j++) {
      mask[j] = raw[i] > 20 ? 255 : 0;
    }
    return mask;
  }

  getCurrentImageData() {
    const temp = document.createElement('canvas');
    temp.width = this.imgWidth;
    temp.height = this.imgHeight;
    const ctx = temp.getContext('2d');
    ctx.drawImage(this.currentImg, 0, 0);
    return ctx.getImageData(0, 0, this.imgWidth, this.imgHeight);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CanvasManager };
} else if (typeof window !== 'undefined') {
  window.CanvasManager = CanvasManager;
}
