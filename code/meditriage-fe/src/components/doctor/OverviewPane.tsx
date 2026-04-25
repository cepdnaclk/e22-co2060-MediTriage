import React, { useState, useEffect } from 'react';
import { PatientCase, User, CareSetting, TriageStatus } from '../../types';
import PatientDetailModal from '../shared/PatientDetailModal';
import DiagnosisModal from './DiagnosisModal';
import * as triageService from '../../services/triageService';

interface DoctorOverviewPaneProps {
    activeCases: PatientCase[];
    careSetting: CareSetting;
    user: User;
    onNavigate: (view: string) => void;
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
    onRemoveCase: (id: string) => void;
    onUpdateCase: (updatedCase: PatientCase) => void;
}

const DoctorOverviewPane: React.FC<DoctorOverviewPaneProps> = ({ activeCases, careSetting, user, onNavigate, showToast, onRemoveCase, onUpdateCase }) => {
    const [animKey, setAnimKey] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        setIsTransitioning(true);
        const timer = setTimeout(() => {
            setAnimKey(prev => prev + 1);
            setIsTransitioning(false);
        }, 150);
        return () => clearTimeout(timer);
    }, [careSetting]);

    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<PatientCase | null>(null);
    const [currentNote, setCurrentNote] = useState<{ subjective: string | null; objective: string | null; assessment: string | null; plan: string | null; } | null>(null);
    const [isLoadingNote, setIsLoadingNote] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Filter cases assigned to THIS doctor
    const myCases = activeCases.filter(c => c.doctorId === user.id);

    const treatedToday = myCases.filter(c => c.status === TriageStatus.COMPLETED);
    const waitingPatients = myCases.filter(c => c.status !== TriageStatus.COMPLETED);

    const handleViewClick = (c: PatientCase) => {
        setSelectedPatient(c);
        setShowDetailModal(true);
    };

    const handleStartDiagnosis = async (patient: PatientCase) => {
        setSelectedPatient(patient);
        setIsLoadingNote(true);
        setShowDiagnosisModal(true);

        try {
            const note = await triageService.getClinicalNote(patient.id);
            setCurrentNote({
                subjective: note.subjective,
                objective: note.objective,
                assessment: note.assessment,
                plan: note.plan
            });
        } catch (error) {
            console.error('Failed to fetch clinical note, providing empty form:', error);
            // Instead of closing the modal, provide an empty note so the doctor can still diagnose
            setCurrentNote({
                subjective: '',
                objective: '',
                assessment: '',
                plan: ''
            });
            showToast('No clinical notes found. You can enter them manually.', 'info');
        } finally {
            setIsLoadingNote(false);
        }
    };

    const handleSaveDiagnosis = async (noteData: { subjective: string; objective: string; assessment: string; plan: string }) => {
        if (!selectedPatient) return;
        setIsSaving(true);
        try {
            await triageService.updateClinicalNote(selectedPatient.id, {
                is_finalized: true,
                ...noteData
            });
            showToast('Diagnosis saved and patient treated', 'success');
            setShowDiagnosisModal(false);

            // Update local state immediately without waiting for poll
            onUpdateCase({
                ...selectedPatient,
                status: TriageStatus.COMPLETED
            });
        } catch (error) {
            console.error('Failed to save diagnosis:', error);
            showToast('Failed to save diagnosis', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Recent Assignments (sorted by most recent encounter, max 5)
    const recentAdmissions = [...myCases]
        .sort((a, b) => b.startTime - a.startTime)
        .slice(0, 5);

    const getStatusLabel = (status: TriageStatus) => {
        switch (status) {
            case TriageStatus.IN_PROGRESS: return { label: 'In Progress', bg: 'bg-blue-50/80', text: 'text-blue-700', dot: 'bg-blue-500' };
            case TriageStatus.AWAITING_REVIEW: return { label: 'Pending', bg: 'bg-yellow-50/80', text: 'text-yellow-700', dot: 'bg-yellow-500' };
            case TriageStatus.COMPLETED: return { label: 'Completed', bg: 'bg-green-50/80', text: 'text-green-700', dot: 'bg-green-500' };
            default: return { label: 'Unknown', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
        }
    };

    if (isTransitioning) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-[#17406E] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-medium text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div key={animKey} className="space-y-8 pb-12 animate-content-enter">
            {/* KPI Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* KPI 1 */}
                <div className="animate-widget-0 bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col justify-between h-48 relative overflow-hidden group hover:shadow-lg transition-all">
                    <div className="absolute top-0 right-0 p-5">
                        <div className="w-14 h-14 bg-[#17406E]/5 rounded-full flex items-center justify-center border-[3px] border-[#17406E]/10">
                            <svg className="w-6 h-6 text-[#17406E]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                        </div>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Total Treated Today
                    </p>
                    <span className="text-5xl font-extrabold text-gray-900 tracking-tight">
                        {treatedToday.length}
                    </span>
                    <span className="bg-[#17406E]/5 text-[#17406E] text-xs font-bold px-3 py-1 rounded-full border border-[#17406E]/10 w-fit">
                        {careSetting}
                    </span>
                </div>

                {/* KPI 2 */}
                <div className="animate-widget-1 bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col justify-between h-48 group hover:shadow-lg transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-5">
                        <div className="w-14 h-14 bg-yellow-50 rounded-full flex items-center justify-center border-[3px] border-yellow-100/50">
                            <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Waiting Patients</p>
                    <span className="text-5xl font-extrabold text-gray-900 tracking-tight">{waitingPatients.length}</span>
                    <span className="bg-yellow-50 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full border border-yellow-100/50 w-fit">
                        Requires Action
                    </span>
                </div>
            </div>

            {/* Recent Admissions Table */}
            <div className="animate-widget-2 bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Recent Assignments</h3>
                        <p className="text-sm text-gray-500 mt-1">Patients assigned to your care</p>
                    </div>
                    <button onClick={() => onNavigate('patients')} className="text-sm font-bold text-[#17406E] hover:text-[#1c5b7e] transition-colors flex items-center gap-1">
                        View All
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>

                {recentAdmissions.length === 0 ? (
                    <div className="p-16 text-center text-gray-500">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                        </div>
                        <p className="font-medium text-gray-900">No patients assigned yet</p>
                        <p className="text-sm mt-1">When a nurse assigns a patient to you, they will appear here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-left rounded-tl-3xl">Patient ID</th>
                                    <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-left">Patient Name</th>
                                    <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-left">Status</th>
                                    <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right rounded-tr-3xl">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {recentAdmissions.map((record) => {
                                    const statusInfo = getStatusLabel(record.status);
                                    return (
                                        <tr key={record.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                                    #{record.patientId?.substring(0, 8).toUpperCase() || 'NEW'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-[#17406E]/10 text-[#17406E] flex items-center justify-center font-bold text-sm">
                                                    {record.patientName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{record.patientName}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{record.age} years old • {record.gender}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusInfo.bg} ${statusInfo.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button onClick={() => handleViewClick(record)} className="px-4 py-2 text-xs font-bold text-[#17406E] bg-gray-100 rounded-full hover:bg-gray-200 transition-colors border border-transparent">
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Patient Detail Modal */}
            <PatientDetailModal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                patient={selectedPatient}
                showToast={showToast}
                onRemoveCase={onRemoveCase}
                userRole={user.role}
                onStartDiagnosing={handleStartDiagnosis}
            />

            {/* Diagnosis Modal */}
            <DiagnosisModal
                isOpen={showDiagnosisModal}
                onClose={() => setShowDiagnosisModal(false)}
                patientName={selectedPatient?.patientName || ''}
                note={isLoadingNote ? null : currentNote}
                onSave={handleSaveDiagnosis}
                isSaving={isSaving}
            />
        </div>
    );
};

export default DoctorOverviewPane;
