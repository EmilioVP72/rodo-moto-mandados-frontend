import { useEffect, useRef } from 'react';
import type React from 'react';

export function useBackdropClose(isOpen: boolean, onClose: () => void) {
  const pressedOnBackdropRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return {
    onMouseDown: (event: React.MouseEvent<HTMLElement>) => {
      pressedOnBackdropRef.current = event.target === event.currentTarget;
    },
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      if (pressedOnBackdropRef.current && event.target === event.currentTarget) {
        onCloseRef.current();
      }
      pressedOnBackdropRef.current = false;
    },
  };
}
