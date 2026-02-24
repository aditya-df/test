"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Icons } from "@/components/icons";
import { useStore } from "@/stores/credential/useStore";
import { Data } from "@/stores/credential/model";
import { useDropzoneForCredentials } from "@/utils/dropzone";
import { useToast } from "@/hooks/use-toast";
import {
    File,
    X,
    Plus,
    Database,
    BookOpen,
    CloudRain,
    Search,
    Cloud,
} from "lucide-react";

const CREDENTIAL_TYPES = {
    BIGQUERY: 'bigquery',
    WIKIPEDIA: 'wikipedia',
    WEATHER: 'weather',
    GOOGLE_SEARCH: 'google_search'
} as const;

type CredentialType = typeof CREDENTIAL_TYPES[keyof typeof CREDENTIAL_TYPES];

const credentialOptions = [
    {
        value: CREDENTIAL_TYPES.BIGQUERY,
        label: 'Google BigQuery',
        description: 'Google Cloud BigQuery service account credentials',
        icon: Database,
        requiresFile: true
    },
    {
        value: CREDENTIAL_TYPES.WIKIPEDIA,
        label: 'Wikipedia API',
        description: 'Wikipedia API user agent configuration',
        icon: BookOpen,
        requiresFile: false
    },
    {
        value: CREDENTIAL_TYPES.WEATHER,
        label: 'Weather API',
        description: 'Weather service API key',
        icon: CloudRain,
        requiresFile: false
    },
    {
        value: CREDENTIAL_TYPES.GOOGLE_SEARCH,
        label: 'Google Search API',
        description: 'Google Custom Search Engine credentials',
        icon: Search,
        requiresFile: false
    }
];

interface AddCredentialDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    preselectedType?: CredentialType | null;
    contextInfo?: {
        isFromKnowledge?: boolean;
        requiredFor?: string;
    };
    onCredentialCreated?: (credential: Data) => void;
}

export function AddCredentialDialog({
    isOpen,
    onOpenChange,
    preselectedType = null,
    contextInfo,
    onCredentialCreated
}: AddCredentialDialogProps) {
    const { toast } = useToast();
    const store = useStore();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [credential, setCredential] = useState<Data>(new Data());
    const [selectedCredentialType, setSelectedCredentialType] = useState<CredentialType | null>(preselectedType);

    const {
        dragActive,
        inputRef,
        files,
        setFiles,
        handleChange,
        handleDragEnter,
        handleDragLeave,
        handleDragOver,
        handleDrop,
        removeFile,
        openFileExplorer,
    } = useDropzoneForCredentials(credential, setCredential);

    // Reset form when dialog opens/closes or preselected type changes
    useEffect(() => {
        if (isOpen) {
            setSelectedCredentialType(preselectedType);
            setCredential(new Data());
            setFiles([]);
        }
    }, [isOpen, preselectedType, setFiles]);

    const handleCredentialTypeSelect = (type: CredentialType) => {
        setSelectedCredentialType(type);
    };

    const getDialogHeader = () => {
        const getCredentialIconAndLabel = () => {
            if (selectedCredentialType) {
                const option = credentialOptions.find(opt => opt.value === selectedCredentialType);
                return {
                    icon: option?.icon || Cloud,
                    label: option?.label || "Credential"
                };
            }
            return { icon: Plus, label: "New Credential" };
        };

        const { icon: CredentialIcon, label: credentialLabel } = getCredentialIconAndLabel();

        if (contextInfo?.isFromKnowledge && contextInfo?.requiredFor) {
            return (
                <div className="space-y-2">
                    <DialogTitle className="flex items-center gap-2">
                        <CredentialIcon className="h-5 w-5" />
                        {selectedCredentialType
                            ? `Create ${credentialLabel}`
                            : "Add New Credential"}
                    </DialogTitle>
                    <DialogDescription>
                        {selectedCredentialType
                            ? `Create ${credentialLabel.toLowerCase()} credentials required for your knowledge setup.`
                            : "Select a credential type and fill in the required information for your knowledge setup."}
                    </DialogDescription>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-3">
                        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            <span className="text-sm font-medium">
                                Required for: {contextInfo.requiredFor} built-in knowledge
                            </span>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <>
                <DialogTitle className="flex items-center gap-2">
                    <CredentialIcon className="h-5 w-5" />
                    {selectedCredentialType
                        ? `Add New ${credentialLabel}`
                        : "Add New Credential"}
                </DialogTitle>
                <DialogDescription>
                    {selectedCredentialType
                        ? "Fill in the required information for your credential."
                        : "Select a credential type and fill in the required information."}
                </DialogDescription>
            </>
        );
    };

    const handleSubmit = async () => {
        if (!credential.name) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Name is required",
            });
            return;
        }

        if (!selectedCredentialType) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Please select a credential type",
            });
            return;
        }

        const selectedOption = credentialOptions.find(opt => opt.value === selectedCredentialType);

        if (selectedOption?.requiresFile && (!files || files.length === 0)) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Please upload a credential file",
            });
            return;
        }

        // Validate required fields for non-file credentials
        if (selectedCredentialType === CREDENTIAL_TYPES.WIKIPEDIA && !credential.wikipediaAPIKey) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "User Agent is required",
            });
            return;
        }

        if (selectedCredentialType === CREDENTIAL_TYPES.WEATHER && !credential.weatherAPIKey) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "API Key is required",
            });
            return;
        }

        if (selectedCredentialType === CREDENTIAL_TYPES.GOOGLE_SEARCH && (!credential.googleAPIKey || !credential.googleCSID)) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Both API Key and Search Engine ID are required",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const credentialData: Data = {
                ...credential,
                name: credential.name,
                description: credential.description || "",
                credentialFile: files[0] || "",
                wikipediaAPIKey: credential.wikipediaAPIKey || null,
                weatherAPIKey: credential.weatherAPIKey || null,
                googleAPIKey: credential.googleAPIKey || null,
                googleCSID: credential.googleCSID || null,
            };

            const createdCredential = await store.create(credentialData);

            onOpenChange(false);
            setCredential(new Data());
            setSelectedCredentialType(null);
            setFiles([]);

            toast({
                title: "Success",
                description: "Credential created successfully",
            });

            // Notify parent component about the new credential
            if (onCredentialCreated && createdCredential) {
                onCredentialCreated(createdCredential);
            }

        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Failed to save credential",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDialogClose = (open: boolean) => {
        if (!open) {
            onOpenChange(false);
            setSelectedCredentialType(null);
            setCredential(new Data());
            setFiles([]);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleDialogClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    {getDialogHeader()}
                </DialogHeader>

                <div className="py-4 space-y-6">
                    <div className="grid gap-4">
                        {/* Credential Type field with same alignment as other fields */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">
                                Credential Type<span className="text-red-500 ml-1">*</span>
                            </Label>
                            <Select
                                value={selectedCredentialType || ""}
                                onValueChange={(value) => handleCredentialTypeSelect(value as CredentialType)}
                                disabled={!!preselectedType} // Disable if preselected (from URL)
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select credential type..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {credentialOptions.map((option) => {
                                        const Icon = option.icon;
                                        return (
                                            <SelectItem key={option.value} value={option.value}>
                                                <div className="flex items-center gap-3 w-full">
                                                    <Icon className="h-5 w-5 text-gray-600" />
                                                    <div className="flex flex-col items-start">
                                                        <span className="font-medium text-gray-900">
                                                            {option.label}
                                                        </span>
                                                        <span className="text-sm text-gray-500">
                                                            {option.description}
                                                        </span>
                                                    </div>
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Form content - Show when credential type is selected */}
                        {selectedCredentialType && (
                            <>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">
                                        Name<span className="text-red-500 ml-1">*</span>
                                    </Label>
                                    <Input
                                        className="col-span-3"
                                        value={credential.name}
                                        onChange={(e) =>
                                            setCredential({ ...credential, name: e.target.value })
                                        }
                                        placeholder="Credential name"
                                    />
                                </div>

                                <div className="grid grid-cols-4 items-start gap-4">
                                    <Label className="text-right">Description</Label>
                                    <Textarea
                                        className="col-span-3"
                                        value={credential.description}
                                        onChange={(e) =>
                                            setCredential({
                                                ...credential,
                                                description: e.target.value,
                                            })
                                        }
                                        placeholder="Credential description"
                                    />
                                </div>

                                {selectedCredentialType === CREDENTIAL_TYPES.WIKIPEDIA && (
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right">
                                            User Agent<span className="text-red-500 ml-1">*</span>
                                        </Label>
                                        <Input
                                            className="col-span-3"
                                            value={credential.wikipediaAPIKey || ""}
                                            onChange={(e) =>
                                                setCredential({ ...credential, wikipediaAPIKey: e.target.value || null })
                                            }
                                            placeholder="Wikipedia API User Agent"
                                        />
                                    </div>
                                )}

                                {selectedCredentialType === CREDENTIAL_TYPES.WEATHER && (
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right">
                                            API Key<span className="text-red-500 ml-1">*</span>
                                        </Label>
                                        <Input
                                            className="col-span-3"
                                            value={credential.weatherAPIKey || ""}
                                            onChange={(e) =>
                                                setCredential({ ...credential, weatherAPIKey: e.target.value || null })
                                            }
                                            placeholder="Weather API Key"
                                        />
                                    </div>
                                )}

                                {selectedCredentialType === CREDENTIAL_TYPES.GOOGLE_SEARCH && (
                                    <>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label className="text-right">
                                                API Key<span className="text-red-500 ml-1">*</span>
                                            </Label>
                                            <Input
                                                className="col-span-3"
                                                value={credential.googleAPIKey || ""}
                                                onChange={(e) =>
                                                    setCredential({ ...credential, googleAPIKey: e.target.value || null })
                                                }
                                                placeholder="Google API Key"
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label className="text-right">
                                                Search Engine ID<span className="text-red-500 ml-1">*</span>
                                            </Label>
                                            <Input
                                                className="col-span-3"
                                                value={credential.googleCSID || ""}
                                                onChange={(e) =>
                                                    setCredential({ ...credential, googleCSID: e.target.value || null })
                                                }
                                                placeholder="Custom Search Engine ID"
                                            />
                                        </div>
                                    </>
                                )}

                                {selectedCredentialType === CREDENTIAL_TYPES.BIGQUERY && (
                                    <div className="grid items-start grid-cols-4 gap-4">
                                        <Label htmlFor="name" className="text-right">
                                            Add Credentials Files<span className="text-red-500 ml-1">*</span>
                                        </Label>

                                        <form
                                            className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors col-span-3 ${dragActive
                                                ? "border-primary bg-primary/10"
                                                : "border-gray-300 hover:border-primary"
                                                } text-center flex flex-col items-center justify-center`}
                                            onDragEnter={handleDragEnter}
                                            onSubmit={(e) => e.preventDefault()}
                                            onDrop={handleDrop}
                                            onDragLeave={handleDragLeave}
                                            onDragOver={handleDragOver}
                                        >
                                            <input
                                                placeholder="fileInput"
                                                className="hidden"
                                                ref={inputRef}
                                                type="file"
                                                multiple={false}
                                                onChange={handleChange}
                                                accept=".json"
                                            />

                                            <p>
                                                Drag & Drop file or{" "}
                                                <span
                                                    className="font-bold text-blue-600 cursor-pointer"
                                                    onClick={openFileExplorer}
                                                >
                                                    <u>Select file</u>
                                                </span>{" "}
                                                to upload
                                            </p>
                                            <div className="flex flex-col items-center p-3">
                                                {files && files.length > 0 && (
                                                    <div className="mt-6">
                                                        <h3 className="text-lg font-semibold mb-2">
                                                            Uploaded Files
                                                        </h3>
                                                        <ul className="space-y-2">
                                                            {files.map((file: any, index: any) => (
                                                                <li
                                                                    key={index}
                                                                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                                                                >
                                                                    <div className="flex items-center">
                                                                        <File className="h-5 w-5 text-primary mr-2" />
                                                                        <span className="text-sm text-gray-700">
                                                                            {file.name}
                                                                        </span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => removeFile("", index)}
                                                                        className="text-red-500 hover:text-red-700"
                                                                    >
                                                                        <X className="h-5 w-5" />
                                                                    </button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleDialogClose(false)}
                    >
                        Cancel
                    </Button>
                    {selectedCredentialType && (
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting && (
                                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Save
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}