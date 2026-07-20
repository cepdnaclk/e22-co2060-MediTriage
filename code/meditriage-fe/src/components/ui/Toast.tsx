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
  }, [isVisible, onClose]);

  if (phase === 'idle') return null;

  const icons = {
    error: (
      <svg className="w-[22px] h-[22px] text-[#ff6b6b] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-[22px] h-[22px] text-[#22c55e] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-[22px] h-[22px] text-[#3b82f6] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const animClass = phase === 'exiting' ? 'animate-toast-out' : 'animate-toast-in';

  return (
    <div
      className={`fixed top-6 right-6 z-[200] flex items-center justify-between gap-3 py-3.5 px-4 bg-white rounded-2xl shadow-[0_4px_30px_rgb(0,0,0,0.08)] border border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${animClass}`}
      style={{ minWidth: 320, maxWidth: 450 }}
      onClick={() => {
        if (phase === 'visible' || phase === 'entering') {
          setPhase('exiting');
          setTimeout(() => {
            onClose();
          }, 350);
        }
      }}
    >
      <div className="flex items-center gap-3.5">
        {icons[type]}
        <p className="font-semibold text-[14.5px] text-gray-800 tracking-tight">{message}</p>
      </div>
      <div className="ml-2 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    </div>
  );
};

export default Toast;
