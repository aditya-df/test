"use client";

import { UIMessage } from "ai";

// Helper function to format dates
export const formatDate = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

// Helper function to extract text content from parts (AI SDK 5.0)
export const getTextFromParts = (message: UIMessage): string => {
  if (!message.parts || message.parts.length === 0) {
    return "";
  }

  return message.parts
    .filter((part: any) => part.type === "text")
    .map((part: any) => part.text)
    .join(" ");
};
