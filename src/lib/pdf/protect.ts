import { loadPdfJs } from './utils';
import { jsPDF } from 'jspdf';

/**
 * Protects a PDF by rendering pages and creating a new encrypted PDF using jsPDF.
 * Uses AES-128 encryption with the provided password.
 */
export async function protectPdf(file: File, password: string): Promise<Blob> {
  const pdfjs = await loadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());

  const sourcePdf = await pdfjs.getDocument({ data: bytes }).promise;
  const numPages = sourcePdf.numPages;

  // Get first page to determine orientation and size
  const firstPage = await sourcePdf.getPage(1);
  const firstViewport = firstPage.getViewport({ scale: 2.0 });
  const isLandscape = firstViewport.width > firstViewport.height;

  // Create encrypted PDF with jsPDF
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'px',
    format: [firstViewport.width, firstViewport.height],
    encryption: {
      userPassword: password,
      ownerPassword: password,
      userPermissions: ['print'],
    },
  });

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await sourcePdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });

    // Render page to canvas
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const imageData = canvas.toDataURL('image/jpeg', 0.95);

    if (pageNum > 1) {
      doc.addPage([viewport.width, viewport.height], viewport.width > viewport.height ? 'landscape' : 'portrait');
    }

    doc.addImage(imageData, 'JPEG', 0, 0, viewport.width, viewport.height);
  }

  sourcePdf.destroy();

  // Return as blob
  const pdfOutput = doc.output('arraybuffer');
  return new Blob([pdfOutput], { type: 'application/pdf' });
}
