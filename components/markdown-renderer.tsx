/**
 * Markdown Renderer Component
 * Renders markdown with syntax-highlighted code blocks
 */

'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm max-w-none break-words overflow-wrap-anywhere">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Code blocks with syntax highlighting
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <div className="overflow-x-auto max-w-full my-2">
              <SyntaxHighlighter
                style={prism}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderRadius: '0.5rem',
                  background: '#f5f5f5',
                  fontSize: '0.875rem',
                  maxWidth: '100%',
                  overflowX: 'auto',
                }}
                codeTagProps={{
                  style: {
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  },
                }}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code
              className="bg-gray-100 text-black px-1.5 py-0.5 rounded text-sm font-mono"
              {...props}
            >
              {children}
            </code>
          );
        },
        // Paragraphs
        p({ children }) {
          return <p className="mb-2 last:mb-0 leading-relaxed break-words overflow-wrap-anywhere">{children}</p>;
        },
        // Links
        a({ href, children }) {
          return (
            <a
              href={href}
              className="text-black underline hover:text-gray-600 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          );
        },
        // Lists
        ul({ children }) {
          return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
        },
        li({ children }) {
          return <li className="leading-relaxed">{children}</li>;
        },
        // Headings
        h1({ children }) {
          return <h1 className="text-xl font-semibold mb-2 mt-4 first:mt-0">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-lg font-semibold mb-2 mt-3 first:mt-0">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h3>;
        },
        // Blockquotes
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700 my-2">
              {children}
            </blockquote>
          );
        },
        // Tables
        table({ children }) {
          return (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border-collapse border border-gray-300">
                {children}
              </table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="border border-gray-300 bg-gray-100 px-3 py-2 text-left font-semibold">
              {children}
            </th>
          );
        },
        td({ children }) {
          return <td className="border border-gray-300 px-3 py-2">{children}</td>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}
