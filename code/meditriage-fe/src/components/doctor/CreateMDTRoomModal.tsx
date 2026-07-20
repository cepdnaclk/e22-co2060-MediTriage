import React, { useState, useEffect } from 'react';
import AnimatedModal from '../ui/AnimatedModal';
import CustomSelect from '../ui/CustomSelect';
import { User, PatientCase, TriageStatus } from '../../types';
import { ToastType } from '../ui/Toast';
import * as triageService from '../../services/triageService';
import * as mdtService from '../../services/mdtService';

interface CreateMDTRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (roomId: string) => void;
    showToast: (msg: string, type: ToastType) => void;
    user: User;
}

const CreateMDTRoomModal: React.FC<CreateMDTRoomModalProps> = ({ isOpen, onClose, onCreated, showToast, user }) => {
    const [title, setTitle] = useState('');
    const [selectedEncounter, setSelectedEncounter] = useState('');
    const [selectedDoctors, setSelectedDoctors] = useState<Set<string>>(new Set());
    
    const [myCases, setMyCases] = useState<{value: string, label: string}[]>([]);
    const [allDoctors, setAllDoctors] = useState<triageService.DoctorOption[]>([]);
    
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setSelectedEncounter('');
            setSelectedDoctors(new Set());
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        setIsLoadingData(true);
        try {
            // Fetch encounters
            const encounters = await triageService.listEncounters();
            // Filter to only own cases (any status)
            const ownCases = encounters.filter(e => 
                e.doctor_id === user.id
            ).map(e => {
                const d = new Date(e.encounter_timestamp);
                const dateStr = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
                return {
                    value: e.id,
                    label: `${e.patient_name} – ${dateStr} (${e.status.replace('_', ' ')})`
                };
            });
            setMyCases(ownCases);

            // Fetch doctors
            const doctors = await triageService.getDoctors();
            setAllDoctors(doctors.filter(d => d.id !== user.id)); // Exclude self
        } catch (error) {
            showToast('Unable to load required data', 'error');
        } finally {
            setIsLoadingData(false);
        }
    };

    const toggleDoctor = (id: string) => {
        const newSet = new Set(selectedDoctors);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedDoctors(newSet);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !selectedEncounter) {
            showToast('All required fields must be completed', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const newRoom = await mdtService.createRoom(
                selectedEncounter,
                title.trim(),
                Array.from(selectedDoctors)
            );
            showToast('MDT conference created successfully', 'success');
            onCreated(newRoom.id);
            onClose();
        } catch (error: any) {
            showToast(error.message || 'Failed to create conference', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputStyle = "w-full px-4 py-3.5 rounded-[18px] text-sm font-medium text-gray-900 placeholder-gray-400 outline-none transition-all";
    const inputBg = { background: '#f0f2f7', border: '2px solid transparent' };

    const selectStyle: React.CSSProperties = {
        background: '#f0f2f7',
        border: '2px solid transparent',
        borderRadius: '18px',
        padding: '12px 16px',
        width: '100%',
        color: '#111827',
        fontSize: '14px',
        fontWeight: 500
    };

    return (
        <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl">
            <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden relative">
                {/* Header */}
                <div className="px-8 pt-6 pb-4 flex justify-between items-start" style={{ borderBottom: '1px solid rgb(240, 240, 240)' }}>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">New MDT Conference</h3>
                        <p className="text-sm text-gray-500 mt-1">Create a new discussion room</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 relative -right-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {isLoadingData ? (
                    <div className="py-12 flex justify-center">
                        <div className="w-8 h-8 border-4 border-[#17406E] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {/* Form Body */}
                        <div className="px-8 py-6 space-y-4" style={{ maxHeight: '55vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Conference Title <span style={{ color: 'red' }}>*</span></label>
                                <input
                                type="text"
                                required
                                maxLength={255}
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. Cardiology review – Patient X"
                                    className={inputStyle} style={inputBg}
                                />
                            </div>

                            {/* Encounter */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Linked Patient Encounter <span style={{ color: 'red' }}>*</span></label>
                                <CustomSelect 
                                    value={selectedEncounter} 
                                    options={[{value: '', label: 'Select a patient...'}, ...myCases]} 
                                    onChange={setSelectedEncounter} 
                                    buttonStyle={selectStyle} 
                                />
                                {myCases.length === 0 && (
                                    <div className="bg-[#f0f2f7] rounded-[18px] p-6 flex flex-col items-center text-center">
                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-3 text-gray-400">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-bold text-gray-900 mb-1">No eligible patients found</p>
                                    </div>
                                )}
                            </div>

                            {/* Invite Doctors */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Invite Additional Doctors</label>
                                <div className="rounded-[18px] overflow-hidden" style={inputBg}>
                                    {allDoctors.length === 0 ? (
                                        <div className="p-4 text-sm text-gray-500 text-center font-medium">No other doctors available.</div>
                                    ) : (
                                        <div className="divide-y divide-gray-100">
                                            {allDoctors.map(doc => (
                                                <label key={doc.id} className="flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer transition-colors">
                                                    <div className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center shrink-0 transition-all ${selectedDoctors.has(doc.id) ? 'border-[#17406E] bg-[#17406E]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                                                        {selectedDoctors.has(doc.id) && (
                                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedDoctors.has(doc.id)}
                                                        onChange={() => toggleDoctor(doc.id)}
                                                        className="hidden"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-gray-900 truncate">{doc.full_name}</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 mt-2 font-medium">You can always add or remove doctors later.</p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-5 flex gap-3" style={{ borderTop: '1px solid #f0f0f0' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="flex-1 py-3.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSubmitting || !title.trim() || !selectedEncounter}
                                className="flex-1 py-3.5 text-sm font-bold text-white bg-[#17406E] rounded-full hover:bg-[#1c5b7e] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Conference'
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </AnimatedModal>
    );
};

export default CreateMDTRoomModal;
