'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Tool } from '@/lib/tools';
import { downloadBlob } from '@/lib/pdf/utils';

export type ProcessorFn = (
  files: File[],
  fields: Record<string, string>,
  onProgress?: (percent: number) => void,
) => Promise<Blob>;

type Stage = 'upload' | 'processing' | 'done' | 'error';

export default function ToolPage({
  tool,
  process,
}: {
  tool: Tool;
  process: ProcessorFn;
}) {
  const [stage, setStage] = useState<Stage>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    tool.fields?.forEach(f => {
      if (f.defaultValue) defaults[f.name] = f.defaultValue;
    });
    return defaults;
  });
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  const outputFilename = getOutputFilename(tool.id);

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    if (fileArray.length === 0) return;
    setFiles(prev => tool.multiple ? [...prev, ...fileArray] : fileArray);
    setError('');
    setShowErrors(false); // Reset error display when new files are added
  }, [tool.multiple]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleProcess = async () => {
    setShowErrors(true); // Show validation errors on submit attempt
    if (files.length === 0) return;
    if (hasErrors) return; // Don't process if there are validation errors

    setStage('processing');
    setProgress(0);
    setError('');

    try {
      const blob = await process(files, fields, setProgress);
      setResultBlob(blob);
      setStage('done');
    } catch (err: any) {
      setError(err.message || 'Processing failed');
      setStage('error');
    }
  };

  const handleDownload = () => {
    if (resultBlob) {
      downloadBlob(resultBlob, outputFilename);
    }
  };

  const handleReset = () => {
    setStage('upload');
    setFiles([]);
    setProgress(0);
    setResultBlob(null);
    setError('');
    setShowErrors(false);
  };

  /* Read page count from the first PDF file */
  useEffect(() => {
    if (files.length === 0 || files[0].type !== 'application/pdf') {
      setPageCount(0);
      return;
    }
    let cancelled = false;
    async function readPageCount() {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const bytes = new Uint8Array(await files[0].arrayBuffer());
        const pdf = await pdfjs.getDocument({ data: bytes }).promise;
        if (!cancelled) setPageCount(pdf.numPages);
        pdf.destroy();
      } catch {
        if (!cancelled) setPageCount(0);
      }
    }
    readPageCount();
    return () => { cancelled = true; };
  }, [files]);

  /* Compute field validation errors */
  const fieldErrors: Record<string, string> = {};

  // Check required fields are filled
  tool.fields?.forEach(field => {
    if (field.required) {
      const value = fields[field.name]?.trim();
      if (!value) {
        fieldErrors[field.name] = `${field.label} is required`;
      }
    }
  });

  // Tool-specific validation
  if (tool.id === 'split') {
    const fromValue = fields.fromPage?.trim();
    const toValue = fields.toPage?.trim();

    if (fromValue && toValue) {
      const from = parseInt(fromValue, 10);
      const to = parseInt(toValue, 10);

      if (isNaN(from) && !fieldErrors.fromPage) {
        fieldErrors.fromPage = 'Please enter a valid page number';
      } else if (pageCount > 0 && (from < 1 || from > pageCount) && !fieldErrors.fromPage) {
        fieldErrors.fromPage = `Page must be between 1 and ${pageCount}`;
      }

      if (isNaN(to) && !fieldErrors.toPage) {
        fieldErrors.toPage = 'Please enter a valid page number';
      } else if (pageCount > 0 && (to < 1 || to > pageCount) && !fieldErrors.toPage) {
        fieldErrors.toPage = `Page must be between 1 and ${pageCount}`;
      }

      if (!isNaN(from) && !isNaN(to) && from > to && !fieldErrors.fromPage && !fieldErrors.toPage) {
        fieldErrors.toPage = `Must be greater than or equal to From Page (${from})`;
      }
    }
  }

  // Password confirmation validation
  if (tool.id === 'protect') {
    const pw = fields.password || '';
    const cpw = fields.confirmPassword || '';
    if (pw && cpw && pw !== cpw && !fieldErrors.confirmPassword) {
      fieldErrors.confirmPassword = 'Passwords do not match';
    }
    if (pw && pw.length < 4 && !fieldErrors.password) {
      fieldErrors.password = 'Password must be at least 4 characters';
    }
  }

  if (pageCount > 0) {
    if (tool.id === 'delete-pages' && fields.pages) {
      const nums = fields.pages.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      if (nums.some(n => n < 1 || n > pageCount)) {
        fieldErrors.pages = `Page numbers must be between 1 and ${pageCount}`;
      } else if (nums.length >= pageCount) {
        fieldErrors.pages = 'Cannot delete all pages';
      }
    }
    if (tool.id === 'reorder' && fields.pageOrder) {
      const nums = fields.pageOrder.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      if (nums.some(n => n < 1 || n > pageCount)) {
        fieldErrors.pageOrder = `Page numbers must be between 1 and ${pageCount}`;
      }
    }
  }

  const hasErrors = Object.keys(fieldErrors).length > 0;

  /* ───────── Single return — keeps file input ref stable ───────── */
  return (
    <>
      {/* Hidden file input — always at stable position in React tree */}
      <input
        ref={fileInputRef}
        type="file"
        accept={tool.acceptTypes}
        multiple={tool.multiple}
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
        }}
        className="hidden"
      />

      {/* ───────── UPLOAD: no files yet ───────── */}
      {stage === 'upload' && files.length === 0 && (
        <div
          className="max-w-3xl mx-auto px-4 py-12"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="inline-flex w-16 h-16 rounded-2xl items-center justify-center text-3xl mb-4"
              style={{ backgroundColor: `${tool.color}15` }}
            >
              {tool.icon}
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{tool.name}</h1>
            <p className="mt-2 text-gray-500">{tool.description}</p>
          </div>

          {/* Drop zone */}
          <div
            className={`
              border-2 border-dashed rounded-xl p-16 text-center transition-all
              ${dragOver
                ? 'border-red-400 bg-red-50'
                : 'border-gray-300 bg-white'}
            `}
          >
            <div className="text-5xl mb-4">{dragOver ? '📥' : '📄'}</div>
            <p className="text-xl font-semibold text-gray-700 mb-4">
              {dragOver ? 'Drop files here' : 'Select PDF files'}
            </p>
            <button
              onClick={openFilePicker}
              className="px-8 py-3.5 rounded-xl text-white font-semibold text-base transition-all hover:opacity-90 active:scale-[0.98] shadow-sm"
              style={{ backgroundColor: tool.color }}
            >
              Choose Files
            </button>
            <p className="text-sm text-gray-400 mt-4">
              or drag & drop anywhere — {tool.multiple ? 'multiple files allowed' : 'single file'}
            </p>
          </div>
        </div>
      )}

      {/* ───────── UPLOAD: files selected — two-column layout ───────── */}
      {stage === 'upload' && files.length > 0 && (
        <div
          className="mx-auto px-4 sm:px-6 lg:px-0 py-8"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {dragOver && tool.multiple && (
            <div className="fixed inset-0 bg-red-500/10 backdrop-blur-sm z-40 pointer-events-none flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-2xl px-12 py-8 border-4 border-dashed border-red-400">
                <div className="text-6xl mb-4 text-center">📥</div>
                <p className="text-2xl font-bold text-gray-900">Drop files to add more</p>
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row">
            {/* ── Main area: thumbnail previews ── */}
            <div className="flex-1 min-w-0">
              <div className="rounded-xl p-4 transition-all min-h-[300px]">
                {/* Grid for multi-file tools */}
                {tool.multiple ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                    {files.map((file, i) => (
                      <FileThumbnail
                        key={`${file.name}-${file.size}-${i}`}
                        file={file}
                        onRemove={() => removeFile(i)}
                      />
                    ))}

                    {/* Add-more card */}
                    <div
                      onClick={openFilePicker}
                      className="aspect-[3/4] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-red-400 hover:bg-red-50 transition-all"
                    >
                      <div className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center text-2xl font-light">
                        +
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Add more</p>
                    </div>
                  </div>
                ) : (
                  /* Single centered preview for single-file tools */
                  <div className="flex justify-center py-6">
                    <div className="w-52">
                      <FileThumbnail
                        file={files[0]}
                        onRemove={() => setFiles([])}
                      />
                      <button
                        onClick={openFilePicker}
                        className="mt-3 w-full text-sm text-gray-500 hover:text-red-500 transition-colors"
                      >
                        Change file
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right sidebar ── */}
            <div className="w-full lg:w-80 shrink-0 lg:border-l lg:border-gray-300 lg:pl-8 lg:ml-8 mt-8 lg:mt-0">
              <div className="lg:sticky lg:top-24 space-y-5 lg:pr-4">
                <h2 className="text-2xl font-bold text-gray-900">{tool.name}</h2>

                {/* Help box */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <p className="text-sm text-blue-800 leading-relaxed">
                    {getHelpText(tool)}
                  </p>
                </div>

                {/* Page count info */}
                {pageCount > 0 && (
                  <p className="text-sm text-gray-500">
                    This PDF has <span className="font-semibold text-gray-700">{pageCount}</span> page{pageCount !== 1 ? 's' : ''}
                  </p>
                )}

                {/* Options / Fields */}
                {tool.fields && tool.fields.length > 0 && (
                  <div className="space-y-4">
                    {tool.fields.map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {field.type === 'select' ? (
                          <select
                            value={fields[field.name] || field.defaultValue || ''}
                            onChange={(e) => setFields(prev => ({ ...prev, [field.name]: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          >
                            {field.options?.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : field.type === 'password' ? (
                          <div className="relative">
                            <input
                              type={showPassword[field.name] ? 'text' : 'password'}
                              value={fields[field.name] || ''}
                              onChange={(e) => setFields(prev => ({ ...prev, [field.name]: e.target.value }))}
                              placeholder={field.placeholder}
                              className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                                showErrors && fieldErrors[field.name] ? 'border-red-400 bg-red-50' : 'border-gray-300'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(prev => ({ ...prev, [field.name]: !prev[field.name] }))}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {showPassword[field.name] ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        ) : (
                          <input
                            type={field.type}
                            value={fields[field.name] || ''}
                            onChange={(e) => setFields(prev => ({ ...prev, [field.name]: e.target.value }))}
                            placeholder={field.placeholder}
                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                              showErrors && fieldErrors[field.name] ? 'border-red-400 bg-red-50' : 'border-gray-300'
                            }`}
                          />
                        )}
                        {showErrors && fieldErrors[field.name] && (
                          <p className="text-xs text-red-500 mt-1">{fieldErrors[field.name]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Process button */}
                <button
                  onClick={handleProcess}
                  disabled={showErrors && hasErrors}
                  className={`w-full py-3.5 px-6 rounded-xl text-white font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
                    showErrors && hasErrors ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.98]'
                  }`}
                  style={{ backgroundColor: tool.color }}
                >
                  {tool.name}
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────── Processing / Done / Error ───────── */}
      {stage !== 'upload' && (
        <div className="max-w-3xl mx-auto px-4 py-12">
          {stage === 'processing' && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="inline-block animate-spin text-4xl mb-4">⚙️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing your file...</h3>
              <div className="max-w-xs mx-auto">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${progress > 0 ? progress : 100}%`,
                      backgroundColor: tool.color,
                      animation: progress > 0 ? 'none' : 'pulse 1.5s ease-in-out infinite',
                    }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {progress > 0 ? `${progress}%` : 'Processing...'}
                </p>
              </div>
              <p className="text-xs text-gray-400 mt-4">Everything runs locally in your browser</p>
            </div>
          )}

          {stage === 'done' && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Done!</h3>
              <p className="text-gray-500 mb-6">Your file is ready to download.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleDownload}
                  className="py-3 px-8 rounded-xl text-white font-semibold transition-all hover:opacity-90"
                  style={{ backgroundColor: tool.color }}
                >
                  Download {outputFilename}
                </button>
                <button
                  onClick={handleReset}
                  className="py-3 px-8 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                >
                  Process another file
                </button>
              </div>
            </div>
          )}

          {stage === 'error' && (
            <div className="bg-white rounded-xl border border-red-200 p-12 text-center">
              <div className="text-5xl mb-4">❌</div>
              <h3 className="text-xl font-semibold text-red-700 mb-2">Something went wrong</h3>
              <p className="text-gray-500 mb-6">{error}</p>
              <button
                onClick={handleReset}
                className="py-3 px-8 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-all"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════
   FileThumbnail — renders first page preview
   ═══════════════════════════════════════════ */

function FileThumbnail({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function generate() {
      try {
        if (file.type === 'application/pdf') {
          const pdfjs = await import('pdfjs-dist');
          pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

          const bytes = new Uint8Array(await file.arrayBuffer());
          const pdf = await pdfjs.getDocument({ data: bytes }).promise;
          if (cancelled) { pdf.destroy(); return; }

          setPageCount(pdf.numPages);

          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 0.4 });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d')!;

          await page.render({ canvasContext: ctx, viewport }).promise;
          pdf.destroy();
          if (cancelled) return;

          setThumbnail(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          /* Image file — show directly */
          objectUrl = URL.createObjectURL(file);
          if (cancelled) { URL.revokeObjectURL(objectUrl); return; }
          setThumbnail(objectUrl);
          setPageCount(1);
        }
      } catch {
        if (!cancelled) setThumbnail(null);
      }
    }

    generate();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return (
    <div className="relative group">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        {/* Preview area */}
        <div className="aspect-[3/4] bg-gray-50 flex items-center justify-center p-3">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={file.name}
              className="max-w-full max-h-full object-contain rounded shadow-sm"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 animate-pulse">
              <span className="text-3xl">📄</span>
              <span className="text-xs text-gray-400">Loading...</span>
            </div>
          )}
        </div>

        {/* Page count badge */}
        {pageCount > 0 && file.type === 'application/pdf' && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] px-1 flex items-center justify-center shadow">
            {pageCount}
          </div>
        )}

        {/* Remove button (visible on hover) */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-2 left-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center
                     opacity-0 group-hover:opacity-100 transition-opacity text-sm hover:bg-red-500"
        >
          ×
        </button>

        {/* Filename + size */}
        <div className="px-3 py-2 border-t border-gray-100">
          <p className="text-xs text-gray-700 truncate text-center font-medium">{file.name}</p>
          <p className="text-[10px] text-gray-400 text-center mt-0.5">{formatSize(file.size)}</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getOutputFilename(toolId: string): string {
  const map: Record<string, string> = {
    merge: 'merged.pdf',
    split: 'split.pdf',
    compress: 'compressed.pdf',
    'jpg-to-pdf': 'images-to-pdf.pdf',
    'pdf-to-jpg': 'pdf-pages.zip',
    'pdf-to-word': 'converted.docx',
    rotate: 'rotated.pdf',
    watermark: 'watermarked.pdf',
    'delete-pages': 'pages-removed.pdf',
    reorder: 'reordered.pdf',
    protect: 'protected.pdf',
    unlock: 'unlocked.pdf',
  };
  return map[toolId] || 'output.pdf';
}

function getHelpText(tool: Tool): string {
  const map: Record<string, string> = {
    merge:
      'Please select more PDF files by clicking the + button or dragging them into the area. Files will be merged in the order shown.',
    split:
      'Enter the starting and ending page numbers to extract. All pages in the range will be included in the output PDF.',
    compress:
      'Choose a compression level. "Maximum" and "Balanced" render pages as images for smaller files. "Light" and "Minimal" preserve selectable text.',
    'jpg-to-pdf':
      'Add images by clicking the + button. Each image becomes one page in the output PDF.',
    'pdf-to-jpg':
      'Each page will be converted to a high-quality JPG image. The result downloads as a ZIP file.',
    'pdf-to-word':
      'Your PDF will be converted to a Word document with the exact same layout, fonts, and formatting preserved as high-quality images.',
    rotate:
      'Select the rotation angle. All pages in the PDF will be rotated by the chosen amount.',
    watermark:
      'Enter the text to appear as a diagonal watermark across every page of the PDF.',
    'delete-pages':
      'Enter the page numbers to remove, separated by commas (e.g. 2, 4, 6). Remaining pages are kept in order.',
    reorder:
      'Enter the new page order as comma-separated numbers (e.g. 3, 1, 2, 5, 4). Pages not listed will be omitted.',
    protect:
      'Set a password to encrypt your PDF. Anyone opening the file will need to enter this password. Make sure to remember it!',
    unlock:
      'Enter the PDF password to remove encryption and restrictions. The unlocked PDF will be saved as a new file without any password protection.',
  };
  return map[tool.id] || tool.description;
}
