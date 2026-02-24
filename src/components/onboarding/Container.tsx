import Sidebar from './Sidebar'
import { cn } from "@/utils/utils";
import React from "react";
import Footer from "./Footer";
import useStore from '@/stores/onboarding/useStore'

type TContainer = {
  children: React.ReactNode;
  className?: string;
  onNext: () => void;
  onPreviousStep?: () => void;
};

export default function Container({
  children,
  className,
  onNext,
  onPreviousStep,
}: TContainer) {
  const { isSubmitted } = useStore((state) => state);
  return (
    <>
      <section
        className={cn(
          "w-[20rem] px-6 py-8 xl:px-[100px] xl:pt-10 bg-c-neutral-white xl:flex lg:w-[600px] xl:w-[1200px] rounded-[15px] c-shadow",
          "absolute top-[103px] xl:static xl:mx-auto left-1/2 -translate-x-1/2 xl:left-0 xl:-translate-x-0 xl:mt-[50px] xl:p-4",
          "min-h-[500px] xl:min-h-[600px]",
          "flex flex-col xl:flex-row xl:gap-[100px]",
          className
        )}
      >
        <Sidebar />
        <div className="w-full xl:mr-[80px] flex flex-col grow">
          {children}
          {!isSubmitted && (
            <Footer
              className="hidden lg:flex mt-auto"
              onHandleNextStep={onNext}
              onHandlePreviousStep={onPreviousStep}
            />
          )}
        </div>
      </section>
      {!isSubmitted && (
        <Footer
          className={cn(
            "flex lg:hidden fixed bottom-0 left-0 right-0"
          )}
          onHandleNextStep={onNext}
          onHandlePreviousStep={onPreviousStep}
        />
      )}
    </>
  );
}
