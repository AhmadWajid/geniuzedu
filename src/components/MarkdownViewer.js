import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

export default function MarkdownViewer({ content }) {
  return (
    <div className="prose max-w-none">
      <ReactMarkdown
        children={content}
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#58b595] to-[#fbbf24] 
              dark:from-[#f59e0b] dark:to-[#fcd34d] bg-clip-text text-transparent 
              pb-4 mb-8 border-b-2 border-orange-200 dark:border-orange-800 tracking-tight" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 
              mt-12 mb-6 pb-2 border-b border-[#58b595]/30 dark:border-gray-800" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100
              mt-10 mb-4" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-lg font-medium text-gray-800 dark:text-gray-100
              mt-8 mb-4" {...props} />
          ),
          h5: ({ node, ...props }) => (
            <h5 className="text-base font-medium text-gray-800 dark:text-gray-100
              mt-8 mb-4" {...props} />
          ),
          p: ({ node, children, ...props }) => {
            if (!children || (Array.isArray(children) && children.every(child => !child))) {
              return null;
            }
            
            const parentLi = node.parent && node.parent.type === 'listItem';
            return parentLi ? (
              <span className="inline-block" {...props}>{children}</span>
            ) : (
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed  text-lg" {...props}>{children}</p>
            );
          },
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-[#58b595] dark:text-[#fbbf24] 
              bg-[#f0faf7] dark:bg-[#3a2e1e] px-1 py-0.5 rounded" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-8 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <table className="w-full text-left border-collapse" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-gray-50 dark:bg-gray-800" {...props} />
          ),
          tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-200 dark:divide-gray-700" {...props} />,
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-750" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="py-3 px-4 font-medium text-gray-700 dark:text-gray-200" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="py-3 px-4 text-gray-700 dark:text-gray-300" {...props} />
          ),
          ul: ({ node, children, ...props }) => {
            if (!children || (Array.isArray(children) && children.every(child => !child))) {
              return null;
            }
            return <ul className="list-disc space-y-2 pl-6 mt-4 mb-6" {...props}>{children}</ul>;
          },
          ol: ({ node, children, ...props }) => {
            if (!children || (Array.isArray(children) && children.every(child => !child))) {
              return null;
            }
            return <ol className="list-decimal space-y-2 pl-6 mt-4 mb-6" {...props}>{children}</ol>;
          },
          li: ({ node, children, ...props }) => {
            if (!children || (Array.isArray(children) && children.every(child => !child))) {
              return null;
            }
            return <li className="text-gray-600 dark:text-gray-300" {...props}>{children}</li>;
          },
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 rounded-r border-[#58b595] dark:border-[#fbbf24] pl-6 py-3 my-6 
              bg-gradient-to-r from-[#58b595]/10 to-transparent dark:from-[#fbbf24]/10 italic text-gray-700 dark:text-gray-200" {...props} />
          ),
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <code className={`bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md px-1.5 py-0.5 ${className}`} {...props}>
                {children}
              </code>
            ) : (
              <code className="bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md px-1.5 py-0.5 font-mono text-sm" {...props}>
                {children}
              </code>
            );
          },
          img: ({ node, ...props }) => (
            <img className="max-w-full h-auto rounded-lg shadow-md my-6" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a className="text-[#58b595] dark:text-[#fbbf24] font-medium hover:underline 
              transition-colors duration-200" {...props} />
          ),
          pre: ({ node, ...props }) => (
            <pre className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 my-6 overflow-auto shadow-inner
              border border-gray-200 dark:border-gray-700" {...props} />
          ),
        }}
      />
    </div>
  );
}
