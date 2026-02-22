'use client';

import ToolPage from '@/components/ToolPage';
import { getToolById } from '@/lib/tools';
import { jpgToPdf } from '@/lib/pdf/jpgToPdf';

export default function JpgToPdfPage() {
  const tool = getToolById('jpg-to-pdf')!;
  return (
    <ToolPage
      tool={tool}
      process={(files) => jpgToPdf(files)}
    />
  );
}
