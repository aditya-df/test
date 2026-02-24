import { Data } from "@/stores/agent/model";
import { useAuthStore } from "@/utils/auth-utils-client";
import { useState } from "react";
import { toast } from "../use-toast";
import { VisibilityType } from "@prisma/client";
export const useAgentForm = (
  create: (obj: Data) => void,
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>,
  update: (obj: Data) => void,
  setIsEditOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const { session } = useAuthStore();
  const [payload, setPayload] = useState<Data>({
    agentName: "",
    systemInstruction: "",
    image: "",
    description: "",
    userId: "",
    toolsIds: [],
    visibilityType: VisibilityType.PRIVATE,
    temperature: 0.7,
  });

  const [describe, setDescribe] = useState("");
  const [buttonActive, setButtonActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setPayload((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTemperatureChange = (value: number[]) => {
    setPayload((prev) => ({
      ...prev,
      temperature: value[0],
    }));
  };

  const handleSave = (): boolean => {
    // Validate required fields
    if (!payload.agentName || !payload.systemInstruction) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields before saving.",
        variant: "destructive",
      });
      return false;
    }

    // Validate minimum length for system instruction
    if (payload.systemInstruction.trim().length < 10) {
      toast({
        title: "System Instruction Too Short",
        description: "System instruction should be at least 10 words long.",
        variant: "destructive",
      });
      return false;
    }

    payload.userId = session?.user.id as string;
    if (payload.visibilityType === null || payload.visibilityType === undefined) {
      payload.visibilityType = VisibilityType.PRIVATE;
    }

    try {
      create(payload);

      // Show success toast
      toast({
        title: "Agent Created",
        description: "Your new agent has been created successfully.",
      });
    } catch (error) {
      console.log(error);

      // Show error toast
      toast({
        title: "Error Creating Agent",
        description:
          "There was a problem creating your agent. Please try again.",
        variant: "destructive",
      });
      return false;
    }

    setIsOpen(false);
    return true;
  };

  const handleEdit = async (): Promise<boolean> => {
    // Validate required fields
    if (!payload.agentName || !payload.systemInstruction) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields before saving.",
        variant: "destructive",
      });
      return false;
    }

    // Validate minimum length for system instruction
    if (payload.systemInstruction.trim().length < 10) {
      toast({
        title: "System Instruction Too Short",
        description: "System instruction should be at least 10 words long.",
        variant: "destructive",
      });
      return false;
    }

    if (payload.visibilityType === null || payload.visibilityType === undefined) {
      payload.visibilityType = VisibilityType.PRIVATE;
    }

    setIsEditOpen(false);
    setIsLoading(true);

    try {
      const response = await update(payload);
      if (typeof response === "string") {
        toast({
          title: "Error",
          description: "Cannot update agent data!",
          variant: "destructive",
        });
        return false;
      } else {
        toast({
          title: "Success",
          description: "Agent updated successfully!",
        });
        return true;
      }
    } catch (error) {
      console.error("Error updating agent:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating the agent.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDescribeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;
    setDescribe(value);

    // Enable the generate button if there's enough content
    if (value.length > 10) {
      setButtonActive(true);
    } else {
      setButtonActive(false);
    }
  };

  const handleGenerateDescription = async () => {
    setIsLoading(true);
    try {
      // Check if session and backendToken are available
      if (!session?.user?.backendToken) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to generate AI instructions.",
          variant: "destructive",
        });
        setIsLoading(false);
        return null;
      }

      // Get the current agent name or use a default
      const agentName = payload.agentName || "AI Assistant";

      // Use the system instruction as context if available, otherwise use the describe field
      const context = payload.systemInstruction || describe;

      if (!context || context.trim().length < 5) {
        toast({
          title: "Insufficient Context",
          description:
            "Please provide more information about your agent before generating instructions.",
          variant: "destructive",
        });
        setIsLoading(false);
        return null;
      }

      const result = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL_V2}/chat/generate_agent_instruction`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.user.backendToken}`,
          },
          body: JSON.stringify({
            description: ` 
            The user request to create an Agent instruction with scope : ${context} and you are an assistant named ${agentName}`,
          }),
        }
      );

      if (!result.ok) {
        // Handle specific authentication errors
        if (result.status === 401) {
          toast({
            title: "Authentication Failed",
            description: "Your session has expired. Please sign in again.",
            variant: "destructive",
          });
          return null;
        }
        throw new Error(`API error: ${result.status}`);
      }

      const response = await result.json();
      const data = response.data;

      // Return the data for further processing
      return data;
    } catch (error) {
      console.error("Error generating description:", error);

      toast({
        title: "Generation Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate AI instructions",
        variant: "destructive",
      });

      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    payload,
    setPayload,
    handleInputChange,
    handleTemperatureChange,
    handleSave,
    handleEdit,
    handleGenerateDescription,
    handleDescribeChange,
    buttonActive,
    isLoading,
    setIsLoading,
  };
};
