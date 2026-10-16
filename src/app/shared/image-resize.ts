import { t } from '../core/i18n/i18n';

/** Longest side of an uploaded photo, and of the thumbnail in lists. */
export const PHOTO_MAX_SIDE = 1600;
export const THUMBNAIL_MAX_SIDE = 400;

export class ImageResizeError extends Error {}

export interface ResizedPhoto {
  photo: Blob;
  thumbnail: Blob;
}

/**
 * Resizes a photo in the browser to at most {@link PHOTO_MAX_SIDE} pixels, plus a thumbnail. The
 * photo is saved as JPEG again; that also removes the EXIF data (such as the GPS location) and
 * a phone photo is upright right away.
 */
export async function resizePhoto(file: Blob): Promise<ResizedPhoto> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageResizeError(t('photos.unreadable'));
  }
  try {
    return {
      photo: await toJpeg(bitmap, PHOTO_MAX_SIDE, 0.85),
      thumbnail: await toJpeg(bitmap, THUMBNAIL_MAX_SIDE, 0.8),
    };
  } finally {
    bitmap.close();
  }
}

/** Dimensions within maxSide, keeping the aspect ratio; never enlarges. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

async function toJpeg(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<Blob> {
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new ImageResizeError(t('photos.cannotResize'));
  // White background for transparent PNGs (JPEG has no transparency).
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ImageResizeError(t('photos.resizeFailed')))),
      'image/jpeg',
      quality,
    ),
  );
}
