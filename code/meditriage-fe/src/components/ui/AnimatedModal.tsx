import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  zIndex?: number;
  /** Set false to prevent closing on backdrop click */
  closeOnBackdrop?: boolean;
}

/**
 * Reusable animated modal wrapper.
 * Uses a React portal to render at document.body level,
 * ensuring the modal is always centered on the full viewport
 * regardless of parent elements (sidebar, header, etc.).
 */
const AnimatedModal: React.FC<AnimatedModalProps> = ({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-lg',
  zIndex = 60,
  closeOnBackdrop = true,
}) => {
  const [visible, setVisible] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setAnimatingOut(false);
    } else if (visible) {
      setAnimatingOut(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setAnimatingOut(false);
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdrop) onClose();
  }, [closeOnBackdrop, onClose]);

  if (!visible) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex }}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/35 backdrop-blur-sm ${animatingOut ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in'
          }`}
        onClick={handleBackdropClick}
      />

      {/* Modal Content */}
      <div
        className={`relative w-full ${maxWidth} ${animatingOut ? 'animate-modal-content-out' : 'animate-modal-content-in'
          }`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default AnimatedModal;
