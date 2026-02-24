import { Loader2 } from "lucide-react";
import { createPortal } from "react-dom";

export const SubmitLoading: React.FC = () => {
  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-background/80 backdrop-blur-xs">
      <div className="rounded-md bg-white dark:bg-grey-950 p-8 shadow-lg">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-blue-400" />
          <h2 className="text-xl font-semibold dark:text-white">Loading...</h2>
          <p className="text-sm text-muted-foreground dark:text-gray-400">
            Please wait while we process your request.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
};
