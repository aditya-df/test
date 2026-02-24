"use client";

import { memo, useState, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface OtherToolResultProps {
  result: any;
  toolName: string;
  index: number;
}

export const OtherToolResult = memo(({ result, toolName, index }: OtherToolResultProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Helper function to render document results nicely
  const renderDocumentResults = (result: any[]) => {
    if (!Array.isArray(result) || result.length === 0 || !result[0].urlFile) {
      return null;
    }

    return (
      <div className="space-y-3">
        {result.map((doc: any, docIndex: number) => {
          // Extract document name from URL
          const fileName = doc.urlFile 
            ? decodeURIComponent(doc.urlFile.split('/').pop() || 'Document')
            : `Document ${docIndex + 1}`;
          
          // Clean up filename
          const cleanFileName = fileName.replace(/.*_/, '').replace(/\.(pdf|xlsx|docx|txt)$/i, '');
          
          // Get file extension for icon
          const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
          const getFileIcon = (ext: string) => {
            switch (ext) {
              case 'pdf': return '📄';
              case 'xlsx': case 'xls': return '📊';
              case 'docx': case 'doc': return '📝';
              case 'txt': return '📃';
              default: return '📄';
            }
          };
          
          return (
            <div key={`doc-${index}-${docIndex}`} className="border rounded p-3 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-2">
                    <span>{getFileIcon(fileExtension)}</span>
                    {cleanFileName}
                  </h4>
                  
                  {/* Show file extension and type */}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {fileExtension.toUpperCase()} file
                  </div>
                  
                  {/* Show content preview if available */}
                  {doc.content && doc.content.trim() && (
                    <div className="text-sm text-gray-700 dark:text-gray-300 max-h-24 overflow-y-auto mb-2 bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs">
                      {doc.content.substring(0, 150)}
                      {doc.content.length > 150 && '...'}
                    </div>
                  )}
                  
                  {/* Show message for files that can't be previewed */}
                  {(!doc.content || !doc.content.trim()) && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 italic mb-2">
                      {fileExtension === 'xlsx' || fileExtension === 'xls' 
                        ? 'Excel spreadsheet - click to download and view'
                        : 'Preview not available - click to download'}
                    </div>
                  )}
                </div>
                
                {/* Download/View button */}
                {doc.urlFile && (
                  <a 
                    href={doc.urlFile} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-md transition-colors"
                  >
                    {fileExtension === 'pdf' ? '👁️ View' : '⬇️ Download'}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Check if this is a document result
  const isDocumentResult = Array.isArray(result) && result.length > 0 && result[0].urlFile;

  return (
    <div className="border rounded-lg bg-gray-50 dark:bg-gray-800">
      {/* Collapsible header */}
      <button
        onClick={toggleExpanded}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
          <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">
            🔧 {toolName}
          </h3>
          {/* Using index to show tool result number */}
          <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
            #{index + 1}
          </span>
          {isDocumentResult && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
              {result.length} document{result.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {isExpanded ? 'Hide' : 'Show'} details
        </span>
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-600">
          {isDocumentResult ? (
            <div className="mt-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Found {result.length} document(s):
              </p>
              {renderDocumentResults(result)}
            </div>
          ) : typeof result === 'object' && result !== null ? (
            <div className="mt-3">
              <div className="text-sm bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-auto max-h-64">
                <pre className="whitespace-pre-wrap text-xs" id={`tool-result-${index}`}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <div className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 p-3 rounded" id={`tool-result-${index}`}>
                {String(result)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

OtherToolResult.displayName = "OtherToolResult";
