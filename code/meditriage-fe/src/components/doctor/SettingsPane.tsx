import React, { useState } from 'react';
import { User } from '../../types';
import { ToastType } from '../ui/Toast';
import ConfirmModal from '../ui/ConfirmModal';
import * as authService from '../../services/authService';

interface DoctorSettingsPaneProps {
    user: User;
    onLogout: () => void;
    onUpdateUser?: (updatedUser: User) => void;
    showToast: (msg: string, type: ToastType) => void;
}

const DoctorSettingsPane: React.FC<DoctorSettingsPaneProps> = ({ user, onLogout, onUpdateUser, showToast }) => {
    const [displayName, setDisplayName] = useState(user.name || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    const handleSaveDisplayName = async () => {
        if (!displayName.trim()) {
            showToast('Display name is required', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const updatedUser = await authService.updateUserProfile(user.id, { full_name: displayName.trim() });
            if (onUpdateUser) {
                onUpdateUser(updatedUser);
            }
            showToast('Profile updated successfully', 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to update name', 'error');
            // Revert on failure
            setDisplayName(user.name);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 w-full animate-fade-in" style={{ maxWidth: '-webkit-fill-available' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">

                    {/* Card 1: Doctor Profile Details */}
                    <div className="bg-gray-50 rounded-[32px] p-8 border border-gray-100 col-span-1" style={{ background: '#f5f5f5', border: 'none' }}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-black">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Doctor Profile</h4>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-50">
                                <img src={user.avatar || '/assets/images/Doctor.jpg'} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-gray-100 object-cover" />
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{user.name}</h3>
                                    <p className="text-sm font-medium text-gray-500">System Role: <span className="text-[#17406E] font-bold">{user.role}</span></p>
                                    <p className="text-xs text-gray-400 mt-1">ID: {user.username || user.id}</p>
                                </div>
                            </div>

                            {/* Edit Display Name Widget */}
                            <div className="p-5 bg-white rounded-2xl shadow-sm border border-gray-50">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Display Name</label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="flex-1 bg-gray-50 rounded-[14px] px-4 py-3 text-sm font-medium text-gray-900 outline-none border border-transparent focus:border-[#17406E]/20 focus:ring-2 focus:ring-[#17406E]/5 transition-all"
                                        placeholder="Enter how your name should appear"
                                    />
                                    <button
                                        onClick={handleSaveDisplayName}
                                        disabled={isSaving || displayName === user.name}
                                        className="px-6 py-3 bg-[#17406E] text-white text-sm font-bold rounded-[14px] hover:bg-[#1c5b7e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[100px]"
                                    >
                                        {isSaving ? 'Saving...' : 'Save Name'}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-3 font-medium">
                                    This name is visible to nurses when assigning patients and on clinical notes.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Account Actions */}
                    <div className="bg-gray-50 rounded-[32px] p-8 border border-gray-100 col-span-1" style={{ background: '#f5f5f5', border: 'none' }}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-black">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Account Preferences</h4>
                        </div>

                        <div className="space-y-4">
                            <div className="p-5 bg-white rounded-2xl border border-gray-100 flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0 mt-0.5">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                </div>
                                <div>
                                    <h5 className="text-sm font-bold text-gray-900">Notifications</h5>
                                    <p className="text-xs text-gray-500 mt-1 font-medium">Currently receiving alerts for urgent designated patients.</p>
                                </div>
                            </div>

                            <div className="p-5 bg-white rounded-2xl border border-gray-100 flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0 mt-0.5">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                </div>
                                <div className="flex-1">
                                    <h5 className="text-sm font-bold text-gray-900 mb-2">Secure Logout</h5>
                                    <p className="text-xs text-gray-500 mb-4 font-medium">End your active session and sign out of the MediTriage platform securely.</p>
                                    <button
                                        onClick={() => setIsLogoutModalOpen(true)}
                                        className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm rounded-xl transition-colors border border-red-100"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <ConfirmModal
                isOpen={isLogoutModalOpen}
                title="Confirm Logout"
                description="Are you sure you want to end your session?"
                confirmLabel="Log Out"
                onConfirm={onLogout}
                onCancel={() => setIsLogoutModalOpen(false)}
            />
        </>
    );
};

export default DoctorSettingsPane;
