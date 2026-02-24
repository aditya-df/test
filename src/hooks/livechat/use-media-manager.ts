import { useState, useRef, useEffect, useCallback } from "react";
import { useMicVAD } from "@ricky0123/vad-react";
import { GeminiLiveAPI, GeminiLiveResponseMessage } from "./gemini-live-api";
import {
  LiveAudioOutputManager,
  LiveVideoManager,
  LiveScreenManager,
} from "./live-media-manager";
import { useAuthStore } from "@/utils/auth-utils-client";

interface UseMediaManagerProps {
  agentId: string;
}

// Environment variables with fallbacks
const PROXY_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "wss://knowgen-ai-dev.metrodata.web.id/api/v1/ws";
const PROJECT_ID = process.env.NEXT_PUBLIC_GOOGLE_PROJECT_ID || "knowgen-me-am-trial";
const MODEL = "gemini-2.0-flash-exp";
const API_HOST = "us-central1-aiplatform.googleapis.com";

export const useMediaManager = (props: UseMediaManagerProps) => {
  const { agentId } = props;
  const { session } = useAuthStore();
  // State for media devices
  const [isMic, setIsMic] = useState(false);
  const [isCamera, setIsCamera] = useState(false);
  const [isShareScreen, setIsShareScreen] = useState(false);
  const [isModalDeviceCameraOpen, setIsModalDeviceCameraOpen] = useState(false);

  // State for device lists
  const [cameraDevice, setCameraDevice] = useState<MediaDeviceInfo[]>([]);
  const [micDevice, setMicDevice] = useState<MediaDeviceInfo[]>([]);

  // State for connection and setup
  const [setupComplete, setSetupComplete] = useState(false);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // State for user speaking detection
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [micStatus, setMicStatus] = useState<{
    listening: boolean;
    loading: boolean;
  } | null>(null);

  // State for responses
  const [responses, setResponses] = useState<string[]>([]);

  // Refs for media elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs for managers
  const geminiApiRef = useRef<GeminiLiveAPI | null>(null);
  const audioOutputRef = useRef<LiveAudioOutputManager | null>(null);
  const videoManagerRef = useRef<LiveVideoManager | null>(null);
  const screenManagerRef = useRef<LiveScreenManager | null>(null);

  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [currentAudioData, setCurrentAudioData] = useState<Float32Array | null>(
    null
  );

  // Define callback functions outside of the VAD hook to prevent recursion
  const handleSpeechStart = useCallback(() => {
    console.log("Speech started");
    setUserSpeaking(true);
  }, []);

  const handleSpeechEnd = useCallback(
    (audio: Float32Array) => {
      setUserSpeaking(false);
      if (!geminiApiRef.current || !isMic || !isWebSocketConnected) return;

      // Convert audio Float32Array to PCM16 at 16kHz (little-endian)
      if (audio) {
        try {
          // For very large audio chunks, we might need to split them
          const MAX_CHUNK_SIZE = 16000; // About 1 second of audio at 16kHz

          // If the audio is too large, process it in chunks
          if (audio.length > MAX_CHUNK_SIZE * 2) {
            console.log(
              `Large audio detected (${audio.length} samples), processing in chunks`
            );

            // Process in chunks of ~1 second
            for (
              let offset = 0;
              offset < audio.length;
              offset += MAX_CHUNK_SIZE
            ) {
              const end = Math.min(offset + MAX_CHUNK_SIZE, audio.length);
              const chunk = audio.slice(offset, end);

              // Process this chunk - convert Float32Array to Int16Array (PCM16)
              const pcm16 = new Int16Array(chunk.length);
              for (let i = 0; i < chunk.length; i++) {
                pcm16[i] = Math.max(
                  -32768,
                  Math.min(32767, Math.round(chunk[i] * 32767))
                );
              }

              // Create buffer with little-endian Int16 values
              const buffer = new ArrayBuffer(pcm16.length * 2);
              const view = new DataView(buffer);

              for (let i = 0; i < pcm16.length; i++) {
                view.setInt16(i * 2, pcm16[i], true); // true = little-endian
              }

              const base64 = arrayBufferToBase64Chunked(buffer);
              geminiApiRef.current.sendAudioMessage(base64);
            }
          } else {
            // Process the entire audio at once for smaller chunks
            const pcm16 = new Int16Array(audio.length);
            for (let i = 0; i < audio.length; i++) {
              pcm16[i] = Math.max(
                -32768,
                Math.min(32767, Math.round(audio[i] * 32767))
              );
            }

            const buffer = new ArrayBuffer(pcm16.length * 2);
            const view = new DataView(buffer);

            for (let i = 0; i < pcm16.length; i++) {
              view.setInt16(i * 2, pcm16[i], true); // true = little-endian
            }

            const base64 = arrayBufferToBase64Chunked(buffer);
            geminiApiRef.current.sendAudioMessage(base64);
          }
        } catch (error) {
          console.error("Error processing audio:", error);
        }
      }
    },
    [isMic, isWebSocketConnected]
  );

  // Improved base64 conversion that handles large buffers
  const arrayBufferToBase64Chunked = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 1024; // Process in smaller chunks

    // Process in chunks to avoid call stack issues
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.length));
      for (let j = 0; j < chunk.length; j++) {
        binary += String.fromCharCode(chunk[j]);
      }
    }

    return btoa(binary);
  };

  // Voice Activity Detection hook
  const vad = useMicVAD({
    onSpeechStart: handleSpeechStart,
    onSpeechEnd: handleSpeechEnd,
  });

  // Initialize audio output manager
  useEffect(() => {
    try {
      // Initialize with 24kHz sample rate for output
      audioOutputRef.current = new LiveAudioOutputManager(24000);
    } catch (error) {
      console.error("Error initializing audio output manager:", error);
    }

    return () => {
      // Cleanup
      if (audioOutputRef.current) {
        try {
          audioOutputRef.current.stopAllAudio();
        } catch (error) {
          console.error("Error stopping audio:", error);
        }
      }
    };
  }, []);

  // Initialize Gemini API
  useEffect(() => {
    // Don't recreate the API on every render
    if (geminiApiRef.current) return;

    try {
      const api = new GeminiLiveAPI(PROXY_URL, PROJECT_ID, MODEL, API_HOST, agentId, session?.user.backendToken);

      api.onReceiveResponse = (message: GeminiLiveResponseMessage) => {
        if (message.type === "TEXT") {
          setResponses((prev) => [...prev, message.data]);
          console.log("Received text response:", message.data);
        } else if (message.type === "AUDIO" && audioOutputRef.current) {
          // Set aiSpeaking to true when receiving audio
          setAiSpeaking(true);

          // Convert base64 PCM16 audio to Float32Array for animation
          try {
            // Decode base64 to binary
            const binary = atob(message.data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }

            // Create a DataView to read Int16 values (little-endian)
            const dataView = new DataView(bytes.buffer);
            const int16Samples = new Int16Array(dataView.byteLength / 2);

            // Read Int16 values (PCM16 format)
            for (let i = 0; i < int16Samples.length; i++) {
              int16Samples[i] = dataView.getInt16(i * 2, true); // true for little-endian
            }

            // Enhanced conversion with optional pre-processing:
            // 1. Convert Int16 to Float32 (normalized to [-1, 1])
            const float32Samples = new Float32Array(int16Samples.length);

            // 2. Apply pre-emphasis filter to highlight speech frequencies
            const preEmphasis = 0.97;
            float32Samples[0] = int16Samples[0] / 32768.0;

            for (let i = 1; i < int16Samples.length; i++) {
              // Apply pre-emphasis filter: y[n] = x[n] - a*x[n-1]
              float32Samples[i] = (int16Samples[i] - preEmphasis * int16Samples[i - 1]) / 32768.0;

              // Normalize to ensure we stay within [-1, 1]
              float32Samples[i] = Math.max(-1.0, Math.min(1.0, float32Samples[i]));
            }

            // 3. Optional: Boost overall amplitude slightly to ensure visible mouth movement
            for (let i = 0; i < float32Samples.length; i++) {
              float32Samples[i] *= 1.2; // Boost by 20%
              float32Samples[i] = Math.max(-1.0, Math.min(1.0, float32Samples[i])); // Clamp to [-1, 1]
            }

            // Set the processed data for animation
            setCurrentAudioData(float32Samples);
          } catch (error) {
            console.error("Error converting PCM16 audio data:", error);
            setCurrentAudioData(null);
          }

          // Play the audio and track when it finishes
          const audioPromise = audioOutputRef.current.playAudioChunk(message.data);

          // If the audio player returns a promise, use it to detect when audio finishes
          if (audioPromise && typeof audioPromise.then === 'function') {
            audioPromise.then(() => {
              // Check if there are no more audio chunks in the queue
              if (audioOutputRef.current && !audioOutputRef.current.isPlaying()) {
                console.log("Audio playback completed");
                setAiSpeaking(false);
                setCurrentAudioData(null);
              }
            }).catch(err => {
              console.error("Audio playback error:", err);
              setAiSpeaking(false);
              setCurrentAudioData(null);
            });
          } else {
            // Fallback to duration-based approach if no promise is returned
            try {
              // Calculate duration based on 24kHz sample rate (output format)
              const binary = atob(message.data);
              const bytes = new Uint8Array(binary.length);
              const sampleCount = bytes.length / 2; // 2 bytes per sample for PCM16
              const durationMs = (sampleCount / 24000) * 1000; // Duration in milliseconds at 24kHz

              // Add a buffer to ensure we don't cut off the audio
              const bufferMs = 300; // 300ms buffer

              // Set a timeout to reset aiSpeaking after the audio should have finished
              setTimeout(() => {
                // Only set aiSpeaking to false if there are no more audio chunks in the queue
                if (audioOutputRef.current && !audioOutputRef.current.isPlaying()) {
                  setAiSpeaking(false);
                  setCurrentAudioData(null);
                }
              }, durationMs + bufferMs);
            } catch (error) {
              console.error("Error calculating audio duration:", error);
              // Fallback timeout if we can't calculate the duration
              setTimeout(() => {
                if (audioOutputRef.current && !audioOutputRef.current.isPlaying()) {
                  setAiSpeaking(false);
                  setCurrentAudioData(null);
                }
              }, 2000); // Default to 2 seconds
            }
          }
        } else if (message.type === "SETUP COMPLETE") {
          setSetupComplete(true);
          console.log("Setup complete");
        }
      };

      api.onConnectionStarted = () => {
        setIsWebSocketConnected(true);
        setConnectionError(null);
        setIsConnecting(false);
        console.log("WebSocket connection established");
      };

      api.onErrorMessage = (message: string) => {
        // Only set error if we're not already connected
        if (!isWebSocketConnected) {
          setConnectionError(message);
          setIsConnecting(false);
          console.error("Connection error:", message);
        }
      };

      geminiApiRef.current = api;

      // Connect to the API
      connectToGeminiAPI();
    } catch (error) {
      console.error("Error initializing Gemini API:", error);
      setConnectionError("Failed to initialize API");
    }

    return () => {
      // Cleanup
      if (geminiApiRef.current) {
        geminiApiRef.current.disconnect();
      }
    };
  }, [connectionAttempts, agentId, session]); // Depend on connectionAttempts to allow reconnection

  // Function to connect to Gemini API
  const connectToGeminiAPI = useCallback(() => {
    if (!geminiApiRef.current) return;

    setIsConnecting(true);

    // For demo purposes, we're using a placeholder token
    // In a real app, you'd get this from your server
    const demoToken = "DEMO_TOKEN";

    // Connect to Gemini API
    geminiApiRef.current.connect(demoToken,"init");
  }, []);

  // Function to retry connection
  const retryConnection = useCallback(() => {
    setConnectionAttempts((prev) => prev + 1);
    setConnectionError(null);

    if (geminiApiRef.current) {
      geminiApiRef.current.disconnect();
    }

    // Short delay before reconnecting
    setTimeout(() => {
      connectToGeminiAPI();
    }, 500);
  }, [connectToGeminiAPI]);

  // Initialize video and screen managers when video element is available
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      videoManagerRef.current = new LiveVideoManager(
        videoRef.current,
        canvasRef.current
      );
      screenManagerRef.current = new LiveScreenManager(
        videoRef.current,
        canvasRef.current
      );

      if (videoManagerRef.current) {
        videoManagerRef.current.onNewFrame = (frameData: string) => {
          if (geminiApiRef.current && isCamera && isWebSocketConnected) {
            geminiApiRef.current.sendImageMessage(frameData);
          }
        };
      }

      if (screenManagerRef.current) {
        screenManagerRef.current.onNewFrame = (frameData: string) => {
          if (geminiApiRef.current && isShareScreen && isWebSocketConnected) {
            geminiApiRef.current.sendImageMessage(frameData);
          }
        };
      }
    } catch (error) {
      console.error("Error initializing video/screen managers:", error);
    }

    return () => {
      // Cleanup
      if (videoManagerRef.current) {
        videoManagerRef.current.stopWebcam();
      }
      if (screenManagerRef.current) {
        screenManagerRef.current.stopCapture();
      }
    };
  }, [videoRef, canvasRef, isCamera, isShareScreen, isWebSocketConnected]);

  // Fetch available media devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission first to get labeled devices
        await navigator.mediaDevices
          .getUserMedia({ audio: true, video: true })
          .then((stream) => {
            // Stop the stream immediately after getting permissions
            stream.getTracks().forEach((track) => track.stop());
          });

        const devices = await navigator.mediaDevices.enumerateDevices();

        const cameras = devices.filter(
          (device) => device.kind === "videoinput"
        );
        const mics = devices.filter((device) => device.kind === "audioinput");

        setCameraDevice(cameras);
        setMicDevice(mics);
      } catch (error) {
        console.error("Error getting media devices:", error);
        setMicError("Failed to access media devices");
      }
    };

    getDevices();
  }, []);

  // Handle camera toggle
  useEffect(() => {
    if (!videoManagerRef.current) return;

    try {
      if (isCamera) {
        videoManagerRef.current.startWebcam();
      } else {
        videoManagerRef.current.stopWebcam();
      }
    } catch (error) {
      console.error("Error toggling camera:", error);
    }
  }, [isCamera]);

  // Handle screen sharing toggle
  useEffect(() => {
    if (!screenManagerRef.current) return;

    try {
      if (isShareScreen) {
        screenManagerRef.current.startCapture();
      } else {
        screenManagerRef.current.stopCapture();
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
    }
  }, [isShareScreen]);

  // Update micStatus based on VAD state
  useEffect(() => {
    setMicStatus({
      listening: vad.listening,
      loading: vad.loading,
    });
  }, [vad.listening, vad.loading]);

  // Toggle microphone with error handling
  useEffect(() => {
    try {
      if (isMic && !vad.listening && !vad.loading) {
        vad.start();
      } else if (!isMic && vad.listening) {
        vad.pause();
      }
    } catch (error) {
      console.error("Error toggling microphone:", error);
      setMicError(`Failed to toggle microphone: ${error}`);
    }
  }, [isMic, vad]);

  // Handle device change
  const handleDeviceChange = useCallback((deviceId: string) => {
    if (videoManagerRef.current) {
      try {
        videoManagerRef.current.updateWebcamDevice(deviceId);
      } catch (error) {
        console.error("Error changing device:", error);
      }
    }
  }, []);

  // Send text message
  const sendTextMessage = useCallback(
    (text: string) => {
      if (geminiApiRef.current && text.trim() && isWebSocketConnected) {
        try {
          geminiApiRef.current.sendTextMessage(text);
          return true;
        } catch (error) {
          console.error("Error sending text message:", error);
        }
      }
      return false;
    },
    [isWebSocketConnected]
  );

  // Create a safe toggle function that won't cause recursion
  const safeToggle = useCallback(() => {
    try {
      if (vad.loading) return; // Don't toggle while loading

      if (vad.listening) {
        vad.pause();
        setIsMic(false);
      } else {
        vad.start();
        setIsMic(true);
      }
    } catch (error) {
      console.error("Error in toggle:", error);
      setMicError(`Toggle error: ${error}`);
    }
  }, [vad]);

  const updateVrmModelPath = (modelPath: string) => {
    if (geminiApiRef.current) {
      geminiApiRef.current.setVrmModelPath(modelPath);
    }
  };

  return {
    // Media state
    isMic,
    isCamera,
    isShareScreen,
    isModalDeviceCameraOpen,
    setupComplete,
    cameraDevice,
    micDevice,
    videoRef,
    canvasRef,
    userSpeaking,
    micError,
    micStatus,
    responses,
    isWebSocketConnected,
    connectionError,
    isConnecting,

    aiSpeaking,
    currentAudioData,

    // Actions
    setIsMic,
    setIsCamera,
    setIsShareScreen,
    setIsModalDeviceCameraOpen,
    handleDeviceChange,
    sendTextMessage,
    toggle: safeToggle, // Use our safe toggle function
    retryConnection,
    updateVrmModelPath,
  };
};
