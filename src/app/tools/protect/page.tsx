'use client';

import ToolPage from '@/components/ToolPage';
import { getToolById } from '@/lib/tools';
import { protectPdf } from '@/lib/pdf/protect';

export default function ProtectPage() {
  const tool = getToolById('protect')!;

  return (
    <ToolPage
      tool={tool}
      process={(files, fields) => protectPdf(files[0], fields.password)}
    />
  );
}
