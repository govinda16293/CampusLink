import { AVATAR_PIXELS } from '@campuslink/shared';

/**
 * Resizes and centre-crops an image file to a square data URL, in the browser.
 *
 * Doing this client-side matters: a phone camera photo is several megabytes, and uploading one
 * raw would be slow on campus wifi and would need a much larger request limit on the API. A
 * 320px square at JPEG quality 0.82 lands around 20–30 KB, which is small enough to send as
 * ordinary JSON and to store without a separate file service.
 *
 * The crop is centred rather than stretched — a squashed face is worse than a tight one.
 */
export function resizeImageToSquareDataUrl(file, size = AVATAR_PIXELS) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('That file is not an image'));
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Centre-crop to a square from the original's shorter edge.
        const edge = Math.min(image.width, image.height);
        const sx = (image.width - edge) / 2;
        const sy = (image.height - edge) / 2;

        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, sx, sy, edge, edge, 0, 0, size, size);

        // JPEG rather than PNG: a photograph compresses an order of magnitude smaller, and an
        // avatar has no transparency to preserve.
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch (error) {
        reject(error);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That image could not be read'));
    };

    image.src = url;
  });
}
