'use client';

import ToolPage from '@/components/ToolPage';
import { getToolById } from '@/lib/tools';
import { pdfToWord } from '@/lib/pdf/pdfToWord';

export default function PdfToWordPage() {
  const tool = getToolById('pdf-to-word')!;

  return (
    <ToolPage
      tool={tool}
      process={(files, _fields, onProgress) => pdfToWord(files[0], onProgress)}
    />
  );
}
