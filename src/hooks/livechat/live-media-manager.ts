import { useMicVAD } from '@ricky0123/vad-react';
import { useState, useRef, useEffect } from 'react';

class LiveAudioOutputManager {
  private audioInputContext: AudioContext | undefined;
  private workletNode: AudioWorkletNode | undefined;
  private initialized: boolean;
  private audioQueue: {buffer: AudioBuffer, source: AudioBufferSourceNode | null}[] = [];
  private isPlayingAudio: boolean = false;
  private outputSampleRate: number;

  constructor(outputSampleRate: number = 24000) {
    this.initialized = false;
    this.outputSampleRate = outputSampleRate;
    
    this.initializeAudioContext();
    console.log(`Initialized LiveAudioOutputManager with sample rate ${outputSampleRate}Hz`);
  }

  // Check if audio is currently playing
  isPlaying(): boolean {
    return this.isPlayingAudio || this.audioQueue.length > 0;
  }

  async playAudioChunk(base64AudioChunk: string): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initializeAudioContext();
      }

      if (this.audioInputContext?.state === "suspended") {
        await this.audioInputContext.resume();
      }

      // Decode base64 to binary
      const binary = atob(base64AudioChunk);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Create a DataView to read Int16 values (little-endian)
      const dataView = new DataView(bytes.buffer);
      const pcm16Data = new Int16Array(dataView.byteLength / 2);
      
      // Read Int16 values (PCM16 format)
      for (let i = 0; i < pcm16Data.length; i++) {
        pcm16Data[i] = dataView.getInt16(i * 2, true); // true for little-endian
      }
      
      // Convert PCM16 to Float32 for Web Audio API
      const floatData = new Float32Array(pcm16Data.length);
      for (let i = 0; i < pcm16Data.length; i++) {
        floatData[i] = pcm16Data[i] / 32768.0; // Normalize to [-1, 1]
      }

      // Create audio buffer (mono, 24kHz)
      const audioBuffer = this.audioInputContext!.createBuffer(
        1, // mono
        floatData.length,
        this.outputSampleRate // 24kHz sample rate for output
      );
      
      // Fill the buffer
      audioBuffer.getChannelData(0).set(floatData);

      // Add to queue
      const queueItem = {
        buffer: audioBuffer,
        source: null
      };
      this.audioQueue.push(queueItem);
      
      // Start playing if not already playing
      if (!this.isPlayingAudio) {
        return this.playNextInQueue();
      }
      
      // Return a promise that resolves when this specific chunk finishes playing
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          // If this chunk has been played and removed from the queue
          if (!this.audioQueue.includes(queueItem)) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    } catch (error) {
      console.error("Error processing audio chunk:", error);
      return Promise.reject(error);
    }
  }

  // Play next audio in queue
  private async playNextInQueue(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlayingAudio = false;
      return Promise.resolve();
    }

    this.isPlayingAudio = true;
    const queueItem = this.audioQueue[0];
    
    return new Promise((resolve) => {
      const source = this.audioInputContext!.createBufferSource();
      source.buffer = queueItem.buffer;
      source.connect(this.audioInputContext!.destination);
      
      queueItem.source = source;
      
      // When this chunk finishes, play the next one
      source.onended = () => {
        // Remove the played item from the queue
        this.audioQueue.shift();
        
        // Play the next item or resolve if queue is empty
        if (this.audioQueue.length > 0) {
          this.playNextInQueue().then(resolve);
        } else {
          this.isPlayingAudio = false;
          resolve();
        }
      };
      
      source.start(0);
    });
  }

  async initializeAudioContext(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log("initializeAudioContext...");

      this.audioInputContext = new AudioContext({ sampleRate: this.outputSampleRate });
      
      try {
        await this.audioInputContext.audioWorklet.addModule("/pcm-processor.js");
        this.workletNode = new AudioWorkletNode(
          this.audioInputContext,
          "pcm-processor",
        );
        this.workletNode.connect(this.audioInputContext.destination);
        console.log("AudioWorklet initialized successfully");
      } catch (workletError) {
        console.warn("AudioWorklet initialization failed, using standard Web Audio API:", workletError);
      }

      this.initialized = true;
      console.log("initializeAudioContext end");
    } catch (error) {
      console.error("Failed to initialize audio context:", error);
      this.initialized = false;
    }
  }
  
  // Stop all currently playing sounds
  stopAllAudio(): void {
    this.audioQueue.forEach(item => {
      if (item.source) {
        try {
          item.source.stop();
        } catch (e) {
          console.error("Error stopping audio source:", e);
        }
      }
    });
    this.audioQueue = [];
    this.isPlayingAudio = false;
    
    if (this.audioInputContext) {
      try {
        this.audioInputContext.suspend();
      } catch (error) {
        console.error("Error suspending audio context:", error);
      }
    }
  }
}

// Using VAD (Voice Activity Detection) React hook instead of custom implementation
const useVoiceActivityDetection = (onSpeechCallback: (audioData: string) => void) => {
  return useMicVAD({
    onSpeechStart: () => {
      console.log('Speech started');
    },
    onSpeechEnd: (audio: Float32Array) => {
      // Convert audio to base64 and send it
      if (audio) {
        // Convert Float32Array to Int16Array (16kHz PCM16 little-endian)
        const pcm16 = new Int16Array(audio.length);
        
        for (let i = 0; i < audio.length; i++) {
          // Convert normalized float (-1 to 1) to int16 (-32768 to 32767)
          pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(audio[i] * 32767)));
        }
        
        // Create buffer with little-endian Int16 values
        const buffer = new ArrayBuffer(pcm16.length * 2);
        const view = new DataView(buffer);
        
        for (let i = 0; i < pcm16.length; i++) {
          view.setInt16(i * 2, pcm16[i], true); // true = little-endian
        }
        
        const base64 = btoa(
          String.fromCharCode(...new Uint8Array(buffer))
        );
        
        onSpeechCallback(base64);
      }
    },
  });
};

// Legacy implementation for compatibility
class LiveAudioInputManager {
  audioContext: AudioContext | undefined;
  mediaRecorder: MediaRecorder | undefined;
  processor: ScriptProcessorNode | boolean;
  pcmData: number[];
  deviceId: string | null;
  interval: number | null;
  stream: MediaStream | null;
  onNewAudioRecordingChunk: (audioData: string) => void;

  constructor() {
    this.processor = false;
    this.pcmData = [];
    this.deviceId = null;
    this.interval = null;
    this.stream = null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.onNewAudioRecordingChunk = (audioData: string) => {
      console.log("New audio recording ");
    };
  }

  async connectMicrophone(): Promise<void> {
    // Initialize with 16kHz for input (Google Live API input spec)
    this.audioContext = new AudioContext({
      sampleRate: 16000,
    });

    const constraints: MediaStreamConstraints = {
      audio: {
        channelCount: 1,
        sampleRate: 16000,
      } as MediaTrackConstraints,
    };

    if (this.deviceId) {
      (constraints.audio as MediaTrackConstraints).deviceId = { exact: this.deviceId };
    }

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);

    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    (this.processor as ScriptProcessorNode).onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      // Convert float32 to int16 (16-bit PCM, little-endian)
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(inputData[i] * 32767)));
      }
      this.pcmData.push(...Array.from(pcm16));
    };

    source.connect(this.processor as ScriptProcessorNode);
    (this.processor as ScriptProcessorNode).connect(this.audioContext.destination);

    this.interval = window.setInterval(this.recordChunk.bind(this), 1000);
  }

  newAudioRecording(b64AudioData: string): void {
    console.log("newAudioRecording ");
    this.onNewAudioRecordingChunk(b64AudioData);
  }

  recordChunk(): void {
    // Create buffer with little-endian Int16 values
    const buffer = new ArrayBuffer(this.pcmData.length * 2);
    const view = new DataView(buffer);
    
    this.pcmData.forEach((value, index) => {
      view.setInt16(index * 2, value, true); // true = little-endian
    });

    const base64 = btoa(
      String.fromCharCode(...new Uint8Array(buffer)),
    );
    this.newAudioRecording(base64);
    this.pcmData = [];
  }
  
  disconnectMicrophone(): void {
    try {
      if (this.processor && typeof this.processor !== 'boolean') {
        this.processor.disconnect();
      }
      this.audioContext?.close();
    } catch {
      console.error("Error disconnecting microphone");
    }

    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async updateMicrophoneDevice(deviceId: string): Promise<void> {
    this.deviceId = deviceId;
    this.disconnectMicrophone();
    await this.connectMicrophone();
  }
}

class LiveVideoManager {
  previewVideoElement: HTMLVideoElement;
  previewCanvasElement: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  stream: MediaStream | null;
  interval: number | null;
  onNewFrame: (newFrame: string) => void;

  constructor(previewVideoElement: HTMLVideoElement, previewCanvasElement: HTMLCanvasElement) {
    this.previewVideoElement = previewVideoElement;
    this.previewCanvasElement = previewCanvasElement;
    const context = this.previewCanvasElement.getContext("2d");
    if (!context) {
      throw new Error("Could not get 2D context from canvas");
    }
    this.ctx = context;
    this.stream = null;
    this.interval = null;
     // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.onNewFrame = (newFrame: string) => {
      console.log("Default new frame trigger.");
    };
  }

  async startWebcam(): Promise<void> {
    try {
      const constraints: MediaStreamConstraints = {
        video: true,
        // video: {
        //     width: { max: 640 },
        //     height: { max: 480 },
        // },
      };
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.previewVideoElement.srcObject = this.stream;
    } catch (err) {
      console.error("Error accessing the webcam: ", err);
    }

    this.interval = window.setInterval(this.newFrame.bind(this), 1000);
  }

  stopWebcam(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.stopStream();
  }

  stopStream(): void {
    if (!this.stream) return;

    const tracks = this.stream.getTracks();

    tracks.forEach((track) => {
      track.stop();
    });
  }

  async updateWebcamDevice(deviceId: string): Promise<void> {
    const constraints: MediaStreamConstraints = {
      video: { deviceId: { exact: deviceId } } as MediaTrackConstraints,
    };
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.previewVideoElement.srcObject = this.stream;
  }

  captureFrameB64(): string {
    if (this.stream == null) return "";

    this.previewCanvasElement.width = this.previewVideoElement.videoWidth;
    this.previewCanvasElement.height = this.previewVideoElement.videoHeight;
    this.ctx.drawImage(
      this.previewVideoElement,
      0,
      0,
      this.previewCanvasElement.width,
      this.previewCanvasElement.height,
    );
    const imageData = this.previewCanvasElement
      .toDataURL("image/jpeg")
      .split(",")[1]
      .trim();
    return imageData;
  }

  newFrame(): void {
    console.log("capturing new frame");
    const frameData = this.captureFrameB64();
    this.onNewFrame(frameData);
  }
}

class LiveScreenManager {
  previewVideoElement: HTMLVideoElement;
  previewCanvasElement: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  stream: MediaStream | null;
  interval: number | null;
  onNewFrame: (newFrame: string) => void;

  constructor(previewVideoElement: HTMLVideoElement, previewCanvasElement: HTMLCanvasElement) {
    this.previewVideoElement = previewVideoElement;
    this.previewCanvasElement = previewCanvasElement;
    const context = this.previewCanvasElement.getContext("2d");
    if (!context) {
      throw new Error("Could not get 2D context from canvas");
    }
    this.ctx = context;
    this.stream = null;
    this.interval = null;
    this.onNewFrame = (newFrame: string) => {
      console.log("Default new frame trigger: ", newFrame);
    };
  }

  async startCapture(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getDisplayMedia();
      this.previewVideoElement.srcObject = this.stream;
    } catch (err) {
      console.error("Error accessing the screen: ", err);
    }
    this.interval = window.setInterval(this.newFrame.bind(this), 1000);
  }

  stopCapture(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }

    if (!this.stream) return;

    const tracks = this.stream.getTracks();

    tracks.forEach((track) => {
      track.stop();
    });
  }

  captureFrameB64(): string {
    if (this.stream == null) return "";

    this.previewCanvasElement.width = this.previewVideoElement.videoWidth;
    this.previewCanvasElement.height = this.previewVideoElement.videoHeight;
    this.ctx.drawImage(
      this.previewVideoElement,
      0,
      0,
      this.previewCanvasElement.width,
      this.previewCanvasElement.height,
    );
    const imageData = this.previewCanvasElement
      .toDataURL("image/jpeg")
      .split(",")[1]
      .trim();
    return imageData;
  }

  newFrame(): void {
    console.log("capturing new frame");
    const frameData = this.captureFrameB64();
    this.onNewFrame(frameData);
  }
}

// A modern React hook for screen capture
const useScreenCapture = (
  onNewFrameCallback: (frameData: string) => void,
  captureInterval: number = 1000
) => {
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<number | null>(null);

  const startCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      // Set up the capture interval
      intervalRef.current = window.setInterval(() => {
        captureFrame();
      }, captureInterval);
      
      setIsCapturing(true);
      
      // Handle stream ending (user stops sharing)
      mediaStream.getVideoTracks()[0].onended = () => {
        stopCapture();
      };
    } catch (err) {
      console.error("Error starting screen capture:", err);
    }
  };
  
  const stopCapture = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    setIsCapturing(false);
  };
  
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current || !stream) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current video frame to the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64 and extract the data part
    const imageData = canvas.toDataURL('image/jpeg').split(',')[1].trim();
    
    // Send the frame data through the callback
    onNewFrameCallback(imageData);
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);
  
  return {
    isCapturing,
    startCapture,
    stopCapture,
    videoRef,
    canvasRef
  };
};

// A modern React hook for webcam capture
const useWebcamCapture = (
  onNewFrameCallback: (frameData: string) => void,
  captureInterval: number = 1000
) => {
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<number | null>(null);

  const startCapture = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      // Set up the capture interval
      intervalRef.current = window.setInterval(() => {
        captureFrame();
      }, captureInterval);
      
      setIsCapturing(true);
    } catch (err) {
      console.error("Error starting webcam capture:", err);
    }
  };
  
  const stopCapture = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    setIsCapturing(false);
  };
  
  const changeDevice = async (newDeviceId: string) => {
    setDeviceId(newDeviceId);
    
    // If we're already capturing, restart with the new device
    if (isCapturing) {
      stopCapture();
      await startCapture();
    }
  };
  
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current || !stream) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current video frame to the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64 and extract the data part
    const imageData = canvas.toDataURL('image/jpeg').split(',')[1].trim();
    
    // Send the frame data through the callback
    onNewFrameCallback(imageData);
  };
  
    // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);
  
  return {
    isCapturing,
    startCapture,
    stopCapture,
    changeDevice,
    videoRef,
    canvasRef
  };
};

console.log("loaded live-media-manager.ts");

export { 
  LiveAudioOutputManager, 
  LiveAudioInputManager, 
  LiveVideoManager, 
  LiveScreenManager,
  useVoiceActivityDetection,
  useScreenCapture,
  useWebcamCapture
};

