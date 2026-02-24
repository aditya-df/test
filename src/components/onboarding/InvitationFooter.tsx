'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/utils';

type InvitationFooterProps = {
  onSubmit: () => void;
};

export default function InvitationFooter({ onSubmit }: InvitationFooterProps) {
  return (
    <footer className="mt-6 flex justify-end">
      <Button
        type="button"
        onClick={onSubmit}
        className={cn(
          "bg-c-primary-marine-blue text-white hover:bg-c-primary-marine-blue-hover"
        )}
      >
        Submit
      </Button>
    </footer>
  );
}
