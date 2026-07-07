export interface PixelCrop { x: number; y: number; width: number; height: number }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

// Crop to the selected square and downscale to `size`×`size` so uploads stay small
// (a WhatsApp-style avatar). Returns a JPEG blob.
export async function getCroppedBlob(src: string, crop: PixelCrop, size = 512): Promise<Blob> {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, size, size);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/jpeg', 0.9);
  });
}

export function readFileAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}
