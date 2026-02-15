import React from 'react';
import { PatientCase } from '../../types';
import { getStatusBadge, getWaitTimeMinutes } from '../../utils/helpers';
import CustomSelect from '../ui/CustomSelect';

interface QueuePaneProps {
    activeCases: PatientCase[];
    queueFilter: string;
    setQueueFilter: (val: string) => void;
    queueSearch: string;
    setQueueSearch: (val: string) => void;
    queueGenderFilter: string;
    setQueueGenderFilter: (val: string) => void;
    queueVisibleCount: number;
    setQueueVisibleCount: React.Dispatch<React.SetStateAction<number>>;
    onViewPatient: (patient: PatientCase) => void;
}

const QueuePane: React.FC<QueuePaneProps> = ({
    activeCases,
    queueFilter,
    setQueueFilter,
    queueSearch,
    setQueueSearch,
    queueGenderFilter,
    setQueueGenderFilter,
    queueVisibleCount,
    setQueueVisibleCount,
    onViewPatient,
}) => {
    // Search + Filter logic
    const searchTerm = queueSearch.toLowerCase();
    const displayedQueue = activeCases.filter(c => {
        if (queueFilter === 'Immediate' && c.soapNote?.urgency !== 'RED') return false;
        if (queueFilter === 'Urgent' && c.soapNote?.urgency !== 'YELLOW') return false;
        if (queueFilter === 'Routine' && c.soapNote?.urgency !== 'GREEN') return false;
        if (queueGenderFilter !== 'All' && c.gender !== queueGenderFilter) return false;
        if (searchTerm && !c.patientName.toLowerCase().includes(searchTerm) && !c.id.toLowerCase().includes(searchTerm)) return false;
        return true;
    });

    const visibleQueue = displayedQueue.slice(0, queueVisibleCount);
    const remaining = displayedQueue.length - queueVisibleCount;

    const dropdownBtnStyle: React.CSSProperties = { lineHeight: '28px', borderRadius: '20px', background: 'white', padding: '10px 13px 10px 20px' };

    return (
        <div className="animate-fade-in flex flex-col mb-12">
            {/* Search + Filter Toolbar */}
            <div className="flex items-center gap-4" style={{ background: '#f2f2f7', borderRadius: '20px', padding: '0', margin: '-15px 0 30px' }}>
                <div className="flex items-center gap-3 flex-1" style={{ background: 'white', borderRadius: '20px', padding: '15px 20px' }}>
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        placeholder="Search patient name or ID..."
                        value={queueSearch}
                        onChange={e => { setQueueSearch(e.target.value); setQueueVisibleCount(10); }}
                        className="w-full bg-transparent 
                     !border-0 !outline-none !shadow-none shadow-[0px_20px_40px_-10px_rgba(0,0,0,0.05)]
                     focus:!border-0 focus:!outline-none focus:!shadow-none
                     text-sm font-medium text-gray-900 placeholder-gray-400"
                    />
                    {queueSearch && (
                        <button
                            onClick={() => { setQueueSearch(''); setQueueVisibleCount(10); }}
                            className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
                <div className="w-48 flex-shrink-0">
                    <CustomSelect
                        value={queueFilter}
                        options={[
                            { value: 'All', label: 'All Status' },
                            { value: 'Immediate', label: 'Immediate' },
                            { value: 'Urgent', label: 'Urgent' },
                            { value: 'Routine', label: 'Routine' }
                        ]}
                        onChange={(val: string) => { setQueueFilter(val); setQueueVisibleCount(10); }}
                        buttonStyle={dropdownBtnStyle}
                    />
                </div>
                <div className="w-44 flex-shrink-0">
                    <CustomSelect
                        value={queueGenderFilter}
                        options={[
                            { value: 'All', label: 'All Gender' },
                            { value: 'Male', label: 'Male' },
                            { value: 'Female', label: 'Female' }
                        ]}
                        onChange={(val: string) => { setQueueGenderFilter(val); setQueueVisibleCount(10); }}
                        buttonStyle={dropdownBtnStyle}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm py-[20px] px-[25px] w-full flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs font-extrabold text-gray-400 uppercase border-b border-gray-100">
                                <th className="p-4">Status</th>
                                <th className="p-4">ID</th>
                                <th className="p-4">Patient Name</th>
                                <th className="p-4">Wait Time</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {visibleQueue.map(c => {
                                const badge = getStatusBadge(c.soapNote?.urgency);
                                return (
                                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => onViewPatient(c)}>
                                        <td className="p-4">
                                            <span className={`inline-flex uppercase items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${badge.bgColor} ${badge.textColor} border ${badge.borderColor}`}>
                                                <span className={`w-2 h-2 rounded-full ${badge.dotColor}`}></span>
                                                {badge.label}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm font-mono text-gray-500 font-semibold">
                                            #MTP-{c.id.slice(0, 6).toUpperCase()}
                                        </td>
                                        <td className="p-4 text-[15px] font-bold text-gray-900">{c.patientName}</td>
                                        <td className="p-4 text-sm font-semibold"><span className="text-gray-600">{getWaitTimeMinutes(c.startTime)}m</span></td>
                                        <td className="p-4 text-right">
                                            <button className="px-[15px] py-[5px] border border-[#17406e61] rounded-full text-[13px] font-bold text-[#17406e] hover:bg-[#17406E] hover:text-white hover:border-[#17406E] transition-all">
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {displayedQueue.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-medium">No matching patients.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {remaining > 0 && (
                    <div className="flex justify-center mt-4 mb-2">
                        <button
                            onClick={() => setQueueVisibleCount(prev => prev + 5)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-[#17406E]/5 text-[#17406E] text-sm font-bold rounded-full hover:bg-[#17406E] hover:text-white border border-[#17406E]/15 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                            Load More ({remaining} remaining)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QueuePane;
