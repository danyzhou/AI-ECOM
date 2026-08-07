/**
 * Image Canvas Standardize Processor
 * Standardizes product images into a 1:1 standard square canvas (800x800px)
 * with centered product subject and pure white (#FFFFFF) background letterbox padding.
 */
export async function standardizeImageToBase641to1(
  imageInput: string | undefined | null,
  targetSize: number = 800
): Promise<string> {
  if (!imageInput || typeof imageInput !== 'string') {
    return imageInput || '';
  }

  const trimmed = imageInput.trim();
  if (!trimmed) return '';

  // Run in browser environment with HTML5 Canvas support
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      // 5-second timeout safety guard
      const timer = setTimeout(() => {
        console.warn('[Image Canvas Standardizer] Image load timeout, returning original');
        resolve(trimmed);
      }, 5000);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            return resolve(trimmed);
          }

          // 1. Fill background with pure white (#FFFFFF)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetSize, targetSize);

          // 2. Calculate scale factor to preserve aspect ratio (Letterbox padding)
          const srcWidth = img.width || 1;
          const srcHeight = img.height || 1;
          const scale = Math.min(targetSize / srcWidth, targetSize / srcHeight);

          const drawWidth = srcWidth * scale;
          const drawHeight = srcHeight * scale;

          // 3. Center the image in the 1:1 square canvas
          const offsetX = (targetSize - drawWidth) / 2;
          const offsetY = (targetSize - drawHeight) / 2;

          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

          // 4. Export compressed high-quality JPEG (quality: 0.92)
          const base64Result = canvas.toDataURL('image/jpeg', 0.92);
          console.log(`[Image Canvas Standardizer] Standardized image to 1:1 (${targetSize}x${targetSize}px)`);
          resolve(base64Result);
        } catch (e) {
          console.warn('[Image Canvas Standardizer Error]:', e);
          resolve(trimmed);
        }
      };

      img.onerror = (err) => {
        clearTimeout(timer);
        console.warn('[Image Canvas Standardizer] Failed to load image on canvas, returning original:', err);
        resolve(trimmed);
      };

      img.src = trimmed;
    });
  }

  return trimmed;
}

/**
 * Normalizes image URL, stripping hardcoded external domains like ai.zosy.net
 * so that image tags can load local /uploads/... relative paths seamlessly.
 */
export function normalizeImageUrl(url?: string): string {
  if (!url) return '';
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image')) return trimmed;

  // Strip any domain / protocol if /uploads/ is present so that browser loads relative to current origin
  if (trimmed.includes('/uploads/')) {
    const idx = trimmed.indexOf('/uploads/');
    return trimmed.substring(idx);
  }

  return trimmed;
}

/**
 * Helper to batch standardize an array of image strings
 */
export async function standardizeImageArray1to1(
  images: string[] | undefined | null,
  targetSize: number = 800
): Promise<string[]> {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return [];
  }
  const results: string[] = [];
  for (const img of images) {
    const std = await standardizeImageToBase641to1(img, targetSize);
    results.push(std);
  }
  return results;
}
