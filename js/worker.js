/**
 * Web Worker for Retouch & Inpainting operations
 */

/* global importScripts, InpaintEngine */
try {
  importScripts('inpainter.js');
} catch (e) {
  // If running in environment without importScripts or inline blob
}

let currentEngine = null;

self.onmessage = async function (e) {
  const { type, image, mask, options, id } = e.data;

  if (type === 'cancel') {
    if (currentEngine) {
      currentEngine.cancel();
    }
    return;
  }

  if (type === 'inpaint') {
    try {
      currentEngine = new InpaintEngine();

      const result = await currentEngine.process(
        image,
        mask,
        options,
        (progress) => {
          self.postMessage({ type: 'progress', progress, id });
        }
      );

      if (currentEngine.cancelled) {
        self.postMessage({ type: 'cancelled', id });
      } else {
        self.postMessage({ type: 'success', result, id }, [result.data.buffer]);
      }
    } catch (err) {
      self.postMessage({ type: 'error', error: err.message, id });
    } finally {
      currentEngine = null;
    }
  }
};

