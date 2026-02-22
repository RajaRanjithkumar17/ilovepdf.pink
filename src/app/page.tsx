import { tools } from '@/lib/tools';
import ToolCard from '@/components/ToolCard';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
          Every PDF tool you need
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Merge, split, compress, convert, rotate, unlock, and more with your PDFs.
          Everything runs locally on your machine — your files never leave your computer.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          100% Private — No cloud, no uploads, no tracking
        </div>
      </div>

      {/* Tool Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  );
}
