import { MimeType } from "@/types";

export type FileFormatInfo = {
  format: string;
  mimeType: string;
  extension: string;
};

export const fileFormats: FileFormatInfo[] = [
  {
    format: "Microsoft Word",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: ".docx",
  },
  {
    format: "OpenDocument",
    mimeType: "application/vnd.oasis.opendocument.text",
    extension: ".odt",
  },
  { format: "Rich Text", mimeType: "application/rtf", extension: ".rtf" },
  { format: "PDF", mimeType: "application/pdf", extension: ".pdf" },
  { format: "Plain Text", mimeType: "text/plain", extension: ".txt" },
  { format: "Web Page (HTML)", mimeType: "application/zip", extension: ".zip" },
  { format: "EPUB", mimeType: "application/epub+zip", extension: ".epub" },
  { format: "Markdown", mimeType: "text/markdown", extension: ".md" },
  {
    format: "Microsoft Excel",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: ".xlsx",
  },
  {
    format: "OpenDocument Spreadsheet",
    mimeType: "application/vnd.oasis.opendocument.spreadsheet",
    extension: ".ods",
  },
  { format: "CSV", mimeType: "text/csv", extension: ".csv" },
  { format: "TSV", mimeType: "text/tab-separated-values", extension: ".tsv" },
  {
    format: "Microsoft PowerPoint",
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    extension: ".pptx",
  },
  {
    format: "ODP",
    mimeType: "application/vnd.oasis.opendocument.presentation",
    extension: ".odp",
  },
  { format: "JPEG", mimeType: "image/jpeg", extension: ".jpg" },
  { format: "PNG", mimeType: "image/png", extension: ".png" },
  { format: "SVG", mimeType: "image/svg+xml", extension: ".svg" },
  {
    format: "Apps Script JSON",
    mimeType: "application/vnd.google-apps.script+json",
    extension: ".json",
  },
  { format: "Google Vids MP4", mimeType: "application/mp4", extension: ".mp4" },
];

export const mimeTypeToExtension = Object.fromEntries(
  fileFormats.map((f) => [f.mimeType, f.extension])
);

export const extensionToMimeType = Object.fromEntries(
  fileFormats.map((f) => [f.extension, f.mimeType])
);

export function getMimeType(mimeType: MimeType) {
  switch (mimeType) {
    case "application/vnd.google-apps.spreadsheet":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "application/vnd.google-apps.presentation":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "application/vnd.google-apps.document":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "application/vnd.ms-excel.sheet.macroenabled.12":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    default:
      break;
  }
}
