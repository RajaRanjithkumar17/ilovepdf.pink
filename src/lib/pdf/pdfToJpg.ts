import { loadPdfJs, renderPageToCanvas } from './utils';

export async function pdfToJpg(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  const pdfjs = await loadPdfJs();
  const JSZip = (await import('jszip')).default;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;

  const zip = new JSZip();

  for (let i = 1; i <= pdf.numPages; i++) {
    const canvas = await renderPageToCanvas(pdf, i, 2);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.92);
    });

    const pad = String(i).padStart(String(pdf.numPages).length, '0');
    zip.file(`page-${pad}.jpg`, blob);

    onProgress?.(Math.round((i / pdf.numPages) * 100));
  }

  return zip.generateAsync({ type: 'blob' });
}
