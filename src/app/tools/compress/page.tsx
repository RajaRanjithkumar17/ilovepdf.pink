'use client';

import ToolPage from '@/components/ToolPage';
import { getToolById } from '@/lib/tools';
import { compressPdf } from '@/lib/pdf/compress';

export default function CompressPage() {
  const tool = getToolById('compress')!;
  return (
    <ToolPage
      tool={tool}
      process={(files, fields, onProgress) =>
        compressPdf(files[0], fields.quality, onProgress)
      }
    />
  );
}
