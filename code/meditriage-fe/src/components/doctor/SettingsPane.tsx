import React, { useState } from 'react';
import { User, UserRole } from '../../types';

interface DoctorSettingsPaneProps {
    user: User;
    onLogout: () => void;
}

const DoctorSettingsPane: React.FC<DoctorSettingsPaneProps> = ({ user, onLogout }) => {
    const [displayName, setDisplayName] = useState(user.name);

    const handleSaveName = () => {
        // Mock save functionality
        console.log('Saving name:', displayName);
    };

    return (
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 w-full animate-fade-in" style={{ maxWidth: '-webkit-fill-available' }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-4">

                {/* Left Card: Doctor Profile */}
                <div className="bg-[#f8f9fa] rounded-[32px] p-8 flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-700">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900">Doctor Profile</h4>
                    </div>

                    {/* Profile Information Card */}
                    <div className="bg-white rounded-[24px] p-6 flex items-center gap-5 shadow-sm border border-gray-50">
                        <img
                            src={user.avatar || '/assets/images/Doctor.jpg'}
                            alt={user.name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-[#17406E]/10"
                        />
                        <div className="flex flex-col">
                            <h3 className="text-xl font-bold text-gray-900 leading-tight">{user.name}</h3>
                            <p className="text-sm font-medium text-gray-500 mt-1">
                                System Role: <span className="text-[#17406E] font-bold uppercase">{user.role}</span>
                            </p>
                            <p className="text-xs font-mono text-gray-500 mt-0.5">ID: {user.username}</p>
                        </div>
                    </div>

                    {/* Display Name Edit Card */}
                    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 flex flex-col gap-4">
                        <label className="text-sm font-bold text-gray-900 ml-1">Display Name</label>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-gray-900 font-medium outline-none focus:ring-2 focus:ring-[#17406E]/10 transition-all font-sans"
                            />
                            <button
                                onClick={handleSaveName}
                                className="bg-[#17406e] text-white px-6 py-3 rounded-2xl font-bold hover:bg-[#0a2340] transition-colors shadow-lg shadow-[#17406E]/15 whitespace-nowrap"
                            >
                                Save Name
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 font-medium ml-1">
                            This name is visible to nurses when assigning patients and on clinical notes.
                        </p>
                    </div>
                </div>

                {/* Right Card: Account Preferences */}
                <div className="bg-[#f8f9fa] rounded-[32px] p-8 flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-700">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900">Account Preferences</h4>
                    </div>

                    {/* Notifications Preference */}
                    <div className="bg-white rounded-[24px] p-6 flex items-center gap-5 shadow-sm border border-gray-50 group hover:border-[#17406E]/20 transition-all cursor-pointer">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#17406E]">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-base font-bold text-gray-900">Notifications</h3>
                            <p className="text-sm font-medium text-gray-500">Currently receiving alerts for urgent designated patients.</p>
                        </div>
                    </div>

                    {/* Logout Section */}
                    <div className="bg-white rounded-[24px] p-6 flex flex-col gap-5 shadow-sm border border-gray-50">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-base font-bold text-gray-900">Secure Logout</h3>
                                <p className="text-sm font-medium text-gray-500">End your active session and sign out of the MediTriage platform securely.</p>
                            </div>
                        </div>

                        <button
                            onClick={onLogout}
                            className="w-full bg-red-50 text-red-600 font-bold py-4 rounded-2xl hover:bg-red-100 transition-colors text-center"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DoctorSettingsPane;
