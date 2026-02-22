'use client';

import ToolPage from '@/components/ToolPage';
import { getToolById } from '@/lib/tools';
import { rotatePdf } from '@/lib/pdf/rotate';

export default function RotatePage() {
  const tool = getToolById('rotate')!;
  return (
    <ToolPage
      tool={tool}
      process={(files, fields) => rotatePdf(files[0], fields.angle)}
    />
  );
}
