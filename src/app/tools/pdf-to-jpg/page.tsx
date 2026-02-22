'use client';

import ToolPage from '@/components/ToolPage';
import { getToolById } from '@/lib/tools';
import { pdfToJpg } from '@/lib/pdf/pdfToJpg';

export default function PdfToJpgPage() {
  const tool = getToolById('pdf-to-jpg')!;
  return (
    <ToolPage
      tool={tool}
      process={(files, _fields, onProgress) => pdfToJpg(files[0], onProgress)}
    />
  );
}
