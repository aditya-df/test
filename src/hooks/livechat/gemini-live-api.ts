// Removed useAuthStore import to fix React hook usage in class

interface ServerContent {
  turnComplete?: boolean;
  modelTurn?: {
    parts?: Array<{
      text?: string;
      inlineData?: {
        data: string;
      };
    }>;
  };
}

interface GeminiResponseData {
  serverContent?: ServerContent;
  setupComplete?: boolean;
}

class GeminiLiveResponseMessage {
  data: string;
  type: string;
  endOfTurn: boolean | undefined;

  constructor(data: GeminiResponseData) {
    this.data = "";
    this.type = "";
    this.endOfTurn = data?.serverContent?.turnComplete;

    const parts = data?.serverContent?.modelTurn?.parts;

    if (data?.setupComplete) {
      this.type = "SETUP COMPLETE";
    } else if (parts?.length && parts[0].text) {
      this.data = parts[0].text;
      this.type = "TEXT";
    } else if (parts?.length && parts[0].inlineData) {
      this.data = parts[0].inlineData.data;
      this.type = "AUDIO";
    }
  }
}

interface PrebuiltVoiceConfig {
  voice_name: string;
}

interface VoiceConfig {
  prebuilt_voice_config: PrebuiltVoiceConfig;
}

interface GeminiSetupMessage {
  bearer_token: string;
  service_url: string;
}

interface SpeechConfig {
  voice_config: VoiceConfig;
  language_code: string;
}

interface GeminiSessionSetupMessage {
  setup: {
    model: string;
    generation_config: {
      response_modalities: string[];
      speech_config?: SpeechConfig;
    };
    system_instruction: {
      parts: Array<{ text: string }>;
    };
  };
}

interface GeminiTextMessage {
  client_content: {
    turns: Array<{
      role: string;
      parts: Array<{ text: string }>;
    }>;
    turn_complete: boolean;
  };
}

interface GeminiRealtimeInputMessage {
  realtime_input: {
    media_chunks: Array<{
      mime_type: string;
      data: string;
    }>;
  };
}

type GeminiMessage =
  | GeminiSetupMessage
  | GeminiSessionSetupMessage
  | GeminiTextMessage
  | GeminiRealtimeInputMessage;

class GeminiLiveAPI {
  proxyUrl: string;
  projectId: string;
  model: string;
  modelUri: string;
  responseModalities: string[];
  systemInstructions: Promise<string>;
  apiHost: string;
  serviceUrl: string;
  accessToken: string;
  webSocket: WebSocket | null;
  onReceiveResponse: (message: GeminiLiveResponseMessage) => void;
  onConnectionStarted: () => void;
  onErrorMessage: (message: string) => void;
  currentVrmModelPath: string;
  private isConnected: boolean = false; // ADD THIS LINE
  agentId: string;

  constructor(
    proxyUrl: string,
    projectId: string,
    model: string,
    apiHost: string,
    agentId: string,
    backendToken?: string
  ) {
    this.proxyUrl = proxyUrl;

    this.projectId = projectId;
    this.model = model;
    this.modelUri = `projects/${this.projectId}/locations/us-central1/publishers/google/models/${this.model}`;

    this.responseModalities = ["AUDIO"];

    this.apiHost = apiHost;
    this.serviceUrl = `wss://${this.apiHost}/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;

    this.onReceiveResponse = (message: GeminiLiveResponseMessage) => {
      console.log("Default message received callback", message);
    };

    this.onConnectionStarted = () => {
      console.log("Default onConnectionStarted");
    };

    this.onErrorMessage = (message: string) => {
      alert(message);
    };

    this.accessToken = "";
    this.webSocket = null;
    this.currentVrmModelPath = "/models/female-model-avatar.vrm";
    this.agentId = agentId;
    console.log("GeminiLiveAPI agentId: ", this.agentId);
    this.systemInstructions = this.initializeAgentInstructions(this.agentId, backendToken);

    console.log("Created Gemini Live API object: ", this);
  }

  async initializeAgentInstructions(agentId: string, backendToken?: string): Promise<string> {
    console.log("Initializing agent instructions for agent ID:", agentId);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL_V2}/agent/${agentId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(backendToken && { "Authorization": `Bearer ${backendToken}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("data: ", data);

      const systemInstruction = data.data?.systemInstruction;

      this.systemInstructions = systemInstruction;
      console.log("System instructions initialized:", this.systemInstructions);

      return systemInstruction;
    } catch (error) {
      console.error("Failed to initialize agent instructions:", error);
      return "";
    }
  }

  setProjectId(projectId: string): void {
    this.projectId = projectId;
    this.modelUri = `projects/${this.projectId}/locations/us-central1/publishers/google/models/${this.model}`;
  }

  setAccessToken(newAccessToken: string): void {
    console.log("setting access token: ", newAccessToken);
    this.accessToken = newAccessToken;
  }

  // REPLACE YOUR EXISTING setVrmModelPath WITH THIS:
  setVrmModelPath(vrmModelPath: string): void {
    console.log("Setting VRM model path: ", vrmModelPath);
    const previousPath = this.currentVrmModelPath;
    this.currentVrmModelPath = vrmModelPath;

    // Update voice if connected and model changed
    if (this.isConnected && previousPath !== vrmModelPath) {
      this.updateVoiceConfiguration();
    }
  }

  private getVoiceForModel(): string {
    // Check if the model path contains "female"
    if (this.currentVrmModelPath.toLowerCase().includes("female")) {
      return "Aoede"; // Female voice
    } else {
      return "Achird"; // Male voice (default)
    }
  }

  // ADD THIS NEW METHOD AFTER getVoiceForModel():
  private async updateVoiceConfiguration(): Promise<void> {
    if (
      !this.isConnected ||
      !this.webSocket ||
      this.webSocket.readyState !== WebSocket.OPEN
    ) {
      console.warn("Cannot update voice configuration: not connected");
      return;
    }

    this.disconnect();

    const selectedVoice = this.getVoiceForModel();
    console.log("Updating voice configuration to:", selectedVoice);

    const sessionSetupMessage: GeminiSessionSetupMessage = {
      setup: {
        model: this.modelUri,
        generation_config: {
          response_modalities: this.responseModalities,
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: selectedVoice,
              },
            },
            language_code: "id-ID",
          },
        },
        system_instruction: {
          parts: [{ text: await this.systemInstructions }],
        },
      },
    };

    this.connect(this.accessToken, sessionSetupMessage);
    // this.sendMessage(sessionSetupMessage);
  }
  connect(accessToken: string, config: any): void {
    this.setAccessToken(accessToken);
    this.setupWebSocketToService(config);
  }

  disconnect(): void {
    this.isConnected = false; // ADD THIS LINE
    if (this.webSocket) {
      try {
        this.webSocket.close(1000, "Disconnected by user"); // 1000 = normal closure
      } catch (e) {
        console.error("Error closing WebSocket:", e);
      }
      this.webSocket = null;
    }
  }

  sendMessage(message: GeminiMessage): void {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify(message));
    } else {
      console.warn("Cannot send message: WebSocket is not open");
    }
  }

  onReceiveMessage(messageEvent: MessageEvent): void {
    console.log("Message received: ", messageEvent);
    const messageData = JSON.parse(messageEvent.data) as GeminiResponseData;
    const message = new GeminiLiveResponseMessage(messageData);
    console.log("onReceiveMessageCallBack this ", this);
    this.onReceiveResponse(message);
  }

  setupWebSocketToService(config: any): void {
    console.log("connecting: ", this.proxyUrl);

    // Close any existing connection first
    if (this.webSocket) {
      this.webSocket.close();
    }

    this.isConnected = false; // ADD THIS LINE
    this.webSocket = new WebSocket(this.proxyUrl);

    this.webSocket.onclose = (event: CloseEvent) => {
      console.log("websocket closed: ", event);
      this.isConnected = false; // ADD THIS LINE
      // Only report error if it wasn't a clean close
      if (!event.wasClean) {
        this.onErrorMessage("Connection closed");
      }
    };

    this.webSocket.onerror = (event: Event) => {
      console.log("websocket error: ", event);
      this.isConnected = false; // ADD THIS LINE
      // The error event doesn't provide much info, so we use a generic message
      this.onErrorMessage("Connection error");
    };

    // REPLACE YOUR EXISTING onopen WITH THIS:
    this.webSocket.onopen = (event: Event) => {
      console.log("websocket open: ", event);
      this.isConnected = true; // ADD THIS LINE - Track connection
      if (config == "init") {
        this.sendInitialSetupMessages();
      } else {
        const serviceSetupMessage: GeminiSetupMessage = {
          bearer_token: this.accessToken,
          service_url: this.serviceUrl,
        };
        this.sendMessage(serviceSetupMessage);

        this.sendMessage(config);
      }
      this.onConnectionStarted();
    };

    this.webSocket.onmessage = this.onReceiveMessage.bind(this);
  }

  async sendInitialSetupMessages(): Promise<void> {
    const serviceSetupMessage: GeminiSetupMessage = {
      bearer_token: this.accessToken,
      service_url: this.serviceUrl,
    };
    this.sendMessage(serviceSetupMessage);

    const selectedVoice = this.getVoiceForModel();
    const sessionSetupMessage: GeminiSessionSetupMessage = {
      setup: {
        model: this.modelUri,
        generation_config: {
          response_modalities: this.responseModalities,
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: selectedVoice,
              },
            },
            language_code: "id-ID",
          },
        },
        system_instruction: {
          parts: [{ text: await this.systemInstructions }],
        },
      },
    };
    this.sendMessage(sessionSetupMessage);
  }
  sendTextMessage(text: string): void {
    const textMessage: GeminiTextMessage = {
      client_content: {
        turns: [
          {
            role: "user",
            parts: [{ text: text }],
          },
        ],
        turn_complete: true,
      },
    };
    this.sendMessage(textMessage);
  }

  sendRealtimeInputMessage(data: string, mime_type: string): void {
    const message: GeminiRealtimeInputMessage = {
      realtime_input: {
        media_chunks: [
          {
            mime_type: mime_type,
            data: data,
          },
        ],
      },
    };
    this.sendMessage(message);
  }

  sendAudioMessage(base64PCM: string): void {
    this.sendRealtimeInputMessage(base64PCM, "audio/pcm");
  }

  sendImageMessage(
    base64Image: string,
    mime_type: string = "image/jpeg"
  ): void {
    this.sendRealtimeInputMessage(base64Image, mime_type);
  }
}

console.log("loaded gemini-live-api.ts");

export { GeminiLiveAPI, GeminiLiveResponseMessage };
