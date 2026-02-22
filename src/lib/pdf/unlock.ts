import { PDFDocument } from 'pdf-lib';
import { pdfBlob, loadPdfJs } from './utils';

/**
 * Unlocks a PDF using the provided password.
 * Strategy 1: Try pdf-lib (works for unencrypted or owner-password-only PDFs)
 * Strategy 2: Use pdfjs-dist with password to decrypt, render, and recreate PDF
 */
export async function unlockPdf(file: File, password: string): Promise<Blob> {
  try {
    // Strategy 1: Try pdf-lib first (fastest, preserves text)
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await PDFDocument.load(bytes);
    const savedBytes = await pdf.save();
    return pdfBlob(savedBytes);
  } catch {
    // Strategy 2: Use pdfjs-dist with password to decrypt and recreate
    return await unlockWithPassword(file, password);
  }
}

/**
 * Opens encrypted PDF with pdfjs-dist using the password,
 * renders all pages to high-quality images, and creates a new unlocked PDF.
 */
async function unlockWithPassword(file: File, password: string): Promise<Blob> {
  const pdfjs = await loadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());

  let sourcePdf;
  try {
    sourcePdf = await pdfjs.getDocument({ data: bytes, password }).promise;
  } catch (error: any) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('incorrect') || msg.includes('password')) {
      throw new Error('Incorrect password. Please check the password and try again.');
    }
    if (msg.includes('no password')) {
      throw new Error('This PDF requires a password to open.');
    }
    throw new Error(`Failed to open PDF: ${error.message}`);
  }

  const numPages = sourcePdf.numPages;
  const newPdf = await PDFDocument.create();

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await sourcePdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const imageBytes = await fetch(imageDataUrl).then(r => r.arrayBuffer());

    const image = await newPdf.embedJpg(new Uint8Array(imageBytes));
    const pdfPage = newPdf.addPage([viewport.width, viewport.height]);
    pdfPage.drawImage(image, {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
    });
  }

  sourcePdf.destroy();
  return pdfBlob(await newPdf.save());
}
