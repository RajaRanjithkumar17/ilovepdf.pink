import { PDFDocument } from 'pdf-lib';
import { pdfBlob } from './utils';

export async function reorderPdf(file: File, pageOrder: string): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const source = await PDFDocument.load(bytes);
  const totalPages = source.getPageCount();

  const indices = pageOrder
    .split(',')
    .map(s => parseInt(s.trim(), 10) - 1)
    .filter(n => !isNaN(n) && n >= 0 && n < totalPages);

  if (indices.length === 0) {
    throw new Error(`Invalid page order. This PDF has ${totalPages} page(s).`);
  }

  const output = await PDFDocument.create();
  const copiedPages = await output.copyPages(source, indices);
  copiedPages.forEach(page => output.addPage(page));

  return pdfBlob(await output.save());
}
