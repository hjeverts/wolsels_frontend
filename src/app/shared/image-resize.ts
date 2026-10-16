/** Langste zijde van een geüploade foto, en van de miniatuur in lijsten. */
export const PHOTO_MAX_SIDE = 1600;
export const THUMBNAIL_MAX_SIDE = 400;

export class ImageResizeError extends Error {}

export interface ResizedPhoto {
  photo: Blob;
  thumbnail: Blob;
}

/**
 * Verkleint een foto in de browser tot maximaal {@link PHOTO_MAX_SIDE} pixels, plus een miniatuur. De
 * foto wordt opnieuw als JPEG opgeslagen; zo verdwijnen ook de EXIF-gegevens (zoals de GPS-locatie) en
 * staat een telefoonfoto meteen goed rechtop.
 */
export async function resizePhoto(file: Blob): Promise<ResizedPhoto> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageResizeError('Dit bestand kan niet als foto gelezen worden. Gebruik een JPEG- of PNG-foto.');
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

/** Afmetingen binnen maxSide, met behoud van verhouding; nooit vergroten. */
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
  if (!context) throw new ImageResizeError('Je browser kan deze foto niet verkleinen.');
  // Witte achtergrond voor transparante PNG's (JPEG kent geen transparantie).
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ImageResizeError('De foto kon niet verkleind worden.'))),
      'image/jpeg',
      quality,
    ),
  );
}
