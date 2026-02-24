import { useAuthStore } from "@/utils/auth-utils-client";
import { useState } from "react";

export const useToolGeneration = () => {
  const { session } = useAuthStore();
  const [describe, setDescribe] = useState("second");
  const [buttonActive, setButtonActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDescribeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescribe(e.target.value);
    if (e.target.value.length > 0) {
      setButtonActive(true);
    } else {
      setButtonActive(false);
    }
  };

  const handleGenerateDescription = async () => {
    setIsLoading(true);
    const result = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL_V2}/chat/generate_tool`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.user.backendToken}`,
        },
        body: JSON.stringify({
          description: describe,
        }),
      }
    );
    const data = await result.json();
    console.log(data);
    setIsLoading(false);
  };

  return {
    describe,
    buttonActive,
    handleDescribeChange,
    handleGenerateDescription,
    isLoading,
  };
};
