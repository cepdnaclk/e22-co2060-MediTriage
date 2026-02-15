import React from 'react';
import { PatientCase } from '../../types';

interface PatientViewModalProps {
    patient: PatientCase | null;
    isActive: boolean;
    onClose: () => void;
    onRemove: (id: string) => void;
    onEdit: (patient: PatientCase) => void;
}

const PatientViewModal: React.FC<PatientViewModalProps> = ({
    patient,
    isActive,
    onClose,
    onRemove,
    onEdit,
}) => {
    if (!patient) return null;

    const urgencyVal = patient.soapNote?.urgency;
    const avatarSrc = patient.gender === 'Female' ? '/assets/images/Female.png' : '/assets/images/Male.webp';

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-200/50 backdrop-blur-md transition-opacity" onClick={onClose} />
            <div className="bg-white rounded-[32px] w-full max-w-sm p-8 relative z-10 shadow-2xl animate-scale-up flex flex-col gap-5">

                {/* Header: Name + Close */}
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 leading-tight">{patient.patientName}</h2>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="bg-[#17406E] text-white text-[10px] font-bold px-2.5 py-1 rounded-md">#MTP-{patient.id.slice(0, 6).toUpperCase()}</span>
                            <span className="text-[11px] font-medium text-gray-400">{new Date(patient.startTime).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors mt-1">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Avatar */}
                <div className="flex justify-center my-2">
                    <div className="w-24 h-24 rounded-full bg-[#17406E]/10 border-4 border-[#17406E]/20 flex items-center justify-center overflow-hidden">
                        <img src={avatarSrc} alt={patient.gender} className="w-full h-full object-cover" />
                    </div>
                </div>

                {/* Age Card */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100" style={{ background: '#f2f2f7' }}>
                    <p className="text-[10px] font-bold text-[#17406E] uppercase tracking-wider mb-1">AGE</p>
                    <p className="text-lg font-black text-gray-900">{patient.age} Years</p>
                </div>

                {/* Chief Complaint */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100" style={{ background: '#f2f2f7' }}>
                    <p className="text-[10px] font-bold text-[#17406E] uppercase tracking-wider mb-1">CHIEF COMPLAINT</p>
                    <p className="text-sm font-semibold text-gray-700 leading-relaxed">
                        {patient.chiefComplaint}
                    </p>
                </div>

                {/* Action Buttons */}
                {isActive && (
                    <div className="flex items-center gap-3 mt-2" style={{ borderTop: '1px solid #e9e9e9', paddingTop: '30px', marginTop: '15px' }}>
                        <button
                            onClick={() => onRemove(patient.id)}
                            className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-2" style={{ borderRadius: '25px' }}
                        >
                            Remove
                        </button>
                        <button
                            onClick={() => onEdit(patient)}
                            className="flex-1 py-3.5 bg-[#17406E] text-white rounded-2xl font-bold text-sm hover:bg-[#1c5b7e] transition-all shadow-lg shadow-[#17406E]/20 flex items-center justify-center gap-2" style={{ borderRadius: '25px' }}
                        >
                            Edit Details
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default PatientViewModal;
