import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="m-0 mb-2 last:mb-0">{children}</p>,
          h1: ({ children }) => <h1 className="m-0 mb-2 mt-3 first:mt-0 text-[18px] font-bold leading-[1.3]">{children}</h1>,
          h2: ({ children }) => <h2 className="m-0 mb-2 mt-3 first:mt-0 text-[17px] font-semibold leading-[1.3]">{children}</h2>,
          h3: ({ children }) => <h3 className="m-0 mb-1.5 mt-2.5 first:mt-0 text-[16px] font-semibold leading-[1.3]">{children}</h3>,
          ul: ({ children }) => <ul className="m-0 mb-2 last:mb-0 pl-5 list-disc">{children}</ul>,
          ol: ({ children }) => <ol className="m-0 mb-2 last:mb-0 pl-5 list-decimal">{children}</ol>,
          li: ({ children }) => <li className="mb-1 last:mb-0">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          hr: () => <hr className="my-3 h-px border-0 bg-[#c7c7cc]" />,
          blockquote: ({ children }) => (
            <blockquote className="m-0 mb-2 pl-3 border-l-2 border-[#c7c7cc] text-[#636366]">{children}</blockquote>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#007aff] underline">
              {children}
            </a>
          ),
          code: ({ className: codeClassName, children }) => {
            const isBlock = codeClassName?.includes('language-');
            if (isBlock) {
              return (
                <code className="block text-[14px] leading-[1.4] font-mono whitespace-pre-wrap">{children}</code>
              );
            }
            return (
              <code className="px-1 py-0.5 rounded bg-[#d1d1d6] text-[14px] font-mono">{children}</code>
            );
          },
          pre: ({ children }) => (
            <pre className="m-0 mb-2 p-2.5 rounded-lg bg-[#d1d1d6] overflow-x-auto text-[14px] leading-[1.4]">{children}</pre>
          ),
          table: ({ children }) => (
            <div className="my-2 -mx-1 overflow-x-auto">
              <table className="w-full min-w-[240px] border-collapse text-[14px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-[#d1d1d6]">{children}</thead>,
          th: ({ children }) => (
            <th className="px-2 py-1.5 text-left font-semibold border border-[#c7c7cc] whitespace-nowrap">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1.5 border border-[#c7c7cc] align-top">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
