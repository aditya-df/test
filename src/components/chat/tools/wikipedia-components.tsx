"use client";

import { memo } from "react";

interface WikipediaError {
  error: string;
  details?: string;
  success: false;
}

interface WikipediaSuccess {
  // Add proper wikipedia result structure when you have successful results
  title?: string;
  extract?: string;
  url?: string;
  success: true;
}

type WikipediaResult = WikipediaError | WikipediaSuccess;

interface WikipediaResultsProps {
  data: WikipediaResult;
}

export const WikipediaResults = memo(({ data }: WikipediaResultsProps) => {
  // Handle error case
  if (!data.success) {
    return (
      <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-red-800 dark:text-red-300">
          📚 Wikipedia Search
        </h3>
        
        <div className="bg-white dark:bg-red-900/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-red-500 text-xl">⚠️</div>
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-300 mb-1">
                Search Failed
              </h4>
              <p className="text-red-700 dark:text-red-400 text-sm mb-2">
                {data.error}
              </p>
              {data.details && (
                <p className="text-red-600 dark:text-red-500 text-xs">
                  {data.details}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-red-600 dark:text-red-400">
          💡 You can try searching again in a few minutes or try a different query.
        </div>
      </div>
    );
  }

  // Handle success case (when you have actual wikipedia results)
  return (
    <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-800 dark:text-green-300">
        📚 Wikipedia Results
      </h3>
      
      <div className="bg-white dark:bg-green-900/30 rounded-lg p-4">
        {data.title && (
          <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">
            {data.title}
          </h4>
        )}
        
        {data.extract && (
          <p className="text-green-700 dark:text-green-400 text-sm mb-3">
            {data.extract}
          </p>
        )}
        
        {data.url && (
          <a 
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
          >
            🔗 Read more on Wikipedia
          </a>
        )}
      </div>
    </div>
  );
});

WikipediaResults.displayName = "WikipediaResults";