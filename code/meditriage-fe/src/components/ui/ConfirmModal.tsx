import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onCancel} />
      <div className="bg-white rounded-[35px] w-full max-w-sm p-8 relative z-10 shadow-2xl animate-scale-up text-center">
        {isDestructive ? (
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-red-50 text-red-500">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-[#17406E]/10 text-[#17406E]">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </div>
        )}

        <h3 className="text-xl font-extrabold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 mb-8 leading-relaxed">{description}</p>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-[25px] border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-[25px] text-sm font-bold text-white transition-all ${isDestructive
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-[#17406E] hover:bg-[#1c5b7e]'
              }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
