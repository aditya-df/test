// Create a preprocessor to fix URLs before markdown parsing
export const preprocessMarkdownUrls = (content: string | null | undefined): string => {
  // Guard against null/undefined content (common with AI SDK 5.x parts-based messages)
  if (!content) {
    return '';
  }

  // First, fix markdown links that have nested square brackets in the link text
  // This regex captures the full markdown link structure
  // We need to be more careful with nested brackets
  const nestedBracketLinkRegex = /\[([^\]]*\[[^\]]*\][^\]]*)\]\(([^)]*)\)/g;

  let processedContent = content.replace(nestedBracketLinkRegex, (match, linkText, url) => {
    // Escape square brackets in the link text
    const escapedLinkText = linkText.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
    // Encode spaces in the URL part
    const encodedUrl = url.replace(/ /g, '%20');
    return `[${escapedLinkText}](${encodedUrl})`;
  });

  // Then handle normal markdown links (without nested brackets)
  const markdownLinkRegex = /\[([^\]]*)\]\(([^)]*)\)/g;

  processedContent = processedContent.replace(markdownLinkRegex, (match, linkText, url) => {
    // Only process if linkText doesn't already have escaped brackets
    if (linkText.includes('\\[') || linkText.includes('\\]')) {
      return match; // Already processed
    }
    // Encode spaces in the URL part
    const encodedUrl = url.replace(/ /g, '%20');
    return `[${linkText}](${encodedUrl})`;
  });

  // Also handle bare URLs (not in markdown link format)
  // Pattern for URLs that contain spaces
  const bareUrlRegex = /(https?:\/\/[^\s\])\>]*\s[^\s\])\>]*(?:\.[a-zA-Z]{2,}|\/[^\s\])\>]*)*)/g;

  processedContent = processedContent.replace(bareUrlRegex, (match) => {
    return match.replace(/ /g, '%20');
  });

  return processedContent;
};