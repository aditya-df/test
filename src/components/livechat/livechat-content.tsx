"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  ArrowUpIcon,
  ChevronDownIcon,
  Mic,
  MicOff,
  Monitor,
  PaperclipIcon,
  Settings,
  Video,
  VideoOff,
  X,
  RefreshCw,
  Info,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Textarea } from "../ui/textarea";
import { cn } from "@/utils/utils";
import { modelID, models } from "@/lib/models";
import { StopIcon } from "../chat/icons";
import { Switch } from "../ui/switch";
import { useRouter } from "nextjs-toploader/app";
import { ChatBubble, ChatBubbleMessage } from "../ui/chat/chat-bubble";
import { useMediaManager } from "@/hooks/livechat/use-media-manager";
import { Badge } from "../ui/badge";
import { useChatMode } from "@/hooks/use-chat-mode";
import useWindowSize from "../chat/use-window-size";
import { VRMAvatar } from "./vrm-avatar";
import { BackgroundType } from "./vrm-background";


export const LiveChatContent = ({ agentId, selectedAgentNameProps }: { agentId: string, selectedAgentNameProps: string }) => {
  const router = useRouter();
  const { isLiveChat, setIsLiveChat } = useChatMode();
  const { width } = useWindowSize();
  const isMobile = width ? width < 768 : false;
  const [selectedBackgroundType, setSelectedBackgroundType] = useState<BackgroundType>("custom-image");
  const [backgroundColor1, setBackgroundColor1] = useState<string>("#0f172a");
  const [backgroundColor2, setBackgroundColor2] = useState<string>("#334155");
  const [useThemeColors, setUseThemeColors] = useState<boolean>(true);

  const [currentThemeIsDark, setCurrentThemeIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme'); // Use your actual storage key
      if (storedTheme === 'dark') return true;
      if (storedTheme === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [customImagePath, setCustomImagePath] = useState<string>("/images/mii_company.png");
  const [showCustomImageInput, setShowCustomImageInput] = useState<boolean>(false);
  // Lazy load the media manager to avoid ONNX runtime warnings on initial render
  const [mediaManagerLoaded, setMediaManagerLoaded] = useState(false);
  const {
    isMic,
    micDevice,
    isCamera,
    isShareScreen,
    setIsShareScreen,
    isModalDeviceCameraOpen,
    setupComplete,
    cameraDevice,
    videoRef,
    canvasRef,
    setIsMic,
    setIsCamera,
    handleDeviceChange,
    setIsModalDeviceCameraOpen,
    userSpeaking,
    micError,
    micStatus,
    toggle,
    isWebSocketConnected,
    connectionError,
    isConnecting,
    responses,
    sendTextMessage,
    retryConnection,
    aiSpeaking,
    currentAudioData,
    updateVrmModelPath
  } = useMediaManager({ agentId });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedModelId, setSelectedModelId] = useState<modelID>(
    "gemini-2.0-flash-exp"
  );
  const [isChatPanel, setIsChatPanel] = useState(false);
  const [message, setMessage] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("Initializing...");
  const [micEnabled, setMicEnabled] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { text: string; isUser: boolean }[]
  >([]);
  const [selectedVrmModel, setSelectedVrmModel] = useState<string>("/models/female-model-avatar.vrm");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [vrmKey, setVrmKey] = useState<number>(0);

  const vrmModels = {
    "/models/male-model-avatar.vrm": "Male Avatar",
    "/models/female-model-avatar.vrm": "Female Avatar"
  };

  const handleModelPathChange = (modelPath: string) => {
    setSelectedVrmModel(modelPath);
    if (mediaManagerLoaded && updateVrmModelPath) {
      updateVrmModelPath(modelPath);
    }
  };

  // ADD: Handle manual VRM model selection
  const handleVrmModelSelection = (modelPath: string) => {
    setSelectedVrmModel(modelPath);
    setVrmKey(prev => prev + 1); // CRITICAL: Force component re-render
    handleModelPathChange(modelPath);
  };

  // Delay VAD initialization to reduce warnings
  useEffect(() => {
    const timer = setTimeout(() => {
      setMediaManagerLoaded(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Update connection status based on WebSocket and setup state
  useEffect(() => {
    if (connectionError) {
      setConnectionStatus(`Connection error: ${connectionError}`);
      setShowStatusDialog(true);
    } else if (isConnecting) {
      setConnectionStatus("Connecting to server...");
      setShowStatusDialog(true);
    } else if (setupComplete) {
      setConnectionStatus("Ready to chat");
      // Auto-hide the dialog after 3 seconds when connected successfully
      const timer = setTimeout(() => {
        setShowStatusDialog(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else if (isWebSocketConnected) {
      setConnectionStatus("Connected, waiting for setup...");
      setShowStatusDialog(true);
    } else {
      setConnectionStatus("Initializing...");
      setShowStatusDialog(true);
    }
  }, [setupComplete, isWebSocketConnected, connectionError, isConnecting]);

  // Keep local mic state in sync with the VAD state
  useEffect(() => {
    setMicEnabled(isMic);
  }, [isMic]);

  // Update chat messages when responses change
  useEffect(() => {
    if (responses.length > 0) {
      const lastResponse = responses[responses.length - 1];
      setChatMessages((prev) => [
        ...prev,
        { text: lastResponse, isUser: false },
      ]);
      setIsLoading(false);
    }
  }, [responses]);

  useEffect(() => {
    const checkTheme = () => {
      if (typeof window !== 'undefined') {
        const storedTheme = localStorage.getItem('ui-theme'); // Use your actual storage key
        if (storedTheme === 'dark') setCurrentThemeIsDark(true);
        else if (storedTheme === 'light') setCurrentThemeIsDark(false);
        else setCurrentThemeIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    };

    checkTheme();

    // Listen for storage events (theme changes in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ui-theme') { // Use your actual storage key
        checkTheme();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatPanel]);

  const handleSendMessage = () => {
    if (message.trim()) {
      // Add user message to chat
      setChatMessages((prev) => [...prev, { text: message, isUser: true }]);

      // Send message to Gemini API
      const success = sendTextMessage(message);

      if (success) {
        setMessage("");
        setIsLoading(true);
        setIsChatPanel(true); // Open chat panel when sending a message

        // Set a timeout to handle cases where no response is received
        setTimeout(() => {
          setIsLoading(false);
        }, 10000);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle microphone toggle with error prevention
  const handleMicToggle = () => {
    if (!mediaManagerLoaded || !isWebSocketConnected || micStatus?.loading) {
      return;
    }

    try {
      setMicEnabled(!micEnabled);

      // Use a timeout to ensure UI updates before potentially heavy operations
      setTimeout(() => {
        toggle();
      }, 10);
    } catch (error) {
      console.error("Error toggling microphone:", error);
      // If there's an error, reset the UI state to match the actual state
      setMicEnabled(isMic);
    }
  };

  // Function to manually retry connection
  const handleRetryConnection = () => {
    setConnectionStatus("Retrying connection...");
    retryConnection();
  };

  // Handle camera toggle
  const handleCameraToggle = () => {
    if (!mediaManagerLoaded || !isWebSocketConnected) {
      return;
    }
    setIsCamera(!isCamera);
  };

  // Handle screen sharing toggle
  const handleScreenToggle = () => {
    if (!mediaManagerLoaded || !isWebSocketConnected) {
      return;
    }
    setIsShareScreen(!isShareScreen);
  };

  // Handle file upload
  const handleFileUpload = (file: File) => {
    if (!file) return;

    // Check if file is an image
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target?.result?.toString().split(",")[1];
        if (base64Data) {
          // Send image to Gemini API
          setChatMessages((prev) => [
            ...prev,
            {
              text: `[Uploaded image: ${file.name}]`,
              isUser: true,
            },
          ]);
          setIsChatPanel(true); // Open chat panel when sending an image
          // TODO: Add image sending functionality
        }
      };
      reader.readAsDataURL(file);
    } else {
      // For now, just show a message that non-image files aren't supported
      alert("Only image files are supported at this time.");
    }
  };

  const handleLiveChatToggle = useCallback(() => {
    setIsLiveChat(!isLiveChat);

    // Create URL params object to preserve query parameters
    const params = new URLSearchParams();

    // Add agent ID if available
    if (agentId) {
      params.append('agentId', agentId);
    }

    // Add agent name if available
    if (selectedAgentNameProps) {
      params.append('selectedAgentNameProps', selectedAgentNameProps);
    }

    // Build the URL with query parameters
    const queryString = params.toString();
    const destination = !isLiveChat
      ? `/livechat${queryString ? `?${queryString}` : ''}`
      : `/chatbot${queryString ? `?${queryString}` : ''}`;

    router.push(destination);
  }, [isLiveChat, setIsLiveChat, agentId, selectedAgentNameProps, router]);

  console.log("selectedAgentNameProps in livechat-content", selectedAgentNameProps)

  return (
    <div className="flex flex-col h-screen bg-black relative overflow-hidden">
      {/* Main video area */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Status indicator - Compact version */}
        {!showStatusDialog && isWebSocketConnected && setupComplete && (
          <div
            className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 cursor-pointer hover:bg-black/70 transition-colors"
            onClick={() => setShowStatusDialog(true)}
          >
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-white text-xs">Connected</span>
          </div>
        )}

        {/* Status dialog - Expanded version */}
        {showStatusDialog && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-black/70 backdrop-blur-md rounded-xl p-6 w-80 text-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Connection Status</h3>
              {isWebSocketConnected && setupComplete && (
                <button
                  className="text-gray-400 hover:text-white"
                  onClick={() => setShowStatusDialog(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {isWebSocketConnected ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium">WebSocket</p>
                  <p className="text-sm text-gray-300">
                    {isWebSocketConnected ? "Connected" : "Disconnected"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {setupComplete ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Info className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <p className="font-medium">Setup</p>
                  <p className="text-sm text-gray-300">
                    {setupComplete ? "Complete" : "Pending"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {micEnabled ? (
                  <Mic className="h-5 w-5 text-green-500" />
                ) : (
                  <MicOff className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <p className="font-medium">Microphone</p>
                  <p className="text-sm text-gray-300">
                    {micEnabled ? "Enabled" : "Disabled"}
                    {userSpeaking && micEnabled && " (Speaking)"}
                  </p>
                </div>
              </div>

              <p className="text-sm text-center mt-2">{connectionStatus}</p>

              {connectionError && (
                <div className="p-2 bg-red-900/50 rounded-md text-sm">
                  {connectionError}
                </div>
              )}

              {!isWebSocketConnected && !isConnecting && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 bg-white/10 hover:bg-white/20 border-white/20"
                  onClick={handleRetryConnection}
                >
                  <RefreshCw className="h-4 w-4 mr-1" /> Retry Connection
                </Button>
              )}

              {isConnecting && (
                <div className="flex justify-center">
                  <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main video grid */}
        <div className="grid grid-cols-1 gap-4 p-4 w-full h-full">
          {/* AI Assistant video placeholder */}
          <div className="bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center relative">
            <div className="relative w-full h-full flex flex-col items-center">
              <h3 className="text-xl font-medium text-white absolute top-4 z-10">
                AI Assistant
              </h3>

              {/* VRM Avatar */}
              <VRMAvatar
                key={vrmKey}
                isSpeaking={aiSpeaking}
                audioData={currentAudioData || undefined}
                className="w-full h-full"
                backgroundType={selectedBackgroundType}
                backgroundColor1={backgroundColor1}
                backgroundColor2={backgroundColor2}
                useThemeColors={useThemeColors}
                themeStorageKey="theme"
                customImagePath={customImagePath}
                vrmModelPath={selectedVrmModel} // KEEP: This is now valid
                onModelPathChange={handleModelPathChange} // KEEP: This is now valid
                logoScale={0.7} // Slightly smaller than default
                logoOpacity={0.85}
                logoPosition={[0, 0, -8]} // Move it closer to the camera
                blendWithBackground={true} // Show the gradient behind the logo
              />

              {/* Speaking indicator */}
              {userSpeaking && micEnabled && (
                <div className="absolute bottom-4 left-4 bg-black/50 text-green-400 text-sm flex items-center justify-center gap-1 px-2 py-1 rounded-md">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  You are speaking
                </div>
              )}

              {/* AI speaking indicator */}
              {aiSpeaking && (
                <div className="absolute bottom-4 right-4 bg-black/50 text-blue-400 text-sm flex items-center justify-center gap-1 px-2 py-1 rounded-md">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  AI is speaking
                </div>
              )}
            </div>

            {/* User video */}
            {isCamera && (
              <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                ></video>
                <div className="absolute bottom-2 left-2 text-xs bg-black/70 text-white px-2 py-0.5 rounded-md">
                  You
                </div>
              </div>
            )}

            {/* Screen share */}
            {isShareScreen && (
              <div className="absolute inset-0 bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="w-full h-full object-contain"
                ></video>
                <div className="absolute top-2 left-2 text-xs bg-black/70 text-white px-2 py-0.5 rounded-md">
                  Screen Share
                </div>
              </div>
            )}

            <canvas id="canvas" className="hidden" ref={canvasRef}></canvas>
          </div>
        </div>
      </div>

      {/* Chat panel - Slide in from right */}
      <div
        className={cn(
          "absolute top-0 right-0 h-full bg-white w-80 transition-transform duration-300 ease-in-out transform z-10",
          isChatPanel ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-3 border-b flex justify-between items-center">
            <h3 className="font-medium">Chat</h3>
            <button onClick={() => setIsChatPanel(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {chatMessages.length > 0 ? (
              <div className="space-y-4">
                {chatMessages.map((msg, index) => (
                  <ChatBubble
                    key={index}
                    variant={msg.isUser ? "sent" : "received"}
                  >
                    <ChatBubbleMessage
                      variant={msg.isUser ? "sent" : "received"}
                      className="max-w-[90%]"
                    >
                      {msg.text}
                    </ChatBubbleMessage>
                  </ChatBubble>
                ))}
                {isLoading && (
                  <ChatBubble variant="received">
                    <ChatBubbleMessage
                      variant="received"
                      className="max-w-[90%]"
                    >
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </ChatBubbleMessage>
                  </ChatBubble>
                )}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <p>No messages yet. Start a conversation!</p>
              </div>
            )}
          </div>

          <div className="p-3 border-t">
            <div className="relative">
              <Textarea
                placeholder="Send a message..."
                className="min-h-[80px] resize-none rounded-md text-sm border-gray-200"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!isWebSocketConnected}
              />

              <div className="absolute right-2 bottom-2 flex items-center gap-2">
                <button
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isWebSocketConnected}
                >
                  <PaperclipIcon className="h-4 w-4" />
                </button>

                <button
                  className={cn(
                    "rounded-full h-7 w-7 flex items-center justify-center",
                    message.trim() || isLoading
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-gray-200 text-gray-400"
                  )}
                  onClick={
                    isLoading ? () => setIsLoading(false) : handleSendMessage
                  }
                  disabled={
                    !isWebSocketConnected || (!message.trim() && !isLoading)
                  }
                >
                  {isLoading ? (
                    <StopIcon size={14} />
                  ) : (
                    <ArrowUpIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat toggle button */}
      <button
        className={cn(
          "absolute top-4 right-4 z-20 bg-white/10 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/20 transition-colors",
          isChatPanel && "hidden"
        )}
        onClick={() => setIsChatPanel(true)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        {chatMessages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {chatMessages.length}
          </span>
        )}
      </button>

      {/* Bottom control bar */}
      <div className="bg-black/50 backdrop-blur-sm py-4 px-3 md:px-6">
        <div className="flex flex-wrap md:flex-nowrap justify-between items-center gap-3">
          <button
            type="button"
            className={cn(
              "relative flex items-center gap-3 px-3 py-2 rounded-full transition-all duration-300 text-sm font-medium"
            )}
            onClick={handleLiveChatToggle}
          >
            {/* Toggle Track */}
            <div
              className={cn(
                "relative w-10 h-5 rounded-full transition-colors duration-300",
                isLiveChat ? "bg-blue-500" : "bg-zinc-300 dark:bg-zinc-600"
              )}
            >
              {/* Toggle Knob with Sliding Animation */}
              <div
                className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 flex items-center justify-center",
                  isLiveChat ? "left-[calc(100%-18px)]" : "left-0.5"
                )}
              >
                {isLiveChat && (
                  <div className="text-blue-500 animate-fadeIn">
                    <Video size={10} />
                  </div>
                )}
              </div>
            </div>

            {/* Label - Hidden on mobile */}
            {!isMobile && (
              <span
                className={cn(
                  "transition-colors duration-300",
                  "text-sm",
                  isLiveChat
                    ? "text-blue-800 dark:text-blue-200"
                    : "text-zinc-700 dark:text-zinc-300"
                )}
              >
                Live Chat
              </span>
            )}
          </button>

          {/* Center controls */}
          <div className="flex items-center justify-center flex-wrap md:flex-nowrap gap-2 md:space-x-3 w-full md:w-auto order-3 md:order-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={micEnabled ? "default" : "outline"}
                    size="icon"
                    className={cn(
                      "rounded-full h-10 w-10 md:h-12 md:w-12 bg-opacity-80",
                      micEnabled
                        ? "bg-gray-700 hover:bg-gray-600"
                        : "bg-red-500 hover:bg-red-600 border-none",
                      userSpeaking && micEnabled && "ring-2 ring-green-400"
                    )}
                    onClick={handleMicToggle}
                    disabled={
                      !mediaManagerLoaded ||
                      !isWebSocketConnected ||
                      micStatus?.loading
                    }
                  >
                    {micEnabled ? (
                      <Mic className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    ) : (
                      <MicOff className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{micEnabled ? "Mute" : "Unmute"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isCamera ? "default" : "outline"}
                    size="icon"
                    className={cn(
                      "rounded-full h-10 w-10 md:h-12 md:w-12 bg-opacity-80",
                      isCamera
                        ? "bg-gray-700 hover:bg-gray-600"
                        : "bg-red-500 hover:bg-red-600 border-none"
                    )}
                    onClick={handleCameraToggle}
                    disabled={!mediaManagerLoaded || !isWebSocketConnected}
                  >
                    {isCamera ? (
                      <Video className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    ) : (
                      <VideoOff className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isCamera ? "Stop Video" : "Start Video"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isShareScreen ? "default" : "outline"}
                    size="icon"
                    className={cn(
                      "rounded-full h-10 w-10 md:h-12 md:w-12",
                      isShareScreen
                        ? "bg-green-600 hover:bg-green-700 border-none"
                        : "bg-gray-700 hover:bg-gray-600 border-none"
                    )}
                    onClick={handleScreenToggle}
                    disabled={!mediaManagerLoaded || !isWebSocketConnected}
                  >
                    <Monitor className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isShareScreen ? "Stop Sharing" : "Share Screen"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full h-10 w-10 md:h-12 md:w-12 bg-gray-700 hover:bg-gray-600 border-none"
                    onClick={() => setIsSettingsOpen(true)}
                  >
                    <Settings className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Right side controls */}
          <div className="flex items-center order-2 md:order-3">
            <div className="relative">
              <div className="flex items-center gap-1 bg-gray-700 px-2 py-1 md:px-3 md:py-1.5 rounded-md text-white text-xs md:text-sm cursor-pointer">
                <span>{models[selectedModelId as keyof typeof models]}</span>
                <ChevronDownIcon className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
              </div>
              <select
                className="absolute inset-0 opacity-0 cursor-pointer"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value as modelID)}
              >
                {Object.entries(models).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Settings modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Configure your audio, video, and background preferences.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="audio" className="mt-4">
            <TabsList className="grid grid-cols-5">
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="video">Video</TabsTrigger>
              <TabsTrigger value="avatar">Avatar</TabsTrigger>
              <TabsTrigger value="background">Background</TabsTrigger>
              <TabsTrigger value="connection">Status</TabsTrigger>
            </TabsList>

            {/* Audio Settings Tab */}
            <TabsContent value="audio" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Microphone Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {micEnabled ? (
                        <Mic className="h-4 w-4 text-green-500" />
                      ) : (
                        <MicOff className="h-4 w-4 text-gray-400" />
                      )}
                      <Label htmlFor="mic-toggle">Microphone</Label>
                      {userSpeaking && micEnabled && (
                        <Badge className="ml-2 bg-green-100 text-green-800">
                          Voice detected
                        </Badge>
                      )}
                    </div>
                    <Switch
                      id="mic-toggle"
                      checked={micEnabled}
                      onCheckedChange={(checked) => {
                        setMicEnabled(checked);
                        setTimeout(() => {
                          setIsMic(checked);
                        }, 10);
                      }}
                      disabled={!isWebSocketConnected || micStatus?.loading}
                    />
                  </div>

                  {micError && (
                    <div className="mt-2 p-2 rounded-md bg-red-50 text-xs text-red-500">
                      {micError}
                    </div>
                  )}

                  {micDevice.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-sm text-gray-500 mb-1.5 block">
                        Microphone Device
                      </Label>
                      <Select
                        disabled={!micEnabled}
                        onValueChange={(value) => handleDeviceChange(value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select microphone" />
                        </SelectTrigger>
                        <SelectContent>
                          {micDevice.map((device: MediaDeviceInfo) => (
                            <SelectItem key={device.deviceId} value={device.deviceId}>
                              {device.label || `Mic ${device.deviceId.substring(0, 5)}...`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Model Selection</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={selectedModelId}
                    onValueChange={(value) => setSelectedModelId(value as modelID)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(models).map(([id, name]) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Video Settings Tab */}
            <TabsContent value="video" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Camera Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {isCamera ? (
                        <Video className="h-4 w-4 text-green-500" />
                      ) : (
                        <VideoOff className="h-4 w-4 text-gray-400" />
                      )}
                      <Label htmlFor="camera-toggle">Camera</Label>
                    </div>
                    <Switch
                      id="camera-toggle"
                      checked={isCamera}
                      onCheckedChange={(checked) => setIsCamera(checked)}
                      disabled={!isWebSocketConnected}
                    />
                  </div>

                  {cameraDevice.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-sm text-gray-500 mb-1.5 block">
                        Camera Device
                      </Label>
                      <Select
                        disabled={!isCamera}
                        onValueChange={(value) => handleDeviceChange(value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select camera" />
                        </SelectTrigger>
                        <SelectContent>
                          {cameraDevice.map((device: MediaDeviceInfo) => (
                            <SelectItem key={device.deviceId} value={device.deviceId}>
                              {device.label || `Camera ${device.deviceId.substring(0, 5)}...`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Screen Sharing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Monitor className={`h-4 w-4 ${isShareScreen ? "text-green-500" : "text-gray-400"}`} />
                      <Label htmlFor="screen-toggle">Share Screen</Label>
                    </div>
                    <Switch
                      id="screen-toggle"
                      checked={isShareScreen}
                      onCheckedChange={(checked) => setIsShareScreen(checked)}
                      disabled={!isWebSocketConnected}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ADD: Avatar Settings Tab */}
            <TabsContent value="avatar" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">VRM Avatar Model</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-gray-500 mb-2 block">
                        Select Avatar Model
                      </Label>
                      <Select
                        value={selectedVrmModel}
                        onValueChange={handleVrmModelSelection}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select avatar model" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(vrmModels).map(([path, name]) => (
                            <SelectItem key={path} value={path}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Avatar model info */}
                    <div className="p-3 rounded-md bg-muted">
                      <p className="text-sm text-muted-foreground mb-1">
                        Current Model: <span className="font-medium">{vrmModels[selectedVrmModel as keyof typeof vrmModels]}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Voice will automatically match the selected avatar gender.
                      </p>
                    </div>

                    {/* Avatar animation settings */}
                    <div className="space-y-3">
                      <Label className="text-sm text-gray-500">Animation Settings</Label>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="half-body-toggle" className="text-sm">
                          Half Body View
                        </Label>
                        <Switch
                          id="half-body-toggle"
                          checked={true} // Currently always true based on your implementation
                          disabled={true} // Disable since it's not configurable yet
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="rotation-toggle" className="text-sm">
                          Allow Rotation
                        </Label>
                        <Switch
                          id="rotation-toggle"
                          checked={false} // Currently always false based on your implementation
                          disabled={true} // Disable since it's not configurable yet
                        />
                      </div>
                    </div>

                    {/* Voice mapping info */}
                    <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start space-x-2">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-900 dark:text-blue-100">
                            Voice Mapping
                          </p>
                          <p className="text-blue-700 dark:text-blue-300 mt-1">
                            • Male Avatar → Achird voice (Indonesian)<br />
                            • Female Avatar → Aoede voice (Indonesian)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Background Settings Tab */}
            <TabsContent value="background" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Background Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={selectedBackgroundType}
                    onValueChange={(value) => {
                      setSelectedBackgroundType(value as BackgroundType);
                      // Show custom image input field when custom-image is selected
                      setShowCustomImageInput(value === "custom-image");
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select background type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom-image">Company Logo</SelectItem>
                      <SelectItem value="gradient">Gradient</SelectItem>
                      <SelectItem value="stars">Stars</SelectItem>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Show custom image input when custom-image is selected */}
                  {showCustomImageInput && (
                    <div className="mt-4 space-y-1.5">
                      <Label className="text-sm text-gray-500">Image Path</Label>
                      <Input
                        type="text"
                        value={customImagePath}
                        onChange={(e) => setCustomImagePath(e.target.value)}
                        placeholder="/images/mii_company.png"
                        className="flex-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Path to the image file in the public folder
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <Label htmlFor="theme-toggle" className="text-sm text-gray-500">
                      Use Theme Colors
                    </Label>
                    <Switch
                      id="theme-toggle"
                      checked={useThemeColors}
                      onCheckedChange={setUseThemeColors}
                    />
                  </div>

                  {!useThemeColors && selectedBackgroundType === "gradient" && (
                    <div className="mt-4 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm text-gray-500">Top Color</Label>
                        <div className="flex gap-2">
                          <div className="flex-shrink-0">
                            <Input
                              type="color"
                              value={backgroundColor1}
                              onChange={(e) => setBackgroundColor1(e.target.value)}
                              className="p-1 h-9 w-9 bg-transparent"
                            />
                          </div>
                          <Input
                            type="text"
                            value={backgroundColor1}
                            onChange={(e) => setBackgroundColor1(e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm text-gray-500">Bottom Color</Label>
                        <div className="flex gap-2">
                          <div className="flex-shrink-0">
                            <Input
                              type="color"
                              value={backgroundColor2}
                              onChange={(e) => setBackgroundColor2(e.target.value)}
                              className="p-1 h-9 w-9 bg-transparent"
                            />
                          </div>
                          <Input
                            type="text"
                            value={backgroundColor2}
                            onChange={(e) => setBackgroundColor2(e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {useThemeColors && selectedBackgroundType !== "custom-image" && (
                    <div className="mt-4 p-3 rounded-md bg-muted text-sm text-muted-foreground">
                      <p>Using theme-aware colors that adapt to light/dark mode.</p>
                      <div className="mt-2 flex gap-2">
                        <span className="px-3 py-1 text-xs rounded bg-gradient-to-b from-blue-50 to-blue-200 dark:from-slate-900 dark:to-slate-700">
                          {currentThemeIsDark ? "Dark Theme" : "Light Theme"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Preview for custom image */}
                  {selectedBackgroundType === "custom-image" && (
                    <div className="mt-4 p-3 rounded-md bg-muted">
                      <p className="text-sm text-muted-foreground mb-2">Image Preview:</p>
                      <div className="relative w-full h-24 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                        <img
                          src={customImagePath}
                          alt="Background Preview"
                          className="object-contain w-full h-full"
                          onError={(e) => {
                            // Set a fallback or error state
                            e.currentTarget.src = "/placeholder-image.png";
                            e.currentTarget.classList.add("opacity-50");
                          }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Connection Status Tab */}
            <TabsContent value="connection" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Connection Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center space-x-2">
                        {isWebSocketConnected ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span>WebSocket</span>
                      </div>
                      <Badge variant={isWebSocketConnected ? "outline" : "destructive"} className={isWebSocketConnected ? "bg-green-100 text-green-800" : ""}>
                        {isWebSocketConnected ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center space-x-2">
                        {setupComplete ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Info className="h-4 w-4 text-amber-500" />
                        )}
                        <span>Setup</span>
                      </div>
                      <Badge variant="outline" className={setupComplete ? "bg-green-100 text-green-800" : ""}>
                        {setupComplete ? "Complete" : "Pending"}
                      </Badge>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center space-x-2">
                        {micEnabled ? (
                          <Mic className="h-4 w-4 text-green-500" />
                        ) : (
                          <MicOff className="h-4 w-4 text-gray-400" />
                        )}
                        <span>Microphone</span>
                      </div>
                      <Badge variant="outline" className={micEnabled ? "bg-green-100 text-green-800" : ""}>
                        {micEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>

                  {connectionError && (
                    <div className="p-3 rounded-md bg-red-50 text-sm text-red-700">
                      {connectionError}
                    </div>
                  )}

                  {!isWebSocketConnected && !isConnecting && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleRetryConnection}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" /> Retry Connection
                    </Button>
                  )}

                  {isConnecting && (
                    <div className="flex justify-center">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button onClick={() => setIsSettingsOpen(false)}>
              Close Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera device selection modal */}
      {isModalDeviceCameraOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Select Camera</h3>
              <button onClick={() => setIsModalDeviceCameraOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {cameraDevice.length > 0 ? (
                <select
                  className="w-full p-2 border rounded"
                  onChange={(e) => handleDeviceChange(e.target.value)}
                >
                  {cameraDevice.map((device: MediaDeviceInfo) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label ||
                        `Camera ${device.deviceId.substring(0, 5)}...`}
                    </option>
                  ))}
                </select>
              ) : (
                <p>No camera devices found.</p>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsModalDeviceCameraOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => setIsModalDeviceCameraOpen(false)}>
                  Select
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            handleFileUpload(file);
            e.target.value = "";
          }
        }}
      />
    </div>
  );
};
