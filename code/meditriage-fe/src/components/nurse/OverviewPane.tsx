import React, { useState, useEffect, useRef } from 'react';
import { PatientCase, CareSetting, TriageStatus, User } from '../../types';
import { ToastType } from '../ui/Toast';
import PatientDetailModal from '../shared/PatientDetailModal';

interface OverviewPaneProps {
    activeCases: PatientCase[];
    careSetting: CareSetting;
    user: User;
    onNavigate: (view: string) => void;
    showToast: (msg: string, type: ToastType) => void;
    onRemoveCase: (id: string) => void;
    onUpdateCase?: (updatedCase: PatientCase) => void;
}

/** Status badge styling */
const getStatusInfo = (status: TriageStatus) => {
    switch (status) {
        case TriageStatus.IN_PROGRESS:
            return { label: 'In Progress', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
        case TriageStatus.AWAITING_REVIEW:
            return { label: 'Pending', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-400' };
        case TriageStatus.COMPLETED:
            return { label: 'Completed', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' };
        default:
            return { label: 'Unknown', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' };
    }
};

const OverviewPane: React.FC<OverviewPaneProps> = ({ activeCases, careSetting, user, onNavigate, showToast, onRemoveCase, onUpdateCase }) => {
    const isOPD = careSetting === CareSetting.OPD;
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [animKey, setAnimKey] = useState(0);
    const prevSetting = useRef(careSetting);

    // Patient detail modal state
    const [selectedPatient, setSelectedPatient] = useState<PatientCase | null>(null);
    const [showDetail, setShowDetail] = useState(false);

    const handleViewPatient = (c: PatientCase) => {
        setSelectedPatient(c);
        setShowDetail(true);
    };

    // When Care Setting changes → show spinner briefly, then re-animate content
    useEffect(() => {
        if (prevSetting.current !== careSetting) {
            prevSetting.current = careSetting;
            setIsTransitioning(true);
            const timer = setTimeout(() => {
                setIsTransitioning(false);
                setAnimKey(k => k + 1); // re-trigger widget animations
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [careSetting]);

    // KPI calculations
    const today = new Date().toDateString();
    const admittedToday = activeCases.filter(c => new Date(c.startTime).toDateString() === today);
    const waiting = activeCases.filter(c => c.status === TriageStatus.IN_PROGRESS || c.status === TriageStatus.AWAITING_REVIEW);
    const uniqueDoctors = new Set(activeCases.map(c => c.doctorName).filter(Boolean));
    const nurseTriages = activeCases.filter(c => c.nurseId === user.id);
    const sortedCases = [...activeCases].sort((a, b) => b.startTime - a.startTime);

    // Loading spinner during care setting switch
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
            {/* 3 KPI Widgets — staggered rise-up */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* KPI 1 */}
                <div className="animate-widget-0 bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col justify-between h-48 relative overflow-hidden group hover:shadow-lg transition-all">
                    <div className="absolute top-0 right-0 p-5">
                        <div className="w-14 h-14 bg-[#17406E]/5 rounded-full flex items-center justify-center border-[3px] border-[#17406E]/10">
                            <svg className="w-6 h-6 text-[#17406E]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </div>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {isOPD ? 'Admitted Today' : 'Triages Initiated'}
                    </p>
                    <span className="text-5xl font-extrabold text-gray-900 tracking-tight">
                        {isOPD ? admittedToday.length : nurseTriages.length}
                    </span>
                    <span className="bg-[#17406E]/5 text-[#17406E] text-xs font-bold px-3 py-1 rounded-full border border-[#17406E]/10 w-fit">
                        {isOPD ? 'Today' : 'By You'}
                    </span>
                </div>

                {/* KPI 2 */}
                <div className="animate-widget-1 bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col justify-between h-48 group hover:shadow-lg transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-5">
                        <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center border-[3px] border-amber-100">
                            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Awaiting Treatment</p>
                    <span className="text-5xl font-extrabold text-gray-900 tracking-tight">{waiting.length}</span>
                    <span className="bg-amber-50 text-amber-600 text-xs font-bold px-3 py-1 rounded-full border border-amber-200 w-fit">Pending</span>
                </div>

                {/* KPI 3 */}
                <div className="animate-widget-2 bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col justify-between h-48 group hover:shadow-lg transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-5">
                        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center border-[3px] border-emerald-100">
                            <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Attending Physicians</p>
                    <span className="text-5xl font-extrabold text-gray-900 tracking-tight">{uniqueDoctors.size}</span>
                    <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 w-fit">Assigned</span>
                </div>
            </div>

            {/* Recent Admissions Table */}
            <div className="animate-widget-3 bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-extrabold text-gray-900">Recent Admissions</h3>
                    <button onClick={() => onNavigate('patients')} className="px-6 py-2.5 bg-[#17406E] text-white text-xs font-bold rounded-full hover:bg-[#1c5b7e] transition-all">
                        View All
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs font-extrabold text-gray-400 uppercase border-b border-gray-100">
                                <th className="p-4">Patient ID</th>
                                <th className="p-4">Patient Name</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {sortedCases.slice(0, 5).map(c => {
                                const badge = getStatusInfo(c.status);
                                return (
                                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => handleViewPatient(c)}>
                                        <td className="p-4 text-sm font-mono text-gray-500 font-semibold">#MTP-{c.id.slice(0, 6).toUpperCase()}</td>
                                        <td className="p-4">
                                            <div className="text-[15px] font-bold text-gray-900">{c.patientName}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">{c.age ? `${c.age} years old` : 'Age N/A'} • {c.gender}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${badge.bg} ${badge.text} border ${badge.border}`}>
                                                <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                                                {badge.label}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={(e) => { e.stopPropagation(); handleViewPatient(c); }} className="px-[15px] py-[5px] border border-[#17406e61] rounded-full text-[13px] font-bold text-[#17406e] hover:bg-[#17406E] hover:text-white hover:border-[#17406E] transition-all">View</button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {sortedCases.length === 0 && (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-400">No patients in queue.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Patient Detail Modal */}
            <PatientDetailModal
                isOpen={showDetail}
                onClose={() => setShowDetail(false)}
                patient={selectedPatient}
                showToast={showToast}
                onRemoveCase={onRemoveCase}
                userRole={user.role}
                onUpdateCase={onUpdateCase}
            />
        </div>
    );
};

export default OverviewPane;
