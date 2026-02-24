"use client";

import { memo, useState } from 'react';
import { ExternalLink, Search, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { cn } from '@/utils/utils';

interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink?: string;
  formattedUrl?: string;
  htmlTitle?: string;
  htmlSnippet?: string;
  pagemap?: {
    cse_thumbnail?: Array<{
      src: string;
      width: string;
      height: string;
    }>;
    cse_image?: Array<{
      src: string;
    }>;
    metatags?: Array<{
      [key: string]: string;
    }>;
  };
}

interface GoogleSearchData {
  items?: GoogleSearchResult[];
  searchInformation?: {
    totalResults: string;
    searchTime: number;
  };
  queries?: {
    request?: Array<{
      searchTerms: string;
    }>;
  };
}

interface GoogleSearchResultsProps {
  data: GoogleSearchResult[] | GoogleSearchData | any;
  minimized?: boolean;
  showSources?: boolean;
}

export const GoogleSearchResults = memo(({
  data,
  minimized = true,
  showSources = true
}: GoogleSearchResultsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle various data structures that might come from the API
  let searchResults: GoogleSearchResult[] = [];
  let searchTerm = "Search";
  let totalResults = "";
  let searchTime = 0;

  if (Array.isArray(data)) {
    searchResults = data;
  } else if (data && typeof data === 'object') {
    // Handle Google Custom Search API response structure
    if (data.items && Array.isArray(data.items)) {
      searchResults = data.items;
      searchTerm = data.queries?.request?.[0]?.searchTerms || "Search";
      totalResults = data.searchInformation?.totalResults || "";
      searchTime = data.searchInformation?.searchTime || 0;
    } else if (data.results && Array.isArray(data.results)) {
      searchResults = data.results;
    } else if (data.organic && Array.isArray(data.organic)) {
      searchResults = data.organic;
    }
  }

  // If still no results, try to extract from any array property
  if (searchResults.length === 0 && data && typeof data === 'object') {
    const arrayProps = Object.values(data).find(val => Array.isArray(val));
    if (arrayProps) {
      searchResults = arrayProps as GoogleSearchResult[];
    }
  }

  if (searchResults.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
          <Search className="w-4 h-4" />
          <p className="text-sm font-medium">No search results found</p>
        </div>
      </div>
    );
  }

  const displayLimit = minimized && !isExpanded ? 3 : searchResults.length;
  const hasMore = searchResults.length > 3;

  // const formatUrl = (url: string) => {
  //   try {
  //     const urlObj = new URL(url);
  //     return urlObj.hostname.replace('www.', '');
  //   } catch {
  //     return url;
  //   }
  // };

  // const getThumbnail = (result: GoogleSearchResult) => {
  //   return result.pagemap?.cse_thumbnail?.[0]?.src || result.pagemap?.cse_image?.[0]?.src;
  // };

  return (
    <div className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      {/* Clickable Header */}
      <div
        className={cn(
          "flex items-center justify-between p-4 transition-colors",
          minimized ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" : ""
        )}
        onClick={minimized ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Google Search: {searchTerm}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {totalResults && parseInt(totalResults) > 0
                ? `${parseInt(totalResults).toLocaleString()} results`
                : `${searchResults.length} results`}
              {searchTime > 0 && ` in ${searchTime.toFixed(2)}s`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            {searchResults.length}
          </div>
          {minimized && (
            isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )
          )}
        </div>
      </div>

      {/* Expandable Results */}
      {(!minimized || isExpanded) && (
        <div className="border-t border-gray-200 dark:border-gray-800">
          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-0">
              {searchResults.slice(0, displayLimit).map((result, index) => (
                <SearchResultItem
                  key={`${result.link}-${index}`}
                  result={result}
                  index={index}
                  showSources={showSources}
                />
              ))}
            </div>
          </div>

          {/* Show More/Less Button */}
          {minimized && hasMore && (
            <div className="border-t border-gray-200 dark:border-gray-800 p-3 bg-gray-50 dark:bg-gray-800/30">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
              >
                {isExpanded ? (
                  <>
                    Show less results <ChevronUp className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    Show {searchResults.length - 3} more results <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Show more indicator for minimized mode */}
      {minimized && !isExpanded && hasMore && (
        <div className="border-t border-gray-200 dark:border-gray-800 p-3 bg-gray-50 dark:bg-gray-800/30">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>+{searchResults.length - 3} more results</span>
          </div>
        </div>
      )}
    </div>
  );
});

GoogleSearchResults.displayName = 'GoogleSearchResults';

// Individual search result component
export const SearchResultItem = memo(({
  result,
  index,
  // showSources = true,
  showThumbnail = true
}: {
  result: GoogleSearchResult;
  index?: number;
  showSources?: boolean;
  showThumbnail?: boolean;
}) => {
  const domain = result.displayLink || formatDomain(result.link);
  const thumbnail = result.pagemap?.cse_thumbnail?.[0]?.src || result.pagemap?.cse_image?.[0]?.src;

  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      <div className="flex items-start gap-3">
        {/* Result Number */}
        {typeof index === 'number' && (
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
            {index + 1}
          </div>
        )}

        {/* Thumbnail */}
        {showThumbnail && thumbnail && (
          <div className="flex-shrink-0">
            <img
              src={thumbnail}
              alt=""
              className="w-16 h-16 object-cover rounded-md border border-gray-200 dark:border-gray-700"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Result Content */}
        <div className="flex-1 min-w-0">
          {/* Domain */}
          <div className="flex items-center gap-1 mb-1">
            <Globe className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {domain}
            </span>
          </div>

          {/* Title */}
          <a
            href={result.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300 transition-colors line-clamp-2 mb-2 flex items-start gap-1">
              <span
                className="flex-1"
                dangerouslySetInnerHTML={{
                  __html: result.htmlTitle || result.title
                }}
              />
              <ExternalLink className="w-3 h-3 mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </h4>
          </a>

          {/* Snippet */}
          {result.snippet && (
            <p
              className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3"
              dangerouslySetInnerHTML={{
                __html: result.htmlSnippet || result.snippet
              }}
            />
          )}

          {/* URL */}
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-500 truncate">
            {result.formattedUrl || result.link}
          </div>
        </div>
      </div>
    </div>
  );
});

SearchResultItem.displayName = 'SearchResultItem';

// Compact version for inline display
export const CompactGoogleSearchResults = memo(({
  data,
  maxResults = 3
}: {
  data: GoogleSearchResult[] | GoogleSearchData | any;
  maxResults?: number;
}) => {
  let searchResults: GoogleSearchResult[] = [];

  if (Array.isArray(data)) {
    searchResults = data;
  } else if (data?.items && Array.isArray(data.items)) {
    searchResults = data.items;
  }

  if (searchResults.length === 0) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-3">
        <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
          Found {searchResults.length} search results
        </span>
      </div>

      <div className="space-y-2">
        {searchResults.slice(0, maxResults).map((result, index) => (
          <SearchResultItem
            key={`${result.link}-${index}`}
            result={result}
            showThumbnail={false}
            showSources={true}
          />
        ))}
      </div>

      {searchResults.length > maxResults && (
        <p className="text-xs text-blue-600 dark:text-blue-400 text-center mt-2">
          ... and {searchResults.length - maxResults} more results
        </p>
      )}
    </div>
  );
});

CompactGoogleSearchResults.displayName = 'CompactGoogleSearchResults';

// Helper function to format domain
function formatDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// Enhanced version with more customization options
export const EnhancedGoogleSearchResults = memo(({
  data,
  config = {}
}: {
  data: GoogleSearchResult[] | GoogleSearchData | any;
  config?: {
    defaultMinimized?: boolean;
    showResultCount?: boolean;
    maxVisibleResults?: number;
    showSnippets?: boolean;
    showThumbnails?: boolean;
  };
}) => {
  const {
    defaultMinimized = true,
    showResultCount = true,
    // maxVisibleResults = 3,
    // showSnippets = true,
    // showThumbnails = true
  } = config;

  return (
    <GoogleSearchResults
      data={data}
      minimized={defaultMinimized}
      showSources={showResultCount}
    />
  );
});

EnhancedGoogleSearchResults.displayName = 'EnhancedGoogleSearchResults';