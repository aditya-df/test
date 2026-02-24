/* eslint-disable @typescript-eslint/no-unused-vars */
import { Components } from "react-markdown";
import Link from "next/link";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { CheckIcon, CopyIcon, ImageIcon } from "lucide-react";
import { useState, useCallback, memo, useRef } from "react";
import React from "react";
// Import XLSX statically at the top
import * as XLSX from "xlsx";

// Import ImagePreview from the separated file
import { ImagePreview, isImageUrl } from "./image-components";

// Define languages that should show line numbers
const LANGUAGES_WITH_LINE_NUMBERS = [
  "javascript",
  "js",
  "jsx",
  "typescript",
  "ts",
  "tsx",
  "json",
  "python",
  "py",
  "java",
  "csharp",
  "c",
  "cpp",
];

// Define a mapping for language aliases
const LANGUAGE_ALIASES = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  zsh: "bash",
  yml: "yaml",
};

// Helper function to check if children contain block-level elements
const containsBlockElements = (children: React.ReactNode): boolean => {
  if (!children) return false;

  const childArray = React.Children.toArray(children);
  return childArray.some((child) => {
    if (React.isValidElement(child)) {
      return (
        child.type === ImagePreview ||
        (typeof child.type === "string" &&
          [
            "div",
            "section",
            "article",
            "header",
            "footer",
            "nav",
            "aside",
          ].includes(child.type))
      );
    }
    return false;
  });
};

// Memoized Code Block Component
const MemoizedCodeBlock = memo(({ className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";

  const handleCopy = useCallback(async () => {
    if (children) {
      await navigator.clipboard.writeText(String(children));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [children]);

  const isCodeBlock = match && children;

  if (isCodeBlock) {
    const { ref, ...syntaxProps } = props;
    return (
      <div className="relative group rounded-md overflow-hidden my-4">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-200 text-xs font-mono">
          <span>{language.toUpperCase()}</span>
          <button
            onClick={handleCopy}
            className="hover:bg-gray-700 px-2 py-1 rounded transition-colors"
          >
            {copied ? (
              <span className="flex items-center">
                <CheckIcon className="h-4 w-4 mr-1 text-green-500" />
                Copied!
              </span>
            ) : (
              <span className="flex items-center">
                <CopyIcon className="h-4 w-4 mr-1" />
                Copy
              </span>
            )}
          </button>
        </div>
        <SyntaxHighlighter
          language={language}
          style={oneDark as any}
          customStyle={{
            margin: 0,
            padding: "1rem",
            borderRadius: "0 0 0.375rem 0.375rem",
            fontSize: "0.9rem",
          }}
          showLineNumbers={LANGUAGES_WITH_LINE_NUMBERS.includes(language)}
          wrapLines={true}
          {...syntaxProps}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    );
  }

  return (
    <code
      className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-base sm:text-sm font-mono"
      {...props}
    >
      {children}
    </code>
  );
});

MemoizedCodeBlock.displayName = "MemoizedCodeBlock";

export const markdownComponents: Partial<Components> = {
  // FIXED: Use div instead of p to avoid nesting issues
  p: ({ children }) => {
    if (containsBlockElements(children)) {
      return <div className="mb-4 last:mb-0">{children}</div>;
    }
    return (
      <div className="leading-6 text-base sm:text-sm mb-4">{children}</div>
    );
  },

  // Handle pre elements properly
  pre: ({ children }) => <div className="overflow-x-auto">{children}</div>,

  // Handle ordered lists
  ol: ({ children, ...props }) => {
    return (
      <div className="mb-4">
        <ol
          className="list-decimal list-outside ml-4 text-base sm:text-sm space-y-1"
          {...props}
        >
          {children}
        </ol>
      </div>
    );
  },

  // Handle unordered lists
  ul: ({ children, ...props }) => {
    return (
      <div className="mb-4">
        <ul
          className="list-disc list-outside ml-4 text-base sm:text-sm space-y-1"
          {...props}
        >
          {children}
        </ul>
      </div>
    );
  },

  // Handle list items
  li: ({ children, ...props }) => {
    return (
      <li className="py-1 text-base sm:text-sm" {...props}>
        {children}
      </li>
    );
  },

  // Enhanced: Handle both markdown images ![](src) and HTML <img src="" /> tags
  img: ({ src, alt, title, width, height, ...props }) => {
    // Early return for missing src
    if (!src) {
      return (
        <div className="inline-block my-4 p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center text-red-600 dark:text-red-400">
            <ImageIcon className="h-5 w-5 mr-2" />
            <span className="text-sm">Image missing src attribute</span>
          </div>
        </div>
      );
    }

    // Check if it's actually an image URL
    if (isImageUrl(src)) {
      return (
        <div className="my-4">
          <ImagePreview
            key={`img-${src}`}
            src={src}
            alt={alt || title || ""}
            className={props.className || ""}
          />
        </div>
      );
    }

    // If src doesn't look like an image URL, render a fallback
    return (
      <div className="inline-block my-4 p-4 border border-yellow-200 dark:border-yellow-800 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
        <div className="flex items-center text-yellow-600 dark:text-yellow-400">
          <ImageIcon className="h-5 w-5 mr-2" />
          <span className="text-sm">Non-image src detected</span>
        </div>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm underline mt-1 block font-mono break-all"
        >
          {src}
        </a>
      </div>
    );
  },

  // Handle code blocks
  code: MemoizedCodeBlock,

  // Handle strong/bold text
  strong: ({ children, ...props }) => {
    return (
      <strong className="font-semibold" {...props}>
        {children}
      </strong>
    );
  },

  // Handle emphasis/italic text
  em: ({ children, ...props }) => {
    return (
      <em className="italic" {...props}>
        {children}
      </em>
    );
  },

  // Enhanced: Also handle <a> tags that contain image URLs
  a: ({ children, href, title, ...props }) => {
    if (href && isImageUrl(href)) {
      const altText =
        typeof children === "string"
          ? children
          : Array.isArray(children)
          ? children.join("")
          : title || href.split("/").pop() || "Image";

      // Use stable key for image links based on href
      return (
        <div className="my-4">
          <ImagePreview key={`link-${href}`} src={href} alt={altText} />
        </div>
      );
    }

    return (
      <Link
        className="text-blue-500 hover:underline font-medium"
        target="_blank"
        rel="noreferrer"
        href={href || ""}
        {...props}
      >
        {children}
      </Link>
    );
  },

  // Handle headings with proper block structure
  h1: ({ children, ...props }) => {
    return (
      <div className="text-3xl sm:text-2xl font-semibold mt-6 mb-3" {...props}>
        {children}
      </div>
    );
  },

  h2: ({ children, ...props }) => {
    return (
      <div className="text-2xl sm:text-xl font-semibold mt-6 mb-3" {...props}>
        {children}
      </div>
    );
  },

  h3: ({ children, ...props }) => {
    return (
      <div className="text-xl sm:text-lg font-semibold mt-6 mb-3" {...props}>
        {children}
      </div>
    );
  },

  h4: ({ children, ...props }) => {
    return (
      <div className="text-lg sm:text-base font-semibold mt-6 mb-3" {...props}>
        {children}
      </div>
    );
  },

  h5: ({ children, ...props }) => {
    return (
      <div className="text-base font-semibold mt-6 mb-3" {...props}>
        {children}
      </div>
    );
  },

  h6: ({ children, ...props }) => {
    return (
      <div className="text-sm font-semibold mt-6 mb-3" {...props}>
        {children}
      </div>
    );
  },

  // Handle blockquotes
  blockquote: ({ children, ...props }) => {
    return (
      <blockquote
        className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic bg-gray-50 dark:bg-gray-800 py-2"
        {...props}
      >
        {children}
      </blockquote>
    );
  },
  // Handle horizontal rules
  hr: ({ ...props }) => {
    return (
      <div
        className="border-t border-gray-300 dark:border-gray-600 my-6"
        {...props}
      ></div>
    );
  },

  // Handle tables with enhanced functionality
  table: ({ children, ...props }) => {
    const [isHovering, setIsHovering] = useState(false);
    const tableRef = useRef<HTMLTableElement>(null);

    const extractTableData = useCallback(() => {
      // Use the ref to target only this specific table
      if (!tableRef.current) return [];

      const rows = Array.from(tableRef.current.querySelectorAll("tr"));

      const headers = Array.from(rows[0]?.querySelectorAll("th") || []).map(
        (header) => header.textContent?.trim() || ""
      );

      const dataRows = rows.slice(1).map((row) => {
        return Array.from(row.querySelectorAll("td")).map(
          (cell) => cell.textContent?.trim() || ""
        );
      });

      return [headers, ...dataRows];
    }, []);

    const downloadAsXLSX = useCallback(async () => {
      const data = extractTableData();

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Table Data");
      XLSX.writeFile(wb, "table-data.xlsx");
    }, [extractTableData]);

    return (
      <div
        className="overflow-x-auto my-4 relative"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {isHovering && (
          <div className="absolute top-0 right-0 p-2 z-10">
            <button
              onClick={downloadAsXLSX}
              className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs flex items-center transition-colors"
              title="Download as Excel"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              XLSX
            </button>
          </div>
        )}
        <table
          ref={tableRef}
          className="min-w-full divide-y divide-gray-300 dark:divide-gray-700 border border-gray-300 dark:border-gray-700 text-base sm:text-sm"
          {...props}
        >
          {children}
        </table>
      </div>
    );
  },

  thead: ({ children, ...props }) => {
    return (
      <thead className="bg-gray-100 dark:bg-gray-800" {...props}>
        {children}
      </thead>
    );
  },

  tbody: ({ children, ...props }) => {
    return (
      <tbody
        className="divide-y divide-gray-200 dark:divide-gray-700"
        {...props}
      >
        {children}
      </tbody>
    );
  },

  tr: ({ children, ...props }) => {
    return (
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-900" {...props}>
        {children}
      </tr>
    );
  },

  th: ({ children, ...props }) => {
    return (
      <th
        className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider"
        {...props}
      >
        {children}
      </th>
    );
  },

  td: ({ children, ...props }) => {
    return (
      <td className="px-4 py-3 text-base sm:text-sm" {...props}>
        {children}
      </td>
    );
  },

  // Handle div elements properly
  div: ({ children, ...props }) => {
    return <div {...props}>{children}</div>;
  },

  // Handle span elements
  span: ({ children, ...props }) => {
    return <span {...props}>{children}</span>;
  },

  // Handle delete/strikethrough text
  del: ({ children, ...props }) => {
    return (
      <del className="line-through" {...props}>
        {children}
      </del>
    );
  },

  // Handle subscript
  sub: ({ children, ...props }) => {
    return (
      <sub className="text-xs align-sub" {...props}>
        {children}
      </sub>
    );
  },

  // Handle superscript
  sup: ({ children, ...props }) => {
    return (
      <sup className="text-xs align-super" {...props}>
        {children}
      </sup>
    );
  },

  // Handle keyboard input
  kbd: ({ children, ...props }) => {
    return (
      <kbd
        className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500"
        {...props}
      >
        {children}
      </kbd>
    );
  },

  // Handle mark/highlight
  mark: ({ children, ...props }) => {
    return (
      <mark
        className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded"
        {...props}
      >
        {children}
      </mark>
    );
  },

  // Handle small text
  small: ({ children, ...props }) => {
    return (
      <small className="text-xs text-gray-600 dark:text-gray-400" {...props}>
        {children}
      </small>
    );
  },
};
