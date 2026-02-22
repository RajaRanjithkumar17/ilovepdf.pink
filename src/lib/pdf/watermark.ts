import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { pdfBlob } from './utils';

export async function watermarkPdf(file: File, text: string): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const fontSize = Math.min(width, height) / 8;
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    // Position so the text is roughly centered when rotated 45°
    const cos45 = Math.cos(Math.PI / 4);
    const sin45 = Math.sin(Math.PI / 4);

    page.drawText(text, {
      x: width / 2 - (textWidth / 2) * cos45,
      y: height / 2 - (textWidth / 2) * sin45,
      size: fontSize,
      font,
      color: rgb(0.75, 0.75, 0.75),
      opacity: 0.3,
      rotate: degrees(45),
    });
  }

  return pdfBlob(await pdf.save());
}
