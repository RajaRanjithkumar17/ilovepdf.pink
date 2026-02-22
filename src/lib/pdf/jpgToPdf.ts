import { PDFDocument } from 'pdf-lib';
import { pdfBlob } from './utils';

export async function jpgToPdf(files: File[]): Promise<Blob> {
  const pdf = await PDFDocument.create();

  for (const file of files) {
    const { bytes, isPng } = await imageToSupportedFormat(file);

    const image = isPng
      ? await pdf.embedPng(bytes)
      : await pdf.embedJpg(bytes);

    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }

  return pdfBlob(await pdf.save());
}

async function imageToSupportedFormat(
  file: File,
): Promise<{ bytes: Uint8Array; isPng: boolean }> {
  if (file.type === 'image/jpeg') {
    return { bytes: new Uint8Array(await file.arrayBuffer()), isPng: false };
  }
  if (file.type === 'image/png') {
    return { bytes: new Uint8Array(await file.arrayBuffer()), isPng: true };
  }

  // Convert WEBP, TIFF, etc. to PNG via canvas
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error(`Failed to convert ${file.name}`));
            return;
          }
          blob
            .arrayBuffer()
            .then((buf) => resolve({ bytes: new Uint8Array(buf), isPng: true }));
        },
        'image/png',
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error(`Failed to load image ${file.name}`));
    };
    img.src = URL.createObjectURL(file);
  });
}
