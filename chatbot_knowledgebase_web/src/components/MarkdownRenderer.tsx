import ReactMarkdown from "react-markdown";
import { memo } from "react";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import MermaidChart from "./MermaidChart";

const MarkdownRenderer = memo(({ content }: { content: string }) => {
  const parsedContent = content.replace(/\\n/g, '\n'); // Parse the escape sequences to convert \n to actual linebreaks
  
  // Check if content contains Mermaid diagrams
  const mermaidPattern = /```mermaid\n([\s\S]*?)\n```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mermaidPattern.exec(parsedContent)) !== null) {
    // Add text before the mermaid diagram
    if (match.index > lastIndex) {
      const beforeText = parsedContent.slice(lastIndex, match.index);
      if (beforeText.trim()) {
        parts.push(
          <ReactMarkdown 
            key={`md-${lastIndex}`} 
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              a: ({ node, ...props }) => (
                <DownloadLink {...props} />
              ),
              h2: ({ node, children, ...props }) => (
                <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800 dark:text-gray-200" {...props}>
                  {children}
                </h2>
              ),
              h3: ({ node, children, ...props }) => (
                <h3 className="text-lg font-medium mt-4 mb-2 text-gray-700 dark:text-gray-300" {...props}>
                  {children}
                </h3>
              ),
              p: ({ node, children, ...props }) => {
                // Check if this paragraph starts with an emoji that indicates a source file
                const text = children?.toString() || '';
                if (text.startsWith('📄')) {
                  return (
                    <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-500 p-3 my-2 rounded-r-md" {...props}>
                      <p className="font-mono text-sm text-gray-700 dark:text-gray-300 mb-1">
                        {children}
                      </p>
                    </div>
                  );
                }
                if (text.includes('💾') || text.includes('❌')) {
                  return (
                    <div className="ml-4 -mt-1 mb-2" {...props}>
                      <p className="text-sm">
                        {children}
                      </p>
                    </div>
                  );
                }
                return <p {...props}>{children}</p>;
              },
            }}
          >
            {beforeText}
          </ReactMarkdown>
        );
      }
    }
    
    // Add the mermaid diagram
    const mermaidCode = match[1];
    parts.push(
      <MermaidChart key={`mermaid-${match.index}`} chart={mermaidCode} />
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after the last mermaid diagram
  if (lastIndex < parsedContent.length) {
    const remainingText = parsedContent.slice(lastIndex);
    if (remainingText.trim()) {
      parts.push(
        <ReactMarkdown 
          key={`md-${lastIndex}`} 
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            a: ({ node, ...props }) => (
              <DownloadLink {...props} />
            ),
            h2: ({ node, children, ...props }) => (
              <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800 dark:text-gray-200" {...props}>
                {children}
              </h2>
            ),
            h3: ({ node, children, ...props }) => (
              <h3 className="text-lg font-medium mt-4 mb-2 text-gray-700 dark:text-gray-300" {...props}>
                {children}
              </h3>
            ),
            p: ({ node, children, ...props }) => {
              // Check if this paragraph starts with an emoji that indicates a source file
              const text = children?.toString() || '';
              if (text.startsWith('📄')) {
                return (
                  <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-500 p-3 my-2 rounded-r-md" {...props}>
                    <p className="font-mono text-sm text-gray-700 dark:text-gray-300 mb-1">
                      {children}
                    </p>
                  </div>
                );
              }
              if (text.includes('💾') || text.includes('❌')) {
                return (
                  <div className="ml-4 -mt-1 mb-2" {...props}>
                    <p className="text-sm">
                      {children}
                    </p>
                  </div>
                );
              }
              return <p {...props}>{children}</p>;
            },
          }}
        >
          {remainingText}
        </ReactMarkdown>
      );
    }
  }
  
  // If no mermaid diagrams found, render as regular markdown
  if (parts.length === 0) {
    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          a: ({ node, ...props }) => (
            <DownloadLink {...props} />
          ),
        }}
      >
        {parsedContent}
      </ReactMarkdown>
    );
  }
  
  return <div>{parts}</div>;
});

// Custom component to handle download links with special styling
const DownloadLink = ({ href, children, ...props }: any) => {
  const isDownloadLink = href && href.includes('/download?filename=');
  
  if (isDownloadLink) {
    // For download links, style as clickable filename
    return (
      <a
        href={href}
        {...props}
        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200 font-medium cursor-pointer"
        target="_blank"
        rel="noopener noreferrer"
        download
      >
        <FileIcon />
        {children}
      </a>
    );
  }
  
  // Regular link styling
  return (
    <a
      href={href}
      {...props}
      className="text-blue-600 hover:text-blue-800 underline transition-colors duration-200"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
};

// File icon component for download links
const FileIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-file-text"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
    <line x1="10" x2="8" y1="9" y2="9" />
  </svg>
);

// Download icon component
const DownloadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-download"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7,10 12,15 17,10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

export default MarkdownRenderer;
