import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PDF Tools — Local PDF Processing',
  description: 'Free, private, local PDF tools. Merge, split, compress, convert, and more — all processed on your machine.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {/* Navbar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <a href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">PDF</span>
                </div>
                <span className="text-xl font-bold text-gray-900">PDF Tools</span>
              </a>
              <span className="text-sm text-gray-500 hidden sm:block">
                100% Local Processing
              </span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-6 mt-12">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
            <p>All files are processed locally on your machine. Nothing is uploaded to any cloud.</p>
            <p className="mt-1">Files are automatically deleted after processing.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
