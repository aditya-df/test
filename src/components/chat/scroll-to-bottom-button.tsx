"use client";

import { memo } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "../ui/button";

interface ScrollToBottomButtonProps {
  show: boolean;
  onClick: () => void;
}

export const ScrollToBottomButton = memo(({
  show,
  onClick,
}: ScrollToBottomButtonProps) => {
  if (!show) return null;

  return (
    <Button
      variant="outline"
      size="icon"
      className="absolute bottom-24 right-4 z-50 rounded-full shadow-lg bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border-gray-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800"
      onClick={onClick}
    >
      <ChevronDown className="h-5 w-5" />
    </Button>
  );
});

ScrollToBottomButton.displayName = "ScrollToBottomButton";
