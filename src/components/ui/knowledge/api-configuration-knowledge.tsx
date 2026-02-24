"use client";

import { useEffect, useState } from "react";
import { useTabEventListener } from "@/hooks/use-cross-tab-communication";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Key,
  Code,
  Plus,
  Send,
  Eye,
  EyeOff,
  Trash2,
  AlertCircle,
  CheckCircle2,
  SlidersVertical,
  Braces,
} from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { testApiConfiguration } from "@/app/action";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, hashText } from "@/utils/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../table";

import { DataRequestRestApi } from "@/stores/knowledge-new/model";
import { useStore as useConfigStore } from "@/stores/oauth2-config/useStore";
import { Data as DataOAuth2Config } from "@/stores/oauth2-config/model";
import { useStore as useConnectionStore } from "@/stores/oauth2-connection/useStore";
import { Data as DataOAuth2Connection } from "@/stores/oauth2-connection/model";
import { generateUUID } from "@/utils/utils";
import ModalSuccess from "./modal-success";
import { FUNCTION_LIBRARY } from "@/utils/dynamicFunction";

// Utility function to handle authentication sentence management
const updateAuthSentence = (
  describe: string,
  payloadDescription: string,
  sentenceType: string,
  shouldAdd: boolean
): { newDescribe: string; newPayloadDescription: string } => {
  // Updated regex to match both old and new authentication sentence patterns
  const authSentenceRegex =
    /(\n\n)?This request must (supply the following fields for authentication|hit tool authentication in order to get)[^\n]*(\n)?/i;

  let newDescribe = describe;
  let newPayloadDescription = payloadDescription || "";

  if (shouldAdd) {
    // Update describe
    if (authSentenceRegex.test(newDescribe)) {
      newDescribe = newDescribe.replace(
        authSentenceRegex,
        `\n\n${sentenceType}`
      );
    } else {
      newDescribe = (newDescribe + `\n\n${sentenceType}`).trim();
    }

    // Update payload.description
    if (authSentenceRegex.test(newPayloadDescription)) {
      newPayloadDescription = newPayloadDescription.replace(
        authSentenceRegex,
        `\n\n${sentenceType}`
      );
    } else {
      newPayloadDescription = (
        newPayloadDescription + `\n\n${sentenceType}`
      ).trim();
    }
  } else {
    // Remove authentication sentences
    if (authSentenceRegex.test(newDescribe)) {
      newDescribe = newDescribe.replace(authSentenceRegex, "").trim();
    }
    if (authSentenceRegex.test(newPayloadDescription)) {
      newPayloadDescription = newPayloadDescription
        .replace(authSentenceRegex, "")
        .trim();
    }
  }

  return { newDescribe, newPayloadDescription };
};

interface ApiConfigurationKnowledgeProps {
  oauth2: DataOAuth2Config;
  setOAuth2: (oauth2: DataOAuth2Config) => void;
  oauth2Connection: DataOAuth2Connection;
  setOAuth2Connection: (oauth2Connection: DataOAuth2Connection) => void;
  [key: string]: any; // Allow any other props
}

const getIcon = (iconType: string) => {
  switch (iconType.toLowerCase()) {
    case "token":
      return <Key className="w-4 h-4" />;
    case "add":
      return <Plus className="w-4 h-4" />;
    default:
      return <Key className="w-4 h-4" />;
  }
};

interface AuthConfigInputProps {
  label?: string;
  description?: string;
  name?: string;
  value: string | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  inputType?: "text" | "password" | "select";
  items?: { value: string; label: string; id: string; icon?: string }[];
  disabled?: boolean;
  loading?: boolean;
  direction?: "vertical" | "horizontal";
}

function AuthConfigInput({
  label,
  description,
  name,
  value,
  onChange,
  placeholder,
  inputType = "text",
  items,
  disabled,
  loading,
  direction = "horizontal",
}: AuthConfigInputProps) {
  return (
    <div
      className={`grid gap-x-4 gap-y-2 grid-cols-${
        direction === "vertical" ? 1 : 4
      }`}
    >
      <div
        className={cn(
          "flex flex-col justify-center gap-y-1",
          direction === "horizontal" ? "items-end" : ""
        )}
      >
        {label && (
          <Label
            className={cn(
              direction === "horizontal" ? "text-right" : "",
              "w-full"
            )}
          >
            {label}
          </Label>
        )}
        {description && (
          <p
            className={cn(
              "text-sm text-gray-500",
              direction === "horizontal" ? "text-right" : ""
            )}
          >
            {description}
          </p>
        )}
      </div>
      {inputType === "select" ? (
        <Select
          value={value}
          onValueChange={(value) =>
            onChange({
              target: { value, name },
            } as React.ChangeEvent<HTMLInputElement>)
          }
          disabled={disabled || loading}
        >
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {items?.map((item) => (
              <SelectItem key={item.id} value={item.value}>
                <div className="flex items-center space-x-3 text-left w-full">
                  {item.icon && getIcon(item.icon)}
                  <div className="flex flex-col text-left">
                    <span className="font-medium text-left">{item.label}</span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          className="col-span-3"
          placeholder={placeholder}
          value={value || ""}
          name={name}
          onChange={onChange}
          type={inputType}
          disabled={disabled}
        />
      )}
    </div>
  );
}

export default function ApiConfigurationKnowledge(
  props: ApiConfigurationKnowledgeProps
) {
  const [bodyType, setBodyType] = useState("json");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuth2Loading, setIsOAuth2Loading] = useState(false);
  const [isSuccessTestAPI, setIsSuccessTestAPI] = useState<boolean | null>(
    null
  );
  const [openPopoverTestAPI, setOpenPopoverTestAPI] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [openParameterDialog, setOpenParameterDialog] = useState(false);
  const [openBodyDialog, setOpenBodyDialog] = useState(false);
  const [openAuthDialog, setOpenAuthDialog] = useState(false);
  const [openOAuthSuccessDialog, setOpenOAuthSuccessDialog] = useState(false);

  const {
    handleSelectChange,
    payload,
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
    describe,
    handleSetDescribe,
    parameter,
    handleParameterRestAPIInput,
    addParameterRestAPI,
    removeParameterRestAPI,
    handleValue,
    oauth2,
    setOAuth2,
    oauth2Connection,
    setOAuth2Connection,
  } = props;

  const methodColors = {
    GET: "bg-green-500",
    POST: "bg-blue-500",
    PUT: "bg-yellow-500",
    DELETE: "bg-red-500",
    PATCH: "bg-purple-500",
  };

  const handleSendRequest = async () => {
    setIsLoading(true);
    setOpenPopoverTestAPI(false);
    const response = await testApiConfiguration(
      payload.request_url || "",
      payload.request_method || "",
      headerRestAPI,
      authRestAPI,
      configRestAPI,
      requestBody
    );
    if (response.success) {
      setIsSuccessTestAPI(true);
      setResponseMessage(response.statusText || "");
    } else {
      setIsSuccessTestAPI(false);
      setResponseMessage(response.statusText || "");
    }
    setOpenPopoverTestAPI(true);
    setIsLoading(false);
  };

  const handleConfirmBody = () => {
    // If the body is like: { "title": "$1", "body": "$2" }
    // This will extract the field names and join them with commas: "title,body"
    if (requestBody === "") {
      setOpenBodyDialog(false);
      return;
    }
    let fields = "";
    try {
      const parsed = JSON.parse(requestBody);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        fields = Object.keys(parsed).join(",");
      }
    } catch (e) {
      console.log(e);
      fields = "";
    }

    const sentence = `This request must supply the following fields: ${fields}`;
    let newDescribe = describe;
    let newPayloadDescription = payload.description || "";

    if (
      newDescribe.includes("This request must supply the following fields:")
    ) {
      newDescribe = newDescribe.replace(
        /(\n\n)?This request must supply the following fields:.*(\n)?/,
        ""
      );
    }
    // Remove existing sentence if present in payload.description
    if (
      newPayloadDescription.includes(
        "This request must supply the following fields:"
      )
    ) {
      newPayloadDescription = newPayloadDescription.replace(
        /(\n\n)?This request must supply the following fields:.*(\n)?/,
        ""
      );
    }

    const description = (newDescribe + `\n\n${sentence}`).trim();
    handleSetDescribe(description);
    handleSelectChange("description", description);
    setOpenBodyDialog(false);
  };

  const handleAuthFromFunction = (value: boolean | string) => {
    if (value) {
      const type = authRestAPI.type;
      let sentenceType = "";
      switch (type) {
        case "bearer":
          sentenceType =
            "This request must hit tool authentication in order to get bearer token and then must pass the value into fields: bearer_token";
          break;
        case "apikey":
          sentenceType =
            "This request must hit tool authentication in order to get api key and then must pass the value into fields: api_key";
          break;
        case "basic":
          sentenceType =
            "This request must hit tool authentication in order to get username or password and then must pass the value into fields: username, password";
          break;
        default:
          sentenceType = "";
          break;
      }

      const { newDescribe, newPayloadDescription } = updateAuthSentence(
        describe,
        payload.description || "",
        sentenceType,
        true
      );

      handleSetDescribe(newDescribe);
      handleSelectChange("description", newPayloadDescription);
    } else {
      const { newDescribe, newPayloadDescription } = updateAuthSentence(
        describe,
        payload.description || "",
        "",
        false
      );

      handleSetDescribe(newDescribe);
      handleSelectChange("description", newPayloadDescription);
    }
  };

  const hasAuth = authRestAPI.type !== "none";
  const hasBody =
    ["POST", "PUT", "PATCH"].includes(payload.request_method || "") &&
    requestBody.trim();
  const hasParameter = Array.isArray(parameter) && parameter.length > 0;

  const { create: createOAuth2Credential } = useConfigStore();

  const {
    getList: getListOAuth2Connection,
    data: oauth2ConnectionList,
    loading: loadingOAuth2Connection,
  } = useConnectionStore();

  async function handleOAuth2Login() {
    setIsOAuth2Loading(true);
    try {
      let config_id = oauth2?.id;
      if (!oauth2?.id) {
        const oauth2Response = await createOAuth2Credential({
          name: oauth2.name,
          grantType: oauth2.grantType,
          callbackUrl: oauth2.callbackUrl,
          authUrl: oauth2.authUrl,
          accessTokenUrl: oauth2.accessTokenUrl,
          clientId: oauth2.clientId,
          clientSecret: oauth2.clientSecret,
          scope: oauth2.scope,
          state: oauth2.state,
          clientAuth: oauth2.clientAuth,
          authRequest: oauth2.authRequest,
          tokenRequest: oauth2.tokenRequest,
          refreshUrl: oauth2.refreshUrl,
          refreshRequest: oauth2.refreshRequest,
        });

        setOAuth2(oauth2Response!);
        config_id = oauth2Response?.id;
      } else {
        // const existingOAuth2 = oauth2ConnectionList.find(
        //   (conn) => conn?.config?.id === oauth2.id
        // );
        // if (JSON.stringify(existingOAuth2) !== JSON.stringify(oauth2)) {
        //   const updatedOAuth2 = await updateOAuth2Credential({ ...oauth2 });
        //   setOAuth2(updatedOAuth2!);
        // }
      }

      let state: any = {
        config_id: config_id,
      };

      if (oauth2.state) {
        state = {
          ...state,
          state: oauth2.state,
        };
      }

      // Construct the OAuth login URL with parameters
      const objectParams = {
        state: JSON.stringify(state),
        ...(oauth2.scope && { scope: oauth2.scope }),
      };

      if (oauth2.authUrl?.includes("shopee")) {
        // Shopee-specific OAuth parameters with HMAC-SHA256 signing
        const timestamp = Math.floor(Date.now() / 1000);
        const partnerId = oauth2.authRequest?.find(
          (param: DataRequestRestApi) => param.key === "partner_id"
        )?.value;
        const clientSecret = oauth2.tokenRequest?.find(
          (param: DataRequestRestApi) => param.key === "partner_key"
        )?.value;
        const apiPath = new URL(oauth2.authUrl).pathname;

        // Create the signing string: partner_id + api_path + timestamp
        const signingString = `${partnerId}${apiPath}${timestamp}`;

        try {
          // Generate HMAC-SHA256 signature using client secret
          const signature = await hashText(signingString, clientSecret || "");

          localStorage.setItem("state", JSON.stringify(state));
          Object.assign(objectParams, {
            sign: signature,
            timestamp: timestamp,
          });
        } catch (error) {
          console.error("Error generating Shopee OAuth signature:", error);
          throw new Error("Failed to generate OAuth signature for Shopee");
        }
      }
      const params = new URLSearchParams();

      // Add objectParams to URLSearchParams
      Object.entries(objectParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });

      oauth2.authRequest?.forEach((param: DataRequestRestApi) => {
        if (param.key && param.value) {
          params.append(param.key, param.value);
        }
      });

      window.open(
        oauth2.authUrl + "?" + params.toString(),
        "_blank",
        "width=600,height=600"
      );
    } catch (error) {
      console.error("Error initiating OAuth flow:", error);
      alert(
        `Failed to initiate OAuth flow: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsOAuth2Loading(false);
    }
  }

  useEffect(() => {
    getListOAuth2Connection();
  }, []);

  // Listen for tab closing events
  useTabEventListener(
    "CLOSING",
    async (data) => {
      const response = await getListOAuth2Connection();

      // Extract connectionId from the received data
      if (
        data?.payload?.state?.success &&
        data?.payload?.state?.connectionId &&
        Array.isArray(response)
      ) {
        const connectionId = data.payload.state.connectionId;

        const selectedConnection = response?.find(
          (conn) => conn?.id === connectionId
        );

        if (selectedConnection) {
          const { config, ...connectionData } = selectedConnection;

          // Update oauth2Connection and oauth2 state variables
          setOAuth2Connection(connectionData as DataOAuth2Connection);
          if (config) {
            setOAuth2(config as DataOAuth2Config);
          }

          // Close Auth Dialog and open OAuth Success Dialog
          setOpenNewTokenDialog(false);
          setOpenOAuthSuccessDialog(true);
          handleValueAuthRestAPI("connection_id", connectionId);
        }
      }
    },
    [
      getListOAuth2Connection,
      oauth2ConnectionList,
      setOAuth2Connection,
      setOAuth2,
    ]
  );

  const resetOAuth2 = () => {
    setOAuth2({
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
  };

  const [openNewTokenDialog, setOpenNewTokenDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("");
  const tiktokTemplate: DataOAuth2Config = {
    callbackUrl:
      typeof window !== "undefined"
        ? `${window.location.origin}/oauth/callback`
        : "https://localhost/oauth/callback",
    grantType: "authorization_code",
    clientAuth: "inHeader",
    authUrl: "https://services.tiktokshop.com/open/authorize",
    authRequest: [
      {
        id: generateUUID(),
        key: "service_id",
        value: "",
        required: true,
      },
    ],
    accessTokenUrl: "https://auth.tiktok-shops.com/api/v2/token/get",
    tokenRequest: [
      {
        id: generateUUID(),
        key: "app_key",
        value: "",
        send_in: "inQuery",
        required: true,
      },
      {
        id: generateUUID(),
        key: "app_secret",
        value: "",
        send_in: "inQuery",
        required: true,
      },
      {
        id: generateUUID(),
        key: "grant_type",
        value: "authorized_code",
        send_in: "inQuery",
        required: true,
      },
    ],
    refreshUrl: "https://auth.tiktok-shops.com/api/v2/token/refresh",
    refreshRequest: [
      {
        id: generateUUID(),
        key: "app_key",
        value: "",
        send_in: "inQuery",
        required: true,
      },
      {
        id: generateUUID(),
        key: "app_secret",
        value: "",
        send_in: "inQuery",
        required: true,
      },
      {
        id: generateUUID(),
        key: "grant_type",
        value: "refresh_token",
        send_in: "inQuery",
        required: true,
      },
    ],
  };
  const shopeeTemplate: DataOAuth2Config = {
    callbackUrl:
      typeof window !== "undefined"
        ? `${window.location.origin}/oauth/callback`
        : "https://localhost/oauth/callback",
    grantType: "authorization_code",
    clientAuth: "inHeader",
    authUrl:
      "https://openplatform.sandbox.test-stable.shopee.sg/api/v2/shop/auth_partner",
    authRequest: [
      {
        id: generateUUID(),
        key: "partner_id",
        value: "",
        required: true,
      },
      {
        id: generateUUID(),
        key: "redirect",
        value:
          typeof window !== "undefined"
            ? `${window.location.origin}/oauth/callback`
            : "https://localhost/oauth/callback",
        required: true,
      },
    ],
    accessTokenUrl:
      "https://openplatform.sandbox.test-stable.shopee.sg/api/v2/auth/token/get",
    tokenRequest: [
      {
        id: generateUUID(),
        key: "partner_id",
        value: "",
        send_in: "inQuery",
        required: true,
      },
      {
        id: generateUUID(),
        key: "partner_key",
        value: "",
        send_in: "inQuery",
        required: true,
      },
    ],
    refreshUrl:
      "https://openplatform.sandbox.test-stable.shopee.sg/api/v2/auth/access_token/get",
    refreshRequest: [
      {
        id: generateUUID(),
        key: "partner_id",
        value: "",
        send_in: "inQuery",
        required: true,
      },
    ],
  };
  const OAuth2Provider = [
    {
      label: "Tiktok",
      action: () => {
        setSelectedProvider("tiktok");
        resetOAuth2();
        setTimeout(() => {
          setOAuth2({
            ...oauth2,
            ...tiktokTemplate,
          });
        }, 250);
      },
    },
    {
      label: "Shopee",
      action: () => {
        setSelectedProvider("shopee");
        resetOAuth2();
        setTimeout(() => {
          setOAuth2({
            ...oauth2,
            ...shopeeTemplate,
          });
        }, 250);
      },
    },
    {
      label: "Other",
      action: () => {
        setSelectedProvider("other");
        resetOAuth2();
      },
    },
  ];

  const [dynamicFunction, setDynamicFunction] = useState("");
  const [dynamicFunctionModal, setDynamicFunctionModal] = useState("");
  const selectedFunction =
    FUNCTION_LIBRARY[dynamicFunction as keyof typeof FUNCTION_LIBRARY];

  return (
    <Card className="shadow-none">
      <CardContent className="p-6">
        {/* Main Request Line */}
        <div className="flex gap-2 mb-4">
          <Select
            value={payload.request_method || ""}
            onValueChange={(value) =>
              handleSelectChange("request_method", value)
            }
          >
            <SelectTrigger className="w-24">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    methodColors[
                      payload.request_method as keyof typeof methodColors
                    ]
                  }`}
                />
                <span className="text-xs font-medium">
                  {payload.request_method}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(methodColors).map(([methodName, color]) => (
                <SelectItem key={methodName} value={methodName}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    {methodName}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="https://api.example.com/endpoint"
            value={payload.request_url || ""}
            onChange={(e) => handleSelectChange("request_url", e.target.value)}
            className="flex-1"
          />

          <Button
            variant="outline"
            onClick={handleSendRequest}
            disabled={!payload.request_url || isLoading}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {isLoading ? "Sending..." : "Send"}
          </Button>
        </div>

        {/* Quick Options */}
        <div className="flex gap-2 mb-4">
          {/* Auth Dialog */}
          <Dialog open={openAuthDialog} onOpenChange={setOpenAuthDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={
                  hasAuth
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-800"
                    : ""
                }
              >
                <Key className="w-4 h-4 mr-1" />
                Auth
                {hasAuth && (
                  <Badge variant="secondary" className="ml-1 h-4 text-xs">
                    ON
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Authentication</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={authRestAPI.type}
                    onValueChange={(value: any) => {
                      handleTypeAuthRestAPI(value);
                      handleAuthFromFunction(false);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Authentication</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="apikey">API Key</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {authRestAPI.type === "bearer" && (
                  <div>
                    <Label>Bearer Token</Label>
                    <Input
                      disabled={authRestAPI.is_get_from_function}
                      type="password"
                      name="bearer_token"
                      placeholder="Enter bearer token"
                      value={authRestAPI.bearer_token}
                      onChange={(e) =>
                        handleValueAuthRestAPI("bearer_token", e.target.value)
                      }
                    />
                  </div>
                )}

                {authRestAPI.type === "apikey" && (
                  <div className="space-y-3">
                    <div>
                      <Label>API Key</Label>
                      <Input
                        disabled={authRestAPI.is_get_from_function}
                        type="password"
                        name="api_key"
                        placeholder="Enter API key"
                        value={authRestAPI.api_key}
                        onChange={(e) =>
                          handleValueAuthRestAPI("api_key", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label>Key Name</Label>
                      <Input
                        disabled={authRestAPI.is_get_from_function}
                        placeholder="X-API-Key"
                        value={authRestAPI.key_name}
                        onChange={(e) =>
                          handleValueAuthRestAPI("key_name", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label>Add to</Label>
                      <Select
                        disabled={authRestAPI.is_get_from_function}
                        value={authRestAPI.key_location}
                        onValueChange={(value: any) =>
                          handleValueAuthRestAPI("key_location", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="header">Header</SelectItem>
                          <SelectItem value="query">Query Parameter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {authRestAPI.type === "basic" && (
                  <div className="space-y-3">
                    <div>
                      <Label>Username/Client ID</Label>
                      <Input
                        placeholder="Username/Client ID"
                        name="username-client-id"
                        disabled={authRestAPI.is_get_from_function}
                        value={authRestAPI.username}
                        onChange={(e) =>
                          handleValueAuthRestAPI("username", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label>Password/Client Secret</Label>
                      <div className="relative">
                        <Input
                          disabled={authRestAPI.is_get_from_function}
                          type={showPassword ? "text" : "password"}
                          placeholder="Password/Client Secret"
                          name="password-client-secret"
                          value={authRestAPI.password}
                          onChange={(e) =>
                            handleValueAuthRestAPI("password", e.target.value)
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {authRestAPI.type !== "none" && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="get-from-function"
                      checked={authRestAPI.is_get_from_function}
                      onCheckedChange={(checked) => {
                        handleValueAuthRestAPI("is_get_from_function", checked);
                        handleAuthFromFunction(checked);
                      }}
                    />
                    <Label htmlFor="get-from-function">Get from function</Label>
                  </div>
                )}

                {authRestAPI.type === "oauth2" && (
                  <section className="space-y-3">
                    <AuthConfigInput
                      direction="vertical"
                      label="Token"
                      description="Select the token to use for authentication."
                      name="token"
                      value={authRestAPI.connection_id}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value !== "create_new") {
                          handleValueAuthRestAPI("connection_id", value);
                          const selectedOAuth2 = oauth2ConnectionList.find(
                            (item) => item.id === value
                          );
                          if (selectedOAuth2 && selectedOAuth2.config) {
                            setOAuth2Connection({
                              ...oauth2Connection,
                              ...selectedOAuth2,
                            });
                            setOAuth2({ ...oauth2, ...selectedOAuth2.config });
                          }
                          setOpenNewTokenDialog(true);
                          setSelectedProvider("other");
                        } else {
                          handleValueAuthRestAPI("connection_id", "");
                          resetOAuth2();
                          setOpenNewTokenDialog(true);
                        }
                      }}
                      placeholder="Available Token"
                      inputType="select"
                      items={[
                        ...oauth2ConnectionList.map((connection) => ({
                          value: connection?.id as string,
                          label:
                            connection?.name ||
                            connection?.config?.name ||
                            "Unnamed Connection",
                          id: connection?.id as string,
                          icon: "token",
                        })),
                        {
                          value: "create_new",
                          label: "Create New Connection",
                          id: "create_new",
                          icon: "add",
                        },
                      ]}
                      loading={loadingOAuth2Connection}
                    />
                  </section>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Headers Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={
                  headerRestAPI.filter((h: any) => h.is_enabled).length > 2
                    ? "bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-800"
                    : ""
                }
              >
                <Plus className="w-4 h-4 mr-1" />
                Headers
                <Badge variant="secondary" className="ml-1 h-4 text-xs">
                  {headerRestAPI.filter((h: any) => h.is_enabled).length}
                </Badge>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Headers</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {headerRestAPI.map((header: any) => (
                  <div key={header.id} className="flex gap-2 items-center">
                    <Switch
                      disabled={!header.id}
                      checked={header.is_enabled}
                      onCheckedChange={(checked) =>
                        handleHeaderRestAPIInput(
                          header.id || "",
                          "is_enabled",
                          checked
                        )
                      }
                    />
                    <Input
                      disabled={!header.id}
                      placeholder="Header name"
                      value={header.key}
                      onChange={(e) =>
                        handleHeaderRestAPIInput(
                          header.id || "",
                          "key",
                          e.target.value
                        )
                      }
                      className="flex-1"
                    />
                    <Input
                      disabled={!header.id}
                      placeholder="Header value"
                      value={header.value}
                      onChange={(e) =>
                        handleHeaderRestAPIInput(
                          header.id || "",
                          "value",
                          e.target.value
                        )
                      }
                      className="flex-1"
                    />
                    <Button
                      disabled={!header.id}
                      variant="outline"
                      size="icon"
                      onClick={() => removeHeaderRestAPI(header.id || "")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={addHeaderRestAPI}
                  className="w-full bg-transparent"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Header
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Parameter dialog */}
          <Dialog
            open={openParameterDialog}
            onOpenChange={setOpenParameterDialog}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={
                  hasParameter
                    ? "bg-orange-50 border-orange-200 dark:bg-orange-900 dark:border-orange-800"
                    : ""
                }
                onClick={() => setOpenParameterDialog(true)}
              >
                <SlidersVertical className="w-4 h-4 mr-1" />
                Parameter
                {hasParameter && (
                  <Badge variant="secondary" className="ml-1 h-4 text-xs">
                    SET
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Request Query Params</DialogTitle>
              </DialogHeader>
              <Table className="border rounded-md">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-2/5 border">Key</TableHead>
                    <TableHead className="w-2/5 border">Value</TableHead>
                    <TableHead className="w-1/5 border">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {parameter?.map(
                    (parameter: { id: string; key: string; value: string }) => {
                      return (
                        <TableRow key={parameter.id}>
                          <TableCell className="border">
                            <Input
                              placeholder="Key"
                              value={parameter.key}
                              name="key"
                              onChange={(e) =>
                                handleParameterRestAPIInput(
                                  parameter.id || "",
                                  e.target.name,
                                  e.target.value
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="border flex gap-x-2 items-center">
                            <Input
                              placeholder="Value"
                              name="value"
                              value={parameter.value}
                              onChange={(e) =>
                                handleParameterRestAPIInput(
                                  parameter.id || "",
                                  e.target.name,
                                  e.target.value
                                )
                              }
                            />
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                setDynamicFunctionModal(parameter.id)
                              }
                            >
                              <Braces className="w-4 h-4" />
                            </Button>
                          </TableCell>
                          <TableCell className="border">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                removeParameterRestAPI(parameter.id || "")
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    }
                  )}

                  <TableRow>
                    <TableCell colSpan={3}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addParameterRestAPI()}
                      >
                        Add Parameter
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpenParameterDialog(false)}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Body Dialog */}
          {["POST", "PUT", "PATCH"].includes(payload.request_method || "") && (
            <Dialog open={openBodyDialog} onOpenChange={setOpenBodyDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={
                    hasBody
                      ? "bg-orange-50 border-orange-200 dark:bg-orange-900 dark:border-orange-800"
                      : ""
                  }
                  onClick={() => setOpenBodyDialog(true)}
                >
                  <Code className="w-4 h-4 mr-1" />
                  Body
                  {hasBody && (
                    <Badge variant="secondary" className="ml-1 h-4 text-xs">
                      SET
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Request Body</DialogTitle>
                </DialogHeader>
                <Tabs value={bodyType} onValueChange={setBodyType}>
                  <TabsList>
                    <TabsTrigger value="json">JSON</TabsTrigger>
                    {/* <TabsTrigger value="form">Form Data</TabsTrigger>
                                        <TabsTrigger value="raw">Raw</TabsTrigger> */}
                  </TabsList>
                  <TabsContent value="json">
                    <CodeMirror
                      height="200px"
                      className="w"
                      value={requestBody}
                      onChange={(value) => setRequestBody(value)}
                      extensions={[json()]}
                    />
                  </TabsContent>
                  <TabsContent value="form">
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input placeholder="Key" />
                        <Input placeholder="Value" />
                        <Button variant="outline" size="icon">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="raw">
                    <Textarea
                      placeholder="Raw request body..."
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      rows={10}
                    />
                  </TabsContent>
                </Tabs>
                <DialogFooter>
                  <Button variant="outline" onClick={handleConfirmBody}>
                    Confirm
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Settings Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-1" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Timeout (ms)</Label>
                  <Input
                    type="number"
                    value={configRestAPI.timeout}
                    onChange={(e) =>
                      handleConfigRestAPI(
                        "timeout",
                        Number.parseInt(e.target.value)
                      )
                    }
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                payload.request_url
                  ? "bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-800"
                  : ""
              }
            >
              {payload.request_url ? "Ready" : "Configure URL"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {payload.request_url
                ? `${payload.request_method} ${payload.request_url}`
                : "Enter a URL to get started"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {hasAuth && (
              <Badge variant="outline" className="h-5">
                Auth
              </Badge>
            )}
            {headerRestAPI.filter((h: any) => h.is_enabled).length > 0 && (
              <Badge variant="outline" className="h-5">
                {headerRestAPI.filter((h: any) => h.is_enabled).length} Headers
              </Badge>
            )}
            {hasBody && (
              <Badge variant="outline" className="h-5">
                Body
              </Badge>
            )}
          </div>
        </div>
        {openPopoverTestAPI && (
          <Alert
            variant={isSuccessTestAPI ? "success" : "destructive"}
            className="mt-4"
          >
            {isSuccessTestAPI ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {isSuccessTestAPI ? "Connection Successful" : "Connection Failed"}
            </AlertTitle>
            <AlertDescription>
              {isSuccessTestAPI
                ? `Successfully request to API. Response from server : ${responseMessage}`
                : `Could not request to API. Please check your request. Response from server : ${responseMessage}`}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <ModalSuccess
        openOAuthSuccessDialog={openOAuthSuccessDialog}
        setOpenOAuthSuccessDialog={setOpenOAuthSuccessDialog}
        oauth2Connection={oauth2Connection}
        authRestAPI={authRestAPI}
      />

      <Dialog open={openNewTokenDialog} onOpenChange={setOpenNewTokenDialog}>
        <DialogContent className="max-h-[95vh] overflow-y-auto max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Create New Token
            </DialogTitle>
            <DialogDescription className="text-left">
              Create token credentials required for your knowledge setup.
            </DialogDescription>
          </DialogHeader>
          <section className="space-y-3">
            <hr />

            <div className="grid grid-cols-1 gap-x-4 gap-y-2 items-center">
              <div className="grid gap-y-1">
                <Label>Choose OAuth2 Provider Template</Label>
                <span className="text-sm text-muted-foreground">
                  Pick an OAuth2 template to speed up setup.
                </span>
              </div>
              <div className="col-span-3 grid grid-cols-3 mb-4">
                {OAuth2Provider.map((provider, index) => (
                  <Button
                    key={"provider" + index}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      provider.action();
                    }}
                    className={cn(
                      "border transition-colors duration-200",
                      "w-full rounded-none",
                      selectedProvider === provider.label.toLowerCase()
                        ? "bg-blue-800 text-blue-200 hover:bg-blue-800/90"
                        : "bg-blue-50 hover:bg-blue-50/90 dark:bg-blue-900/20 hover:dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800"
                    )}
                  >
                    {provider.label}
                  </Button>
                ))}
              </div>
            </div>

            {selectedProvider != "" && (
              <>
                <AuthConfigInput
                  label="Token Name"
                  placeholder="e.g. Bearer"
                  value={oauth2?.name}
                  name="name"
                  onChange={(e) =>
                    handleValue(
                      e.target.name,
                      e.target.value,
                      setOAuth2,
                      oauth2
                    )
                  }
                />

                {selectedProvider === "other" && (
                  <AuthConfigInput
                    label="Header Prefix"
                    placeholder="e.g. Bearer"
                    name="headerPrefix"
                    inputType="text"
                    value={oauth2Connection.headerPrefix}
                    onChange={(e) =>
                      handleValue(
                        e.target.name,
                        e.target.value,
                        setOAuth2Connection,
                        oauth2Connection
                      )
                    }
                  />
                )}

                {selectedProvider === "other" && (
                  <AuthConfigInput
                    label="Grant Type"
                    name="grant_type"
                    value={oauth2?.grantType}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleValue("grantType", value, setOAuth2, oauth2);
                    }}
                    placeholder="Available Token"
                    inputType="select"
                    items={[
                      {
                        id: "authCode",
                        value: "authorization_code",
                        label: "Authorization Code",
                      },
                      {
                        id: "authCodePKCE",
                        value: "authorization_code_pkce",
                        label: "Authorization Code (With PKCE)",
                      },
                      {
                        id: "implicit",
                        value: "implicit",
                        label: "Implicit",
                      },
                      {
                        id: "passwordCreds",
                        value: "password_credentials",
                        label: "Password Credentials",
                      },
                      {
                        id: "clientCreds",
                        value: "client_credentials",
                        label: "Client Credentials",
                      },
                    ]}
                  />
                )}

                {selectedProvider === "other" && (
                  <AuthConfigInput
                    label="Callback URL"
                    name="callbackUrl"
                    value={oauth2?.callbackUrl}
                    onChange={(e) =>
                      handleValue(
                        e.target.name,
                        e.target.value,
                        setOAuth2,
                        oauth2
                      )
                    }
                    placeholder="http://your-application.com/registered/callback"
                    inputType="text"
                  />
                )}

                <>
                  <AuthConfigInput
                    label="Auth URL"
                    name="authUrl"
                    value={oauth2?.authUrl}
                    onChange={(e) =>
                      handleValue(
                        e.target.name,
                        e.target.value,
                        setOAuth2,
                        oauth2
                      )
                    }
                    placeholder="https://example.com/login/oauth/authorize"
                    inputType="text"
                  />

                  <div className="grid gap-x-4 lg:grid-cols-4">
                    <div className="lg:col-span-3 lg:col-start-2">
                      <Table className="border rounded-md">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-2/5 border">Key</TableHead>
                            <TableHead className="w-2/5 border">
                              Value
                            </TableHead>
                            <TableHead className="w-1/5 border">
                              Action
                            </TableHead>
                          </TableRow>
                        </TableHeader>

                        <TableBody>
                          {oauth2?.authRequest?.map(
                            (parameter: DataRequestRestApi, index: number) => {
                              return (
                                <TableRow key={`authRequest-${index}`}>
                                  <TableCell className="border">
                                    <Input
                                      placeholder="Key"
                                      value={parameter.key}
                                      name="key"
                                      id={parameter.id}
                                      onChange={(e) => {
                                        const updatedAuthRequest =
                                          oauth2.authRequest?.map((p) =>
                                            p.id === parameter.id
                                              ? {
                                                  ...p,
                                                  key: e.target.value,
                                                }
                                              : p
                                          );

                                        setOAuth2({
                                          ...oauth2,
                                          authRequest: updatedAuthRequest,
                                        });
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="border">
                                    <Input
                                      placeholder="Value"
                                      name="value"
                                      value={parameter.value}
                                      onChange={(e) => {
                                        const updatedAuthRequest =
                                          oauth2.authRequest?.map((p) => {
                                            return p.id === parameter.id
                                              ? {
                                                  ...p,
                                                  value: e.target.value,
                                                }
                                              : p;
                                          });

                                        setOAuth2({
                                          ...oauth2,
                                          authRequest: updatedAuthRequest,
                                        });
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={parameter.required}
                                      onClick={() => {
                                        const updatedAuthRequest =
                                          oauth2.authRequest?.filter(
                                            (p) => p.id !== parameter.id
                                          );

                                        setOAuth2({
                                          ...oauth2,
                                          authRequest: updatedAuthRequest,
                                        });
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            }
                          )}

                          <TableRow>
                            <TableCell colSpan={3}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setOAuth2({
                                    ...oauth2,
                                    authRequest: [
                                      ...(oauth2.authRequest || []),
                                      {
                                        id: generateUUID(),
                                        key: "",
                                        value: "",
                                      },
                                    ],
                                  });
                                }}
                              >
                                Add Request
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>

                <>
                  <AuthConfigInput
                    label="Access Token URL"
                    name="accessTokenUrl"
                    value={oauth2?.accessTokenUrl}
                    onChange={(e) =>
                      handleValue(
                        e.target.name,
                        e.target.value,
                        setOAuth2,
                        oauth2
                      )
                    }
                    placeholder="https://example.com/login/oauth/access_token"
                    inputType="text"
                  />
                  <div className="grid gap-x-4 lg:grid-cols-4">
                    <div className="lg:col-span-3 lg:col-start-2">
                      <Table className="border rounded-md">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-2/11 border">Key</TableHead>
                            <TableHead className="w-4/11 border">
                              Value
                            </TableHead>
                            <TableHead className="w-3/11 border">
                              Send in
                            </TableHead>
                            <TableHead className="w-2/11 border">
                              Action
                            </TableHead>
                          </TableRow>
                        </TableHeader>

                        <TableBody>
                          {oauth2?.tokenRequest?.map(
                            (parameter: DataRequestRestApi) => {
                              return (
                                <TableRow key={`token-request-${parameter.id}`}>
                                  <TableCell className="border">
                                    <Input
                                      placeholder="Key"
                                      value={parameter.key}
                                      name="key"
                                      id={parameter.id}
                                      onChange={(e) => {
                                        const updatedAuthRequest =
                                          oauth2?.tokenRequest?.map((p) =>
                                            p.id === parameter.id
                                              ? {
                                                  ...p,
                                                  key: e.target.value,
                                                }
                                              : p
                                          );

                                        setOAuth2({
                                          ...oauth2,
                                          tokenRequest: updatedAuthRequest,
                                        });
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="border">
                                    <Input
                                      placeholder="Value"
                                      name="value"
                                      value={parameter.value}
                                      onChange={(e) => {
                                        console.log(parameter.id);
                                        const updatedTokenRequest =
                                          oauth2?.tokenRequest?.map((p) => {
                                            console.log(p.id);
                                            return p.id === parameter.id
                                              ? {
                                                  ...p,
                                                  value: e.target.value,
                                                }
                                              : p;
                                          });

                                        setOAuth2({
                                          ...oauth2,
                                          tokenRequest: updatedTokenRequest,
                                        });
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="border">
                                    <Select
                                      value={parameter.send_in}
                                      onValueChange={(e) => {
                                        const updatedTokenRequest =
                                          oauth2?.tokenRequest?.map((p) =>
                                            p.id === parameter.id
                                              ? {
                                                  ...p,
                                                  send_in:
                                                    e as DataRequestRestApi["send_in"],
                                                }
                                              : p
                                          );

                                        setOAuth2({
                                          ...oauth2,
                                          tokenRequest: updatedTokenRequest,
                                        });
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select location" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="inBody">
                                          Request Body
                                        </SelectItem>
                                        <SelectItem value="inQuery">
                                          Request Query
                                        </SelectItem>
                                        <SelectItem value="inHeader">
                                          Request Header
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={parameter.required}
                                      onClick={() => {
                                        const updatedTokenRequest =
                                          oauth2?.tokenRequest?.filter(
                                            (p) => p.id !== parameter.id
                                          );

                                        setOAuth2({
                                          ...oauth2,
                                          tokenRequest: updatedTokenRequest,
                                        });
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            }
                          )}

                          <TableRow>
                            <TableCell colSpan={4}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setOAuth2({
                                    ...oauth2,
                                    tokenRequest: [
                                      ...(oauth2?.tokenRequest || []),
                                      {
                                        id: generateUUID(),
                                        key: "",
                                        value: "",
                                        required: true,
                                      },
                                    ],
                                  });
                                }}
                              >
                                Add Request
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>

                <>
                  <AuthConfigInput
                    label="Refresh Token URL"
                    placeholder="https://example.com/login/oauth/refresh_token"
                    name="refreshUrl"
                    value={oauth2?.refreshUrl}
                    onChange={(e) =>
                      handleValue(
                        e.target.name,
                        e.target.value,
                        setOAuth2,
                        oauth2
                      )
                    }
                  />
                  <div className="grid gap-x-4 lg:grid-cols-4">
                    <div className="lg:col-span-3 lg:col-start-2">
                      <Table className="border rounded-md">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-2/11 border">Key</TableHead>
                            <TableHead className="w-4/11 border">
                              Value
                            </TableHead>
                            <TableHead className="w-3/11 border">
                              Send in
                            </TableHead>
                            <TableHead className="w-2/11 border">
                              Delete
                            </TableHead>
                          </TableRow>
                        </TableHeader>

                        <TableBody>
                          {oauth2?.refreshRequest?.map(
                            (parameter: DataRequestRestApi) => {
                              return (
                                <TableRow
                                  key={`refresh-request-${parameter.id}`}
                                >
                                  <TableCell className="border">
                                    <Input
                                      placeholder="Key"
                                      value={parameter.key}
                                      name="key"
                                      id={parameter.id}
                                      onChange={(e) => {
                                        const updatedRefreshRequest =
                                          oauth2?.refreshRequest?.map((p) =>
                                            p.id === parameter.id
                                              ? {
                                                  ...p,
                                                  key: e.target.value,
                                                }
                                              : p
                                          );

                                        setOAuth2({
                                          ...oauth2,
                                          refreshRequest: updatedRefreshRequest,
                                        });
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="border">
                                    <Input
                                      placeholder="Value"
                                      name="value"
                                      value={parameter.value}
                                      onChange={(e) => {
                                        const updatedRefreshRequest =
                                          oauth2?.refreshRequest?.map((p) =>
                                            p.id === parameter.id
                                              ? {
                                                  ...p,
                                                  value: e.target.value,
                                                }
                                              : p
                                          );

                                        setOAuth2({
                                          ...oauth2,
                                          refreshRequest: updatedRefreshRequest,
                                        });
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="border">
                                    <Select
                                      value={parameter.send_in}
                                      onValueChange={(e) => {
                                        const updatedRefreshRequest =
                                          oauth2?.refreshRequest?.map((p) =>
                                            p.id === parameter.id
                                              ? {
                                                  ...p,
                                                  send_in:
                                                    e as DataRequestRestApi["send_in"],
                                                }
                                              : p
                                          );

                                        setOAuth2({
                                          ...oauth2,
                                          refreshRequest: updatedRefreshRequest,
                                        });
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select location" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="inBody">
                                          Request Body
                                        </SelectItem>
                                        <SelectItem value="inQuery">
                                          Request Query
                                        </SelectItem>
                                        <SelectItem value="inHeader">
                                          Request Header
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="border">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={parameter.required}
                                      onClick={() => {
                                        const updatedRefreshRequest =
                                          oauth2?.refreshRequest?.filter(
                                            (p) => p.id !== parameter.id
                                          );

                                        setOAuth2({
                                          ...oauth2,
                                          refreshRequest: updatedRefreshRequest,
                                        });
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            }
                          )}

                          <TableRow>
                            <TableCell colSpan={4}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setOAuth2({
                                    ...oauth2,
                                    refreshRequest: [
                                      ...(oauth2?.refreshRequest || []),
                                      {
                                        id: generateUUID(),
                                        key: "",
                                        value: "",
                                      },
                                    ],
                                  });
                                }}
                              >
                                Add Request
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>

                {selectedProvider === "other" && (
                  <AuthConfigInput
                    label="Scope"
                    name="scope"
                    value={oauth2?.scope}
                    onChange={(e) =>
                      handleValue(
                        e.target.name,
                        e.target.value,
                        setOAuth2,
                        oauth2
                      )
                    }
                    placeholder="e.g. read:org"
                    inputType="text"
                  />
                )}

                {selectedProvider === "other" && (
                  <AuthConfigInput
                    label="State"
                    name="state"
                    value={oauth2?.state}
                    onChange={(e) =>
                      handleValue(
                        e.target.name,
                        e.target.value,
                        setOAuth2,
                        oauth2
                      )
                    }
                    placeholder="State"
                    inputType="text"
                  />
                )}

                {selectedProvider === "other" && (
                  <AuthConfigInput
                    label="Client Authentication"
                    name="clientAuth"
                    value={oauth2?.clientAuth}
                    onChange={(e) =>
                      handleValue(
                        e.target.name,
                        e.target.value,
                        setOAuth2,
                        oauth2
                      )
                    }
                    placeholder="Client Authentication"
                    inputType="select"
                    items={[
                      {
                        id: "inHeader",
                        label: "Send as Basic Auth header",
                        value: "inHeader",
                      },
                      {
                        id: "inBody",
                        label: "Send client credentials in body",
                        value: "inBody",
                      },
                    ]}
                  />
                )}

                <div className="grid gap-x-4 lg:grid-cols-4">
                  <Button
                    onClick={handleOAuth2Login}
                    disabled={isOAuth2Loading}
                    className="w-full lg:col-span-4 lg:col-start-2"
                  >
                    {isOAuth2Loading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                        Getting Token...
                      </>
                    ) : (
                      "Get New Access Token"
                    )}
                  </Button>
                </div>
              </>
            )}
          </section>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!dynamicFunctionModal}
        onOpenChange={() => setDynamicFunctionModal("")}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Insert Dynamic Function
            </DialogTitle>
            <DialogDescription className="text-left">
              Insert dynamic function to map request/response fields for your
              knowledge setup.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <section className="space-y-4">
              <div>
                <Label>Dynamic Function</Label>
                <Select
                  value={dynamicFunction}
                  onValueChange={(value) => setDynamicFunction(value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Dynamic Function" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(FUNCTION_LIBRARY).map((name) => (
                      <SelectItem key={name} value={name}>
                        {(FUNCTION_LIBRARY as Record<string, any>)[name]
                          ?.label || "test"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedFunction && (
                <>
                  <div>
                    <Label>Preview</Label>
                    <div className="p-2 border rounded-md text-gray-500 text-sm break-words">
                      <p>{selectedFunction?.preview || ""}</p>
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <div className="p-2 border rounded-md text-gray-500 text-sm break-words">
                      <p className="whitespace-pre-line">
                        {selectedFunction?.description || ""}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </section>
            {/* <div className="flex items-center gap-x-2 text-gray-400">
              <hr className="w-full" />
              <p>or</p>
              <hr className="w-full" />
            </div>
            <section className="space-y-4">
              <div>
                <Label>Dynamic Variable</Label>
                <Select
                  value={dynamicFunction}
                  onValueChange={(value) => setDynamicFunction(value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Dynamic Function" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(FUNCTION_LIBRARY).map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedFunction && (
                <div>
                  <Label>Preview</Label>
                  <Textarea
                    value={selectedFunction?.preview || ""}
                    className="w-full h-20 resize-none"
                    disabled
                  />
                </div>
              )}
            </section> */}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                handleParameterRestAPIInput(
                  dynamicFunctionModal,
                  "value",
                  selectedFunction?.preview
                );
                setDynamicFunction("");
                setDynamicFunctionModal("");
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
