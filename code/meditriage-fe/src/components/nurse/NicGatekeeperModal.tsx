import React, { useState } from 'react';
import AnimatedModal from '../ui/AnimatedModal';
import * as patientService from '../../services/patientService';

interface NicGatekeeperModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProceed: (patientData: any) => void;
}

/**
 * Step 1 of patient registration — NIC Gatekeeper.
 * Prompts nurse to enter the patient's NIC.
 * If found in DB, auto-fills the demographics form in Step 2.
 */
const NicGatekeeperModal: React.FC<NicGatekeeperModalProps> = ({ isOpen, onClose, onProceed }) => {
    const [nic, setNic] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleProceed = async () => {
        if (!nic.trim()) return;
        setIsLoading(true);

        try {
            // Search for existing patient by NIC
            const results = await patientService.searchPatients({ nic: nic.trim() });
            if (results.length > 0) {
                // Patient found — pass data for auto-fill
                onProceed(results[0]);
            } else {
                // New patient — proceed with only NIC
                onProceed({ national_id: nic.trim() });
            }
        } catch {
            // API error — proceed with NIC only
            onProceed({ national_id: nic.trim() });
        } finally {
            setIsLoading(false);
            setNic('');
        }
    };

    const handleClose = () => {
        setNic('');
        setIsLoading(false);
        onClose();
    };

    return (
        <AnimatedModal isOpen={isOpen} onClose={handleClose} maxWidth="max-w-md" zIndex={70}>
            <div className="bg-white rounded-[35px] p-8 shadow-2xl">
                {/* Icon */}
                <div className="flex justify-center mb-5">
                    <div className="w-16 h-16 bg-[#17406E]/5 rounded-full flex items-center justify-center border-[3px] border-[#17406E]/10">
                        <svg className="w-7 h-7 text-[#17406E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                    </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Patient Identification</h3>
                <p className="text-sm text-gray-500 text-center mb-6">Enter the patient's National Identity Card number</p>

                {/* NIC Input */}
                <input
                    type="text"
                    placeholder="Enter NIC Number"
                    value={nic}
                    onChange={e => setNic(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && nic.trim()) handleProceed(); }}
                    autoFocus
                    className="w-full px-5 py-4 rounded-[18px] text-sm font-medium text-gray-900 placeholder-gray-400 outline-none transition-all"
                    style={{ background: '#f0f2f7', border: '2px solid transparent' }}
                    onFocus={e => (e.target.style.borderColor = '#17406E')}
                    onBlur={e => (e.target.style.borderColor = 'transparent')}
                />

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={handleClose}
                        className="flex-1 py-3.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleProceed}
                        disabled={!nic.trim() || isLoading}
                        className="flex-1 py-3.5 text-sm font-bold text-white bg-[#17406E] rounded-full hover:bg-[#1c5b7e] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Proceeding
                            </>
                        ) : (
                            'Proceed'
                        )}
                    </button>
                </div>
            </div>
        </AnimatedModal>
    );
};

export default NicGatekeeperModal;
