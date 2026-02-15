import React from 'react';
import { User } from '../../types';
import CustomSelect from '../ui/CustomSelect';

interface SettingsPaneProps {
    user: User;
    sensitivity: number;
    setSensitivity: (val: number) => void;
    maxQuestions: number;
    setMaxQuestions: (val: number) => void;
    department: string;
    setDepartment: (val: string) => void;
    onClearCache: () => void;
    onExportCSV: () => void;
}

const SettingsPane: React.FC<SettingsPaneProps> = ({
    user,
    sensitivity,
    setSensitivity,
    maxQuestions,
    setMaxQuestions,
    department,
    setDepartment,
    onClearCache,
    onExportCSV,
}) => {
    const getSensLabel = (val: number) => {
        if (val === 1) return "Strict";
        if (val === 2) return "Balanced";
        return "Cautious";
    };
    const getSensDesc = (val: number) => {
        if (val === 1) return "Only flags life-threatening keywords.";
        if (val === 2) return "Default.";
        return "Flags anything suspicious (more false positives).";
    };

    return (
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 w-full animate-fade-in max-w-4xl mx-auto mb-12" style={{
            width: '-webkit-fill-available',
            margin: 0,
            maxWidth: '-webkit-fill-available'
        }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">

                {/* Card 1: Triage Control */}
                <div className="bg-gray-50 rounded-[32px] p-8 border border-gray-100 col-span-1 md:col-span-2 lg:col-span-1" style={{ background: '#f5f5f5', border: 'none' }}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-black">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900">Triage Control</h4>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-bold text-gray-700">Triage Sensitivity</label>
                                <span className="text-xs font-bold bg-[#17406E] text-white px-2 py-1 rounded-md">{getSensLabel(sensitivity)}</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="3"
                                value={sensitivity}
                                onChange={(e) => setSensitivity(parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                            />
                            <p className="text-xs text-gray-500 mt-2 font-medium">{getSensDesc(sensitivity)}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Max Questions</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={maxQuestions}
                                    onChange={(e) => setMaxQuestions(parseInt(e.target.value))}
                                    className="w-20 bg-white border border-gray-200 rounded-xl px-3 py-2 text-center font-bold text-gray-900 outline-none focus:ring-2 focus:ring-black/10"
                                    style={{ borderRadius: '20px' }}
                                />
                                <p className="text-xs text-gray-400">Limits the chat loop.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 2: Nurse Profile */}
                <div className="bg-gray-50 rounded-[32px] p-8 border border-gray-100 col-span-1 md:col-span-2 lg:col-span-1" style={{ background: '#f5f5f5', border: 'none' }}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-black">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900">Nurse Profile</h4>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Display Name</label>
                            <div className="text-sm font-bold text-gray-900 bg-gray-200/50 px-4 py-3 rounded-xl border border-transparent" style={{ background: 'white' }}>{user.name}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Employee ID</label>
                            <div className="inline-block text-xs font-mono font-bold text-gray-600 bg-gray-200 px-3 py-1.5 rounded-lg">MTN0001</div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Department</label>
                            <CustomSelect
                                value={department}
                                className="w-full"
                                buttonStyle={{ background: 'white' }}
                                options={[
                                    { value: 'Emergency / OPD', label: 'Emergency / OPD' },
                                    { value: 'Pediatrics', label: 'Pediatrics' },
                                    { value: 'General', label: 'General' }
                                ]}
                                onChange={setDepartment}
                            />
                        </div>
                    </div>
                </div>

                {/* Card 3: System & Data */}
                <div className="bg-gray-50 rounded-[32px] p-8 border border-gray-100 col-span-1 md:col-span-2" style={{ background: '#f5f5f5', border: 'none' }}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-black">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900">System & Data</h4>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={onClearCache}
                            className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 hover:text-red-600 transition-colors shadow-sm flex items-center gap-2"
                            style={{ borderRadius: '25px' }}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Clear Local Cache
                        </button>
                        <button
                            onClick={onExportCSV}
                            className="px-6 py-3 bg-[#17406E] text-white font-bold rounded-xl hover:bg-[#1c5b7e] transition-colors shadow-lg shadow-[#17406E]/10 flex items-center gap-2"
                            style={{ borderRadius: '25px' }}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Export Logs (CSV)
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SettingsPane;
