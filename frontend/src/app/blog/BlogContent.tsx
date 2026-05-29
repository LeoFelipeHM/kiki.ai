import type { ReactNode } from 'react';
import { resolveBlogContentImages } from './blog-media';

export function BlogContent({ content }: { content: string }) {
  if (containsHtml(content)) {
    return (
      <div
        className="blog-content space-y-5 text-base leading-8 text-gray-700 md:text-lg [&_a]:font-semibold [&_a]:text-purple-700 [&_a]:underline [&_blockquote]:rounded-2xl [&_blockquote]:border-l-4 [&_blockquote]:border-purple-300 [&_blockquote]:bg-purple-50 [&_blockquote]:p-5 [&_em]:italic [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-gray-500 [&_figure]:clear-both [&_figure]:my-8 [&_h1]:pt-5 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-gray-900 md:[&_h1]:text-4xl [&_h2]:pt-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-900 md:[&_h2]:text-3xl [&_h3]:pt-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-gray-900 md:[&_h3]:text-2xl [&_h4]:pt-2 [&_h4]:text-lg [&_h4]:font-bold [&_h4]:text-gray-900 md:[&_h4]:text-xl [&_img]:max-w-full [&_img]:rounded-2xl [&_img]:shadow-lg [&_img]:shadow-purple-900/10 [&_ol]:list-decimal [&_ol]:pl-6 [&_strong]:font-bold [&_u]:underline [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: resolveBlogContentImages(sanitizeHtml(content)) }}
      />
    );
  }

  return (
    <div className="space-y-5 text-gray-700">
      {content.split('\n').map((line, index) => renderLine(line, index))}
    </div>
  );
}

function renderLine(line: string, index: number): ReactNode {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('## ')) {
    return (
      <h2 key={index} className="pt-4 text-2xl md:text-3xl font-bold text-gray-900">
        {renderInline(trimmed.replace(/^##\s+/, ''))}
      </h2>
    );
  }

  if (trimmed.startsWith('### ')) {
    return (
      <h3 key={index} className="pt-3 text-xl md:text-2xl font-bold text-gray-900">
        {renderInline(trimmed.replace(/^###\s+/, ''))}
      </h3>
    );
  }

  if (trimmed.startsWith('- ')) {
    return (
      <p key={index} className="pl-4 leading-8 before:mr-2 before:text-purple-600 before:content-['•']">
        {renderInline(trimmed.replace(/^-\s+/, ''))}
      </p>
    );
  }

  return (
    <p key={index} className="text-base leading-8 md:text-lg">
      {renderInline(trimmed)}
    </p>
  );
}

function renderInline(value: string): ReactNode {
  const parts = value.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function containsHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function sanitizeHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}
