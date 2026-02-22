'use client';

import ToolPage from '@/components/ToolPage';
import { getToolById } from '@/lib/tools';
import { splitPdf } from '@/lib/pdf/split';

export default function SplitPage() {
  const tool = getToolById('split')!;
  return (
    <ToolPage
      tool={tool}
      process={(files, fields) =>
        splitPdf(files[0], parseInt(fields.fromPage, 10), parseInt(fields.toPage, 10))
      }
    />
  );
}
