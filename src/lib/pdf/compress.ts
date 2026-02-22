import { PDFDocument } from 'pdf-lib';
import { loadPdfJs, renderPageToCanvas, pdfBlob } from './utils';

export async function compressPdf(
  file: File,
  quality: string,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  // For high/maximum quality: re-save with pdf-lib (removes incremental updates, unused objects)
  // For medium/low: render pages as JPEG images at reduced quality (aggressive compression)
  if (quality === 'high' || quality === 'maximum') {
    return losslessCompress(file, quality);
  }
  return lossyCompress(file, quality, onProgress);
}

async function losslessCompress(file: File, quality: string): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await PDFDocument.load(bytes);

  if (quality === 'high') {
    pdf.setTitle('');
    pdf.setAuthor('');
    pdf.setSubject('');
    pdf.setKeywords([]);
    pdf.setProducer('');
    pdf.setCreator('');
  }

  const pdfBytes = await pdf.save({
    useObjectStreams: true,
  });
  return pdfBlob(pdfBytes);
}

async function lossyCompress(
  file: File,
  quality: string,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  const pdfjs = await loadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;

  const dpi = quality === 'low' ? 1.0 : 1.5;
  const jpegQuality = quality === 'low' ? 0.5 : 0.7;

  const { PDFDocument: PdfLibDoc } = await import('pdf-lib');
  const output = await PdfLibDoc.create();

  for (let i = 1; i <= pdf.numPages; i++) {
    const canvas = await renderPageToCanvas(pdf, i, dpi);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', jpegQuality);
    });
    const imgBytes = new Uint8Array(await blob.arrayBuffer());
    const image = await output.embedJpg(imgBytes);

    const pdfPage = output.addPage([viewport.width, viewport.height]);
    pdfPage.drawImage(image, {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
    });

    onProgress?.(Math.round((i / pdf.numPages) * 100));
  }

  const pdfBytes = await output.save();
  return pdfBlob(pdfBytes);
}
