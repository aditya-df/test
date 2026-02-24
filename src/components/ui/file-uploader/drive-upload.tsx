"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";
import { ChevronRight, Loader2Icon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Files } from "@/types";
import { getMimeType, mimeTypeToExtension } from "@/utils/file-formats";
import { toast } from "@/hooks/use-toast";
import { LinkGoogleAccount } from "@/components/account/link-google";
import * as XLSX from "xlsx";

export default function Home({ setMultipleFiles }: any) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<Files[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("root");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [driveSource, setDriveSource] = useState<"myDrive" | "shared">("myDrive");
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([
    {
      id: "root",
      name: "My Drive",
    },
  ]);

  const fetchFiles = useCallback(async () => {
    if (!session?.user.provider || session.user.provider !== "google") return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/drive?key=${selectedFolder}&source=${driveSource}`);
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast({
        title: "Error",
        description: "Failed to fetch files from Google Drive",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedFolder, driveSource, session?.user.provider]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    if (open) {
      setMultipleFiles((prevFiles: File[]) => {
        setUploadedFiles(prevFiles);
        return prevFiles;
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) setSelectedFiles([]);
  }, [open]);

  function selectFolder(id: string) {
    const selectedFile = files.find((item) => item.id === id);
    if (breadcrumb.find((item) => item.id === id)) {
      setBreadcrumb(
        breadcrumb.slice(0, breadcrumb.findIndex((item) => item.id === id) + 1)
      );
    } else {
      setBreadcrumb((prev: any) => {
        return [...prev, { id, name: selectedFile?.name }];
      });
    }
    setSelectedFiles([]);
    setSelectedFolder(id);
  }

  const switchDriveSource = useCallback((source: "myDrive" | "shared") => {
    // Prevent multiple calls if already on the same source
    if (driveSource === source) return;
    
    // Batch state updates to prevent multiple re-renders
    setDriveSource(source);
    setSelectedFiles([]);

    if (source === "myDrive") {
      setSelectedFolder("root");
      setBreadcrumb([{
        id: "root",
        name: "My Drive",
      }]);
    } else {
      setSelectedFolder("shared");
      setBreadcrumb([{
        id: "shared",
        name: "Shared with me",
      }]);
    }
  }, [driveSource]);

  const [loadingUpload, setLoadingUpload] = useState(false);

  // Helper function to check for duplicate files
  const checkForDuplicates = (newFiles: File[], existingFiles: File[]) => {
    const duplicates: string[] = [];
    const uniqueFiles: File[] = [];

    newFiles.forEach((newFile) => {
      const isDuplicate = existingFiles.some((existingFile) => {
        // Check by name and size for more accurate duplicate detection
        return existingFile.name === newFile.name && existingFile.size === newFile.size;
      });

      if (isDuplicate) {
        duplicates.push(newFile.name);
      } else {
        uniqueFiles.push(newFile);
      }
    });

    return { duplicates, uniqueFiles };
  };

  async function downloadGDriveFile(filesId: string[]) {
    setLoadingUpload(true);
    const newFiles: File[] = [];
    const errors: string[] = [];
    const multiSheetExcelFiles: string[] = [];

    await Promise.all(
      filesId.map(async (id) => {
        try {
          const selectedFile = files.find((file) => file.id == id);

          if (!selectedFile) return;

          const response = await fetch("/api/drive/download", {
            method: "POST",
            body: JSON.stringify(selectedFile),
          });
          if (!response.ok)
            throw new Error(
              'Failed to download file "' + selectedFile.name + '"'
            );

          const blob = await response.blob();
          const fileName = selectedFile.name.includes(".")
            ? selectedFile.name
            : selectedFile.name +
            mimeTypeToExtension[getMimeType(selectedFile.mimeType) as string];
          const fileType = response.headers.get("content-type");

          const myFile = new File([blob], fileName, {
            type: fileType as string,
          });

          // Check if Excel file has multiple sheets
          if ((fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls')) &&
            await hasMultipleSheets(myFile)) {
            multiSheetExcelFiles.push(fileName);
          } else {
            newFiles.push(myFile);
          }
        } catch (error) {
          if (error instanceof Error) {
            errors.push(error.message);
          } else {
            errors.push("Unexpected error occurred");
          }
        }
      })
    );

    // Check for duplicates before adding to existing files
    setMultipleFiles((prevFiles: File[]) => {
      const { duplicates, uniqueFiles } = checkForDuplicates(newFiles, prevFiles);

      // Check if adding unique files would exceed the 15 file limit
      const totalFilesAfterAddition = prevFiles.length + uniqueFiles.length;

      if (totalFilesAfterAddition > 15) {
        toast({
          variant: "destructive",
          title: "File Limit Exceeded",
          description: `You can only upload a maximum of 15 files. Currently you have ${prevFiles.length} files. Adding ${uniqueFiles.length} more files would exceed the limit.`,
        });
        setOpen(false);
        setLoadingUpload(false);
        return prevFiles; // Return existing files without adding new ones
      }

      // Show toast for duplicates
      if (duplicates.length > 0) {
        toast({
          variant: "destructive",
          title: "Duplicate Files Detected",
          description: `The following files are already uploaded: ${duplicates.join(", ")}. Duplicate files were not added.`,
        });
      }

      // Show toast for errors
      if (errors.length > 0) {
        toast({
          variant: "destructive",
          title: "Download Errors",
          description: errors.join("; "),
        });
      }

      // Display toast error for multi-sheet Excel files
      if (multiSheetExcelFiles.length > 0) {
        multiSheetExcelFiles.forEach((fileName) => {
          toast({
            title: "Error",
            description: `"${fileName}" contains multiple sheets. Only single-sheet Excel files are supported.`,
            variant: "destructive",
          });
        });
      }

      // Show success toast for unique files
      if (uniqueFiles.length > 0) {
        toast({
          title: "Files Added Successfully",
          description: `${uniqueFiles.length} file${uniqueFiles.length !== 1 ? 's' : ''} added to your upload list. Total files: ${totalFilesAfterAddition}`,
        });
      }

      // Return updated files array with only unique files added
      return [...prevFiles, ...uniqueFiles];
    });

    setOpen(false);
    setLoadingUpload(false);
  }

  useEffect(() => {
    if (!open) setSelectedFiles([]);
  }, [open]);

  const isFileTooLarge = (file: Files) => {
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    return file.size && file.size > maxSize;
  };

  const isFileAlreadyUploaded = (file: Files) => {
    // Make sure we have a valid file name and size to compare
    if (!file.name || !file.size) return false;

    // Check if this file exists in the uploadedFiles array
    return uploadedFiles.some((uploadedFile) => {
      // Normalize file names for comparison (remove extension if needed)
      const uploadedName = uploadedFile.name.toLowerCase();
      const fileName = file.name.toLowerCase();

      // Compare by name and size for more accurate detection
      return (uploadedName === fileName ||
        uploadedName.includes(fileName) ||
        fileName.includes(uploadedName)) &&
        Math.abs(uploadedFile.size - file.size) < 100; // Allow small size differences
    });
  };

  // Function to check if an Excel file has multiple sheets
  const hasMultipleSheets = async (file: File): Promise<boolean> => {
    // Only check Excel files
    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      return false;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      // If the workbook has more than one sheet, return true
      return workbook.SheetNames.length > 1;
    } catch (error) {
      console.error('Error checking Excel sheets:', error);
      return false; // In case of error, allow the file to proceed
    }
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number) => {
    if (!bytes) return "—";
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  // Helper function to check if file has allowed extension
  const isAllowedFileType = (file: Files) => {
    const allowedExtensions = ['pdf', 'docx', 'xlsx'];
    const fileName = file.name.toLowerCase();
    const mimeType = file.mimeType.toLowerCase();

    // Check by file extension
    const hasAllowedExtension = allowedExtensions.some(ext =>
      fileName.endsWith(`.${ext}`)
    );

    // Check by MIME type as fallback
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const hasAllowedMimeType = allowedMimeTypes.some(type =>
      mimeType.includes(type.toLowerCase())
    );

    return hasAllowedExtension || hasAllowedMimeType;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <form>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex gap-x-1">
            <img src="/images/icon-gdrive.png" alt="Google Drive" className="h-6 aspect-square" />
            Google Drive
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-10/12 max-h-11/12 flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Your Google Drive File</DialogTitle>
            <DialogDescription>
              We will securely connect to your Google Drive, allow you to browse
              your files, and import PDF, DOCX, or XLSX files to be used as knowledge sources.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 border border-gray-400 rounded-md grow overflow-y-auto">
            {session?.user.provider === "google" ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <section className="flex gap-x-2 items-center">
                    {breadcrumb.map((item, index) => {
                      return (
                        <div key={`${item.id}-${index}`} className="flex items-center gap-x-2">
                          <button
                            className={cn(
                              "text-lg font-semibold",
                              index != breadcrumb.length - 1 && "cursor-pointer"
                            )}
                            onClick={() => {
                              selectFolder(item.id);
                            }}
                          >
                            {item.name}
                          </button>
                          {index != breadcrumb.length - 1 && (
                            <ChevronRight className="w-4" />
                          )}
                        </div>
                      );
                    })}
                  </section>

                  <div className="flex gap-2">
                    <Button
                      variant={driveSource === "myDrive" ? "default" : "outline"}
                      size="sm"
                      onClick={() => switchDriveSource("myDrive")}
                      className="text-xs"
                    >
                      My Drive
                    </Button>
                    <Button
                      variant={driveSource === "shared" ? "default" : "outline"}
                      size="sm"
                      onClick={() => switchDriveSource("shared")}
                      className="text-xs"
                    >
                      Shared with me
                    </Button>
                    {/* <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          // Sign out current user first
                          await signOut({ redirect: false });
                          
                          // Small delay to ensure signout is complete
                          setTimeout(() => {
                            // Sign in with account selection prompt
                            signIn("google", {
                              redirect: true,
                              callbackUrl: window.location.href,
                              prompt: "select_account"
                            });
                          }, 100);
                        } catch (error) {
                          console.error("Error switching accounts:", error);
                          toast({
                            title: "Error",
                            description: "Failed to switch accounts. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="text-xs"
                    >
                      Switch Account
                    </Button> */}
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2Icon className="animate-spin" />
                  </div>
                ) : (
                  <div className="select-none">
                    {files.length > 0 ? (
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr className="border-b">
                              <th className="text-left p-3 font-medium text-sm w-10">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300"
                                  onChange={(e) => {
                                    const selectableFiles = files
                                      .filter(item => !item.mimeType.includes("folder") &&
                                        isAllowedFileType(item) &&
                                        !isFileTooLarge(item) &&
                                        !isFileAlreadyUploaded(item))
                                      .map(file => file.id);

                                    if (e.target.checked) {
                                      setSelectedFiles(selectableFiles);
                                    } else {
                                      setSelectedFiles([]);
                                    }
                                  }}
                                  checked={
                                    selectedFiles.length > 0 &&
                                    selectedFiles.length === files.filter(item =>
                                      !item.mimeType.includes("folder") &&
                                      isAllowedFileType(item) &&
                                      !isFileTooLarge(item) &&
                                      !isFileAlreadyUploaded(item)
                                    ).length
                                  }
                                />
                              </th>
                              <th className="text-left p-3 font-medium text-sm">Name</th>
                              <th className="text-left p-3 font-medium text-sm">Modified</th>
                              <th className="text-left p-3 font-medium text-sm">Size</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Render folders first */}
                            {files
                              .filter((item) => item.mimeType.includes("folder"))
                              .map((file) => (
                                <tr
                                  key={file.id}
                                  className={cn(
                                    "border-b hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors",
                                    selectedFolder === file.id &&
                                    "bg-blue-50 dark:bg-blue-900/20"
                                  )}
                                  onDoubleClick={() => {
                                    selectFolder(file.id);
                                  }}
                                >
                                  <td className="p-3 text-center">
                                    {/* Folders don't have checkboxes since they can't be selected */}
                                    <span className="w-4 h-4 inline-block"></span>
                                  </td>
                                  <td className="p-3 flex items-center gap-3">
                                    <img
                                      src={file.iconLink}
                                      alt={file.name}
                                      className="w-5 h-5 shrink-0"
                                    />
                                    <span className="text-sm font-medium">{file.name}</span>
                                  </td>
                                  <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                                    {formatDate(file.modifiedTime)}
                                  </td>
                                  <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                                    —
                                  </td>
                                </tr>
                              ))}

                            {/* Render files - only show allowed file types */}
                            {files
                              .filter((item) => !item.mimeType.includes("folder") && isAllowedFileType(item))
                              .map((file) => {
                                const isTooLarge = isFileTooLarge(file);
                                const isAlreadyUploaded = isFileAlreadyUploaded(file);
                                return (
                                  <tr
                                    key={file.id}
                                    className={cn(
                                      "border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                                      isTooLarge || isAlreadyUploaded
                                        ? "opacity-50 cursor-not-allowed"
                                        : "cursor-pointer",
                                      !isTooLarge && !isAlreadyUploaded && selectedFiles.includes(file.id) &&
                                      "bg-blue-50 dark:bg-blue-900/20"
                                    )}
                                  >
                                    <td className="p-3 text-center">
                                      <input
                                        type="checkbox"
                                        className="rounded border-gray-300"
                                        checked={selectedFiles.includes(file.id)}
                                        disabled={isTooLarge || isAlreadyUploaded}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          if (isTooLarge) {
                                            toast({
                                              variant: "destructive",
                                              title: "File Too Large",
                                              description: `${file.name} exceeds the 10MB size limit and cannot be selected.`,
                                            });
                                            return;
                                          }
                                          if (isAlreadyUploaded) {
                                            toast({
                                              variant: "destructive",
                                              title: "File Already Uploaded",
                                              description: `${file.name} has already been uploaded and cannot be selected again.`,
                                            });
                                            return;
                                          }
                                          if (selectedFiles.includes(file.id)) {
                                            setSelectedFiles(
                                              selectedFiles.filter(
                                                (id) => id !== file.id
                                              )
                                            );
                                          } else {
                                            setSelectedFiles([
                                              ...selectedFiles,
                                              file.id,
                                            ]);
                                          }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </td>
                                    <td className="p-3 flex items-center gap-3">
                                      <img
                                        src={file.iconLink}
                                        alt={file.name}
                                        className="w-5 h-5 shrink-0"
                                      />
                                      <span className={cn(
                                        "text-sm",
                                        (isTooLarge || isAlreadyUploaded) && "line-through"
                                      )}>
                                        {file.name}
                                        {isTooLarge && (
                                          <span className="ml-2 text-xs text-red-500">
                                            (Exceeds 10MB limit)
                                          </span>
                                        )}
                                        {!isTooLarge && isAlreadyUploaded && (
                                          <span className="ml-2 text-xs text-green-600 font-medium">
                                            ✓ Already uploaded
                                          </span>
                                        )}
                                      </span>
                                    </td>
                                    <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                                      {formatDate(file.modifiedTime)}
                                    </td>
                                    <td className={cn(
                                      "p-3 text-sm",
                                      isTooLarge ? "text-red-500 font-medium" :
                                        isAlreadyUploaded ? "text-green-600 font-medium" :
                                          "text-gray-600 dark:text-gray-400"
                                    )}>
                                      {formatFileSize(file.size)}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>

                        {files.filter((item) => item.mimeType.includes("folder")).length === 0 &&
                          files.filter((item) => !item.mimeType.includes("folder") && isAllowedFileType(item)).length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              No PDF, DOCX, or XLSX files found in this folder
                            </div>
                          )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No PDF, DOCX, or XLSX files found in this folder
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-40">
                <LinkGoogleAccount className="mx-auto" redirect />
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={loadingUpload} variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              disabled={selectedFiles.length < 1 || loadingUpload}
              onClick={() => downloadGDriveFile(selectedFiles)}
              className="flex gap-x-1 items-center"
            >
              {loadingUpload && <Loader2Icon className="animate-spin h-4" />}
              Select Files
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}