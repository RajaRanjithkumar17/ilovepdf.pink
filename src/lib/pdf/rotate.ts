import { PDFDocument, degrees } from 'pdf-lib';
import { pdfBlob } from './utils';

export async function rotatePdf(file: File, angle: string): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await PDFDocument.load(bytes);
  const rotation = parseInt(angle, 10);

  for (const page of pdf.getPages()) {
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + rotation) % 360));
  }

  return pdfBlob(await pdf.save());
}
