'use client';

import ToolPage from '@/components/ToolPage';
import { getToolById } from '@/lib/tools';
import { deletePagesPdf } from '@/lib/pdf/deletePages';

export default function DeletePagesPage() {
  const tool = getToolById('delete-pages')!;
  return (
    <ToolPage
      tool={tool}
      process={(files, fields) => deletePagesPdf(files[0], fields.pages)}
    />
  );
}
