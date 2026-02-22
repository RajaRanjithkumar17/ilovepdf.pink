export interface Tool {
  id: string;
  name: string;
  description: string;
  href: string;
  color: string;
  icon: string;
  acceptTypes: string;
  multiple: boolean;
  fields?: ToolField[];
}

export interface ToolField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'password';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: string;
}

export const tools: Tool[] = [
  {
    id: 'merge',
    name: 'Merge PDF',
    description: 'Combine multiple PDF files into one document',
    href: '/tools/merge',
    color: '#e74c3c',
    icon: '📎',
    acceptTypes: '.pdf',
    multiple: true,
  },
  {
    id: 'split',
    name: 'Split PDF',
    description: 'Extract specific pages from a PDF',
    href: '/tools/split',
    color: '#3498db',
    icon: '✂️',
    acceptTypes: '.pdf',
    multiple: false,
    fields: [
      {
        name: 'fromPage',
        label: 'From Page',
        type: 'number',
        placeholder: '1',
        required: true,
      },
      {
        name: 'toPage',
        label: 'To Page',
        type: 'number',
        placeholder: 'e.g. 5',
        required: true,
      },
    ],
  },
  {
    id: 'compress',
    name: 'Compress PDF',
    description: 'Reduce PDF file size while keeping quality',
    href: '/tools/compress',
    color: '#27ae60',
    icon: '📦',
    acceptTypes: '.pdf',
    multiple: false,
    fields: [
      {
        name: 'quality',
        label: 'Compression Level',
        type: 'select',
        options: [
          { value: 'low', label: 'Maximum compression (renders as images)' },
          { value: 'medium', label: 'Balanced (renders as images)' },
          { value: 'high', label: 'Light — strip metadata (keeps text)' },
          { value: 'maximum', label: 'Minimal — re-save only (keeps text)' },
        ],
        defaultValue: 'medium',
      },
    ],
  },
  {
    id: 'jpg-to-pdf',
    name: 'JPG to PDF',
    description: 'Convert images to a PDF document',
    href: '/tools/jpg-to-pdf',
    color: '#f39c12',
    icon: '🖼️',
    acceptTypes: '.jpg,.jpeg,.png,.webp,.tiff',
    multiple: true,
  },
  {
    id: 'pdf-to-jpg',
    name: 'PDF to JPG',
    description: 'Convert PDF pages to JPG images (ZIP)',
    href: '/tools/pdf-to-jpg',
    color: '#9b59b6',
    icon: '📷',
    acceptTypes: '.pdf',
    multiple: false,
  },
  {
    id: 'pdf-to-word',
    name: 'PDF to Word',
    description: 'Convert PDF documents to editable Word (DOCX) files',
    href: '/tools/pdf-to-word',
    color: '#2b5797',
    icon: '📝',
    acceptTypes: '.pdf',
    multiple: false,
  },
  {
    id: 'rotate',
    name: 'Rotate PDF',
    description: 'Rotate PDF pages by 90, 180, or 270 degrees',
    href: '/tools/rotate',
    color: '#1abc9c',
    icon: '🔄',
    acceptTypes: '.pdf',
    multiple: false,
    fields: [
      {
        name: 'angle',
        label: 'Rotation Angle',
        type: 'select',
        options: [
          { value: '90', label: '90° clockwise' },
          { value: '180', label: '180°' },
          { value: '270', label: '90° counter-clockwise' },
        ],
        defaultValue: '90',
      },
    ],
  },
  {
    id: 'watermark',
    name: 'Add Watermark',
    description: 'Add a text watermark to your PDF',
    href: '/tools/watermark',
    color: '#e67e22',
    icon: '💧',
    acceptTypes: '.pdf',
    multiple: false,
    fields: [
      {
        name: 'text',
        label: 'Watermark Text',
        type: 'text',
        placeholder: 'e.g. CONFIDENTIAL',
        required: true,
      },
    ],
  },
  {
    id: 'delete-pages',
    name: 'Delete Pages',
    description: 'Remove specific pages from a PDF',
    href: '/tools/delete-pages',
    color: '#e74c3c',
    icon: '🗑️',
    acceptTypes: '.pdf',
    multiple: false,
    fields: [
      {
        name: 'pages',
        label: 'Pages to Delete',
        type: 'text',
        placeholder: 'e.g. 2,4,6',
        required: true,
      },
    ],
  },
  {
    id: 'reorder',
    name: 'Reorder Pages',
    description: 'Rearrange the page order in a PDF',
    href: '/tools/reorder',
    color: '#2980b9',
    icon: '🔀',
    acceptTypes: '.pdf',
    multiple: false,
    fields: [
      {
        name: 'pageOrder',
        label: 'New Page Order',
        type: 'text',
        placeholder: 'e.g. 3,1,2,5,4',
        required: true,
      },
    ],
  },
  {
    id: 'protect',
    name: 'Protect PDF',
    description: 'Encrypt your PDF with a password to keep data confidential',
    href: '/tools/protect',
    color: '#8e44ad',
    icon: '🔒',
    acceptTypes: '.pdf',
    multiple: false,
    fields: [
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        placeholder: 'Enter password',
        required: true,
      },
      {
        name: 'confirmPassword',
        label: 'Confirm Password',
        type: 'password',
        placeholder: 'Re-enter password',
        required: true,
      },
    ],
  },
  {
    id: 'unlock',
    name: 'Unlock PDF',
    description: 'Remove PDF password security and restrictions',
    href: '/tools/unlock',
    color: '#16a085',
    icon: '🔓',
    acceptTypes: '.pdf',
    multiple: false,
    fields: [
      {
        name: 'password',
        label: 'PDF Password',
        type: 'password',
        placeholder: 'Enter PDF password',
        required: true,
      },
    ],
  },
];

export function getToolById(id: string): Tool | undefined {
  return tools.find(t => t.id === id);
}
