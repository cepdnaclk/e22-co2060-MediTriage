import React from 'react';
import AnimatedModal from '../ui/AnimatedModal';

interface SOAPNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    note: {
        subjective: string | null;
        objective: string | null;
        assessment: string | null;
        plan: string | null;
    } | null;
    doctorName: string;
    onDeleteRecord?: () => void;
}

/**
 * Read-only SOAP note viewer modal.
 * Shows all 4 SOAP fields in disabled form style.
 * Used for viewing historical encounter notes.
 */
const SOAPNoteModal: React.FC<SOAPNoteModalProps> = ({ isOpen, onClose, note, doctorName, onDeleteRecord }) => {
    const fieldStyle: React.CSSProperties = {
        background: '#f0f2f7',
        borderRadius: '18px',
        padding: '16px 20px',
        fontSize: '14px',
        lineHeight: '1.7',
        color: '#4b5563',
        border: 'none',
        fontWeight: 500,
        minHeight: '60px',
    };

    return (
        <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl" zIndex={80}>
            <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-8 pt-8 pb-3">
                    <h3 className="text-xl font-bold text-gray-900">Clinical Notes</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {doctorName ? `Treated by ${doctorName}` : 'SOAP note details'}
                    </p>
                </div>

                {/* Content */}
                <div className="px-8 pb-4 space-y-4" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Subjective</label>
                        <div style={fieldStyle} className="whitespace-pre-wrap">{note?.subjective || '—'}</div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Objective</label>
                        <div style={fieldStyle} className="whitespace-pre-wrap">{note?.objective || '—'}</div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Assessment</label>
                        <div style={fieldStyle} className="whitespace-pre-wrap">{note?.assessment || '—'}</div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Plan</label>
                        <div style={fieldStyle} className="whitespace-pre-wrap">{note?.plan || '—'}</div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 flex gap-3" style={{ borderTop: '1px solid #f0f0f0' }}>
                    {onDeleteRecord && (
                        <button
                            onClick={onDeleteRecord}
                            className="py-3.5 px-5 text-sm font-semibold text-red-500 bg-red-50 rounded-full hover:bg-red-100 transition-colors"
                        >
                            Delete Record
                        </button>
                    )}
                    <div className="flex-1" />
                    <button
                        onClick={onClose}
                        className="py-3.5 px-8 text-sm font-semibold text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </AnimatedModal>
    );
};

export default SOAPNoteModal;
