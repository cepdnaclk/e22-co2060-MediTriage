import React from 'react';
import { PatientCase, TriageStatus } from '../../types';
import CustomSelect from '../ui/CustomSelect';

interface HistoryPaneProps {
    historyCases: PatientCase[];
    historyFilter: string;
    setHistoryFilter: (val: string) => void;
    historySearch: string;
    setHistorySearch: (val: string) => void;
    historyGenderFilter: string;
    setHistoryGenderFilter: (val: string) => void;
    onViewPatient: (patient: PatientCase) => void;
    onRemove: (id: string) => void;
}

const HistoryPane: React.FC<HistoryPaneProps> = ({
    historyCases,
    historyFilter,
    setHistoryFilter,
    historySearch,
    setHistorySearch,
    historyGenderFilter,
    setHistoryGenderFilter,
    onViewPatient,
    onRemove,
}) => {
    const searchTerm = historySearch.toLowerCase();
    const displayedHistory = historyCases.filter(c => {
        if (historyFilter === 'Treated' && c.status !== TriageStatus.TREATED) return false;
        if (historyFilter === 'Removed' && c.status !== TriageStatus.REMOVED) return false;
        if (historyGenderFilter !== 'All' && c.gender !== historyGenderFilter) return false;
        if (searchTerm && !c.patientName.toLowerCase().includes(searchTerm) && !c.id.toLowerCase().includes(searchTerm)) return false;
        return true;
    });

    const dropdownBtnStyle: React.CSSProperties = { lineHeight: '28px', borderRadius: '20px', background: 'white', padding: '10px 13px 10px 20px' };

    return (
        <div className="animate-fade-in flex flex-col mb-12">
            {/* Search + Filter Toolbar */}
            <div className="flex items-center gap-4" style={{ background: '#f2f2f7', borderRadius: '20px', padding: '0', margin: '-15px 0 30px' }}>
                <div className="flex items-center gap-3 flex-1" style={{ background: 'white', borderRadius: '20px', padding: '15px 20px' }}>
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        placeholder="Search history records..."
                        value={historySearch}
                        onChange={e => setHistorySearch(e.target.value)}
                        className="w-full bg-transparent 
                     !border-0 !outline-none !shadow-none
                     focus:!border-0 focus:!outline-none focus:!shadow-none
                     text-sm font-medium text-gray-900 placeholder-gray-400"
                    />
                    {historySearch && (
                        <button
                            onClick={() => setHistorySearch('')}
                            className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
                <div className="w-48 flex-shrink-0">
                    <CustomSelect
                        value={historyFilter}
                        options={[
                            { value: 'All', label: 'All Records' },
                            { value: 'Treated', label: 'Treated' },
                            { value: 'Removed', label: 'Removed' }
                        ]}
                        onChange={setHistoryFilter}
                        buttonStyle={dropdownBtnStyle}
                    />
                </div>
                <div className="w-44 flex-shrink-0">
                    <CustomSelect
                        value={historyGenderFilter}
                        options={[
                            { value: 'All', label: 'All Gender' },
                            { value: 'Male', label: 'Male' },
                            { value: 'Female', label: 'Female' }
                        ]}
                        onChange={setHistoryGenderFilter}
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
                                <th className="p-4">Disposition</th>
                                <th className="p-4">ID</th>
                                <th className="p-4">Patient Name</th>
                                <th className="p-4">Visit Date</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {displayedHistory.map(c => (
                                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => onViewPatient(c)}>
                                    <td className="p-4">
                                        <span className={`inline-flex uppercase items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${c.status === TriageStatus.TREATED
                                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                                            : 'bg-gray-100 text-gray-600 border-gray-200'
                                            }`}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm font-mono text-gray-500 font-semibold">
                                        #MTP-{c.id.slice(0, 6).toUpperCase()}
                                    </td>
                                    <td className="p-4 text-[15px] font-bold text-gray-900">{c.patientName}</td>
                                    <td className="p-4 text-sm font-semibold">{new Date(c.startTime).toLocaleDateString()}</td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onRemove(c.id); }}
                                            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors"
                                            title="Delete Record"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {displayedHistory.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-medium">No history found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HistoryPane;
