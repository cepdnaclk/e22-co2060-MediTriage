import React, { useState, useEffect } from 'react';
import AnimatedModal from '../ui/AnimatedModal';

interface DiagnosisModalProps {
    isOpen: boolean;
    onClose: () => void;
    note: {
        subjective: string | null;
        objective: string | null;
        assessment: string | null;
        plan: string | null;
    } | null;
    patientName: string;
    onSave: (note: { subjective: string; objective: string; assessment: string; plan: string }) => void;
    isSaving?: boolean;
    showToast?: (msg: string, type: any) => void;
}

/**
 * Diagnosis Modal for Doctors.
 * Allows editing all 4 SOAP fields and saving them.
 */
const DiagnosisModal: React.FC<DiagnosisModalProps> = ({ isOpen, onClose, note, patientName, onSave, isSaving = false, showToast }) => {
    const [formData, setFormData] = useState({
        subjective: '',
        objective: '',
        assessment: '',
        plan: ''
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                subjective: note?.subjective || '',
                objective: note?.objective || '',
                assessment: note?.assessment || '',
                plan: note?.plan || ''
            });
        }
    }, [isOpen, note]);

    const handleChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleSave = () => {
        if (!formData.assessment.trim()) {
            if (showToast) {
                showToast('Please provide an Assessment (Diagnosis) before marking as treated.', 'error');
            } else {
                alert('Please provide an Assessment (Diagnosis) before marking as treated.');
            }
            return;
        }
        onSave(formData);
    };

    const fieldStyle = "w-full bg-[#f0f2f7] hover:bg-[#eef0f6] focus:bg-white rounded-[18px] px-5 py-4 text-sm font-medium text-gray-800 placeholder-gray-400 border-2 border-transparent focus:border-[#17406E]/30 focus:ring-4 focus:ring-[#17406E]/5 outline-none transition-all resize-y min-h-[100px]";

    return (
        <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" zIndex={80}>
            <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-10 pt-10 pb-4 shrink-0">
                    <h3 className="text-2xl font-bold text-gray-900">Diagnosis & Treatment</h3>
                    <p className="text-sm font-medium text-gray-500 mt-1">
                        Patient: <span className="text-[#17406E] font-bold">{patientName}</span>
                    </p>
                </div>

                {/* Content - Scrollable */}
                <div className="px-10 pb-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Subjective (Symptoms & History)</label>
                        <textarea
                            value={formData.subjective}
                            onChange={handleChange('subjective')}
                            className={fieldStyle}
                            placeholder="Patient's reported symptoms, history of present illness..."
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Objective (Physical Exam & Vitals)</label>
                        <textarea
                            value={formData.objective}
                            onChange={handleChange('objective')}
                            className={fieldStyle}
                            placeholder="Vital signs, physical examination findings, lab results..."
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Assessment (Diagnosis)</label>
                        <textarea
                            value={formData.assessment}
                            onChange={handleChange('assessment')}
                            className={fieldStyle}
                            placeholder="Medical diagnosis, differential diagnoses..."
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Plan (Treatment & Follow-up)</label>
                        <textarea
                            value={formData.plan}
                            onChange={handleChange('plan')}
                            className={fieldStyle}
                            placeholder="Prescriptions, procedures, referrals, follow-up instructions..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-10 py-6 shrink-0 flex gap-4 bg-gray-50/50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="py-4 px-8 text-sm font-bold text-gray-600 bg-white rounded-full border-2 border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <div className="flex-1" />
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="py-4 px-10 text-sm font-bold text-white bg-[#17406E] rounded-full hover:bg-[#1c5b7e] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#17406E]/20 hover:shadow-xl hover:shadow-[#17406E]/30 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                Mark as Treated
                                <svg className="w-5 h-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </AnimatedModal>
    );
};

export default DiagnosisModal;
