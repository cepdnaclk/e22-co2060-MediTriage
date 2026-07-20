import React, { useState, useEffect } from 'react';
import AnimatedModal from '../ui/AnimatedModal';
import ConfirmModal from '../ui/ConfirmModal';
import SOAPNoteModal from './SOAPNoteModal';
import { PatientCase, TriageStatus } from '../../types';
import { ToastType } from '../ui/Toast';
import * as patientService from '../../services/patientService';
import * as triageService from '../../services/triageService';

interface PatientDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: PatientCase | null;
    showToast: (msg: string, type: ToastType) => void;
    onRemoveCase: (id: string) => void;
    userRole?: string;
    onStartDiagnosing?: (patient: PatientCase) => void;
    onUpdateCase?: (updatedCase: PatientCase) => void;
}

const HISTORY_PAGE_SIZE = 3;

const getStatusLabel = (status: TriageStatus) => {
    switch (status) {
        case TriageStatus.IN_PROGRESS: return { label: 'Active', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' };
        case TriageStatus.AWAITING_REVIEW: return { label: 'Pending', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' };
        case TriageStatus.COMPLETED: return { label: 'Completed', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' };
        default: return { label: 'Unknown', bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' };
    }
};

const PatientDetailModal: React.FC<PatientDetailModalProps> = ({ isOpen, onClose, patient, showToast, onRemoveCase, userRole, onStartDiagnosing, onUpdateCase }) => {
    const [history, setHistory] = useState<patientService.EncounterSummary[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDeleteRecordConfirm, setShowDeleteRecordConfirm] = useState(false);
    const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);
    const [showSoapNote, setShowSoapNote] = useState(false);
    const [soapNote, setSoapNote] = useState<any>(null);
    const [soapDoctorName, setSoapDoctorName] = useState('');

    // Edit modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editDob, setEditDob] = useState('');
    const [editGender, setEditGender] = useState('');
    const [editContact, setEditContact] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Patient details from DB
    const [patientDetails, setPatientDetails] = useState<patientService.PatientResponse | null>(null);

    // History pagination
    const [historyPage, setHistoryPage] = useState(0);

    useEffect(() => {
        if (isOpen && patient?.patientId) {
            setHistoryPage(0);
            setLoadingHistory(true);
            patientService.getPatientHistory(patient.patientId)
                .then(h => setHistory(h))
                .catch(() => setHistory([]))
                .finally(() => setLoadingHistory(false));

            // Fetch full patient details by ID
            patientService.getPatient(patient.patientId)
                .then(p => {
                    setPatientDetails(p);
                    // If age is missing in the case but we have DOB now, sync it back
                    if (p.date_of_birth && patient && !patient.age && onUpdateCase) {
                        const calculatedAge = calculateAge(p.date_of_birth);
                        if (calculatedAge !== null) {
                            onUpdateCase({ ...patient, age: String(calculatedAge) });
                        }
                    }
                })
                .catch(() => setPatientDetails(null));
        } else {
            setHistory([]);
            setPatientDetails(null);
        }
    }, [isOpen, patient?.patientId]);

    if (!patient) return null;

    const statusInfo = getStatusLabel(patient.status);
    // Only show past encounters, not the current active one
    const pastHistory = patient.encounterId
        ? history.filter(h => h.id !== patient.encounterId)
        : history;
    const totalHistoryPages = Math.max(1, Math.ceil(pastHistory.length / HISTORY_PAGE_SIZE));
    const paginatedHistory = pastHistory.slice(historyPage * HISTORY_PAGE_SIZE, (historyPage + 1) * HISTORY_PAGE_SIZE);

    const handleDelete = async () => {
        try {
            if (patient.patientId) await patientService.deletePatient(patient.patientId);
            onRemoveCase(patient.id);
            showToast('Patient record deleted', 'success');
            setShowDeleteConfirm(false);
            onClose();
        } catch (err: any) {
            showToast(err?.message || 'Failed to delete patient', 'error');
            setShowDeleteConfirm(false);
        }
    };

    const handleViewSoapNote = async (encounterId: string, doctorName: string) => {
        try {
            const note = await triageService.getClinicalNote(encounterId);
            setSoapNote(note);
            setSoapDoctorName(doctorName);
            setSelectedEncounterId(encounterId);
            setShowSoapNote(true);
        } catch {
            showToast('Clinical notes are currently unavailable', 'error');
        }
    };

    const handleEditOpen = () => {
        setEditFirstName(patientDetails?.first_name || patient.patientName.split(' ')[0] || '');
        setEditLastName(patientDetails?.last_name || patient.patientName.split(' ').slice(1).join(' ') || '');
        setEditDob(patientDetails?.date_of_birth || '');
        setEditGender(patientDetails?.gender || patient.gender || '');
        setEditContact(patientDetails?.contact_number || '');
        setShowEditModal(true);
    };

    const handleEditSave = async () => {
        if (!patient.patientId) return;
        setIsSavingEdit(true);
        try {
            const updated = await patientService.updatePatient(patient.patientId, {
                first_name: editFirstName,
                last_name: editLastName,
                ...(editDob ? { date_of_birth: editDob } : {}),
                ...(editGender ? { gender: editGender } : {}),
                ...(editContact ? { contact_number: editContact } : {}),
            });
            setPatientDetails(updated);
            showToast('Patient record updated', 'success');
            setShowEditModal(false);
        } catch (err: any) {
            showToast(err?.message || 'Failed to update', 'error');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const inputStyle = "w-full px-4 py-3.5 rounded-[18px] text-sm font-medium text-gray-900 placeholder-gray-400 outline-none transition-all";
    const inputBg: React.CSSProperties = { background: '#f0f2f7', border: '2px solid transparent' };

    const formatDate = (dateStr: string) => {
        try { return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
        catch { return dateStr; }
    };

    const calculateAge = (dob: string) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    return (
        <>
            <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl" zIndex={70}>
                <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col" style={{ height: '-webkit-fill-available' }}>
                    {/* Header */}
                    <div className="px-8 pt-7 pb-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{patientDetails ? `${patientDetails.first_name} ${patientDetails.last_name}` : patient.patientName}</h3>
                            <p className="text-sm text-gray-500 mt-0.5 font-mono">#MTP-{patient.id.slice(0, 6).toUpperCase()}</p>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Two-column content — fills remaining height */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-8 pb-8 pt-4 flex-1 min-h-0 overflow-hidden">
                        {/* Left Column — full height, scrollable */}
                        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
                            {/* Profile Card — avatar + age only */}
                            <div className="bg-[#f5f5f5] rounded-[28px] p-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-14 h-14 bg-[#17406E]/10 rounded-full flex items-center justify-center text-[#17406E] text-lg font-bold shrink-0">
                                        {patient.patientName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{patientDetails ? `${patientDetails.first_name} ${patientDetails.last_name}` : patient.patientName}</p>
                                        <p className="text-xs text-gray-500">
                                            {patientDetails?.date_of_birth
                                                ? `${calculateAge(patientDetails.date_of_birth)} years old`
                                                : (patient.age ? `${patient.age} years old` : 'N/A')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Patient Details */}
                            <div className="bg-[#f5f5f5] rounded-[28px] p-6 space-y-3">
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Gender</span>
                                    <p className="text-sm font-medium text-gray-800 mt-1">{patientDetails?.gender || patient.gender || 'N/A'}</p>
                                </div>
                                <div className="h-px bg-gray-200/60" />
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Date of Birth</span>
                                    <p className="text-sm font-medium text-gray-800 mt-1">{patientDetails?.date_of_birth ? formatDate(patientDetails.date_of_birth) : 'N/A'}</p>
                                </div>
                                <div className="h-px bg-gray-200/60" />
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Contact Number</span>
                                    <p className="text-sm font-medium text-gray-800 mt-1">{patientDetails?.contact_number || 'N/A'}</p>
                                </div>
                                <div className="h-px bg-gray-200/60" />
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">NIC</span>
                                    <p className="text-sm font-medium text-gray-800 font-mono mt-1">{patientDetails?.national_id || 'N/A'}</p>
                                </div>
                                <div className="h-px bg-gray-200/60" />
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Registered</span>
                                    <p className="text-sm font-medium text-gray-800 mt-1">{patientDetails?.created_at ? formatDate(patientDetails.created_at) : 'N/A'}</p>
                                </div>
                            </div>

                            {userRole !== 'DOCTOR' && (
                                <div className="flex gap-3">
                                    <button onClick={handleEditOpen} className="flex-1 py-3 text-sm font-bold text-white bg-[#17406E] rounded-full hover:bg-[#1c5b7e] transition-colors">
                                        Edit Patient
                                    </button>
                                    {userRole === 'ADMIN' && (
                                        <button onClick={() => setShowDeleteConfirm(true)} className="py-3 px-5 text-sm font-semibold text-red-500 bg-red-50 rounded-full hover:bg-red-100 transition-colors">
                                            Delete
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right Column — Status + History */}
                        <div className="flex flex-col gap-4 overflow-y-auto pl-1">
                            {/* Status Card */}
                            <div className="bg-[#f5f5f5] rounded-[28px] p-6 space-y-4">
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Status</span>
                                    <div className="mt-2">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusInfo.bg} ${statusInfo.text}`}>
                                            <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                                            {statusInfo.label}
                                        </span>
                                    </div>
                                </div>
                                <div className="h-px bg-gray-200/60" />
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Attending Physician</span>
                                    <p className="text-sm font-semibold text-gray-800 mt-2">{patient.doctorName || 'Unassigned'}</p>
                                </div>
                                {patient.encounterId && (
                                    <>
                                        <div className="h-px bg-gray-200/60" />
                                        {(userRole === 'DOCTOR' && patient.status === TriageStatus.AWAITING_REVIEW && onStartDiagnosing) ? (
                                            <button
                                                onClick={() => {
                                                    onClose();
                                                    onStartDiagnosing(patient);
                                                }}
                                                className="w-full py-2.5 text-sm font-bold text-white bg-blue-600 rounded-full hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all"
                                            >
                                                Start Diagnosing
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleViewSoapNote(patient.encounterId!, patient.doctorName || '')}
                                                className="w-full py-2.5 text-sm font-bold text-[#17406E] bg-white rounded-full border border-[#17406E]/15 hover:bg-[#17406E]/5 transition-colors"
                                            >
                                                View Record
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Visit History with Pagination */}
                            <div className="flex-1 flex flex-col">
                                <h4 className="text-sm font-bold text-gray-900 mb-3">Visit History</h4>
                                {loadingHistory ? (
                                    <div className="flex justify-center py-8">
                                        <div className="w-6 h-6 border-3 border-[#17406E] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : history.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-6">No previous visits</p>
                                ) : (
                                    <>
                                        <div className="space-y-2 flex-1">
                                            {paginatedHistory.map(h => (
                                                <div key={h.id} className="bg-[#f5f5f5] rounded-[20px] px-5 py-4 flex items-center justify-between group hover:bg-gray-200/70 transition-colors cursor-pointer" onClick={() => handleViewSoapNote(h.id, h.doctor_name || '')}>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-800">{h.doctor_name || 'Unassigned'}</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(h.encounter_timestamp)}</p>
                                                    </div>
                                                    <button className="px-3 py-1.5 text-xs font-bold text-[#17406E] bg-white rounded-full border border-[#17406E]/15 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        View
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        {totalHistoryPages > 1 && (
                                            <div className="flex items-center justify-center gap-4 mt-3 pt-2">
                                                <button
                                                    onClick={() => setHistoryPage(p => Math.max(0, p - 1))}
                                                    disabled={historyPage === 0}
                                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                                </button>
                                                <span className="text-xs font-semibold text-gray-500">Page {historyPage + 1} of {totalHistoryPages}</span>
                                                <button
                                                    onClick={() => setHistoryPage(p => Math.min(totalHistoryPages - 1, p + 1))}
                                                    disabled={historyPage >= totalHistoryPages - 1}
                                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </AnimatedModal>

            {/* Edit Patient Modal */}
            <AnimatedModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="max-w-xl" zIndex={80}>
                <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden">
                    <div className="px-8 pt-8 pb-4">
                        <h3 className="text-xl font-bold text-gray-900">Edit Patient</h3>
                        <p className="text-sm text-gray-500 mt-1">Update the patient's information</p>
                    </div>
                    <div className="px-8 pb-4 space-y-4" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">First Name *</label>
                                <input type="text" placeholder="First Name" value={editFirstName} onChange={e => setEditFirstName(e.target.value)} className={inputStyle} style={inputBg} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Last Name *</label>
                                <input type="text" placeholder="Last Name" value={editLastName} onChange={e => setEditLastName(e.target.value)} className={inputStyle} style={inputBg} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Date of Birth</label>
                            <input type="date" value={editDob} max={new Date().toISOString().split('T')[0]} onChange={e => setEditDob(e.target.value)} className={inputStyle} style={inputBg} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2.5">Gender</label>
                            <div className="flex gap-4">
                                {[
                                    { value: 'MALE', label: 'Male' },
                                    { value: 'FEMALE', label: 'Female' },
                                    { value: 'OTHER', label: 'Prefer not to say' },
                                ].map(opt => (
                                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${editGender === opt.value ? 'border-[#17406E] bg-[#17406E]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                                            {editGender === opt.value && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                        <input type="radio" name="editGender" value={opt.value} checked={editGender === opt.value} onChange={e => setEditGender(e.target.value)} className="hidden" />
                                        <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Contact Number</label>
                            <input type="tel" placeholder="07X XXX XXXX" value={editContact} onChange={e => setEditContact(e.target.value)} className={inputStyle} style={inputBg} />
                        </div>
                    </div>
                    <div className="px-8 py-5 flex gap-3" style={{ borderTop: '1px solid #f0f0f0' }}>
                        <button onClick={() => setShowEditModal(false)} className="flex-1 py-3.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">Cancel</button>
                        <button onClick={handleEditSave} disabled={isSavingEdit} className="flex-1 py-3.5 text-sm font-bold text-white bg-[#17406E] rounded-full hover:bg-[#1c5b7e] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {isSavingEdit ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</> : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </AnimatedModal>

            <ConfirmModal isOpen={showDeleteConfirm} title="Delete Patient?" description="This action cannot be undone. All associated records will be permanently removed." confirmLabel="Delete" isDestructive onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />

            <SOAPNoteModal isOpen={showSoapNote} onClose={() => setShowSoapNote(false)} note={soapNote} doctorName={soapDoctorName} onDeleteRecord={userRole === 'ADMIN' ? () => { setShowSoapNote(false); setShowDeleteRecordConfirm(true); } : undefined} />

            <ConfirmModal isOpen={showDeleteRecordConfirm} title="Delete Record?" description="This will permanently delete the clinical record for this encounter." confirmLabel="Delete" isDestructive onConfirm={() => { setShowDeleteRecordConfirm(false); showToast('Administrator privileges are required to delete records', 'info'); }} onCancel={() => setShowDeleteRecordConfirm(false)} />
        </>
    );
};

export default PatientDetailModal;
