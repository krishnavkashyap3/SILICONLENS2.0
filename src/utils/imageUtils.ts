import type { UploadedImage } from '../types/analysis';

const MAX_DIMENSION = 1400;
const MAX_RAW_BYTES = 900 * 1024;

function readImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Could not decode image dimensions.'));
    img.src = dataUrl;
  });
}

async function normalizeDataUrl(
  rawDataUrl: string,
  mimeType: string,
  name: string
): Promise<UploadedImage> {
  const { width, height } = await readImageDimensions(rawDataUrl);

  const rawBase64 = rawDataUrl.split(',')[1] ?? '';
  const rawBytes = Math.round((rawBase64.length * 3) / 4);
  const needsResize = width > MAX_DIMENSION || height > MAX_DIMENSION;
  const needsCompress = rawBytes > MAX_RAW_BYTES;

  let finalDataUrl = rawDataUrl;
  let finalMime = mimeType;
  let finalWidth = width;
  let finalHeight = height;

  if (needsResize || needsCompress) {
    const scale = needsResize
      ? Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
      : 1;
    finalWidth = Math.max(1, Math.round(width * scale));
    finalHeight = Math.max(1, Math.round(height * scale));

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for optimization.'));
      img.src = rawDataUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
      finalMime = 'image/jpeg';
      finalDataUrl = canvas.toDataURL('image/jpeg', 0.86);
    }
  }

  const base64 = finalDataUrl.split(',')[1] ?? '';
  const estimatedBytes = Math.round((base64.length * 3) / 4);

  return {
    dataUrl: finalDataUrl,
    base64,
    mimeType: finalMime,
    name,
    sizeBytes: estimatedBytes,
    width: finalWidth,
    height: finalHeight,
  };
}

export async function processImageFile(file: File): Promise<UploadedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (PNG, JPG, or WEBP).');
  }

  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Image file is larger than 15 MB. Please upload a smaller photo.');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  return normalizeDataUrl(rawDataUrl, file.type || 'image/jpeg', file.name);
}

export async function processImageUrl(url: string, name: string): Promise<UploadedImage> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Unable to load sample component photo.');
  }
  const blob = await response.blob();
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to decode sample image.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to decode sample image.'));
    reader.readAsDataURL(blob);
  });

  return normalizeDataUrl(rawDataUrl, blob.type || 'image/jpeg', name);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
