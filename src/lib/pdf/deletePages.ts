import { PDFDocument } from 'pdf-lib';
import { pdfBlob } from './utils';

export async function deletePagesPdf(file: File, pages: string): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const source = await PDFDocument.load(bytes);
  const totalPages = source.getPageCount();

  const toDelete = new Set(
    pages
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n >= 1 && n <= totalPages),
  );

  if (toDelete.size === 0) {
    throw new Error('No valid pages specified to delete.');
  }
  if (toDelete.size >= totalPages) {
    throw new Error('Cannot delete all pages from the PDF.');
  }

  const keepIndices: number[] = [];
  for (let i = 0; i < totalPages; i++) {
    if (!toDelete.has(i + 1)) {
      keepIndices.push(i);
    }
  }

  const output = await PDFDocument.create();
  const copiedPages = await output.copyPages(source, keepIndices);
  copiedPages.forEach(page => output.addPage(page));

  return pdfBlob(await output.save());
}
