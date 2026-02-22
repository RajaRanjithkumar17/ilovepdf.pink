import { PDFDocument } from 'pdf-lib';
import { pdfBlob } from './utils';

export async function splitPdf(file: File, fromPage: number, toPage: number): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const source = await PDFDocument.load(bytes);
  const totalPages = source.getPageCount();

  const from = Math.max(1, Math.min(fromPage, totalPages));
  const to = Math.max(from, Math.min(toPage, totalPages));

  const indices: number[] = [];
  for (let i = from - 1; i < to; i++) {
    indices.push(i);
  }

  if (indices.length === 0) {
    throw new Error(`Invalid page range. This PDF has ${totalPages} page(s).`);
  }

  const output = await PDFDocument.create();
  const pages = await output.copyPages(source, indices);
  pages.forEach(page => output.addPage(page));

  return pdfBlob(await output.save());
}
