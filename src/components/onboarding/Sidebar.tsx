import Step from "@/components/onboarding/Step";
import React from "react";

export default function Sidebar() {
  return (
    <aside className="hidden xl:flex xl:w-[274px] xl:h-[568px] xl:flex-col xl:shrink-0 rounded-lg xl:bg-[url('/images/bg-sidebar-desktop.svg')] xl:px-8 pt-10 xl:gap-8">
      <Step stepNumber={1} smallTitle="Step 1" sectionTitle="Your Info" />
      <Step stepNumber={2} smallTitle="Step 2" sectionTitle="Company Info" />
      <Step stepNumber={3} smallTitle="Step 3" sectionTitle="Terms of Services" />
      {/* <Step stepNumber={4} smallTitle="Step 4" sectionTitle="Summary" /> */}
      {/* <Step stepNumber={5} smallTitle="Step 5" sectionTitle="Summary" /> */}
    </aside>
  );
}
