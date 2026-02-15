import React from 'react';
import { PatientCase, UrgencyLevel } from '../../types';
import { getStatusBadge, getWaitTimeMinutes } from '../../utils/helpers';

interface OverviewPaneProps {
    activeCases: PatientCase[];
    onViewPatient: (patient: PatientCase) => void;
    onNavigate: (view: string) => void;
}

const OverviewPane: React.FC<OverviewPaneProps> = ({ activeCases, onViewPatient, onNavigate }) => (
    <div className="space-y-8 animate-fade-in pb-12">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Active Patients */}
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col justify-between h-48 relative overflow-hidden group hover:shadow-lg transition-all">
                <div className="absolute top-0 right-0 p-5">
                    <div className="w-14 h-14 bg-[#17406E]/5 rounded-full flex items-center justify-center border-[3px] border-[#17406E]/10">
                        <svg className="w-6 h-6 text-[#17406E]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Active Patients</p>
                <span className="text-5xl font-extrabold text-gray-900 tracking-tight">{activeCases.length}</span>
                <span className="bg-[#17406E]/5 text-[#17406E] text-xs font-bold px-3 py-1 rounded-full border border-[#17406E]/10 w-fit">Active</span>
            </div>

            {/* Avg Wait */}
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col justify-between h-48 group hover:shadow-lg transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 p-5">
                    <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center border-[3px] border-green-100">
                        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Avg Wait</p>
                <span className="text-5xl font-extrabold text-gray-900 tracking-tight">
                    {activeCases.length > 0
                        ? Math.floor(activeCases.reduce((acc, c) => acc + getWaitTimeMinutes(c.startTime), 0) / activeCases.length)
                        : 0}
                    <span className="text-lg text-gray-400 font-medium ml-1">min</span>
                </span>
                <span className="bg-green-50 text-green-600 text-xs font-bold px-3 py-1 rounded-full border border-green-200 w-fit">Live</span>
            </div>

            {/* Critical Alerts */}
            <div className="p-8 rounded-[32px] shadow-sm border border-red-100 flex flex-col justify-between h-48 group hover:shadow-lg transition-all relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%)' }}>
                <div className="absolute top-0 right-0 p-5">
                    <div className="w-14 h-14 bg-red-100/60 rounded-full flex items-center justify-center border-[3px] border-red-200/40">
                        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    </div>
                </div>
                <p className="text-xs font-bold text-red-800 uppercase tracking-widest">Critical Alerts</p>
                <span className="text-5xl font-extrabold text-red-900 tracking-tight">{activeCases.filter(c => c.soapNote?.urgency === UrgencyLevel.IMMEDIATE).length}</span>
                <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full border border-red-200 w-fit">Urgent</span>
            </div>
        </div>

        {/* Recent Admissions */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-extrabold text-gray-900">Recent Admissions</h3>
                <button
                    onClick={() => onNavigate('queue')}
                    className="px-6 py-2.5 bg-[#17406E] text-white text-xs font-bold rounded-full hover:bg-[#1c5b7e] transition-all"
                >
                    View All
                </button>
            </div>
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
                        {activeCases.slice(0, 5).map(c => {
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
                        {activeCases.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">No active patients in queue.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

export default OverviewPane;
