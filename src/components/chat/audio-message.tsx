import { toast } from "@/hooks/use-toast";
import { Loader, Square, Volume2 } from "lucide-react";
import React, { useEffect, useState } from "react";

export const AudioMessage = React.memo(
  ({ text, isUser }: { text: string; isUser: boolean }) => {
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Extract appropriate text for audio
    const getAudioText = (text: string) => {
      try {
        // If text is empty or just whitespace, return null
        if (!text || !text.trim()) {
          return null;
        }

        // Check if the text is JSON
        if (text.trim().startsWith("{") && text.trim().endsWith("}")) {
          const parsed = JSON.parse(text);
          // If there's analysis, use that
          if (parsed.analysis) {
            return parsed.analysis;
          }
        }

        // Look for Analysis section in markdown-style text
        const analysisMatch = text.match(
          /Analysis\s*(?:[#\n]|$)([\s\S]*?)(?=\s*#|$)/i
        );
        if (analysisMatch?.[1]) {
          const analysisText = analysisMatch[1].trim();
          if (analysisText) {
            return analysisText;
          }
        }

        // If no analysis found, return the original text
        return text;
      } catch (error) {
        // If JSON parsing fails, return original text
        console.error("Error parsing text:", error);
        return text;
      }
    };

    const handlePlay = async () => {
      if (isLoading) return;

      try {
        setIsLoading(true);

        // Only create new audio if it doesn't exist
        if (!audio) {
          const audioText = getAudioText(text);

          // If no valid text to read, show error
          if (!audioText) {
            throw new Error("No text available for audio synthesis");
          }

          const cleanText = audioText
            .replace(/[*_~`]/g, "") // Remove markdown symbols
            .replace(/\s+/g, " ") // Normalize whitespace
            .trim();

          // If cleaned text is empty, show error
          if (!cleanText) {
            throw new Error("No text available after cleaning");
          }

          console.log("Sending text for synthesis:", cleanText);

          const response = await fetch("/api/synthesize", {
            method: "POST",
            headers: {
              "Content-Type": "text/plain",
            },
            body: cleanText,
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error("TTS API Error:", errorData);
            throw new Error(errorData.error || "Text-to-speech service error");
          }

          const data = await response.json();

          if (!data.audioContent) {
            throw new Error("No audio content in response");
          }

          const audioBlob = new Blob(
            [Uint8Array.from(atob(data.audioContent), (c) => c.charCodeAt(0))],
            { type: "audio/mp3" }
          );
          const audioUrl = URL.createObjectURL(audioBlob);
          const newAudio = new Audio(audioUrl);

          newAudio.onerror = (e) => {
            console.error("Audio creation error:", e);
            throw new Error("Failed to create audio element");
          };

          newAudio.onended = () => {
            setIsPlaying(false);
          };

          await new Promise((resolve, reject) => {
            newAudio.oncanplaythrough = resolve;
            newAudio.onerror = reject;
          });

          setAudio(newAudio);
          setIsPlaying(true);
          await newAudio.play();
        } else {
          setIsPlaying(true);
          audio.currentTime = 0;
          await audio.play();
        }
      } catch (error: unknown) {
        console.error("Error playing audio:", error);
        setIsPlaying(false);
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to play audio",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const handleStop = () => {
      if (audio && isPlaying) {
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
      }
    };

    useEffect(() => {
      return () => {
        if (audio) {
          audio.pause();
          URL.revokeObjectURL(audio.src);
        }
      };
    }, [audio]);

    // Check if we have text to process before rendering the button
    const audioText = getAudioText(text);
    if (!audioText) return null;

    return (
      <button
        // size="icon"
        // variant="ghost"
        onClick={isPlaying ? handleStop : handlePlay}
        disabled={isLoading}
        //  className={`size-4 p-0 ${isUser ? "text-white" : "text-black"}`}
        className={`cursor-pointer  w-4 h-4${
          isUser ? "hover:text-blue-300" : "hover:text-blue-800"
        } `}
      >
        {isLoading ? (
          <Loader
            className={`h-4 w-4 animate-spin w-4 h-4 ${
              isUser ? "hover:bg-white/50" : ""
            } `}
          />
        ) : isPlaying ? (
          <Square
            className={`cursor-pointer w-4 h-4 ${
              isUser ? "hover:text-blue-300" : "hover:text-blue-800"
            } `}
          />
        ) : (
          <Volume2
            className={`cursor-pointer w-4 h-4 ${
              isUser ? "hover:text-blue-300" : "hover:text-blue-800"
            } `}
          />
        )}
      </button>
    );
  }
);

AudioMessage.displayName = "AudioMessage";
