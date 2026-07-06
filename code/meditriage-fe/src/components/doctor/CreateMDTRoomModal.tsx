import React, { useState, useEffect } from 'react';
import AnimatedModal from '../ui/AnimatedModal';
import Button from '../ui/Button';
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
            showToast('Failed to load required data', 'error');
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
            showToast('Please fill in required fields', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const newRoom = await mdtService.createRoom(
                selectedEncounter,
                title.trim(),
                Array.from(selectedDoctors)
            );
            showToast('Conference created successfully', 'success');
            onCreated(newRoom.id);
            onClose();
        } catch (error: any) {
            showToast(error.message || 'Failed to create conference', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectStyle: React.CSSProperties = {
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '12px 16px',
        width: '100%',
        color: '#111827',
        fontSize: '14px',
        fontWeight: 500
    };

    return (
        <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidth="w-full max-w-lg">
            <div className="bg-white rounded-[32px] shadow-2xl p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-[#17406E]/10 rounded-full flex items-center justify-center shrink-0">
                        <svg className="w-6 h-6 text-[#17406E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">New MDT Conference</h2>
                        <p className="text-sm text-gray-500 font-medium">Create a new discussion room</p>
                    </div>
                </div>

                {isLoadingData ? (
                    <div className="py-12 flex justify-center">
                        <div className="w-8 h-8 border-4 border-[#17406E] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Conference Title <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                maxLength={255}
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. Cardiology review – Patient X"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#17406E]/20 focus:border-[#17406E] transition-all"
                            />
                        </div>

                        {/* Encounter */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Linked Patient Encounter <span className="text-red-500">*</span></label>
                            {myCases.length > 0 ? (
                                <CustomSelect 
                                    value={selectedEncounter} 
                                    options={[{value: '', label: 'Select a patient...'}, ...myCases]} 
                                    onChange={setSelectedEncounter} 
                                    buttonStyle={selectStyle} 
                                />
                            ) : (
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 flex flex-col items-center text-center">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-3 text-gray-400">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 mb-1">No eligible patients found</p>
                                    <p className="text-xs text-gray-500 max-w-[250px]">
                                        Conferences can only be created for patients assigned to you.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Invite Doctors */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Invite Additional Doctors</label>
                            <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 max-h-48 overflow-y-auto">
                                {allDoctors.length === 0 ? (
                                    <div className="p-4 text-sm text-gray-500 text-center font-medium">No other doctors available.</div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {allDoctors.map(doc => (
                                            <label key={doc.id} className="flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer transition-colors">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedDoctors.has(doc.id)}
                                                    onChange={() => toggleDoctor(doc.id)}
                                                    className="w-4 h-4 text-[#17406E] bg-white border-gray-300 rounded focus:ring-[#17406E]"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 truncate">{doc.full_name}</p>
                                                    {doc.license_number && <p className="text-xs text-gray-500 truncate">{doc.license_number}</p>}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mt-2 font-medium">You can always add or remove doctors later.</p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-6 py-2.5 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <Button 
                                type="submit" 
                                isLoading={isSubmitting} 
                                disabled={isSubmitting || !title.trim() || !selectedEncounter}
                            >
                                Create Conference
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </AnimatedModal>
    );
};

export default CreateMDTRoomModal;
