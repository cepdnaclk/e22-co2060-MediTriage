import React from 'react';
import AnimatedModal from '../ui/AnimatedModal';

interface AnalyzingModalProps {
    isOpen: boolean;
}

/**
 * "AI is Analysing" overlay shown while the SOAP note is being generated.
 * No close handler — it auto-closes when analysis completes.
 */
const AnalyzingModal: React.FC<AnalyzingModalProps> = ({ isOpen }) => {
    return (
        <AnimatedModal isOpen={isOpen} onClose={() => { }} maxWidth="max-w-sm" zIndex={75}>
            <div className="bg-white rounded-[35px] p-10 shadow-2xl text-center">
                {/* Animated icon */}
                <div className="flex justify-center mb-6">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 rounded-full border-4 border-[#17406E]/10" />
                        <div className="absolute inset-0 rounded-full border-4 border-t-[#17406E] animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-8 h-8 text-[#17406E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2">AI is Analysing</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                    Generating clinical notes from the interview.<br />
                    This may take a few seconds...
                </p>
            </div>
        </AnimatedModal>
    );
};

export default AnalyzingModal;
