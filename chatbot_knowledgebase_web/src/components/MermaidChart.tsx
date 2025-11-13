"use client";

import { useEffect, useRef, useState } from 'react';

interface MermaidProps {
  chart: string;
}

// Helper function to sanitize Mermaid chart content
const sanitizeMermaidChart = (chart: string): string => {
  return chart
    .trim()
    // Handle brackets with content - escape special characters
    .replace(/\[([^\]]*)\]/g, (match, content) => {
      // Clean up the content
      let sanitized = content
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\n/g, '<br/>')
        .replace(/\r/g, '')
        .trim();
      
      // Always wrap content in quotes to handle special characters
      return `["${sanitized}"]`;
    })
    // Handle arrow labels with special characters
    .replace(/\|([^|]*)\|/g, (match, content) => {
      const sanitized = content
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .trim();
      return `|"${sanitized}"|`;
    })
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    // Ensure proper line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
};

const MermaidChart = ({ chart }: MermaidProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderChart = async () => {
      if (ref.current && chart) {
        try {
          setIsLoading(true);
          setError(null);
          
          // Use improved sanitization function
          let sanitizedChart = sanitizeMermaidChart(chart);
          
          // Dynamically import mermaid to avoid SSR issues
          const mermaid = (await import('mermaid')).default;
          
          // Initialize mermaid with custom config
          mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'inherit',
            fontSize: 14,
            flowchart: {
              useMaxWidth: true,
              htmlLabels: true,
              curve: 'basis'
            },
            themeVariables: {
              primaryColor: '#fff',
              primaryTextColor: '#333',
              primaryBorderColor: '#333',
              lineColor: '#333',
              secondaryColor: '#f8f9fa',
              tertiaryColor: '#f1f3f4',
            }
          });

          // Clear previous content
          ref.current.innerHTML = '';
          
          // Generate unique ID for this chart
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          
          // Try to render with sanitized content first
          try {
            console.log('Attempting to render with sanitized chart:', sanitizedChart);
            const { svg } = await mermaid.render(id, sanitizedChart);
            ref.current.innerHTML = svg;
            setIsLoading(false);
          } catch (sanitizeError) {
            console.warn('Sanitized version failed, trying simplified version:', sanitizeError);
            
            try {
              // Try with a more aggressive simplification
              const simplifiedChart = chart
                .trim()
                .replace(/\[([^\]]*)\]/g, (match, content) => {
                  // Remove all special characters and Vietnamese characters
                  const simplified = content
                    .replace(/[^\w\s]/g, '') // Remove all non-word chars except spaces
                    .replace(/\s+/g, ' ')    // Normalize spaces
                    .trim();
                  return `[${simplified}]`;
                });
              
              console.log('Attempting simplified chart:', simplifiedChart);
              const { svg } = await mermaid.render(id + '_simplified', simplifiedChart);
              ref.current.innerHTML = svg;
              setIsLoading(false);
            } catch (simplifiedError) {
              console.warn('Simplified version also failed:', simplifiedError);
              throw sanitizeError; // Throw original error
            }
          }
          
        } catch (error) {
          console.error('Mermaid rendering error:', error);
          setError(error instanceof Error ? error.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className="mermaid-error my-4">
        <strong>🚫 Mermaid Diagram Error:</strong>
        <p className="mt-2 text-sm">{error}</p>
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-medium">Show diagram code</summary>
          <pre className="mt-2 text-xs overflow-x-auto">{chart}</pre>
        </details>
      </div>
    );
  }

  return (
    <div className="my-4">
      {isLoading && (
        <div className="flex items-center justify-center h-24 bg-gray-50 border rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Rendering diagram...</span>
          </div>
        </div>
      )}
      <div 
        ref={ref} 
        className={`mermaid-container ${isLoading ? 'hidden' : 'block'}`}
      />
    </div>
  );
};

export default MermaidChart;
