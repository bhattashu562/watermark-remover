/**
 * Retouch & Watermark Remover Application Controller
 * Inspired by Pixelcut.ai Retouch UX
 */

/* global CanvasManager, InpaintEngine, SampleGenerator */

class RetouchApp {
  constructor() {
    this.canvasManager = null;
    this.worker = null;
    this.isProcessing = false;
    this.activeSamplePreset = null;
    this.inpaintOptions = {
      mode: 'gemini', // 'gemini' (specialist biharmonic), 'texture', 'smooth'
      dilate: 2,
      patchRadius: 4,
      searchRadius: 36
    };

    this.initElements();
    this.initWorker();
    this.initCanvas();
    this.initSamples();
    this.bindEvents();
    this.showUploadView();
  }

  initElements() {
    // Views
    this.uploadView = document.getElementById('uploadView');
    this.editorView = document.getElementById('editorView');
    this.canvasContainer = document.getElementById('canvasContainer');

    // Upload Elements
    this.dropZone = document.getElementById('dropZone');
    this.fileInput = document.getElementById('fileInput');
    this.browseBtn = document.getElementById('browseBtn');
    this.samplesGrid = document.getElementById('samplesGrid');

    // Top Bar Elements
    this.newImageBtn = document.getElementById('newImageBtn');
    this.imageMetaBadge = document.getElementById('imageMetaBadge');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.downloadDropdown = document.getElementById('downloadDropdown');
    this.settingsBtn = document.getElementById('settingsBtn');
    this.settingsModal = document.getElementById('settingsModal');
    this.closeSettingsBtn = document.getElementById('closeSettingsBtn');

    // Floating Tool Dock
    this.toolBrush = document.getElementById('toolBrush');
    this.toolEraser = document.getElementById('toolEraser');
    this.toolBox = document.getElementById('toolBox');
    this.toolLasso = document.getElementById('toolLasso');
    this.toolPan = document.getElementById('toolPan');
    this.brushSizeSlider = document.getElementById('brushSizeSlider');
    this.brushSizeValue = document.getElementById('brushSizeValue');
    this.brushSizePreview = document.getElementById('brushSizePreview');
    this.undoBtn = document.getElementById('undoBtn');
    this.redoBtn = document.getElementById('redoBtn');
    this.clearMaskBtn = document.getElementById('clearMaskBtn');
    this.autoGeminiBtn = document.getElementById('autoGeminiBtn');
    this.inpaintBtn = document.getElementById('inpaintBtn');

    // Comparison & Zoom Dock
    this.compareBtn = document.getElementById('compareBtn');
    this.splitSliderBtn = document.getElementById('splitSliderBtn');
    this.fitScreenBtn = document.getElementById('fitScreenBtn');
    this.zoomInBtn = document.getElementById('zoomInBtn');
    this.zoomOutBtn = document.getElementById('zoomOutBtn');
    this.zoomLevelText = document.getElementById('zoomLevelText');
    this.undoRetouchBtn = document.getElementById('undoRetouchBtn');

    // Progress Dialog
    this.progressModal = document.getElementById('progressModal');
    this.progressBar = document.getElementById('progressBar');
    this.progressPercent = document.getElementById('progressPercent');
    this.progressStatus = document.getElementById('progressStatus');
    this.cancelProcessBtn = document.getElementById('cancelProcessBtn');

    // Shortcuts Modal
    this.shortcutsBtn = document.getElementById('shortcutsBtn');
    this.shortcutsModal = document.getElementById('shortcutsModal');
    this.closeShortcutsBtn = document.getElementById('closeShortcutsBtn');

    // Toast Container
    this.toastContainer = document.getElementById('toastContainer');
  }

  initWorker() {
    // Try spawning Web Worker
    try {
      this.worker = new Worker('js/worker.js');
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = (e) => {
        console.warn('Worker error, fallback to synchronous inpainting engine', e);
        this.worker = null;
      };
    } catch (e) {
      console.warn('Worker initialization failed (likely file:// protocol), using direct thread', e);
      this.worker = null;
    }
  }

  initCanvas() {
    this.canvasManager = new CanvasManager(this.canvasContainer);
    this.canvasManager.onStateChange = this.updateUIStates.bind(this);
  }

  initSamples() {
    const samples = SampleGenerator.getSamples();
    this.samplesGrid.innerHTML = '';

    samples.forEach((sample) => {
      const card = document.createElement('div');
      card.className = 'sample-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Try sample: ${sample.title}`);

      // Generate preview thumbnail
      const imgDataUrl = sample.generate();

      card.innerHTML = `
        <div class="sample-thumbnail">
          <img src="${imgDataUrl}" alt="${sample.title}" loading="lazy">
          <span class="sample-category-badge">${sample.category}</span>
          <div class="sample-hover-overlay">
            <span class="sample-try-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              Try Retouch
            </span>
          </div>
        </div>
        <div class="sample-info">
          <h4>${sample.title}</h4>
          <p>${sample.description}</p>
        </div>
      `;

      const loadThisSample = () => {
        this.loadSample(sample, imgDataUrl);
      };

      card.addEventListener('click', loadThisSample);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          loadThisSample();
        }
      });

      this.samplesGrid.appendChild(card);
    });
  }

  bindEvents() {
    // Drop Zone & File Selection
    this.browseBtn.addEventListener('click', () => this.fileInput.click());
    this.dropZone.addEventListener('click', (e) => {
      if (e.target !== this.browseBtn && !this.browseBtn.contains(e.target)) {
        this.fileInput.click();
      }
    });

    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleFileSelected(e.target.files[0]);
      }
    });

    // Drag & Drop
    ['dragenter', 'dragover'].forEach((eventName) => {
      this.dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      this.dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.remove('drag-active');
      });
    });

    this.dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files[0]) {
        this.handleFileSelected(files[0]);
      }
    });

    // Clipboard Paste (Cmd+V / Ctrl+V anywhere)
    window.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            this.handleFileSelected(blob, 'pasted-image.png');
            this.showToast('Image pasted from clipboard!', 'success');
            break;
          }
        }
      }
    });

    // New Image button
    this.newImageBtn.addEventListener('click', () => {
      this.showUploadView();
    });

    // Tool switching
    const tools = [
      { el: this.toolBrush, name: 'brush' },
      { el: this.toolEraser, name: 'eraser' },
      { el: this.toolBox, name: 'box' },
      { el: this.toolLasso, name: 'lasso' },
      { el: this.toolPan, name: 'pan' }
    ];

    tools.forEach(({ el, name }) => {
      if (!el) return;
      el.addEventListener('click', () => {
        tools.forEach((t) => t.el.classList.remove('active'));
        el.classList.add('active');
        this.canvasManager.setTool(name);
      });
    });

    // Brush Size Slider
    this.brushSizeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.setBrushSize(val);
    });

    // Undo / Redo
    this.undoBtn.addEventListener('click', () => this.canvasManager.undo());
    this.redoBtn.addEventListener('click', () => this.canvasManager.redo());
    this.clearMaskBtn.addEventListener('click', () => {
      this.canvasManager.clearMask();
      this.showToast('Mask cleared', 'info');
    });

    // 1-Click Auto Gemini Watermark Selector
    if (this.autoGeminiBtn) {
      this.autoGeminiBtn.addEventListener('click', () => {
        if (!this.canvasManager || !this.canvasManager.currentImg) return;
        const w = this.canvasManager.imgWidth;
        const h = this.canvasManager.imgHeight;
        // Gemini & Imagen standard watermark is positioned in bottom-right corner
        const boxSize = Math.max(36, Math.min(68, Math.round(Math.min(w, h) * 0.12)));
        const preset = {
          type: 'rect',
          x: Math.round(w - boxSize - 12),
          y: Math.round(h - boxSize - 12),
          width: boxSize,
          height: boxSize
        };
        this.canvasManager.applyPresetMask(preset);
        this.showToast('Targeted Gemini sparkle watermark! Click "Remove Watermark" to erase.', 'success');
      });
    }

    // Primary Retouch / Inpaint Button
    this.inpaintBtn.addEventListener('click', () => this.startInpaint());

    // Comparison Buttons
    // Hold to compare
    this.compareBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.canvasManager.setHoldCompare(true);
      this.compareBtn.classList.add('active');
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach((evt) => {
      this.compareBtn.addEventListener(evt, () => {
        this.canvasManager.setHoldCompare(false);
        this.compareBtn.classList.remove('active');
      });
    });

    // Split Slider toggle
    this.splitSliderBtn.addEventListener('click', () => {
      const active = !this.canvasManager.splitSliderActive;
      this.canvasManager.setSplitSliderMode(active);
      this.splitSliderBtn.classList.toggle('active', active);
      if (active) {
        this.showToast('Drag center handle to compare before & after', 'info');
      }
    });

    // Undo Retouch (revert step)
    this.undoRetouchBtn.addEventListener('click', () => {
      this.canvasManager.undoRetouch();
      this.showToast('Reverted to previous retouch state', 'info');
    });

    // Zoom buttons
    this.fitScreenBtn.addEventListener('click', () => this.canvasManager.fitToScreen());
    this.zoomInBtn.addEventListener('click', () => this.canvasManager.setZoom(this.canvasManager.zoom * 1.25));
    this.zoomOutBtn.addEventListener('click', () => this.canvasManager.setZoom(this.canvasManager.zoom * 0.8));

    // Cancel Process
    this.cancelProcessBtn.addEventListener('click', () => {
      if (this.worker) {
        this.worker.postMessage({ type: 'cancel' });
      }
      if (this.currentEngine) {
        this.currentEngine.cancel();
      }
      this.isProcessing = false;
      this.hideProgress();
      this.showToast('Retouch cancelled', 'warning');
    });

    // Download dropdown
    this.downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.downloadDropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      this.downloadDropdown.classList.remove('show');
    });

    document.querySelectorAll('[data-export-format]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const format = e.currentTarget.getAttribute('data-export-format');
        this.downloadImage(format);
      });
    });

    // Settings Modal
    this.settingsBtn.addEventListener('click', () => {
      this.settingsModal.showModal();
    });
    this.closeSettingsBtn.addEventListener('click', () => {
      this.settingsModal.close();
    });
    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) this.settingsModal.close();
    });

    // Settings Form Radios
    document.querySelectorAll('input[name="inpaintMode"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        this.inpaintOptions.mode = e.target.value;
      });
    });

    // Shortcuts Modal
    this.shortcutsBtn.addEventListener('click', () => this.shortcutsModal.showModal());
    this.closeShortcutsBtn.addEventListener('click', () => this.shortcutsModal.close());
    this.shortcutsModal.addEventListener('click', (e) => {
      if (e.target === this.shortcutsModal) this.shortcutsModal.close();
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      if (key === 'b') {
        this.toolBrush.click();
      } else if (key === 'e') {
        this.toolEraser.click();
      } else if (key === 'r') {
        this.toolBox.click();
      } else if (key === 'l') {
        this.toolLasso.click();
      } else if (key === 'h') {
        this.toolPan.click();
      } else if (key === 'c') {
        this.splitSliderBtn.click();
      } else if (e.key === 'Enter' && !this.isProcessing && this.canvasManager.hasMask()) {
        this.startInpaint();
      } else if (key === '?') {
        this.shortcutsModal.showModal();
      }
    });
  }

  setBrushSize(val) {
    this.brushSizeSlider.value = val;
    this.brushSizeValue.textContent = `${val}px`;
    if (this.brushSizePreview) {
      this.brushSizePreview.style.width = `${Math.min(36, val)}px`;
      this.brushSizePreview.style.height = `${Math.min(36, val)}px`;
    }
    this.canvasManager.setBrushSize(val);
  }

  showUploadView() {
    this.uploadView.style.display = 'block';
    this.editorView.style.display = 'none';
    this.newImageBtn.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.imageMetaBadge.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showEditorView() {
    this.uploadView.style.display = 'none';
    this.editorView.style.display = 'flex';
    this.newImageBtn.style.display = 'inline-flex';
    this.downloadBtn.style.display = 'inline-flex';
    this.imageMetaBadge.style.display = 'inline-block';
  }

  async handleFileSelected(file, customName = null) {
    if (!file || !file.type.match('image.*')) {
      this.showToast('Please select a valid image file (PNG, JPG, WebP)', 'error');
      return;
    }

    try {
      this.showEditorView();
      await this.canvasManager.loadImage(file);

      const fileName = customName || file.name || 'image.png';
      this.imageMetaBadge.textContent = `${this.canvasManager.imgWidth} × ${this.canvasManager.imgHeight} px`;

      this.showToast(`Loaded ${fileName} (${this.canvasManager.imgWidth}×${this.canvasManager.imgHeight})`, 'success');
    } catch (err) {
      this.showToast(`Error loading image: ${err.message}`, 'error');
      this.showUploadView();
    }
  }

  async loadSample(sample, imgDataUrl) {
    try {
      this.showEditorView();
      await this.canvasManager.loadImage(imgDataUrl);

      this.imageMetaBadge.textContent = `${this.canvasManager.imgWidth} × ${this.canvasManager.imgHeight} px`;

      // Apply default mask for this sample to demonstrate magic immediately!
      const preset = sample.defaultMask(this.canvasManager.imgWidth, this.canvasManager.imgHeight);
      this.canvasManager.applyPresetMask(preset);

      this.showToast(
        `Loaded "${sample.title}". Watermark is highlighted in pink! Click "Remove Watermark" to test.`,
        'success',
        6000
      );
    } catch (err) {
      this.showToast(`Error loading sample: ${err.message}`, 'error');
    }
  }

  updateUIStates() {
    if (!this.canvasManager) return;

    // Undo / Redo buttons
    this.undoBtn.disabled = !this.canvasManager.canUndo();
    this.redoBtn.disabled = !this.canvasManager.canRedo();
    this.clearMaskBtn.disabled = !this.canvasManager.hasMask();

    // Zoom indicator
    const zoomPct = Math.round(this.canvasManager.zoom * 100);
    this.zoomLevelText.textContent = `${zoomPct}%`;

    // Undo Retouch button
    this.undoRetouchBtn.disabled = !this.canvasManager.canUndoRetouch();
    this.compareBtn.disabled = !this.canvasManager.canUndoRetouch();
    this.splitSliderBtn.disabled = !this.canvasManager.canUndoRetouch();

    // Inpaint button disabled state
    const hasMask = this.canvasManager.hasMask();
    this.inpaintBtn.disabled = !hasMask || this.isProcessing;
    if (this.autoGeminiBtn) this.autoGeminiBtn.disabled = !this.canvasManager.currentImg || this.isProcessing;
  }

  async startInpaint() {
    if (this.isProcessing) return;

    if (!this.canvasManager.hasMask()) {
      this.showToast('Please brush over the watermark or object you want to remove first!', 'info');
      return;
    }

    this.isProcessing = true;
    this.showProgress();

    const imgData = this.canvasManager.getCurrentImageData();
    const mask = this.canvasManager.getMaskBinary();
    const options = { ...this.inpaintOptions };

    if (this.worker) {
      // Run in Web Worker
      this.worker.postMessage({
        type: 'inpaint',
        image: imgData,
        mask: mask,
        options: options,
        id: Date.now()
      });
    } else {
      // Run asynchronously on main thread with non-blocking microtasks
      try {
        const engine = new InpaintEngine();
        this.currentEngine = engine;
        this.progressStatus.textContent = 'Analyzing texture and synthesizing replacement...';
        await new Promise((r) => setTimeout(r, 60));

        const result = await engine.process(imgData, mask, options, (progress) => {
          this.updateProgress(progress);
        });

        if (result && !engine.cancelled) {
          this.canvasManager.applyInpaintResult(result);
          this.showToast('Watermark removed seamlessly! Click "Split View" to compare.', 'success');
        }
      } catch (err) {
        this.showToast(`Inpaint failed: ${err.message}`, 'error');
      } finally {
        this.hideProgress();
        this.isProcessing = false;
        this.currentEngine = null;
        this.updateUIStates();
      }
    }
  }

  handleWorkerMessage(e) {
    const { type, progress, result, error } = e.data;

    if (type === 'progress') {
      this.updateProgress(progress);
    } else if (type === 'success') {
      this.canvasManager.applyInpaintResult(result);
      this.hideProgress();
      this.isProcessing = false;
      this.updateUIStates();
      this.showToast('Watermark removed seamlessly! Click "Split View" to compare.', 'success');
    } else if (type === 'error') {
      this.hideProgress();
      this.isProcessing = false;
      this.updateUIStates();
      this.showToast(`Retouch failed: ${error}`, 'error');
    } else if (type === 'cancelled') {
      this.hideProgress();
      this.isProcessing = false;
      this.updateUIStates();
    }
  }

  showProgress() {
    this.progressModal.showModal();
    this.progressBar.style.width = '5%';
    this.progressPercent.textContent = '5%';
    this.progressStatus.textContent = 'Analyzing pixels & mask contours...';
  }

  updateProgress(pct) {
    const rounded = Math.round(pct * 100);
    this.progressBar.style.width = `${rounded}%`;
    this.progressPercent.textContent = `${rounded}%`;
    if (rounded < 30) {
      this.progressStatus.textContent = 'Harmonic boundary condition matching...';
    } else if (rounded < 75) {
      this.progressStatus.textContent = 'Navier-Stokes biharmonic stream continuation...';
    } else {
      this.progressStatus.textContent = 'Synthesizing local micro-texture & grain...';
    }
  }

  hideProgress() {
    this.progressModal.close();
  }

  downloadImage(format) {
    let mimeType = 'image/png';
    let ext = 'png';
    let quality = 0.95;

    if (format === 'jpeg') {
      mimeType = 'image/jpeg';
      ext = 'jpg';
      quality = 0.92;
    } else if (format === 'webp') {
      mimeType = 'image/webp';
      ext = 'webp';
      quality = 0.95;
    }

    const dataUrl = this.canvasManager.exportImage(mimeType, quality);
    const link = document.createElement('a');
    link.download = `retouched-image-${Date.now()}.${ext}`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast(`Downloaded HD image as ${ext.toUpperCase()}`, 'success');
  }

  showToast(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = '✨';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '✕';
    if (type === 'warning') icon = '⚠';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
    `;

    this.toastContainer.appendChild(toast);

    // Trigger enter animation
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new RetouchApp();
});
