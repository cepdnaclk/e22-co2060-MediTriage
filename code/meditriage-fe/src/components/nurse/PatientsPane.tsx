import React, { useState } from 'react';
import { PatientCase, TriageStatus, User } from '../../types';
import CustomSelect from '../ui/CustomSelect';
import PatientDetailModal from '../shared/PatientDetailModal';
import { ToastType } from '../ui/Toast';

interface PatientsPaneProps {
    cases: PatientCase[];
    user: User;
    showToast: (msg: string, type: ToastType) => void;
    onRemoveCase: (id: string) => void;
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

const PatientsPane: React.FC<PatientsPaneProps> = ({ cases, user, showToast, onRemoveCase }) => {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [genderFilter, setGenderFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('All');
    const [visibleCount, setVisibleCount] = useState(10);

    // Patient detail modal
    const [selectedPatient, setSelectedPatient] = useState<PatientCase | null>(null);
    const [showDetail, setShowDetail] = useState(false);

    // Filter logic
    const filteredCases = cases.filter(c => {
        const term = search.toLowerCase();
        if (term && !c.patientName.toLowerCase().includes(term) && !c.id.toLowerCase().includes(term)) return false;
        if (statusFilter === 'In Progress' && c.status !== TriageStatus.IN_PROGRESS) return false;
        if (statusFilter === 'Pending' && c.status !== TriageStatus.AWAITING_REVIEW) return false;
        if (statusFilter === 'Completed' && c.status !== TriageStatus.COMPLETED) return false;
        if (genderFilter !== 'All' && c.gender !== genderFilter) return false;
        if (dateFilter !== 'All') {
            const diffDays = Math.floor((Date.now() - c.startTime) / (1000 * 60 * 60 * 24));
            if (dateFilter === 'Last 7 Days' && diffDays > 7) return false;
            if (dateFilter === 'Last 30 Days' && diffDays > 30) return false;
        }
        return true;
    }).sort((a, b) => b.startTime - a.startTime);

    const visibleCases = filteredCases.slice(0, visibleCount);
    const remaining = filteredCases.length - visibleCount;

    const dropdownBtnStyle: React.CSSProperties = { lineHeight: '28px', borderRadius: '20px', background: 'white', padding: '10px 13px 10px 20px' };

    const handleViewPatient = (c: PatientCase) => {
        setSelectedPatient(c);
        setShowDetail(true);
    };

    return (
        <div className="animate-fade-in flex flex-col mb-12">
            {/* Search + Filter Toolbar */}
            <div className="flex items-center gap-4 flex-wrap" style={{ padding: '0', margin: '-15px 0 30px' }}>
                {/* Search */}
                <div className="flex items-center gap-3 flex-1 min-w-[280px]" style={{ background: 'white', borderRadius: '20px', padding: '15px 20px' }}>
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text" placeholder="Search by name or ID..."
                        value={search} onChange={e => { setSearch(e.target.value); setVisibleCount(10); }}
                        className="search-input w-full bg-transparent !border-0 !outline-none !shadow-none text-sm font-medium text-gray-900 placeholder-gray-400"
                    />
                    {search && (
                        <button onClick={() => { setSearch(''); setVisibleCount(10); }} className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>

                {/* Date */}
                <div className="w-44 flex-shrink-0">
                    <CustomSelect value={dateFilter} options={[
                        { value: 'All', label: 'All Time' },
                        { value: 'Last 7 Days', label: 'Last 7 Days' },
                        { value: 'Last 30 Days', label: 'Last 30 Days' },
                    ]} onChange={(val: string) => { setDateFilter(val); setVisibleCount(10); }} buttonStyle={dropdownBtnStyle} />
                </div>

                {/* Status */}
                <div className="w-44 flex-shrink-0">
                    <CustomSelect value={statusFilter} options={[
                        { value: 'All', label: 'All Status' },
                        { value: 'In Progress', label: 'In Progress' },
                        { value: 'Pending', label: 'Pending' },
                        { value: 'Completed', label: 'Completed' },
                    ]} onChange={(val: string) => { setStatusFilter(val); setVisibleCount(10); }} buttonStyle={dropdownBtnStyle} />
                </div>

                {/* Gender */}
                <div className="w-40 flex-shrink-0">
                    <CustomSelect value={genderFilter} options={[
                        { value: 'All', label: 'All Gender' },
                        { value: 'MALE', label: 'Male' },
                        { value: 'FEMALE', label: 'Female' },
                        { value: 'OTHER', label: 'Prefer Not to Say' },
                    ]} onChange={(val: string) => { setGenderFilter(val); setVisibleCount(10); }} buttonStyle={dropdownBtnStyle} />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm py-[20px] px-[25px] w-full flex flex-col">
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
                            {visibleCases.map(c => {
                                const badge = getStatusInfo(c.status);
                                return (
                                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => handleViewPatient(c)}>
                                        <td className="p-4 text-sm font-mono text-gray-500 font-semibold">#MTP-{c.id.slice(0, 6).toUpperCase()}</td>
                                        <td className="p-4 text-[15px] font-bold text-gray-900">{c.patientName}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${badge.bg} ${badge.text} border ${badge.border}`}>
                                                <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                                                {badge.label}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={(e) => { e.stopPropagation(); handleViewPatient(c); }} className="px-[15px] py-[5px] border border-[#17406e61] rounded-full text-[13px] font-bold text-[#17406e] hover:bg-[#17406E] hover:text-white hover:border-[#17406E] transition-all">
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredCases.length === 0 && (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-400 font-medium">No patients found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {remaining > 0 && (
                    <div className="flex justify-center mt-4 mb-2">
                        <button onClick={() => setVisibleCount(prev => prev + 10)} className="flex items-center gap-2 px-6 py-2.5 bg-[#17406E]/5 text-[#17406E] text-sm font-bold rounded-full hover:bg-[#17406E] hover:text-white border border-[#17406E]/15 transition-all">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                            Load More ({remaining} remaining)
                        </button>
                    </div>
                )}
            </div>

            {/* Patient Detail Modal */}
            <PatientDetailModal
                isOpen={showDetail}
                onClose={() => setShowDetail(false)}
                patient={selectedPatient}
                showToast={showToast}
                onRemoveCase={onRemoveCase}
                userRole={user.role}
            />
        </div>
    );
};

export default PatientsPane;
