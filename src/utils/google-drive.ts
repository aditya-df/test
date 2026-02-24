import { google } from "googleapis";
import { getAuthSession } from "@/utils/auth-utils-server";
import { Files, MimeType } from "@/types";
import { getMimeType } from "@/utils/file-formats";

export async function authenticate() {
  const session = await getAuthSession();

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_ID,
    process.env.GOOGLE_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: session?.accessToken,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function getFiles(id: string, source: string = 'myDrive') {
  const drive = await authenticate();

  const dataArr: any[] = [];

  let pageToken = null;
  let query = '';
  
  // Determine query based on source
  if (source === 'myDrive') {
    query = `'${id}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.form' and mimeType != 'application/vnd.jgraph.mxfile'`;
  } else if (source === 'shared') {
    query = `sharedWithMe = true and trashed = false and mimeType != 'application/vnd.google-apps.form' and mimeType != 'application/vnd.jgraph.mxfile'`;
    if (id !== 'shared') {
      query += ` and '${id}' in parents`;
    }
  }

  do {
    const res: any = await drive.files.list({
      fields:
        "nextPageToken, files(id, name, size, mimeType, parents, iconLink, capabilities(canDownload), fileExtension)",
      corpora: "user",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      pageToken,
      q: query,
    });

    res.data.files.forEach((file: any) => {
      dataArr.push(file);
    });

    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return dataArr;
}

function isWorkspaceFile(mimeType: MimeType) {
  // Only Google Workspace native formats need export
  const workspaceMimeTypes = [
    "application/vnd.google-apps.spreadsheet",  // Google Sheets
    "application/vnd.google-apps.document",     // Google Docs
    "application/vnd.google-apps.presentation", // Google Slides
    "application/vnd.google-apps.drawing",      // Google Drawings
  ];

  return workspaceMimeTypes.includes(mimeType);
}

export async function downloadFiles(file: Files) {
  const drive = await authenticate();

  let res: any;

  console.log("Downloading file:", file.name);
  console.log("Original MIME type:", file.mimeType);

  if (isWorkspaceFile(file.mimeType)) {
    // This is a native Google Workspace file - needs export
    const exportMimeType = getMimeType(file.mimeType);
    console.log("Exporting Google Workspace file to:", exportMimeType);

    res = await drive.files.export(
      {
        fileId: file.id,
        mimeType: exportMimeType,
      },
      { responseType: "stream" }
    );
  } else {
    // This is a regular file (xlsx, pdf, docx, etc.) - just download it
    console.log("Downloading regular file");

    res = await drive.files.get(
      {
        fileId: file.id,
        alt: "media",
      },
      { responseType: "stream" }
    );
  }

  return res;
}