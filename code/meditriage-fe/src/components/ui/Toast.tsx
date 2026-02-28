import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
  const [phase, setPhase] = useState<'idle' | 'entering' | 'visible' | 'exiting'>('idle');

  useEffect(() => {
    if (isVisible) {
      setPhase('entering');
      // After enter animation completes, switch to visible
      const enterTimer = setTimeout(() => setPhase('visible'), 400);
      // Auto-dismiss after 3s
      const dismissTimer = setTimeout(() => setPhase('exiting'), 3000);
      // After exit animation, close
      const closeTimer = setTimeout(() => {
        setPhase('idle');
        onClose();
      }, 3350);
      return () => {
        clearTimeout(enterTimer);
        clearTimeout(dismissTimer);
        clearTimeout(closeTimer);
      };
    } else {
      setPhase('idle');
    }
  }, [isVisible]);

  if (phase === 'idle') return null;

  const borderColors = {
    success: 'border-l-emerald-500',
    error: 'border-l-red-500',
    info: 'border-l-blue-500',
  };

  const icons = {
    success: (
      <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    ),
    error: (
      <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    ),
    info: (
      <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    ),
  };

  const animClass = phase === 'exiting' ? 'animate-toast-out' : 'animate-toast-in';

  return (
    <div
      className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 bg-white rounded-2xl shadow-2xl border-l-4 ${borderColors[type]} ${animClass}`}
      style={{ minWidth: 280, maxWidth: 400 }}
    >
      {icons[type]}
      <p className="font-bold text-sm text-gray-900 leading-snug">{message}</p>
    </div>
  );
};

export default Toast;
