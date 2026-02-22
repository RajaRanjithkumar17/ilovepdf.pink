import Link from 'next/link';
import type { Tool } from '@/lib/tools';

export default function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      href={tool.href}
      className="group block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200"
    >
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-4"
        style={{ backgroundColor: `${tool.color}15` }}
      >
        {tool.icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
        {tool.name}
      </h3>
      <p className="mt-1 text-sm text-gray-500 leading-relaxed">
        {tool.description}
      </p>
    </Link>
  );
}
