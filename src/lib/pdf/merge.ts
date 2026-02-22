import { PDFDocument } from 'pdf-lib';
import { pdfBlob } from './utils';

export async function mergePdfs(files: File[]): Promise<Blob> {
  const merged = await PDFDocument.create();

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(pdf, pdf.getPageIndices());
    pages.forEach(page => merged.addPage(page));
  }

  return pdfBlob(await merged.save());
}
