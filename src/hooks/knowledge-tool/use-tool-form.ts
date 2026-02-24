import {
  Data,
  DataAuthRestApi,
  DataBuiltInKey,
  DataConfigRestApi,
  DataHeaderRestApi,
  DataSubmit,
} from "@/stores/knowledge-new/model";
import { generateUUID, redirectWithRefresh } from "@/utils/utils";
import { useState } from "react";
import { useToast } from "../use-toast";
import { VisibilityType } from "@prisma/client";
import { useAuthStore } from "@/utils/auth-utils-client";
import { Data as DataOAuth2 } from "@/stores/oauth2-config/model";
import { useStore as useConnectionStore } from "@/stores/oauth2-connection/useStore";
import { Data as DataOAuth2Connection } from "@/stores/oauth2-connection/model";

export const useToolForm = (
  create: (obj: DataSubmit) => void,
  update: (obj: DataSubmit) => void,
  initialData: Data | null
) => {
  const { toast } = useToast();
  const { session } = useAuthStore();
  const [payload, setPayload] = useState<DataSubmit>({
    type_id: "",
    agent_id: "",
    name: "",
    system_instruction: "",
    function_name: "",
    description: "",
    database_type: "",
    sql_command: "",
    database_zone: "",
    dataset_id: "",
    visibility_type: VisibilityType.PRIVATE,
    // Add new fields for credential selection
    selected_wikipedia_credential_id: "",
    selected_weather_credential_id: "",
    selected_google_credential_id: "",
    request_method: "GET",
    request_url: "",
  });
  const [payloadRestAPI, setPayloadRestAPI] = useState({
    method: "",
    api_url: "",
  });
  const [builtInKeyPayload, setBuiltInKeyPayload] = useState<DataBuiltInKey[]>(
    []
  );
  const [headerRestAPI, setHeaderRestAPI] = useState<DataHeaderRestApi[]>([
    {
      id: generateUUID(),
      key: "Content-Type",
      value: "application/json",
      is_secure: false,
      is_enabled: true,
    },
    {
      id: generateUUID(),
      key: "Accept",
      value: "application/json",
      is_secure: false,
      is_enabled: true,
    },
  ]);
  const [parameterRestAPI, setParameterRestAPI] = useState<
    Record<string, any>[]
  >([]);
  const handleParameterRestAPIInput = (
    id: string,
    field: keyof DataHeaderRestApi,
    value: string | boolean
  ) => {
    setParameterRestAPI(
      parameterRestAPI.map((parameter) => {
        if (parameter.id === id) {
          parameter[field] = value as never;
        }
        return parameter;
      })
    );
  };
  const addParameterRestAPI = () => {
    setParameterRestAPI([
      ...parameterRestAPI,
      {
        id: generateUUID(),
        key: "",
        value: "",
      },
    ]);
  };
  const removeParameterRestAPI = (id: string) => {
    setParameterRestAPI(
      parameterRestAPI.filter((parameter) => parameter.id !== id)
    );
  };

  const [multipleFiles, setMultipleFiles] = useState<File[]>([]);
  const [currentFiles, setCurrentFiles] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<File | null>(null);
  const [describe, setDescribe] = useState("");
  const [buttonActive, setButtonActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [authRestAPI, setAuthRestAPI] = useState<DataAuthRestApi>({
    type: "none",
    bearer_token: "",
    api_key: "",
    key_name: "",
    key_location: "",
    username: "",
    password: "",
    is_get_from_function: false,
    connection_id: "",
  });
  const [oauth2, setOAuth2] = useState<DataOAuth2>({
    id: "",
    name: "",
    grantType: "",
    callbackUrl: "",
    authUrl: "",
    accessTokenUrl: "",
    clientId: "",
    clientSecret: "",
    scope: "",
    state: "",
    clientAuth: "",
    refreshUrl: "",
    authRequest: [],
    tokenRequest: [],
    refreshRequest: [],
  });
  const [oauth2Connection, setOAuth2Connection] =
    useState<DataOAuth2Connection>({
      id: "",
      name: "",
      configId: "",
      externalId: "",
      accessToken: "",
      refreshToken: "",
      accessExpiresAt: null,
      refreshExpiresAt: null,
      bindingCreatedAt: null,
      bindingExpiredAt: null,
    });
  const [configRestAPI, setConfigRestAPI] = useState<DataConfigRestApi>({
    timeout: 30000,
  });
  const [requestBody, setRequestBody] = useState("");

  const handleDescribeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescribe(e.target.value);
    setPayload({
      ...payload,
      description: e.target.value,
    });
    if (e.target.value.length > 0) {
      setButtonActive(true);
    } else {
      setButtonActive(false);
    }
  };

  const handleSetDescribe = (value: string) => {
    setDescribe(value);
  };

  const handleGenerateDescription = async () => {
    setIsLoading(true);
    try {
      const result = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL_V2}/chat/generate_tool`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.user.backendToken}`,
          },
          body: JSON.stringify({
            description: describe,
          }),
        }
      );
      const response = await result.json();
      const data = response.data;
      setPayload({
        ...payload,
        description: data.tool_description,
        system_instruction: data.system_instructions,
        function_name: data.function_name,
      });
      setDescribe(data.tool_description);
      return data; // Return the data
    } catch (error) {
      console.error("Error generating description:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setPayload({
      ...payload,
      [e.target.name]: e.target.value,
    });
  };

  const addBuiltInKey = (keys: string[]) => {
    setBuiltInKeyPayload([]);
    keys.forEach((key) => {
      setBuiltInKeyPayload((prev) => [
        ...prev,
        {
          id: generateUUID(),
          key: key,
          value: "",
        },
      ]);
    });
  };

  const handleBuiltInKeyInput = (id: string, value: string) => {
    setBuiltInKeyPayload(
      builtInKeyPayload.map((key) => {
        if (key.id === id) {
          key.value = value;
        }
        return key;
      })
    );
  };

  const addHeaderRestAPI = () => {
    setHeaderRestAPI((prev) => [
      ...prev,
      {
        id: generateUUID(),
        key: "",
        value: "",
        is_secure: false,
        is_enabled: true,
      },
    ]);
  };

  const handleHeaderRestAPIInput = (
    id: string,
    field: keyof DataHeaderRestApi,
    value: string | boolean
  ) => {
    setHeaderRestAPI(
      headerRestAPI.map((header) => {
        if (header.id === id) {
          header[field] = value as never;
        }
        return header;
      })
    );
  };

  const removeHeaderRestAPI = (id: string) => {
    setHeaderRestAPI(headerRestAPI.filter((header) => header.id !== id));
  };

  const handleTypeAuthRestAPI = (type: string) => {
    handleValue("type", type, setAuthRestAPI, authRestAPI);
  };

  // General function to handle authentication value updates
  const handleValue = <T extends Record<string, any>>(
    field: string,
    value: string | number,
    setterFunction: React.Dispatch<React.SetStateAction<T>>,
    currentState: T
  ) => {
    setterFunction({
      ...currentState,
      [field]: value,
    });
  };

  const handleValueAuthRestAPI = (field: string, value: string) => {
    handleValue(field, value, setAuthRestAPI, authRestAPI);
  };

  const handleConfigRestAPI = (field: string, value: number) => {
    handleValue(field, value, setConfigRestAPI, configRestAPI);
  };

  const handleRemoveFile = (fileId: string) => {
    const currentFilesPayload = payload.current_files?.filter(
      (file) => file !== fileId
    );
    const currentFilesState = currentFiles.filter((file) => file.id !== fileId);
    console.log(currentFilesState);
    setCurrentFiles(currentFilesState);
    setPayload({
      ...payload,
      current_files: currentFilesPayload,
    });
  };

  const handleSelectChange = (key: string, value: string) => {
    setPayload((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const transformPayloadParameters = (connection_id?: any) => {
    const parameters = {
      "built-in": {
        function_name: payload.function_name || payload.name,
        environtments: builtInKeyPayload.map((built_in) => {

          return {
            [built_in["key"]]: built_in["value"],
          };
        }),
        // Add credential IDs to parameters
        credential_ids: {
          wikipedia: payload.selected_wikipedia_credential_id || null,
          weather: payload.selected_weather_credential_id || null,
          google_search: payload.selected_google_credential_id || null,
        },
      },
      "rest-api": {
        function_name: payload.function_name || payload.name,
        headers: headerRestAPI,

        queryParams: parameterRestAPI,
        auth: {
          ...authRestAPI,
          connection_id: connection_id || authRestAPI?.connection_id,
        },
        config: configRestAPI,
        request_body: requestBody,
      },
      zod_parameters: {},
    };
    return parameters;
  };

  const { update: updateOAuth2Connection } = useConnectionStore();

  const handleSave = async () => {
    setIsSubmitLoading(true);
    try {
      if (authRestAPI.type === "oauth2") {
        // run endpoint create oauth2 credential
        await updateOAuth2Connection({
          ...oauth2Connection,
        });
      }

      // Better sanitization for function_name: only allow lowercase alphanumeric and underscores
      payload.function_name = payload.function_name
        ? payload.function_name
            .trim()
            .normalize("NFD") // Decompose accents
            .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "_") // Replace any non-alphanumeric char (except _) with _
            .replace(/_+/g, "_") // Merge multiple underscores
            .replace(/^_+|_+$/g, "") // Remove leading/trailing underscores
        : "";

      // If function_name is still empty, derive it from the name field
      if (!payload.function_name && payload.name) {
        payload.function_name = payload.name
          .trim()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_+|_+$/g, "");
      }

      payload.parameters = JSON.stringify(
        transformPayloadParameters(oauth2Connection?.id)
      );
      payload.files = multipleFiles;
      payload.current_files = currentFiles.map((file) => file.id);
      // payload.credential_file = credentials;

      if (payload.database_type !== "bigquery" || !credentials) {
        delete payload.credential_file;
      }

      // Create a new payload object to avoid modifying the state directly
      const submitPayload = { ...payload };

      // Only add id for update case
      if (initialData?.id) {
        submitPayload.id = initialData.id;
      }

      const response = initialData
        ? await update(submitPayload)
        : await create(submitPayload);
      setIsSubmitLoading(false);
      if (typeof response === "string") {
        toast({
          title: "Error",
          description: initialData
            ? "Cannot update data!"
            : "Cannot create data!",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: initialData
            ? "Data updated successfully!"
            : "Data created successfully!",
          variant: "default",
        });
        redirectWithRefresh("/knowledge");
      }
    } catch (err) {
      console.log(err);
    }
  };

  return {
    payload,
    setPayload,
    handleInputChange,
    handleSelectChange,
    builtInKeyPayload,
    addBuiltInKey,
    handleBuiltInKeyInput,
    multipleFiles,
    setMultipleFiles,
    addHeaderRestAPI,
    handleHeaderRestAPIInput,
    removeHeaderRestAPI,
    headerRestAPI,
    handleSave,
    setPayloadRestAPI,
    payloadRestAPI,
    currentFiles,
    setCurrentFiles,
    describe,
    buttonActive,
    handleDescribeChange,
    handleGenerateDescription,
    isLoading,
    setCredentials,
    credentials,
    handleSetDescribe,
    isSubmitLoading,
    authRestAPI,
    handleTypeAuthRestAPI,
    handleValueAuthRestAPI,
    handleValue,
    oauth2,
    setOAuth2,
    configRestAPI,
    handleConfigRestAPI,
    requestBody,
    setRequestBody,
    setHeaderRestAPI,
    setAuthRestAPI,
    setConfigRestAPI,
    handleRemoveFile,

    parameterRestAPI,
    setParameterRestAPI,
    handleParameterRestAPIInput,
    addParameterRestAPI,
    removeParameterRestAPI,

    oauth2Connection,
    setOAuth2Connection,
  };
};
