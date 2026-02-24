/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-uploader/file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Toast, ToastProvider } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToolForm } from "@/hooks/knowledge-tool/use-tool-form";
import { useStore } from "@/stores/knowledge-new/useStore";
import { useStore as useAgentStore } from "@/stores/agent/useStore";
import { useStore as useParameterStore } from "@/stores/parameter/useStore";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Play,
  WandSparkles,
  Database,
  Book,
  Cloud,
  Search,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { testConnectionDatabase, testQueryBigquery } from "@/app/action";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from "@/utils/auth-utils-client";
import { VisibilityType } from "@prisma/client";
import { useStore as useCredentialStore } from "@/stores/credential/useStore";
import { toast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ExternalLink,
  Plus,
  AlertTriangle,
  Check,
  ChevronDown,
} from "lucide-react";
import { Data as CredentialData } from "@/stores/credential/model";
import { AddCredentialDialog } from "@/components/admin-panel/add-credential-dialog";
import { regions } from "@/data/bq-locations";
import { appendColumnSchema, cn } from "@/utils/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "next-themes";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { formatSchemaForCodeMirror } from "@/utils/utils";
import ApiConfigurationKnowledge from "@/components/ui/knowledge/api-configuration-knowledge";
import DriveUpload from "@/components/ui/file-uploader/drive-upload";
import { errorMessages } from "@/utils/get-error-message";
import {
  findTableSchema,
  formatSchemaToString,
  extractTableNameFromQuery,
} from "@/utils/utils";

// Helper function to add timeout to async operations
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out. Please try again.')), timeoutMs)
    ),
  ]);
};

const CREDENTIAL_TYPES = {
  BIGQUERY: "bigquery",
  WIKIPEDIA: "wikipedia",
  WEATHER: "weather",
  GOOGLE_SEARCH: "google_search",
} as const;

type CredentialType = (typeof CREDENTIAL_TYPES)[keyof typeof CREDENTIAL_TYPES];

export const CreateKnowledgeComponent = () => {
  const router = useRouter();
  const { session } = useAuth();
  const [builtInTool] = useState([
    { value: "Wikipedia" },
    { value: "Weather" },
    { value: "Google Search" },
  ]);
  const [selectedParameter, setSelectedParameter] = useState("");
  const [successConnectionDatabase, setSuccessConnectionDatabase] =
    useState(false);
  const [openPopoverConnection, setOpenPopoverConnection] = useState(false);
  const [step, setStep] = useState(1);
  const [aiGeneratedData, setAiGeneratedData] = useState({
    function_name: "",
    tool_description: "",
    system_instructions: "",
  });
  const [showGeneratedData, setShowGeneratedData] = useState(false);
  const { getList: getCredentialList, data: credentialsList } =
    useCredentialStore();

  // Add new state for confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isGeneratingBeforeSave, setIsGeneratingBeforeSave] = useState(false);
  const [isDownloadingCredentials, setIsDownloadingCredentials] =
    useState(false);
  const [downloadedCredentialFile, setDownloadedCredentialFile] =
    useState<File | null>(null);

  // NEW: Add Credential Dialog state
  const [showAddCredentialDialog, setShowAddCredentialDialog] = useState(false);
  const [preselectedCredentialType, setPreselectedCredentialType] =
    useState<CredentialType | null>(null);
  const [credentialContextInfo, setCredentialContextInfo] = useState<{
    isFromKnowledge?: boolean;
    requiredFor?: string;
  }>({});

  const [validationErrors, setValidationErrors] = useState({
    type: false,
    name: false,
    description: false,
    files: false,
    database: false,
    sql: false,
    credentials: false,
    visibility_type: false,
    database_zone: false,
    dataset_id: false,
    credential_id: false,
  });

  const { getList: getParameterList, data: parameters } = useParameterStore();
  const { getList: getAgentList, data: agents } = useAgentStore();
  const { create, update } = useStore();
  const {
    handleSelectChange,
    payload,
    builtInKeyPayload,
    addBuiltInKey,
    handleBuiltInKeyInput,
    multipleFiles,
    setMultipleFiles,
    handleSave,
    handleDescribeChange,
    handleGenerateDescription,
    isLoading,
    describe,
    setCredentials,
    credentials,
    handleSetDescribe,
    isSubmitLoading,
    headerRestAPI,
    addHeaderRestAPI,
    handleHeaderRestAPIInput,
    removeHeaderRestAPI,
    authRestAPI,
    setAuthRestAPI,
    handleTypeAuthRestAPI,
    handleValueAuthRestAPI,
    configRestAPI,
    handleConfigRestAPI,
    requestBody,
    setRequestBody,
    setPayload,
    parameterRestAPI,
    handleParameterRestAPIInput,
    addParameterRestAPI,
    removeParameterRestAPI,
    handleValue,
    oauth2,
    setOAuth2,
    oauth2Connection,
    setOAuth2Connection,
  } = useToolForm(create, update, null);
  const [openDatabaseZone, setOpenDatabaseZone] = useState(false);
  const [searchTermRegion, setSearchTermRegion] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const { theme } = useTheme();
  const [datasetBigquery, setDatasetBigquery] = useState<Record<string, any>[]>(
    []
  );
  const [selectedDatasetBigquery, setSelectedDatasetBigquery] = useState<Record<
    string,
    any
  > | null>(null);
  const [isTestingQuery, setIsTestingQuery] = useState(false);
  const [successQuery, setSuccessQuery] = useState<boolean | null>(null);
  const [openPopoverQuery, setOpenPopoverQuery] = useState(false);

  useEffect(() => {
    const filters = { keyString: { value: "TOOL_KEY", command: "eq" } };
    getParameterList({
      offset: 1,
      limit: 50,
      filters: JSON.stringify(filters),
    });
    getAgentList({
      offset: 1,
      limit: "all",
    });
    getCredentialList({
      offset: 0,
      limit: 1000,
    });
    return () => { };
  }, []);

  useEffect(() => {
    const parameter = parameters.find(
      (parameter) => parameter.id === payload.type_id
    );
    setSelectedParameter(parameter?.valueString ? parameter.valueString : "");

    if (parameter?.valueString === "BUILT-IN") {
      const nameBuiltIn = payload.name;

      switch (nameBuiltIn) {
        case "Wikipedia":
          // addBuiltInKey(["WIKIPEDIA_API_USER_AGENT"]);
          break;
        case "Weather":
          // addBuiltInKey(["WEATHER_API_KEY"]);
          break;
        case "Google Search":
          // addBuiltInKey(["GOOGLE_API_KEY", "GOOGLE_CSE_ID"]);
          break;
        default:
          break;
      }
    }
    return () => {
      return setSelectedParameter("");
    };
  }, [payload.type_id, payload.name, parameters]);

  useEffect(() => {
    switch (payload.database_type) {
      case "mysql":
        addBuiltInKey([
          "MYSQL_HOST",
          "MYSQL_USER",
          "MYSQL_PASSWORD",
          "MYSQL_DATABASE",
        ]);
        break;
      case "postgresql":
        addBuiltInKey([
          "POSTGRES_HOST",
          "POSTGRES_USER",
          "POSTGRES_PASSWORD",
          "POSTGRES_DATABASE",
        ]);
        break;
    }
  }, [payload.database_type]);

  // Add this useEffect to restore knowledge creation state when user returns from credentials
  useEffect(() => {
    const pendingCreation = localStorage.getItem("pendingKnowledgeCreation");

    if (pendingCreation) {
      try {
        const savedState = JSON.parse(pendingCreation);
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        // Only restore if saved within last hour
        if (now - savedState.timestamp < oneHour) {
          // Restore the knowledge creation state
          handleSelectChange("type_id", savedState.payload.type_id);
          handleSelectChange("name", savedState.payload.name);
          if (savedState.payload.visibility_type) {
            handleSelectChange(
              "visibility_type",
              savedState.payload.visibility_type
            );
          }
          handleSetDescribe(savedState.describe);
          setStep(savedState.step);
        }
      } catch (error) {
        console.error("Error restoring knowledge creation state:", error);
      }
    }

    return () => {
      localStorage.removeItem("pendingKnowledgeCreation");
    };
  }, []);

  // Also add this to refresh credentials list when returning
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const returnFromCredentials = urlParams.get("from") === "credentials";

    if (returnFromCredentials) {
      // Refresh credentials list
      getCredentialList({
        offset: 0,
        limit: 1000,
      });

      // Remove the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const validateBasicInfo = () => {
    const errors = {
      type: !payload.type_id,
      name: !payload.name,
    };

    setValidationErrors({ ...validationErrors, ...errors });

    return !Object.values(errors).some((error) => error);
  };

  const handleNextStep = () => {
    if (step === 1 && validateBasicInfo()) {
      setStep(2);
      localStorage.setItem(
        "pendingKnowledgeCreation",
        JSON.stringify({
          timestamp: Date.now(),
          selectedParameter,
          payload,
          describe,
          step: 2,
        })
      );
    } else if (step === 2) {
      // Validate step 2 based on selected parameter
      if (selectedParameter === "EMBEDDING") {
        if (!describe) {
          setValidationErrors({ ...validationErrors, description: true });
          return;
        }
        if (!multipleFiles || multipleFiles.length === 0) {
          setValidationErrors({ ...validationErrors, files: true });
          return;
        }
      } else if (selectedParameter === "DATABASE") {
        if (!describe) {
          setValidationErrors({ ...validationErrors, description: true });
          return;
        }
        if (!payload.database_type) {
          setValidationErrors({ ...validationErrors, database: true });
          return;
        }
        if (!payload.sql_command) {
          setValidationErrors({ ...validationErrors, sql: true });
          return;
        }
        if (
          payload.database_type === "bigquery" &&
          !payload.selected_credential_id &&
          !payload.database_zone
        ) {
          setValidationErrors({ ...validationErrors, credentials: true });
          return;
        }
        if (!successConnectionDatabase) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description:
              "Please test and ensure successful database connection",
          });
          return;
        }
        if (successQuery === null) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please test your SQL query before proceeding",
          });
          return;
        }
        if (successQuery === false) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description:
              "SQL query test failed. Please fix your query before proceeding",
          });
          return;
        }
      } else if (selectedParameter === "BUILT-IN") {
        if (!describe) {
          setValidationErrors({ ...validationErrors, description: true });
          return;
        }

        // Validate that appropriate credentials are selected for each built-in tool
        if (
          payload.name === "Wikipedia" &&
          !payload.selected_wikipedia_credential_id
        ) {
          setValidationErrors({ ...validationErrors, credentials: true });
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please select Wikipedia credentials",
          });
          return;
        }

        if (
          payload.name === "Weather" &&
          !payload.selected_weather_credential_id
        ) {
          setValidationErrors({ ...validationErrors, credentials: true });
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please select Weather API credentials",
          });
          return;
        }

        if (
          payload.name === "Google Search" &&
          !payload.selected_google_credential_id
        ) {
          setValidationErrors({ ...validationErrors, credentials: true });
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please select Google Search credentials",
          });
          return;
        }
      }

      // Check if AI description has been generated (if applicable)
      if (!showGeneratedData) {
        // Show confirmation dialog
        setShowConfirmDialog(true);
        return;
      }

      localStorage.removeItem("pendingKnowledgeCreation");
      // If AI description was generated, proceed with save
      handleSave();
    }
  };

  const handlePreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Add these functions to handle the confirmation dialog
  const handleConfirmSaveWithoutGeneration = () => {
    setShowConfirmDialog(false);
    handleSave();
  };

  const handleGenerateBeforeSave = async () => {
    setShowConfirmDialog(false);
    setIsGeneratingBeforeSave(true);

    try {
      await handleGenerateAIDescription();
      // After generation is complete, proceed with save
      setTimeout(() => {
        setIsGeneratingBeforeSave(false);
        handleSave();
      }, 1000); // Small delay to show the generated content
    } catch (error) {
      console.error("Error generating description before save:", error);
      setIsGeneratingBeforeSave(false);
      // Still proceed with save even if generation fails
      handleSave();
    }
  };

  const handleCancelSave = () => {
    setShowConfirmDialog(false);
  };

  const handleGenerateAIDescription = async () => {
    try {
      // Call the handleGenerateDescription function
      await handleGenerateDescription().then((data) => {
        // Since handleGenerateDescription doesn't return data directly,
        // we need to extract the data from the payload after it's been updated
        const generatedData = {
          function_name: data.function_name || "",
          tool_description: data.tool_description || "",
          system_instructions: data.system_instructions || "",
        };

        // Set the AI generated data for display in the accordion
        setAiGeneratedData(generatedData);
        setShowGeneratedData(true);
      });
    } catch (error) {
      console.error("Error generating description:", error);
    }
  };

  const downloadCredentialFromGCS = async (gcsPath: string) => {
    try {
      const response = await fetch("/api/credentials/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gcsPath }),
      });

      if (!response.ok) {
        throw new Error("Failed to download credential file");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error downloading from GCS:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  // Function to download credential file from GCS
  const downloadCredentialFileFromGCS = async (credentialId: string) => {
    setIsDownloadingCredentials(true);
    try {
      const selectedCredential = credentialsList.find(
        (cred) => cred.id === credentialId
      );
      if (!selectedCredential?.credentialFile) {
        throw new Error("No credential file found");
      }

      // Get organization ID using your existing utility
      const organizationId = await session?.user.organizationId;
      console.log("Organization ID in create knowledge:", organizationId);
      if (!organizationId) {
        throw new Error("Organization ID not found");
      }

      const bucketName = `${process.env.NEXT_PUBLIC_BUCKET_PREFIX}knowgenai_credentials_${organizationId}`;
      const gcsPath = `gs://${bucketName}/${selectedCredential.credentialFile}`;

      // Call server-side API to download file
      const result = await downloadCredentialFromGCS(gcsPath);

      if (!result.success || !result.fileContent) {
        throw new Error(result.error || "Failed to download credential file");
      }

      // Convert base64 to File object (client-side processing)
      const byteCharacters = atob(result.fileContent);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      // Ensure fileName is always a string
      const fileName =
        typeof selectedCredential.credentialFile === "string"
          ? selectedCredential.credentialFile
          : "credential.json";

      const file = new File([byteArray], fileName, {
        type: "application/json",
      });

      setDownloadedCredentialFile(file);
      setCredentials(file);

      // toast({
      //   title: "Success",
      //   description: "Credential file downloaded successfully",
      // });
    } catch (error) {
      console.error("Error downloading credential file:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to download credential file",
      });
    } finally {
      setIsDownloadingCredentials(false);
    }
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setOpenPopoverConnection(false);
    setSuccessConnectionDatabase(false);
    let credentialToUse: File | null = null;

    if (
      payload.database_type === "bigquery" &&
      payload.selected_credential_id
    ) {
      // Use the downloaded credential file
      credentialToUse = downloadedCredentialFile;
    } else {
      credentialToUse = credentials instanceof File ? credentials : null;
    }

    try {
      const result = await withTimeout(
        testConnectionDatabase(payload.database_type, credentialToUse),
        120000 // 120 second timeout
      );

      console.log("result of testing connection: ", result);

      setDatasetBigquery('data' in result ? result.data : []);
      setSuccessConnectionDatabase(result?.success ?? false);
      setOpenPopoverConnection(true);
      setIsTestingConnection(false);
      return result?.success ?? false;
    } catch (error) {
      console.error("Connection test error:", error);
      setSuccessConnectionDatabase(false);
      setOpenPopoverConnection(true);
      setIsTestingConnection(false);
      toast({
        variant: "destructive",
        title: "Connection Test Failed",
        description:
          error instanceof Error ? error.message : "Connection test failed",
      });
      return false;
    }
  };

  // Function to extract table names and their structures from datasetBigquery
  const extractTableNamesAndStructures = (datasets: Record<string, any>[]) => {
    const result: Array<{
      dataset_id: string;
      location: string;
      tables: Array<{
        table_id: string;
        schema: Array<{
          name: string;
          type: string;
          mode: string;
        }>;
      }>;
    }> = [];

    datasets.forEach((dataset) => {
      const datasetInfo = {
        dataset_id: dataset.dataset_id,
        location: dataset.location,
        tables:
          dataset.tables?.map((table: any) => ({
            table_id: table.table_id,
            schema:
              table.schema?.map((field: any) => ({
                name: field.name,
                type: field.type,
                mode: field.mode,
              })) || [],
          })) || [],
      };
      result.push(datasetInfo);
    });

    return result;
  };

  const testQuery = async () => {
    setIsTestingQuery(true);
    setOpenPopoverQuery(false);
    setSuccessQuery(null);
    const sqlcommand = payload.sql_command + " LIMIT 1";
    try {
      const result = await withTimeout(
        testQueryBigquery(
          payload.database_type ?? "",
          sqlcommand ?? "",
          payload.database_zone ?? "",
          downloadedCredentialFile
        ),
        120000 // 120 second timeout
      );
      console.log("result of testing big query: ", result);
      setSuccessQuery(result?.success ?? false);

      if (result?.success) {
        const tableName = extractTableNameFromQuery(payload.sql_command ?? "");
        const schema = findTableSchema(tableName ?? "", datasetBigquery);
        const formattedSchema = formatSchemaToString(schema);

        const updatedDescription = appendColumnSchema(describe, formattedSchema);
        handleSetDescribe(updatedDescription);
        setPayload({ ...payload, description: updatedDescription });

        // Show success message with row count
        toast({
          title: "Query Test Successful",
          description: "message" in result ? result.message : "Your SQL query executed successfully.",
          duration: 5000,
        });
      } else {
        // Show specific error message for timeout
        if ("isTimeout" in result && result.isTimeout) {
          toast({
            variant: "destructive",
            title: "Query Timeout",
            description: "error" in result ? result.error : "The query took too long to execute. Please simplify your query or add a LIMIT clause.",
            duration: 7000,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Query Failed",
            description: "error" in result ? result.error : "Could not execute the query. Please check your SQL syntax.",
            duration: 5000,
          });
        }
      }
    } catch (e) {
      console.error("Query test error:", e);
      setSuccessQuery(false);
      toast({
        variant: "destructive",
        title: "Query Test Failed",
        description:
          e instanceof Error ? e.message : "Query test failed",
      });
    } finally {
      setIsTestingQuery(false);
      setOpenPopoverQuery(true);
    }
  };

  // Helper function to get credential icon
  const getCredentialIcon = (credentialType: string) => {
    switch (credentialType.toLowerCase()) {
      case "bigquery":
        return <Database className="w-4 h-4" />;
      case "wikipedia":
        return <Book className="w-4 h-4" />;
      case "weather":
        return <Cloud className="w-4 h-4" />;
      case "google_search":
      case "google search":
        return <Search className="w-4 h-4" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };
  const handleCreateCredentials = (credentialType: string) => {
    // Map credential type to our enum
    const typeMapping = {
      bigquery: CREDENTIAL_TYPES.BIGQUERY,
      wikipedia: CREDENTIAL_TYPES.WIKIPEDIA,
      weather: CREDENTIAL_TYPES.WEATHER,
      google_search: CREDENTIAL_TYPES.GOOGLE_SEARCH,
    };

    const mappedType = typeMapping[credentialType as keyof typeof typeMapping];

    if (mappedType) {
      setPreselectedCredentialType(mappedType);
      setCredentialContextInfo({
        isFromKnowledge: true,
        requiredFor: credentialType.replace("_", " "),
      });
      setShowAddCredentialDialog(true);
    }
  };

  // NEW: Handle credential created from dialog
  const handleCredentialCreated = (newCredential: CredentialData) => {
    // Refresh credentials list
    getCredentialList({
      offset: 0,
      limit: 1000,
    });

    // Auto-select the newly created credential based on its type
    if (newCredential.credentialFile && payload.database_type === "bigquery") {
      handleSelectChange("selected_credential_id", newCredential.id || "");
      // Also download the credential file
      if (newCredential.id) {
        downloadCredentialFileFromGCS(newCredential.id);
      }
    } else if (newCredential.wikipediaAPIKey && payload.name === "Wikipedia") {
      handleSelectChange(
        "selected_wikipedia_credential_id",
        newCredential.id || ""
      );
      if (newCredential.wikipediaAPIKey) {
        handleBuiltInKeyInput("wikipedia_key", newCredential.wikipediaAPIKey);
      }
    } else if (newCredential.weatherAPIKey && payload.name === "Weather") {
      handleSelectChange(
        "selected_weather_credential_id",
        newCredential.id || ""
      );
      if (newCredential.weatherAPIKey) {
        handleBuiltInKeyInput("weather_key", newCredential.weatherAPIKey);
      }
    } else if (
      newCredential.googleAPIKey &&
      newCredential.googleCSID &&
      payload.name === "Google Search"
    ) {
      handleSelectChange(
        "selected_google_credential_id",
        newCredential.id || ""
      );
      if (newCredential.googleAPIKey && newCredential.googleCSID) {
        handleBuiltInKeyInput("google_api_key", newCredential.googleAPIKey);
        handleBuiltInKeyInput("google_cse_id", newCredential.googleCSID);
      }
    }

    toast({
      title: "Credential Created",
      description:
        "Your new credential has been created and selected automatically.",
    });
  };

  // Filter regions based on search term
  const filteredRegions = useMemo(() => {
    if (!searchTermRegion) return regions;
    return regions.filter(
      (region) =>
        region.name.toLowerCase().includes(searchTermRegion.toLowerCase()) ||
        region.value.toLowerCase().includes(searchTermRegion.toLowerCase())
    );
  }, [searchTermRegion]);

  // Get selected region display name
  const getSelectedRegionName = () => {
    const found = regions.find(
      (region) => region.value === payload.database_zone
    );
    return found ? found.name : "";
  };

  // Memoized CodeMirror schema
  const codeMirrorSchema = useMemo(
    () => formatSchemaForCodeMirror(selectedDatasetBigquery),
    [selectedDatasetBigquery]
  );

  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  useMemo(() => {
    if (error) {
      toast({
        title: "Authentication failed",
        description: errorMessages[error ?? "default"],
        variant: "destructive",
      });
      sessionStorage.removeItem("redirectPage");
    }
  }, [error]);

  return (
    <ToastProvider>
      <Card className="w-full mt-6">
        <CardHeader>
          <h1 className="text-2xl font-bold mb-4">Create New Knowledge</h1>
          <CardDescription>
            Add extra knowledge to enhance your AI capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div
                className={`flex items-center ${step >= 1 ? "text-primary" : "text-gray-400"
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 1
                      ? "bg-primary text-white dark:bg-transparent dark:border dark:border-primary dark:text-white"
                      : "bg-gray-200 dark:bg-transparent dark: text-white dark:border dark:border-gray-200 "
                    }`}
                >
                  1
                </div>
                <span className="font-medium">Basic Information</span>
              </div>
              <div className="flex-1 h-1 mx-4 bg-gray-200">
                <div
                  className={`h-full ${step >= 2 ? "bg-primary" : "bg-gray-200"
                    }`}
                  style={{ width: step >= 2 ? "100%" : "0%" }}
                ></div>
              </div>
              <div
                className={`flex items-center ${step >= 2 ? "text-primary" : "text-gray-400"
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 2
                      ? "bg-primary text-white dark:bg-transparent dark:border dark:border-primary dark:text-white"
                      : "bg-gray-200 dark:bg-transparent dark: text-white dark:border dark:border-gray-800 "
                    }`}
                >
                  2
                </div>
                <span className="font-medium">Configuration</span>
              </div>
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Basic Information</h2>
              <hr className="border-t border-gray-200" />

              <div className="space-y-2">
                <Label htmlFor="type_id" className="block">
                  Knowledge Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={payload.type_id}
                  onValueChange={(value) => {
                    handleSelectChange("type_id", value);
                    setValidationErrors({ ...validationErrors, type: false });
                  }}
                >
                  <SelectTrigger
                    className={`w-full ${validationErrors.type ? "border-red-500" : ""
                      }`}
                    name="type_id"
                  >
                    <SelectValue placeholder="Select knowledge type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Knowledge Type</SelectLabel>
                      {parameters.map((parameter) => {
                        if (parameter.valueString !== "REST API") {
                          return (
                            <SelectItem
                              key={parameter.id}
                              value={parameter.id ? parameter.id : ""}
                            >
                              {parameter.valueString === "EMBEDDING"
                                ? "File Upload"
                                : parameter.valueString
                                  ?.toLowerCase()
                                  .replace(/\b\w/g, (char) =>
                                    char.toUpperCase()
                                  )}
                            </SelectItem>
                          );
                        } else if (parameter.valueString === "REST API") {
                          return (
                            <SelectItem
                              key={parameter.id}
                              value={parameter.id ? parameter.id : ""}
                            >
                              Rest API
                            </SelectItem>
                          );
                        }
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {validationErrors.type && (
                  <p className="text-red-500 text-sm">
                    Please select a knowledge type
                  </p>
                )}
              </div>

              {session?.user?.roles?.includes("admin") && (
                <div className="space-y-2">
                  <Label htmlFor="visibility_type" className="block">
                    Visibility Type <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-col gap-4 ">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={VisibilityType.PRIVATE}
                          name="visibility_type"
                          value={VisibilityType.PRIVATE}
                          className="h-4 w-4"
                          checked={
                            payload.visibility_type ===
                            VisibilityType.PRIVATE || !payload.visibility_type
                          }
                          onChange={(e) => {
                            handleSelectChange(
                              "visibility_type",
                              e.target.value
                            );
                            setValidationErrors({
                              ...validationErrors,
                              visibility_type: false,
                            });
                          }}
                        />
                        <Label
                          htmlFor={VisibilityType.PRIVATE}
                          className="font-medium"
                        >
                          Private
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">
                        Only visible to you. Perfect for personal knowledge
                        bases and private research.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={VisibilityType.ORGANIZATION}
                          name="visibility_type"
                          value={VisibilityType.ORGANIZATION}
                          className="h-4 w-4"
                          checked={
                            payload.visibility_type ===
                            VisibilityType.ORGANIZATION
                          }
                          onChange={(e) => {
                            handleSelectChange(
                              "visibility_type",
                              e.target.value
                            );
                            setValidationErrors({
                              ...validationErrors,
                              visibility_type: false,
                            });
                          }}
                        />
                        <Label
                          htmlFor={VisibilityType.ORGANIZATION}
                          className="font-medium"
                        >
                          Organization
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">
                        Shared within your organization. Requires admin approval
                        for access requests.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={VisibilityType.PUBLIC}
                          name="visibility_type"
                          value={VisibilityType.PUBLIC}
                          className="h-4 w-4"
                          checked={
                            payload.visibility_type === VisibilityType.PUBLIC
                          }
                          onChange={(e) => {
                            handleSelectChange(
                              "visibility_type",
                              e.target.value
                            );
                            setValidationErrors({
                              ...validationErrors,
                              visibility_type: false,
                            });
                          }}
                        />
                        <Label
                          htmlFor={VisibilityType.PUBLIC}
                          className="font-medium"
                        >
                          Public
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">
                        Accessible to everyone. Can be directly attached without
                        requesting access.
                      </p>
                    </div>
                  </div>
                  {validationErrors.visibility_type && (
                    <p className="text-red-500 text-sm mt-2">
                      Please select a visibility type
                    </p>
                  )}
                </div>
              )}

              {selectedParameter !== "" && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="block">
                    Knowledge Name <span className="text-red-500">*</span>
                  </Label>

                  {selectedParameter === "BUILT-IN" && (
                    <Select
                      onValueChange={(value) => {
                        handleSelectChange("name", value);
                        setValidationErrors({
                          ...validationErrors,
                          name: false,
                        });
                      }}
                    >
                      <SelectTrigger
                        className={`w-full ${validationErrors.name ? "border-red-500" : ""
                          }`}
                        name="name"
                      >
                        <SelectValue placeholder="Select built-in tool" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Choose Built-in Tool</SelectLabel>
                          {builtInTool.map((knowledge) => (
                            <SelectItem
                              key={knowledge.value}
                              value={knowledge.value ? knowledge.value : ""}
                            >
                              {knowledge.value}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}

                  {(selectedParameter === "EMBEDDING" ||
                    selectedParameter === "DATABASE" ||
                    selectedParameter === "REST API") && (
                      <Input
                        type="text"
                        placeholder="Enter a descriptive name for this knowledge"
                        className={`w-full ${validationErrors.name ? "border-red-500" : ""
                          }`}
                        name="name"
                        value={payload.name}
                        onChange={(e) => {
                          handleSelectChange("name", e.target.value);
                          setValidationErrors({
                            ...validationErrors,
                            name: false,
                          });
                        }}
                      />
                    )}

                  {validationErrors.name && (
                    <p className="text-red-500 text-sm">
                      Please enter a knowledge name
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Configuration</h2>
              <hr className="border-t border-gray-200" />

              <div className="space-y-2">
                <Label className="block font-medium" htmlFor="tool_describe">
                  Describe this knowledge{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-gray-500 mb-2">
                  Provide a clear description of what this knowledge does and
                  how it should be used
                </p>
                <Textarea
                  id="tool_describe"
                  placeholder="This knowledge contains information about..."
                  className={`h-40 ${validationErrors.description ? "border-red-500" : ""
                    }`}
                  name="tool_describe"
                  onChange={(e) => {
                    handleDescribeChange(e);
                    setValidationErrors({
                      ...validationErrors,
                      description: false,
                    });
                  }}
                  value={describe}
                />
                {validationErrors.description && (
                  <p className="text-red-500 text-sm">
                    Please describe this knowledge
                  </p>
                )}

                <Button
                  variant="outline"
                  className="border border-primary text-primary mt-2"
                  onClick={handleGenerateAIDescription}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating description...
                    </>
                  ) : (
                    <>
                      <WandSparkles className="w-4 h-4 mr-2" />
                      Generate description with AI
                    </>
                  )}
                </Button>

                {showGeneratedData && (
                  <div className="mt-4 border rounded-md p-4 bg-slate-50 dark:bg-neutral-900">
                    <h3 className="font-medium mb-2 flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                      AI Generated Information (Edit as needed)
                    </h3>

                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="function-name">
                        <AccordionTrigger className="text-sm font-medium">
                          Function Name
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            <Input
                              type="text"
                              value={aiGeneratedData.function_name}
                              onChange={(e) =>
                                setAiGeneratedData({
                                  ...aiGeneratedData,
                                  function_name: e.target.value,
                                })
                              }
                              className="w-full"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleSelectChange(
                                  "function_name",
                                  aiGeneratedData.function_name
                                )
                              }
                              className="text-xs"
                            >
                              Use this function name
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="description">
                        <AccordionTrigger className="text-sm font-medium">
                          Description
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            <Textarea
                              value={payload.description}
                              onChange={(e) =>
                                handleSelectChange(
                                  "description",
                                  e.target.value
                                )
                              }
                              className="w-full min-h-[100px]"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleSetDescribe(
                                  aiGeneratedData.tool_description
                                )
                              }
                              className="text-xs"
                            >
                              Use this description
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="system-instructions">
                        <AccordionTrigger className="text-sm font-medium">
                          System Instructions
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            <Textarea
                              value={aiGeneratedData.system_instructions}
                              onChange={(e) =>
                                setAiGeneratedData({
                                  ...aiGeneratedData,
                                  system_instructions: e.target.value,
                                })
                              }
                              className="w-full min-h-[100px]"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleSelectChange(
                                  "system_instruction",
                                  aiGeneratedData.system_instructions
                                )
                              }
                              className="text-xs"
                            >
                              Use these instructions
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <div className="flex justify-end mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleSelectChange(
                            "function_name",
                            aiGeneratedData.function_name
                          );
                          handleSetDescribe(aiGeneratedData.tool_description);
                          handleSelectChange(
                            "system_instruction",
                            aiGeneratedData.system_instructions
                          );
                        }}
                        className="text-xs"
                      >
                        Use all generated content
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Type-specific configuration */}
              {selectedParameter === "EMBEDDING" && (
                <div className="space-y-4 mt-6">
                  <div className="flex items-center">
                    <h3 className="text-md font-bold">Document Upload</h3>
                    <span className="text-red-500 ml-1">*</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Upload documents to be embedded and used as knowledge source
                    (PDF, DOCX, XLSX)
                  </p>

                  <DriveUpload setMultipleFiles={setMultipleFiles} />

                  <FileUpload
                    files={multipleFiles}
                    onFilesChange={(files) => {
                      setMultipleFiles(files);
                      setValidationErrors({
                        ...validationErrors,
                        files: false,
                      });
                    }}
                    maxSize={1024 * 1024 * 10}

                    accept="application/pdf; application/vnd.openxmlformats-officedocument.wordprocessingml.document; application/docx; application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; application/xlsx"
                    multiple={true}
                  />

                  {validationErrors.files && (
                    <p className="text-red-500 text-sm">
                      Please upload at least one document
                    </p>
                  )}

                  {multipleFiles.length > 0 && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertTitle className="text-green-700">
                        Documents Ready
                      </AlertTitle>
                      <AlertDescription className="text-green-600">
                        {multipleFiles.length} document
                        {multipleFiles.length !== 1 ? "s" : ""} will be
                        processed and embedded
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {selectedParameter === "DATABASE" && (
                <div className="space-y-4 mt-6">
                  <div className="flex items-center">
                    <h3 className="text-md font-bold">
                      Database Configuration
                    </h3>
                    <span className="text-red-500 ml-1">*</span>
                  </div>

                  <div className="space-y-2">
                    <Label className="block" htmlFor="databaseType">
                      Database Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      onValueChange={(value) => {
                        handleSelectChange("database_type", value);
                        setValidationErrors({
                          ...validationErrors,
                          database: false,
                        });
                      }}
                    >
                      <SelectTrigger
                        className={`w-full ${validationErrors.database ? "border-red-500" : ""
                          }`}
                        name="databaseType"
                      >
                        <SelectValue placeholder="Select database type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Database Type</SelectLabel>
                          <SelectItem value="bigquery">
                            Google BigQuery
                          </SelectItem>
                          {/* <SelectItem value="mysql">MySQL</SelectItem> */}
                          {/* <SelectItem value="postgresql">PostgreSQL</SelectItem> */}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {validationErrors.database && (
                      <p className="text-red-500 text-sm">
                        Please select a database type
                      </p>
                    )}
                  </div>

                  {payload.database_type === "bigquery" && (
                    <>
                      <div className="space-y-2">
                        <Label className="block" htmlFor="credentials">
                          Credentials File{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <p className="text-sm text-gray-500 mb-2">
                          Select your Google BigQuery service account
                          credentials from existing credentials
                        </p>
                        <Select
                          onValueChange={async (value) => {
                            if (value === "add-new") {
                              handleCreateCredentials("bigquery");
                              return;
                            }
                            handleSelectChange("credential_id", value);
                            handleSelectChange("selected_credential_id", value);
                            setValidationErrors({
                              ...validationErrors,
                              credentials: false,
                            });

                            // Download the credential file from GCS
                            await downloadCredentialFileFromGCS(value);
                          }}
                          disabled={isDownloadingCredentials}
                        >
                          <SelectTrigger
                            className={`w-full ${validationErrors.credentials
                                ? "border-red-500"
                                : ""
                              }`}
                            name="credentials"
                          >
                            <SelectValue placeholder="Select credentials" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Available Credentials</SelectLabel>
                              {credentialsList
                                .filter(
                                  (credential) => credential.credentialFile
                                )
                                .map((credential) => (
                                  <SelectItem
                                    key={credential.id}
                                    value={credential.id || ""}
                                    className="text-left"
                                  >
                                    <div className="flex items-center space-x-3 text-left w-full">
                                      {getCredentialIcon("bigquery")}
                                      <div className="flex flex-col text-left">
                                        <span className="font-medium text-left">
                                          {credential.name}
                                        </span>
                                        {credential.description && (
                                          <span className="text-xs text-gray-500 text-left">
                                            Google Cloud BigQuery service
                                            account credentials
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              {/* Add separator if there are existing credentials */}
                              {credentialsList.filter(
                                (credential) => credential.credentialFile
                              ).length > 0 && (
                                  <div className="border-t border-gray-200 my-1"></div>
                                )}
                              {/* Add new credential option */}
                              <SelectItem
                                value="add-new"
                                className="text-blue-600 font-medium"
                              >
                                <div className="flex items-center space-x-3">
                                  <Plus className="w-4 h-4" />
                                  <span>Add new BigQuery credentials</span>
                                </div>
                              </SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        {validationErrors.credentials && (
                          <p className="text-red-500 text-sm">
                            Please select credentials file
                          </p>
                        )}
                        {payload.selected_credential_id &&
                          payload.selected_credential_id !== "add-new" && (
                            <p className="text-green-600 text-sm flex items-center mt-1">
                              <CheckCircle2 className="w-4 h-4 mr-1" />{" "}
                              Credentials selected
                            </p>
                          )}
                      </div>
                    </>
                  )}

                  {(payload.database_type === "mysql" ||
                    payload.database_type === "postgresql") && (
                      <div className="space-y-2">
                        <Label className="block" htmlFor="databaseConnection">
                          Database Connection Details{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <div className="grid gap-4 p-4 border rounded-md bg-slate-50">
                          {builtInKeyPayload.map((builtInInput) => (
                            <div
                              className="grid grid-cols-2 gap-4"
                              id={builtInInput.id}
                              key={builtInInput.id}
                            >
                              <Label className="flex items-center">
                                {builtInInput.key}
                              </Label>
                              <Input
                                type={
                                  builtInInput.key.includes("PASSWORD")
                                    ? "password"
                                    : "text"
                                }
                                placeholder={`Enter ${builtInInput.key
                                  .toLowerCase()
                                  .replace(/_/g, " ")}`}
                                className="w-full"
                                name="value"
                                value={builtInInput.value}
                                onChange={(e) => {
                                  handleBuiltInKeyInput(
                                    builtInInput.id,
                                    e.target.value
                                  );
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  <div className="mt-2">
                    <div className="flex items-start gap-2 mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                      <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>Note:</strong> Testing the connection may take up to 120 seconds for projects with many datasets. The test will timeout automatically to prevent performance issues.
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="border border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/40 hover:border-green-700 transition-colors"
                      onClick={testConnection}
                      disabled={
                        (payload.database_type === "bigquery" &&
                          !downloadedCredentialFile) ||
                        isDownloadingCredentials ||
                        isTestingConnection
                      }
                    >
                      {isTestingConnection ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin text-green-600 dark:text-green-400" />
                          Testing connection (may take up to 120s)...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2 text-green-600" />
                          Test Connection
                        </>
                      )}
                    </Button>

                    {openPopoverConnection && (
                      <Alert
                        variant={
                          successConnectionDatabase ? "success" : "destructive"
                        }
                        className="mt-2"
                      >
                        {successConnectionDatabase ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <AlertTitle>
                          {successConnectionDatabase
                            ? "Connection Successful"
                            : "Connection Failed"}
                        </AlertTitle>
                        <AlertDescription>
                          {successConnectionDatabase
                            ? `Successfully connected to ${payload.database_type?.toUpperCase()}`
                            : `Could not connect to ${payload.database_type?.toUpperCase()}. Please check your credentials and query.`}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {successConnectionDatabase && openPopoverConnection && (
                    <>
                      {payload.database_type === "bigquery" && (
                        <>
                          <div className="space-y-2">
                            <Label className="block" htmlFor="credentials">
                              Dataset <span className="text-red-500">*</span>
                            </Label>
                            <p className="text-sm text-gray-500 mb-2">
                              Select your Google BigQuery dataset
                            </p>
                            <Select
                              onValueChange={(value) => {
                                const filteredDataset = datasetBigquery.find(
                                  (dataset) => dataset.dataset_id === value
                                );
                                setSelectedDatasetBigquery(
                                  filteredDataset ?? null
                                );
                                handleSelectChange(
                                  "sql_command",
                                  `SELECT * FROM \`${filteredDataset?.dataset_id}\`.\`\``
                                );
                                handleSelectChange(
                                  "database_zone",
                                  filteredDataset?.location ?? ""
                                );
                                handleSelectChange("dataset_id", value);
                              }}
                            >
                              <SelectTrigger
                                className={`w-full ${validationErrors.dataset_id
                                    ? "border-red-500"
                                    : ""
                                  }`}
                                name="dataset"
                              >
                                <SelectValue placeholder="Select dataset" />
                              </SelectTrigger>
                              <SelectContent>
                                {datasetBigquery.map((dataset) => (
                                  <SelectItem
                                    key={dataset.dataset_id}
                                    value={dataset.dataset_id}
                                  >
                                    {dataset.dataset_id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {validationErrors.dataset_id && (
                              <p className="text-red-500 text-sm">
                                Please select a dataset
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label className="block" htmlFor="credentials">
                              Database Zone
                            </Label>
                            <p className="text-sm text-gray-500 mb-2">
                              Select your Google BigQuery database zone
                            </p>
                            <Popover
                              open={openDatabaseZone}
                              onOpenChange={setOpenDatabaseZone}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openDatabaseZone}
                                  className="w-full justify-between text-left font-normal bg-transparent"
                                  disabled
                                >
                                  <div className="flex items-center space-x-2">
                                    <Search className="h-4 w-4 text-muted-foreground" />
                                    <span
                                      className={cn(
                                        "truncate",
                                        payload.database_zone
                                          ? "text-foreground"
                                          : "text-muted-foreground"
                                      )}
                                    >
                                      {payload.database_zone
                                        ? getSelectedRegionName()
                                        : "Select a region..."}
                                    </span>
                                  </div>
                                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-full p-0"
                                align="start"
                              >
                                <div className="p-2">
                                  <Input
                                    placeholder="Search regions..."
                                    value={searchTermRegion}
                                    onChange={(e) =>
                                      setSearchTermRegion(e.target.value)
                                    }
                                    className="h-9"
                                  />
                                </div>
                                <ScrollArea className="h-[300px]">
                                  <div className="p-1">
                                    {filteredRegions.length === 0 ? (
                                      <div className="py-6 text-center text-sm text-muted-foreground">
                                        No regions found.
                                      </div>
                                    ) : (
                                      filteredRegions.map((region: any) => (
                                        <div
                                          key={region.value}
                                          className={cn(
                                            "flex items-center space-x-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                                            payload.database_zone ===
                                            region.value && "bg-accent"
                                          )}
                                          onClick={() => {
                                            handleSelectChange(
                                              "database_zone",
                                              region.value
                                            );
                                            setOpenDatabaseZone(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "h-4 w-4",
                                              payload.database_zone ===
                                                region.value
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                          />
                                          <span className="truncate">
                                            {region.name}
                                          </span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </ScrollArea>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </>
                      )}
                      <div className="space-y-2">
                        <Label className="block" htmlFor="sqlCommand">
                          SQL Query <span className="text-red-500">*</span>
                        </Label>
                        <p className="text-sm text-gray-500 mb-2">
                          Enter the SQL query that will be executed when this
                          knowledge is accessed
                        </p>
                        <CodeMirror
                          height="200px"
                          extensions={[
                            sql({
                              schema: codeMirrorSchema,
                            }),
                          ]}
                          onChange={(val) => {
                            handleSelectChange("sql_command", val);
                            setValidationErrors({
                              ...validationErrors,
                              sql: false,
                            });
                          }}
                          theme={theme === "dark" ? vscodeDark : vscodeLight}
                          className={
                            validationErrors.sql
                              ? "border border-red-500 rounded-md"
                              : ""
                          }
                          value={payload.sql_command}
                        />
                        {validationErrors.sql && (
                          <p className="text-red-500 text-sm">
                            Please enter an SQL query
                          </p>
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="flex items-start gap-2 mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-blue-700 dark:text-blue-300">
                            <strong>Note:</strong> Query testing may take up to 60 seconds. Large result sets are automatically limited to 1,000 rows to prevent memory issues.
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          className="border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:border-blue-700 transition-colors"
                          onClick={testQuery}
                          disabled={!payload.sql_command || isTestingQuery}
                        >
                          {isTestingQuery ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin text-blue-600 dark:text-blue-400" />
                              Testing query (may take up to 60s)...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2 text-blue-600" />
                              Test Query
                            </>
                          )}
                        </Button>
                        {openPopoverQuery && (
                          <Alert
                            variant={successQuery ? "success" : "destructive"}
                            className="mt-2"
                          >
                            {successQuery ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                            <AlertTitle>
                              {successQuery
                                ? "Query Successful"
                                : "Query Failed"}
                            </AlertTitle>
                            <AlertDescription>
                              {successQuery
                                ? `Query executed successfully on ${payload.database_type?.toUpperCase()}`
                                : `Could not execute query on ${payload.database_type?.toUpperCase()}. Please check your SQL and try again.`}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {selectedParameter === "BUILT-IN" && (
                <div className="space-y-4 mt-6">
                  <div className="flex items-center">
                    <h3 className="text-md font-bold">API Configuration</h3>
                    <span className="text-red-500 ml-1">*</span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 mb-2">
                      Select the required credentials for the selected built-in
                      tool
                    </p>
                    <div className="space-y-4 p-4 border rounded-md bg-slate-50 dark:bg-neutral-900">
                      {payload.name === "Wikipedia" && (
                        <div className="space-y-2">
                          <Label className="flex items-center text-sm font-medium">
                            Wikipedia Credentials
                          </Label>
                          <Select
                            onValueChange={(value) => {
                              if (value === "add-new") {
                                handleCreateCredentials("wikipedia");
                                return;
                              }
                              const selectedCredential = credentialsList.find(
                                (cred) => cred.id === value
                              );
                              if (
                                selectedCredential &&
                                selectedCredential.wikipediaAPIKey
                              ) {
                                handleBuiltInKeyInput(
                                  "wikipedia_key",
                                  selectedCredential.wikipediaAPIKey
                                );
                              }
                              handleSelectChange(
                                "selected_wikipedia_credential_id",
                                value
                              );
                            }}
                            value={
                              payload.selected_wikipedia_credential_id || ""
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Wikipedia credentials" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectLabel>
                                  Available Wikipedia Credentials
                                </SelectLabel>
                                {credentialsList
                                  .filter(
                                    (credential) => credential.wikipediaAPIKey
                                  )
                                  .map((credential) => (
                                    <SelectItem
                                      key={credential.id}
                                      value={credential.id || ""}
                                      className="text-left"
                                    >
                                      <div className="flex items-center space-x-3 text-left w-full">
                                        {getCredentialIcon("wikipedia")}
                                        <div className="flex flex-col text-left">
                                          <span className="font-medium text-left">
                                            {credential.name}
                                          </span>
                                          <span className="text-xs text-gray-500 text-left">
                                            Wikipedia API user agent
                                            configuration
                                          </span>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                {/* Add separator if there are existing credentials */}
                                {credentialsList.filter(
                                  (credential) => credential.wikipediaAPIKey
                                ).length > 0 && (
                                    <div className="border-t border-gray-200 my-1"></div>
                                  )}
                                {/* Add new credential option */}
                                <SelectItem
                                  value="add-new"
                                  className="text-blue-600 font-medium"
                                >
                                  <div className="flex items-center space-x-3">
                                    <Plus className="w-4 h-4" />
                                    <span>Add new Wikipedia credentials</span>
                                  </div>
                                </SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {payload.name === "Weather" && (
                        <div className="space-y-2">
                          <Label className="flex items-center text-sm font-medium">
                            Weather API Credentials
                          </Label>
                          <Select
                            onValueChange={(value) => {
                              if (value === "add-new") {
                                handleCreateCredentials("weather");
                                return;
                              }
                              const selectedCredential = credentialsList.find(
                                (cred) => cred.id === value
                              );
                              if (
                                selectedCredential &&
                                selectedCredential.weatherAPIKey
                              ) {
                                handleBuiltInKeyInput(
                                  "weather_key",
                                  selectedCredential.weatherAPIKey
                                );
                              }
                              handleSelectChange(
                                "selected_weather_credential_id",
                                value
                              );
                            }}
                            value={payload.selected_weather_credential_id || ""}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Weather API credentials" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectLabel>
                                  Available Weather Credentials
                                </SelectLabel>
                                {credentialsList
                                  .filter(
                                    (credential) => credential.weatherAPIKey
                                  )
                                  .map((credential) => (
                                    <SelectItem
                                      key={credential.id}
                                      value={credential.id || ""}
                                      className="text-left"
                                    >
                                      <div className="flex items-center space-x-3 text-left w-full">
                                        {getCredentialIcon("weather")}
                                        <div className="flex flex-col text-left">
                                          <span className="font-medium text-left">
                                            {credential.name}
                                          </span>
                                          <span className="text-xs text-gray-500 text-left">
                                            Weather service API key
                                          </span>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                {/* Add separator if there are existing credentials */}
                                {credentialsList.filter(
                                  (credential) => credential.weatherAPIKey
                                ).length > 0 && (
                                    <div className="border-t border-gray-200 my-1"></div>
                                  )}
                                {/* Add new credential option */}
                                <SelectItem
                                  value="add-new"
                                  className="text-blue-600 font-medium"
                                >
                                  <div className="flex items-center space-x-3">
                                    <Plus className="w-4 h-4" />
                                    <span>Add new Weather credentials</span>
                                  </div>
                                </SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {payload.name === "Google Search" && (
                        <div className="space-y-2">
                          <Label className="flex items-center text-sm font-medium">
                            Google Search Credentials
                          </Label>
                          <Select
                            onValueChange={(value) => {
                              if (value === "add-new") {
                                handleCreateCredentials("google_search");
                                return;
                              }
                              const selectedCredential = credentialsList.find(
                                (cred) => cred.id === value
                              );
                              if (
                                selectedCredential &&
                                selectedCredential.googleAPIKey &&
                                selectedCredential.googleCSID
                              ) {
                                handleBuiltInKeyInput(
                                  "google_api_key",
                                  selectedCredential.googleAPIKey
                                );
                                handleBuiltInKeyInput(
                                  "google_cse_id",
                                  selectedCredential.googleCSID
                                );
                              }
                              handleSelectChange(
                                "selected_google_credential_id",
                                value
                              );
                            }}
                            value={payload.selected_google_credential_id || ""}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Google Search credentials" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectLabel>
                                  Available Google Search Credentials
                                </SelectLabel>
                                {credentialsList
                                  .filter(
                                    (credential) =>
                                      credential.googleAPIKey &&
                                      credential.googleCSID
                                  )
                                  .map((credential) => (
                                    <SelectItem
                                      key={credential.id}
                                      value={credential.id || ""}
                                      className="text-left"
                                    >
                                      <div className="flex items-center space-x-3 text-left w-full">
                                        {getCredentialIcon("google_search")}
                                        <div className="flex flex-col text-left">
                                          <span className="font-medium text-left">
                                            {credential.name}
                                          </span>
                                          <span className="text-xs text-gray-500 text-left">
                                            Google Custom Search Engine
                                            credentials
                                          </span>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                {/* Add separator if there are existing credentials */}
                                {credentialsList.filter(
                                  (credential) =>
                                    credential.googleAPIKey &&
                                    credential.googleCSID
                                ).length > 0 && (
                                    <div className="border-t border-gray-200 my-1"></div>
                                  )}
                                {/* Add new credential option */}
                                <SelectItem
                                  value="add-new"
                                  className="text-blue-600 font-medium"
                                >
                                  <div className="flex items-center">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add new Google Search credentials
                                  </div>
                                </SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>

                          {payload.selected_google_credential_id &&
                            payload.selected_google_credential_id !==
                            "add-new" && (
                              <div className="text-sm text-green-600 flex items-center mt-1">
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Google Search credentials selected (includes
                                both API Key and Search Engine ID)
                              </div>
                            )}
                        </div>
                      )}

                      {/* Show success message when credentials are selected */}
                      {(payload.selected_wikipedia_credential_id ||
                        payload.selected_weather_credential_id ||
                        payload.selected_google_credential_id) && (
                          <Alert className="bg-green-50 border-green-200">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <AlertTitle className="text-green-700">
                              Credentials Selected
                            </AlertTitle>
                            <AlertDescription className="text-green-600">
                              The selected credentials will be used for this
                              built-in tool.
                            </AlertDescription>
                          </Alert>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {selectedParameter === "REST API" && (
                <div className="space-y-4 mt-6">
                  <div className="flex items-center">
                    <h3 className="text-md font-bold">
                      REST API Configuration
                    </h3>
                    <span className="text-red-500 ml-1">*</span>
                  </div>
                  <ApiConfigurationKnowledge
                    handleSelectChange={handleSelectChange}
                    payload={payload}
                    headerRestAPI={headerRestAPI}
                    addHeaderRestAPI={addHeaderRestAPI}
                    handleHeaderRestAPIInput={handleHeaderRestAPIInput}
                    removeHeaderRestAPI={removeHeaderRestAPI}
                    authRestAPI={authRestAPI}
                    setAuthRestAPI={setAuthRestAPI}
                    handleTypeAuthRestAPI={handleTypeAuthRestAPI}
                    handleValueAuthRestAPI={handleValueAuthRestAPI}
                    configRestAPI={configRestAPI}
                    handleConfigRestAPI={handleConfigRestAPI}
                    requestBody={requestBody}
                    setRequestBody={setRequestBody}
                    describe={describe}
                    handleSetDescribe={handleSetDescribe}
                    parameter={parameterRestAPI}
                    handleParameterRestAPIInput={handleParameterRestAPIInput}
                    addParameterRestAPI={addParameterRestAPI}
                    removeParameterRestAPI={removeParameterRestAPI}
                    handleValue={handleValue}
                    oauth2={oauth2}
                    setOAuth2={setOAuth2}
                    oauth2Connection={oauth2Connection}
                    setOAuth2Connection={setOAuth2Connection}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <Button variant="outline" onClick={handlePreviousStep}>
                Back
              </Button>
            ) : (
              <div></div> // Empty div to maintain flex spacing
            )}

            <Button
              onClick={handleNextStep}
              disabled={
                step === 1
                  ? isSubmitLoading || isGeneratingBeforeSave
                  : isSubmitLoading || isGeneratingBeforeSave
              }
            >
              {isSubmitLoading || isGeneratingBeforeSave ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isGeneratingBeforeSave
                    ? "Generating & Saving..."
                    : "Processing..."}
                </>
              ) : step < 2 ? (
                "Continue"
              ) : (
                "Save Knowledge"
              )}
            </Button>
          </div>
        </CardContent>

        {/* NEW: Add Credential Dialog */}
        <AddCredentialDialog
          isOpen={showAddCredentialDialog}
          onOpenChange={setShowAddCredentialDialog}
          preselectedType={preselectedCredentialType}
          contextInfo={credentialContextInfo}
          onCredentialCreated={handleCredentialCreated}
        />

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <WandSparkles className="w-5 h-5 mr-2 text-blue-500" />
                AI Description Not Generated
              </DialogTitle>
              <DialogDescription className="text-left">
                You haven&apos;t generated an AI description for this knowledge
                yet. AI-generated descriptions help improve the quality and
                usability of your knowledge base.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <WandSparkles className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Recommended: Generate AI Description
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      AI will analyze your knowledge and create optimized
                      descriptions, function names, and system instructions
                      automatically.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={handleCancelSave}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSaveWithoutGeneration}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Save Without AI
              </Button>
              <Button
                onClick={handleGenerateBeforeSave}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <WandSparkles className="w-4 h-4 mr-2" />
                    Generate & Save
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Toast />
      </Card>
    </ToastProvider>
  );
};
