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
          // Customize the rendering of specific elements if needed
          h1: ({ node, ...props }) => <h1 className="text-3xl font-bold bg-gradient-to-r from-[#58b595] to-[#fbbf24] 
             dark:from-[#f59e0b] dark:to-[#fcd34d] bg-clip-text text-transparent 
             pb-4 mb-8 border-b-2 border-orange-200 dark:border-orange-800" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 
                   mt-12 mb-6 pb-2 border-b border-[#58b595]-50 dark:border-gray-800" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100
                   mt-10 mb-4" {...props} />,
          h4: ({ node, ...props }) => <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100
                   mt-8 mb-4" {...props} />,
          h5: ({ node, ...props }) => <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-100
                   mt-8 mb-4" {...props} />,
          p: ({ node, children, ...props }) => {
            // Don't render empty paragraphs
            if (!children || (Array.isArray(children) && children.every(child => !child))) {
              return null;
            }
            
            // If parent is a list item, make it inline-block
            const parentLi = node.parent && node.parent.type === 'listItem';
            return parentLi ? (
              <span className="inline-block" {...props}>{children}</span>
            ) : (
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-2 mt-6 text-lg" {...props}>{children}</p>
            );
          },
          strong: ({ node, ...props }) => <strong className="font-semibold text-[#58b595] dark:text-[#fbbf24] 
               bg-[#fff7ed] dark:bg-[#3a2e1e] px-1 rounded" {...props} />,
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse my-6" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-gray-100 dark:bg-gray-800" {...props} />
          ),
          tbody: ({ node, ...props }) => <tbody {...props} />,
          tr: ({ node, ...props }) => (
            <tr className="border-b border-gray-200 dark:border-gray-700" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="py-2 px-4 font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="py-2 px-4 text-gray-700 dark:text-gray-300" {...props} />
          ),
          ul: ({ node, children, ...props }) => {
            // Don't render empty lists
            if (!children || (Array.isArray(children) && children.every(child => !child))) {
              return null;
            }
            return <ul className="list-disc list-inside pl-4" {...props}>{children}</ul>;
          },
          ol: ({ node, children, ...props }) => {
            // Don't render empty ordered lists
            if (!children || (Array.isArray(children) && children.every(child => !child))) {
              return null;
            }
            return <ol className="list-decimal list-inside pl-4" {...props}>{children}</ol>;
          },
          li: ({ node, children, ...props }) => {
            // Don't render empty list items
            if (!children || (Array.isArray(children) && children.every(child => !child))) {
              return null;
            }
            return <li className="text-gray-600 dark:text-gray-300 mb-2" {...props}>{children}</li>;
          },
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 rounded border-[#58b595] dark:border-[#fbbf24] pl-4 italic  mb-4 bg-[#58b595] text-[white]" {...props} />
          ),
        }}
      />
    </div> 
  );
}
