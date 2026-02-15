import React from 'react';

interface AdmitPatientModalProps {
    isOpen: boolean;
    formData: { name: string; age: string; gender: string; complaint: string };
    setFormData: (data: { name: string; age: string; gender: string; complaint: string }) => void;
    onStartInterview: () => void;
    onClose: () => void;
}

const AdmitPatientModal: React.FC<AdmitPatientModalProps> = ({
    isOpen,
    formData,
    setFormData,
    onStartInterview,
    onClose,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="bg-white rounded-[45px] w-full max-w-lg p-10 relative z-10 shadow-2xl transform transition-all scale-100" style={{ padding: '30px 30px 35px' }}>
                <div className="flex justify-between items-center mb-8" style={{ borderBottom: '1px solid #e3e3e3', paddingBottom: '20px', marginBottom: '30px' }}>
                    <h2 className="text-2xl font-extrabold text-gray-900">New Admission</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2 ml-1">Patient Name</label>
                        <input className="w-full bg-[#f0f2f7] border-0 rounded-[18px] px-[20px] py-[15px] text-gray-900 text-sm font-medium focus:ring-0 focus:outline-none transition-all placeholder-gray-400" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Full Name" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2 ml-1">Age</label>
                        <input className="w-full bg-[#f0f2f7] border-0 rounded-[18px] px-[20px] py-[15px] text-gray-900 text-sm font-medium focus:ring-0 focus:outline-none transition-all placeholder-gray-400" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} placeholder="Patient Age" />
                    </div>
                    <div style={{ margin: '30px 0 35px' }}>
                        <label className="block text-sm font-bold text-gray-900 mb-3 ml-1">Gender</label>
                        <div className="flex gap-6">
                            {['Male', 'Female', 'Prefer not to say'].map(g => (
                                <label key={g} className="flex items-center gap-2.5 cursor-pointer group" onClick={() => setFormData({ ...formData, gender: g })}>
                                    <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all ${formData.gender === g ? 'border-[#17406E]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                                        {formData.gender === g && <div className="w-2.5 h-2.5 rounded-full bg-[#17406E]" />}
                                    </div>
                                    <span className={`text-sm ${formData.gender === g ? 'text-[#17406E] font-bold' : 'text-gray-500 font-medium'}`}>{g}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2 ml-1">Chief Complaint</label>
                        <input className="w-full bg-[#f0f2f7] border-0 rounded-[18px] px-[20px] py-[15px] text-gray-900 text-sm font-medium focus:ring-0 focus:outline-none transition-all placeholder-gray-400" value={formData.complaint} onChange={e => setFormData({ ...formData, complaint: e.target.value })} placeholder="Main reason for visit" />
                    </div>
                </div>
                <div className="flex gap-3 mt-8" style={{ borderTop: '1px solid #e3e3e3', paddingTop: '30px', marginTop: '40px' }}>
                    <button onClick={onClose} className="flex-1 py-[15px] rounded-full border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all">Cancel</button>
                    <button onClick={onStartInterview} className="flex-1 py-[15px] rounded-full bg-[#17406E] text-white text-sm font-bold hover:bg-[#1c5b7e] transition-all">Start Triage Interview</button>
                </div>
            </div>
        </div>
    );
};

export default AdmitPatientModal;
