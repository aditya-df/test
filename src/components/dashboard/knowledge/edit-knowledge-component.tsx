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
  Plus,
  ChevronDown,
  Search,
  Check,
  Database,
  Book,
  Cloud,
  FileText,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { useRouter, useParams } from "next/navigation";
import { Data } from "@/stores/knowledge-new/model";
import { useAuthStore } from "@/utils/auth-utils-client";
import { VisibilityType } from "@prisma/client";
import { useStore as useCredentialStore } from "@/stores/credential/useStore";
import { regions } from "@/data/bq-locations";
import { useMemo } from "react";
import {
  appendColumnSchema,
  cn,
  formatSchemaToString,
  findTableSchema,
  extractTableNameFromQuery,
} from "@/utils/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { formatSchemaForCodeMirror } from "@/utils/utils";
import ApiConfigurationKnowledge from "@/components/ui/knowledge/api-configuration-knowledge";
import Link from "next/link";

// Helper function to add timeout to async operations
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out. Please try again.')), timeoutMs)
    ),
  ]);
};

export const EditKnowledgeComponent = () => {
  const { session } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const knowledgeId = params.id as string;

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
  const [isCreationSuccessful, setIsCreationSuccessful] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [, setKnowledgeData] = useState<Data | null>(null);

  const { getList: getParameterList, data: parameters } = useParameterStore();
  const { getList: getAgentList } = useAgentStore();
  const { getList: getCredentialList, data: credentialsList } =
    useCredentialStore();
  const { update, getDetail, selectedData } = useStore();
  const {
    handleSelectChange,
    payload,
    setPayload,
    builtInKeyPayload,
    addBuiltInKey,
    handleBuiltInKeyInput,
    multipleFiles,
    setMultipleFiles,
    handleSave,
    handleDescribeChange,
    handleGenerateDescription,
    isLoading: isFormLoading,
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
    handleTypeAuthRestAPI,
    handleValueAuthRestAPI,
    configRestAPI,
    handleConfigRestAPI,
    requestBody,
    setRequestBody,
    setHeaderRestAPI,
    setAuthRestAPI,
    setConfigRestAPI,
    handleRemoveFile,
    setCurrentFiles,
    currentFiles,
    handleValue,
    oauth2,
    setOAuth2,
    oauth2Connection,
    setOAuth2Connection,
    parameterRestAPI,
    setParameterRestAPI,
    handleParameterRestAPIInput,
    addParameterRestAPI,
    removeParameterRestAPI,
  } = useToolForm(() => { }, update, selectedData);
  const [openDatabaseZone, setOpenDatabaseZone] = useState(false);
  const [searchTermRegion, setSearchTermRegion] = useState("");
  const [downloadedCredentialFile, setDownloadedCredentialFile] =
    useState<File | null>(null);
  const [isDownloadingCredentials, setIsDownloadingCredentials] =
    useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
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
  const [isLoadedData, setIsLoadedData] = useState(false);
  const { theme } = useTheme();

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
  const downloadCredentialFileFromGCS = async (
    credentialId: string,
    credentialList: any[] | null,
    sessionUser: any | null,
    isFirstLoad: boolean = false
  ) => {
    setIsDownloadingCredentials(true);
    try {
      let selectedCredential: any = null;
      if (credentialList == null) {
        selectedCredential = credentialsList.find(
          (cred) => cred.id === credentialId
        );
      } else {
        selectedCredential = credentialList.find(
          (cred) => cred.id === credentialId
        );
      }
      if (!selectedCredential?.credentialFile) {
        throw new Error("No credential file found");
      }

      // Get organization ID using your existing utility
      let organizationId = null;
      if (sessionUser != null) {
        organizationId = sessionUser?.user.organizationId;
      } else {
        organizationId = await session?.user.organizationId;
      }
      console.log("Organization ID in create knowledge:", organizationId);
      if (!organizationId) {
        if (!isFirstLoad) {
          throw new Error("Organization ID not found");
        }
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
    } catch (error) {
      console.error("Error downloading credential file:", error);
      if (!isFirstLoad) {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to download credential file",
        });
      }
    } finally {
      setIsDownloadingCredentials(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await getDetail(knowledgeId);
        (await getCredentialList({ offset: 0, limit: 1000 })) as any;

        if (data) {
          setKnowledgeData(data);

          setPayload({
            id: data.id,
            type_id: data.typeId,
            name: data.name,
            function_name: data.functionName,
            description: data.description,
            system_instruction: data.systemInstruction,
            database_type: data?.databaseType,
            database_zone: data?.databaseZone,
            sql_command: data?.sqlCommand,
            current_credentials: data?.credentialsJson,
            visibility_type: data?.visibilityType,
            credential_id: data?.credentialId,
            selected_credential_id: data?.credentialId,
            dataset_id: data?.datasetId,
            request_method: data?.requestMethod,
            request_url: data?.requestUrl,
          });

          if (
            data.functionName !== "" &&
            data.description !== "" &&
            data.systemInstruction !== ""
          ) {
            setShowGeneratedData(true);
            setAiGeneratedData({
              function_name: data.functionName ?? "",
              tool_description: data.description ?? "",
              system_instructions: data.systemInstruction ?? "",
            });
          }

          // Set the description
          handleSetDescribe(data.description || "");

          // If there are existing documents, handle them
          if (data.documents && data.documents.length > 0) {
            // You might need to adjust this based on your file structure
            const existingFiles = data.documents.map((doc: any) => doc.id);
            setPayload((prev) => ({
              ...prev,
              current_files: existingFiles,
            }));
            setCurrentFiles(data.documents);
          }

          setSelectedParameter(data.type?.valueString ?? "");

          // If there are database parameters, handle them
          if (data.parameters) {
            // Handle built-in keys based on the knowledge type
            if (data.type?.valueString === "BUILT-IN") {
              const builtInParameters = data.parameters["built-in"];
              let credentialIds: any = {};
              if (builtInParameters.credential_ids) {
                credentialIds = builtInParameters.credential_ids;
              }
              if (Object.keys(credentialIds).length > 0) {
                if (data.name === "Wikipedia") {
                  setPayload((prev) => ({
                    ...prev,
                    selected_wikipedia_credential_id: credentialIds.wikipedia,
                  }));
                } else if (data.name === "Weather") {
                  setPayload((prev) => ({
                    ...prev,
                    selected_weather_credential_id: credentialIds.weather,
                  }));
                } else if (data.name === "Google Search") {
                  setPayload((prev) => ({
                    ...prev,
                    selected_google_credential_id: credentialIds.google_search,
                  }));
                }
              }
            } else if (data.type?.valueString === "REST API") {
              const restApiParameters = data.parameters["rest-api"];
              if (restApiParameters.headers) {
                setHeaderRestAPI(restApiParameters.headers);
              }
              if (restApiParameters.auth) {
                setAuthRestAPI(restApiParameters.auth);
              }
              if (restApiParameters.config) {
                setConfigRestAPI(restApiParameters.config);
              }
              if (restApiParameters.request_body) {
                setRequestBody(restApiParameters.request_body);
              }
              if (restApiParameters.queryParams) {
                setParameterRestAPI(restApiParameters.queryParams);
              }
            }
          }
          setIsLoadedData(true);
        }
      } catch (error) {
        setIsLoading(false);
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load knowledge data",
        });
      }
    };

    if (knowledgeId) {
      loadData();
    }
  }, [knowledgeId]);

  useEffect(() => {
    const loadCredentialFile = async () => {
      try {
        if (credentialsList.length > 0 && session) {
          if (payload.credential_id && payload.database_type === "bigquery") {
            await downloadCredentialFileFromGCS(
              payload.credential_id,
              credentialsList,
              session,
              true
            );
          }
        }
      } catch (error) {
        setIsLoading(false);
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load credential file",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoadedData) {
      loadCredentialFile();
    }
  }, [isLoadedData, credentialsList, payload, session]);

  useEffect(() => {
    const loadConnection = async () => {
      try {
        if (
          payload.database_type === "bigquery" &&
          payload.sql_command &&
          payload.database_zone
        ) {
          await testConnection(
            true,
            downloadedCredentialFile,
            payload.database_type
          );
        }
      } catch (error) {
        setIsLoading(false);
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load connection",
        });
      } finally {
        setIsLoading(false);
      }
    };
    if (downloadedCredentialFile !== null && datasetBigquery.length === 0) {
      loadConnection();
    }
  }, [downloadedCredentialFile, datasetBigquery]);

  useEffect(() => {
    const loadQuery = async () => {
      if (datasetBigquery.length > 0) {
        await testQuery(
          true,
          payload.sql_command,
          payload.database_zone,
          payload.database_type,
          downloadedCredentialFile
        );
      }
    };
    if (datasetBigquery.length > 0) {
      loadQuery();
    }
  }, [datasetBigquery]);

  useEffect(() => {
    const filters = { keyString: { value: "TOOL_KEY", command: "eq" } };
    getParameterList({
      offset: 1,
      limit: 50,
      filters: JSON.stringify(filters),
    });
    getAgentList({
      offset: 1,
      limit: 50,
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

    // Update selectedParameter immediately
    const newSelectedParameter = parameter?.valueString || "";
    setSelectedParameter(newSelectedParameter);

    // Clear name when switching types
    if (newSelectedParameter !== selectedParameter) {
      handleSelectChange("name", "");
    }

    if (parameter?.valueString === "BUILT-IN") {
      const nameBuiltIn = payload.name;

      switch (nameBuiltIn) {
        case "Wikipedia":
          addBuiltInKey(["WIKIPEDIA_API_USER_AGENT"]);
          break;
        case "Weather":
          addBuiltInKey(["WEATHER_API_KEY"]);
          break;
        case "Google Search":
          addBuiltInKey(["GOOGLE_API_KEY", "GOOGLE_CSE_ID"]);
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

  const validateBasicInfo = () => {
    const errors = {
      type: !payload.type_id,
      name: !payload.name,
    };

    setValidationErrors({ ...validationErrors, ...errors });

    return !Object.values(errors).some((error) => error);
  };

  const handleCreateCredentials = (credentialType: string) => {
    // Store current knowledge edit state in localStorage so user can return
    const currentState = {
      selectedParameter,
      payload: {
        type_id: payload.type_id,
        name: payload.name,
        visibility_type: payload.visibility_type,
      },
      describe,
      step,
      timestamp: Date.now(),
      isEditing: true,
      knowledgeId,
    };

    localStorage.setItem("pendingKnowledgeEdit", JSON.stringify(currentState));

    // Navigate to credentials page with specific type context
    const credentialTypeParam = encodeURIComponent(credentialType);
    router.push(
      `/credentials?create=${credentialTypeParam}&return=/dashboard/knowledge/${knowledgeId}/edit`
    );
  };

  const handleCustomSave = () => {
    setIsCreationSuccessful(false);
    handleSave();
  };

  const handleNextStep = () => {
    console.log("hit next step");
    if (step === 1 && validateBasicInfo()) {
      setStep(2);
    } else if (step === 2) {
      // Validate step 2 based on selected parameter
      if (selectedParameter === "EMBEDDING") {
        if (!describe) {
          setValidationErrors({ ...validationErrors, description: true });
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
      } else if (selectedParameter === "BUILT-IN") {
        if (
          !payload.selected_wikipedia_credential_id &&
          !payload.selected_weather_credential_id &&
          !payload.selected_google_credential_id
        ) {
          setValidationErrors({ ...validationErrors, credentials: true });
          return;
        }
      }
      handleCustomSave();
    }
  };

  const handlePreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleGenerateAIDescription = async () => {
    try {
      // Call the handleGenerateDescription function
      await handleGenerateDescription();

      // Add a small delay to ensure state updates have been processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Now use the updated state values
      const generatedData = {
        function_name: payload.function_name || "",
        tool_description: payload.description || "",
        system_instructions: payload.system_instruction || "",
      };

      // Set the AI generated data for display in the accordion
      setAiGeneratedData(generatedData);
      setShowGeneratedData(true);
    } catch (error) {
      console.error("Error generating description:", error);
    }
  };

  const testConnection = async (
    isFirstLoad: boolean = false,
    credentialFile: File | null = null,
    databaseType: string = ""
  ) => {
    setIsTestingConnection(true);
    setOpenPopoverConnection(false);
    setSuccessConnectionDatabase(false);

    if (!isFirstLoad) {
      handleSelectChange("database_zone", "");
      handleSelectChange("dataset_id", "");
      handleSelectChange("sql_command", "");
    }

    let credentialToUse: File | null = null;
    let databaseTypeToUse: string = "";

    if (isFirstLoad) {
      databaseTypeToUse = databaseType;
      credentialToUse = credentialFile;
    } else {
      if (
        payload.database_type === "bigquery" &&
        payload.selected_credential_id
      ) {
        // Use the downloaded credential file
        credentialToUse = downloadedCredentialFile;
      } else {
        credentialToUse = credentials instanceof File ? credentials : null;
      }

      databaseTypeToUse = payload.database_type as string;
    }

    try {
      const result = await withTimeout(
        testConnectionDatabase(databaseTypeToUse, credentialToUse),
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
      if (!isFirstLoad) {
        toast({
          variant: "destructive",
          title: "Connection Test Failed",
          description:
            error instanceof Error ? error.message : "Connection test failed",
        });
      }
      return false;
    }
  };

  const testQuery = async (
    isFirstLoad: boolean = false,
    sqlCommand: string = "",
    databaseZone: string = "",
    databaseType: string = "",
    credentialFile: File | null = null
  ) => {
    setIsTestingQuery(true);
    setOpenPopoverQuery(false);
    setSuccessQuery(null);
    const sqlcommand = payload.sql_command + " LIMIT 1";

    if (!isFirstLoad) {
      databaseType = payload.database_type ?? "";
      sqlCommand = sqlcommand;
      databaseZone = payload.database_zone ?? "";
      credentialFile = downloadedCredentialFile;
    }

    try {
      const result = await withTimeout(
        testQueryBigquery(
          databaseType,
          sqlCommand,
          databaseZone,
          credentialFile
        ),
        120000 // 120 second timeout
      );

      setSuccessQuery(result?.success ?? false);

      console.log("dataset bigquery", datasetBigquery);

      const tableName = extractTableNameFromQuery(sqlCommand);
      const schema = findTableSchema(tableName ?? "", datasetBigquery);
      const formattedSchema = formatSchemaToString(schema);

      const updatedDescription = appendColumnSchema(describe, formattedSchema);
      console.log(updatedDescription);
      handleSetDescribe(updatedDescription);
      setPayload({ ...payload, description: updatedDescription });
    } catch (e) {
      console.error("Query test error:", e);
      setSuccessQuery(false);
    } finally {
      setIsTestingQuery(false);
      setOpenPopoverQuery(true);
    }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading knowledge data...</span>
      </div>
    );
  }

  return (
    <ToastProvider>
      <Card className="w-full mt-6">
        <CardHeader>
          <h1 className="text-2xl font-bold mb-4">Edit Knowledge</h1>
          <CardDescription>Update your knowledge configuration</CardDescription>
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
                    : "bg-gray-200 dark:bg-transparent dark: text-white dark:border dark:border-gray-800"
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
                    : "bg-gray-200 dark:bg-transparent dark: text-white dark:border dark:border-gray-8  00"
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
                            payload.visibility_type === VisibilityType.PRIVATE
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
                      key="built-in-select"
                      value={payload.name || ""}
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
                        key="text-input"
                        type="text"
                        placeholder="Enter a descriptive name for this knowledge"
                        className={`w-full ${validationErrors.name ? "border-red-500" : ""
                          }`}
                        name="name"
                        value={payload.name || ""}
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
                  disabled={isFormLoading}
                >
                  {isFormLoading ? (
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
                  </div>
                  <p className="text-sm text-gray-500">
                    Upload additional documents to be embedded and used as
                    knowledge source (PDF, DOCX, XLSX)
                  </p>

                  {currentFiles && currentFiles.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">
                        Current Documents:
                      </h4>
                      <ul className="space-y-2">
                        {currentFiles.map((doc: any, index: number) => {
                          // // Extract meaningful filename by removing prefix before the dash
                          const getDisplayName = (bucketName: string) => {
                            const parts = bucketName.split("-");
                            if (parts.length > 1) {
                              // Remove the first part and join the rest
                              return parts.slice(2).join("-");
                            }
                            return bucketName; // Return original if no dash found
                          };

                          return (
                            <li
                              key={index}
                              className="flex items-center gap-2 justify-between"
                            >
                              <div className="flex items-center gap-2 w-full">
                                <FileText className="h-4 w-4" />
                                <Link
                                  href={`/api/document/${doc.bucketName}`}
                                  target="_blank"
                                  className="text-blue-500 hover:text-blue-600 text-sm"
                                >
                                  {getDisplayName(doc.bucketName)}
                                </Link>
                              </div>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="text-xs"
                                onClick={() => handleRemoveFile(doc.id)}
                              >
                                <X className="h-4 w-4 " />
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  <FileUpload
                    files={multipleFiles}
                    onFilesChange={(files) => {
                      setMultipleFiles(files);
                    }}
                    maxSize={1024 * 1024 * 10}

                    accept="application/pdf; application/vnd.openxmlformats-officedocument.wordprocessingml.document; application/docx; application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; application/xlsx"
                    multiple={true}
                  />

                  {multipleFiles.length > 0 && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertTitle className="text-green-700">
                        New Documents Ready
                      </AlertTitle>
                      <AlertDescription className="text-green-600">
                        {multipleFiles.length} new document
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
                      value={payload.database_type}
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
                          value={payload.credential_id}
                          onValueChange={async (value) => {
                            console.log("value : ", value);
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
                            await downloadCredentialFileFromGCS(
                              value,
                              null,
                              null
                            );
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
                      onClick={() => {
                        testConnection(false);
                      }}
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
                              value={payload.dataset_id}
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
                          onClick={() => testQuery(false)}
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
                    <div className="space-y-4 p-4 border rounded-md bg-slate-50">
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
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {credential.name}
                                        </span>
                                        {credential.description && (
                                          <span className="text-xs text-gray-500">
                                            {credential.description}
                                          </span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                {credentialsList.filter(
                                  (credential) => credential.wikipediaAPIKey
                                ).length > 0 && (
                                    <div className="border-t border-gray-200 my-1"></div>
                                  )}
                                <SelectItem
                                  value="add-new"
                                  className="text-blue-600 font-medium"
                                >
                                  <div className="flex items-center">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add new Wikipedia credentials
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
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {credential.name}
                                        </span>
                                        {credential.description && (
                                          <span className="text-xs text-gray-500">
                                            {credential.description}
                                          </span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                {credentialsList.filter(
                                  (credential) => credential.weatherAPIKey
                                ).length > 0 && (
                                    <div className="border-t border-gray-200 my-1"></div>
                                  )}
                                <SelectItem
                                  value="add-new"
                                  className="text-blue-600 font-medium"
                                >
                                  <div className="flex items-center">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add new Weather credentials
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
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {credential.name}
                                        </span>
                                        {credential.description && (
                                          <span className="text-xs text-gray-500">
                                            {credential.description}
                                          </span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                {credentialsList.filter(
                                  (credential) =>
                                    credential.googleAPIKey &&
                                    credential.googleCSID
                                ).length > 0 && (
                                    <div className="border-t border-gray-200 my-1"></div>
                                  )}
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

                      {validationErrors.credentials && (
                        <p className="text-red-500 text-sm">
                          Please select a credential for the built-in tool
                        </p>
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

          {isCreationSuccessful && (
            <Alert className="mt-4 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-700">
                Knowledge Updated
              </AlertTitle>
              <AlertDescription className="text-green-600">
                Your knowledge has been successfully updated. You will be
                redirected to the knowledge list.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <Button variant="outline" onClick={handlePreviousStep}>
                Back
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => router.push("/knowledge")}
              >
                Cancel
              </Button>
            )}

            <Button onClick={handleNextStep} disabled={isSubmitLoading}>
              {isSubmitLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : step < 2 ? (
                "Continue"
              ) : (
                "Update Knowledge"
              )}
            </Button>
          </div>
        </CardContent>
        <Toast />
      </Card>
    </ToastProvider>
  );
};
