"use client";

import React from "react";
import { Button } from '@/components/ui/button'
import { cn } from "@/utils/utils";
import useStore from '@/stores/onboarding/useStore'

type TFooter = {
  className?: string;
  onHandleNextStep?: () => void;
  onHandlePreviousStep?: () => void;
};

export default function Footer({
  className,
  onHandleNextStep,
  onHandlePreviousStep,
}: TFooter) {
  
  const step = useStore((state) => state.step);
  const isNextButtonDisabled = useStore((state) => state.isNextButtonDisabled);

  return (
    <footer
      className={cn(
        "p-4 bg-c-neutral-white flex items-center justify-between",
        className
      )}
    >
      {step === 1 && <div className="w-full" />}

      {step > 1 && (
        <Button
          variant="ghost"
          className="text-c-neutral-cool-gray hover:text-c-primary-marine-blue"
          onClick={onHandlePreviousStep}
        >
          Go Back
        </Button>
      )}
      <Button
        className={cn(
          "bg-c-primary-marine-blue text-c-neutral-white hover:bg-c-primary-marine-blue-hover",
          // {
          //   "bg-c-primary-purplish-blue hover:bg-c-primary-purplish-hover":
          //     step === 4,
          // }
        )}
        onClick={onHandleNextStep}
        disabled={isNextButtonDisabled}
      >
        {step === 3 ? "Confirm" : "Next Step"}
      </Button>
    </footer>
  );
}
