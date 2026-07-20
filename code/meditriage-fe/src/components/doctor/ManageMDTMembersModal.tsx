import React, { useState, useEffect } from 'react';
import AnimatedModal from '../ui/AnimatedModal';
import { User, MDTMember } from '../../types';
import { ToastType } from '../ui/Toast';
import * as triageService from '../../services/triageService';
import * as mdtService from '../../services/mdtService';

interface ManageMDTMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomId: string;
    members: MDTMember[];
    isCreator: boolean;
    currentUser: User;
    showToast: (msg: string, type: ToastType) => void;
    onMembersChanged: () => void;
}

const ManageMDTMembersModal: React.FC<ManageMDTMembersModalProps> = ({ 
    isOpen, onClose, roomId, members, isCreator, currentUser, showToast, onMembersChanged 
}) => {
    const [activeTab, setActiveTab] = useState<'members' | 'add'>('members');
    const [allDoctors, setAllDoctors] = useState<triageService.DoctorOption[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setActiveTab('members');
            setSearchQuery('');
            fetchAvailableDoctors();
        }
    }, [isOpen]);

    const fetchAvailableDoctors = async () => {
        setIsLoading(true);
        try {
            const doctors = await triageService.getDoctors();
            setAllDoctors(doctors);
        } catch (error) {
            showToast('Unable to retrieve doctor list', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddMember = async (doctorId: string) => {
        setActionLoadingId(doctorId);
        try {
            await mdtService.addMember(roomId, doctorId);
            showToast('Member successfully added', 'success');
            onMembersChanged();
        } catch (error: any) {
            showToast(error.message || 'Failed to add doctor', 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleRemoveMember = async (doctorId: string) => {
        setActionLoadingId(doctorId);
        try {
            await mdtService.removeMember(roomId, doctorId);
            showToast('Member successfully removed', 'success');
            onMembersChanged();
        } catch (error: any) {
            showToast(error.message || 'Failed to remove doctor', 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    // Filter out existing members for the "Add" tab
    const existingMemberIds = new Set(members.map(m => m.doctor_id));
    const availableDoctors = allDoctors.filter(d => 
        !existingMemberIds.has(d.id) && 
        d.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getInitials = (name: string) => {
        const cleanName = name.replace(/^Dr\.\s*/i, '');
        return cleanName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    return (
        <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
            <div className="bg-white rounded-[40px] shadow-2xl flex flex-col h-[500px] overflow-hidden relative">
                {/* Header */}
                <div className="px-8 pt-6 flex justify-between items-start shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{isCreator ? 'Manage Conference' : 'View Conference'}</h3>
                        <p className="text-sm text-gray-500 mt-1">{isCreator ? 'Add or remove doctors from this room' : 'View doctors in this room'}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 relative -right-2.5 -top-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors shrink-0 ml-4"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                {isCreator ? (
                    <div className="px-8 pt-6 pb-4 shrink-0 border-b border-gray-100">
                        <div className="relative flex p-1 bg-[#f0f2f7] rounded-[14px] w-full">
                            <div className={`absolute top-1 bottom-1 w-[calc(50%-6px)] bg-white rounded-[10px] shadow-sm border border-gray-100 transition-all duration-300 ease-in-out ${activeTab === 'members' ? 'left-1' : 'left-[calc(50%+2px)]'}`} />
                            <button 
                                onClick={() => setActiveTab('members')}
                                className={`relative flex-1 py-2 text-sm font-bold rounded-[10px] transition-colors z-10 ${
                                    activeTab === 'members' ? 'text-[#17406E]' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Members ({members.length})
                            </button>
                            <button 
                                onClick={() => setActiveTab('add')}
                                className={`relative flex-1 py-2 text-sm font-bold rounded-[10px] transition-colors z-10 ${
                                    activeTab === 'add' ? 'text-[#17406E]' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Add Doctor
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="px-8 pt-4 pb-4 shrink-0 flex items-center justify-between border-b border-gray-100">
                        <span className="text-sm font-bold text-gray-900">Members ({members.length})</span>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2">
                    {activeTab === 'members' ? (
                        <div className="flex flex-col">
                            {members.map(member => {
                                const isMe = member.doctor_id === currentUser.id;
                                const showRemove = isCreator && !isMe;
                                
                                return (
                                    <div key={member.doctor_id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors group">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-[#17406E]/10 text-[#17406E] flex items-center justify-center font-bold text-sm shrink-0">
                                                {getInitials(member.full_name)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">
                                                    {member.full_name} {isMe && <span className="text-xs font-semibold text-gray-400 font-normal ml-1">(You)</span>}
                                                </p>
                                                {member.license_number && (
                                                    <p className="text-xs text-gray-500 truncate">{member.license_number}</p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {showRemove && (
                                            <button
                                                onClick={() => handleRemoveMember(member.doctor_id)}
                                                disabled={actionLoadingId === member.doctor_id}
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0 disabled:opacity-50"
                                                title="Remove member"
                                            >
                                                {actionLoadingId === member.doctor_id ? (
                                                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="p-4 pt-2 shrink-0">
                                <div className="relative">
                                    <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input 
                                        type="text" 
                                        placeholder="Search doctors..." 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-gray-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-[#17406E] focus:ring-1 focus:ring-[#17406E] transition-all outline-none"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto">
                                {isLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="w-6 h-6 border-2 border-[#17406E] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : availableDoctors.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 text-sm font-medium">
                                        No matching doctors found.
                                    </div>
                                ) : (
                                    availableDoctors.map(doc => (
                                        <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm shrink-0">
                                                    {getInitials(doc.full_name)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 truncate">{doc.full_name}</p>
                                                    {doc.license_number && <p className="text-xs text-gray-500 truncate">{doc.license_number}</p>}
                                                </div>
                                            </div>
                                            
                                            <button
                                                onClick={() => handleAddMember(doc.id)}
                                                disabled={actionLoadingId === doc.id}
                                                className="px-4 py-1.5 bg-[#17406E]/10 text-[#17406E] text-xs font-bold rounded-full hover:bg-[#17406E] hover:text-white transition-colors shrink-0 disabled:opacity-50"
                                            >
                                                {actionLoadingId === doc.id ? 'Adding...' : 'Add'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AnimatedModal>
    );
};

export default ManageMDTMembersModal;
