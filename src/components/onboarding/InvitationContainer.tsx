'use client';

import React from 'react';
import { cn } from '@/utils/utils';
import InvitationFooter from './InvitationFooter'; 
import SectionHeader from './SectionHeader';

type InvitationContainerProps = {
  children: React.ReactNode;
  onSubmit: () => void;
};

export default function InvitationContainer({ children, onSubmit }: InvitationContainerProps) {
  return (
    <section className={cn("w-full max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md")}>
      <SectionHeader
        title="Personal Information"
        description="Please provide your detailed personal information to complete your registration."
      />
      <div className="mt-6">
        {children}
      </div>
      <InvitationFooter onSubmit={onSubmit} />
    </section>
  );
}
