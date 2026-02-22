import { loadPdfJs } from './utils';
import JSZip from 'jszip';

/**
 * Converts PDF to Word by rendering each page as a high-quality image
 * and embedding it in a DOCX document. This preserves exact layout,
 * fonts, colors, and positioning from the original PDF.
 *
 * Builds the DOCX (Office Open XML) manually with JSZip to avoid
 * issues with the `docx` package's image handling in browsers.
 */
export async function pdfToWord(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  const pdfjs = await loadPdfJs();

  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const totalPages = pdf.numPages;

  if (totalPages === 0) {
    throw new Error('This PDF has no pages.');
  }

  const RENDER_SCALE = 2;

  // Collect page data: rendered image (base64) + dimensions
  const pages: { base64: string; widthPt: number; heightPt: number }[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const renderViewport = page.getViewport({ scale: RENDER_SCALE });

    const canvas = document.createElement('canvas');
    canvas.width = renderViewport.width;
    canvas.height = renderViewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];

    pages.push({
      base64,
      widthPt: viewport.width,
      heightPt: viewport.height,
    });

    onProgress?.(Math.round((pageNum / totalPages) * 100));
  }

  pdf.destroy();

  // Build DOCX using JSZip
  return buildDocx(pages);
}

/* ──────────────────────────────────────────────────────────
   Build a valid DOCX (Office Open XML) zip archive manually
   ────────────────────────────────────────────────────────── */

interface PageData {
  base64: string;
  widthPt: number;
  heightPt: number;
}

function buildDocx(pages: PageData[]): Promise<Blob> {
  const zip = new JSZip();

  // 1 point = 20 twips (for page size)
  // 1 point = 12700 EMU (for image extent)
  const PT_TO_TWIP = 20;
  const PT_TO_EMU = 12700;

  // ── [Content_Types].xml ──
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );

  // ── _rels/.rels ──
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );

  // ── word/_rels/document.xml.rels ──
  const imageRels = pages
    .map(
      (_, i) =>
        `  <Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${i + 1}.png"/>`,
    )
    .join('\n');

  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${imageRels}
</Relationships>`,
  );

  // ── word/media/imageN.png ──
  pages.forEach((page, i) => {
    zip.file(`word/media/image${i + 1}.png`, page.base64, { base64: true });
  });

  // ── word/document.xml ──
  const NS =
    'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

  let bodyXml = '';

  pages.forEach((page, i) => {
    const cx = Math.round(page.widthPt * PT_TO_EMU);
    const cy = Math.round(page.heightPt * PT_TO_EMU);
    const wTwips = Math.round(page.widthPt * PT_TO_TWIP);
    const hTwips = Math.round(page.heightPt * PT_TO_TWIP);
    const rId = `rId${i + 1}`;
    const imgName = `image${i + 1}.png`;
    const picId = i + 1;
    const isLast = i === pages.length - 1;

    // Section properties (for all but last page, goes inside w:pPr)
    const sectPr = `<w:sectPr>
        <w:pgSz w:w="${wTwips}" w:h="${hTwips}"/>
        <w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/>
      </w:sectPr>`;

    bodyXml += `<w:p>
      ${!isLast ? `<w:pPr>${sectPr}</w:pPr>` : ''}
      <w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
      <w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0">
            <wp:extent cx="${cx}" cy="${cy}"/>
            <wp:docPr id="${picId}" name="Picture ${picId}"/>
            <wp:cNvGraphicFramePr>
              <a:graphicFrameLocks noChangeAspect="1"/>
            </wp:cNvGraphicFramePr>
            <a:graphic>
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic>
                  <pic:nvPicPr>
                    <pic:cNvPr id="${picId}" name="${imgName}"/>
                    <pic:cNvPicPr/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="${rId}"/>
                    <a:stretch><a:fillRect/></a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm>
                      <a:off x="0" y="0"/>
                      <a:ext cx="${cx}" cy="${cy}"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>\n`;

    // Last page: body-level sectPr
    if (isLast) {
      bodyXml += sectPr + '\n';
    }
  });

  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${NS}>
  <w:body>
${bodyXml}  </w:body>
</w:document>`,
  );

  return zip.generateAsync({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });
}
