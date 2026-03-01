import React, { useState, useEffect } from 'react';
import AnimatedModal from '../ui/AnimatedModal';
import { PatientCase, TriageStatus } from '../../types';
import { ToastType } from '../ui/Toast';
import * as patientService from '../../services/patientService';
import * as triageService from '../../services/triageService';

interface AdmitPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStartInterview: (encounterId: string, newCase: PatientCase) => void;
    prefillData: any;
    showToast: (msg: string, type: ToastType) => void;
}


/**
 * Step 2 of patient registration — Demographics Form.
 * Creates patient in DB and starts triage interview.
 */
const AdmitPatientModal: React.FC<AdmitPatientModalProps> = ({ isOpen, onClose, onStartInterview, prefillData, showToast }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('');
    const [contactNo, setContactNo] = useState('');
    const [chiefComplaint, setChiefComplaint] = useState('');
    const [nic, setNic] = useState('');
    const [existingPatientId, setExistingPatientId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auto-fill from NIC gatekeeper result
    useEffect(() => {
        if (prefillData && isOpen) {
            setNic(prefillData.national_id || '');
            setFirstName(prefillData.first_name || '');
            setLastName(prefillData.last_name || '');
            setDob(prefillData.date_of_birth || '');
            setGender(prefillData.gender || '');
            setContactNo(prefillData.contact_number || '');
            setExistingPatientId(prefillData.id || null);
            setChiefComplaint('');
        }
    }, [prefillData, isOpen]);

    const resetForm = () => {
        setFirstName(''); setLastName(''); setDob(''); setGender('');
        setContactNo(''); setChiefComplaint(''); setNic('');
        setExistingPatientId(null); setIsSubmitting(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async () => {
        if (!firstName.trim() || !lastName.trim() || !dob || !chiefComplaint.trim()) {
            showToast('Please fill required fields', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            let patientId = existingPatientId;

            // Create patient if new
            if (!patientId) {
                const patient = await patientService.createPatient({
                    national_id: nic,
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    date_of_birth: dob,
                    gender: gender || undefined,
                    contact_number: contactNo || undefined,
                });
                patientId = patient.id;
            }

            // Start triage interview
            const interview = await triageService.startInterview(patientId!, chiefComplaint.trim());

            // Build case for local state
            const newCase: PatientCase = {
                id: interview.encounter_id,
                patientId: patientId!,
                patientName: `${firstName.trim()} ${lastName.trim()}`,
                age: dob ? String(new Date().getFullYear() - new Date(dob).getFullYear()) : '',
                gender: gender,
                chiefComplaint: chiefComplaint.trim(),
                nurseId: '',
                startTime: Date.now(),
                status: TriageStatus.IN_PROGRESS,
                messages: [],
                encounterId: interview.encounter_id,
            };

            showToast('Patient admitted — starting interview', 'success');
            resetForm();
            onStartInterview(interview.encounter_id, newCase);
        } catch (err: any) {
            showToast(err?.message || 'Failed to admit patient', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputStyle = "w-full px-4 py-3.5 rounded-[18px] text-sm font-medium text-gray-900 placeholder-gray-400 outline-none transition-all";
    const inputBg = { background: '#f0f2f7', border: '2px solid transparent' };

    return (
        <AnimatedModal isOpen={isOpen} onClose={handleClose} maxWidth="max-w-xl" zIndex={70}>
            <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-8 pt-8 pb-4">
                    <h3 className="text-xl font-bold text-gray-900">Add Patient</h3>
                    <p className="text-sm text-gray-500 mt-1">Enter the patient's demographic information</p>
                </div>

                {/* Form */}
                <div className="px-8 pb-4 space-y-4" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                    {/* Name Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">First Name *</label>
                            <input
                                type="text" placeholder="First Name" value={firstName}
                                onChange={e => setFirstName(e.target.value)}
                                className={inputStyle} style={inputBg}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Last Name *</label>
                            <input
                                type="text" placeholder="Last Name" value={lastName}
                                onChange={e => setLastName(e.target.value)}
                                className={inputStyle} style={inputBg}
                            />
                        </div>
                    </div>

                    {/* DOB */}
                    <div>

                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Date of Birth *</label>
                        <input
                            type="date" value={dob}
                            onChange={e => setDob(e.target.value)}
                            className={inputStyle} style={inputBg}
                        />
                    </div>

                    {/* Gender Radio */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2.5">Gender</label>
                        <div className="flex gap-4">
                            {[
                                { value: 'MALE', label: 'Male' },
                                { value: 'FEMALE', label: 'Female' },
                                { value: 'OTHER', label: 'Prefer not to say' },
                            ].map(opt => (
                                <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${gender === opt.value ? 'border-[#17406E] bg-[#17406E]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                                        {gender === opt.value && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <input type="radio" name="gender" value={opt.value} checked={gender === opt.value} onChange={e => setGender(e.target.value)} className="hidden" />
                                    <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Contact Number</label>
                        <input
                            type="tel" placeholder="Phone number" value={contactNo}
                            onChange={e => setContactNo(e.target.value)}
                            className={inputStyle} style={inputBg}
                        />
                    </div>

                    {/* Chief Complaint */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Chief Complaint *</label>
                        <textarea
                            placeholder="Describe the primary reason for visit"
                            value={chiefComplaint}
                            onChange={e => setChiefComplaint(e.target.value)}
                            rows={3}
                            className={`${inputStyle} resize-none`} style={inputBg}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 flex gap-3" style={{ borderTop: '1px solid #f0f0f0' }}>
                    <button onClick={handleClose} className="flex-1 py-3.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 py-3.5 text-sm font-bold text-white bg-[#17406E] rounded-full hover:bg-[#1c5b7e] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Starting...
                            </>
                        ) : (
                            'Start Triage Interview'
                        )}
                    </button>
                </div>
            </div>
        </AnimatedModal>
    );
};

export default AdmitPatientModal;
