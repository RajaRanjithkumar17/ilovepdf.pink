'use client';

import ToolPage from '@/components/ToolPage';
import { getToolById } from '@/lib/tools';
import { reorderPdf } from '@/lib/pdf/reorder';

export default function ReorderPage() {
  const tool = getToolById('reorder')!;
  return (
    <ToolPage
      tool={tool}
      process={(files, fields) => reorderPdf(files[0], fields.pageOrder)}
    />
  );
}
