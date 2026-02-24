import { useRef, useEffect } from 'react';

export function useAgentDialog() {
  const viewDialogContentRef = useRef<HTMLDivElement>(null);
  const editDialogContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const setupScrolling = (contentRef: React.RefObject<HTMLDivElement | null>) => {
      const content = contentRef.current;
      if (!content) return;

      // Set max height and enable scrolling
      content.style.maxHeight = '80vh';
      content.style.overflow = 'auto';
    };

    setupScrolling(viewDialogContentRef);
    setupScrolling(editDialogContentRef);
  }, []);
  return {
    viewDialogContentRef,
    editDialogContentRef
  };
}