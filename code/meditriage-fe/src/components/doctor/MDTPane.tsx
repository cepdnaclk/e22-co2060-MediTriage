import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';
import { ToastType } from '../ui/Toast';
import CustomSelect from '../ui/CustomSelect';
import { MDTRoom } from '../../types';
import * as mdtService from '../../services/mdtService';
import CreateMDTRoomModal from './CreateMDTRoomModal';

interface MDTPaneProps {
    user: User;
    showToast: (msg: string, type: ToastType) => void;
}

const MDTPane: React.FC<MDTPaneProps> = ({ user, showToast }) => {
    const [rooms, setRooms] = useState<MDTRoom[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const navigate = useNavigate();

    const fetchRooms = async () => {
        setIsLoading(true);
        try {
            const data = await mdtService.getMyRooms();
            setRooms(data);
        } catch (error) {
            console.error('Failed to fetch rooms', error);
            showToast('Failed to load MDT conferences', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    const handleCreated = (roomId: string) => {
        fetchRooms();
        navigate(`/mdt/${roomId}`);
    };

    const filteredRooms = rooms.filter(r => {
        const term = search.toLowerCase();
        if (term && !r.title.toLowerCase().includes(term)) return false;
        if (statusFilter === 'Open' && r.status !== 'OPEN') return false;
        if (statusFilter === 'Closed' && r.status !== 'CLOSED') return false;
        return true;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const dropdownBtnStyle: React.CSSProperties = { lineHeight: '28px', borderRadius: '20px', background: 'white', padding: '10px 13px 10px 20px' };

    const getRelativeTime = (timestamp: string) => {
        const diffHours = Math.floor((Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60));
        if (diffHours < 1) return 'Less than an hour ago';
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    return (
        <div className="animate-fade-in flex flex-col mb-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Multidisciplinary Team Conferences</h1>
                    <p className="text-gray-500 mt-1">Collaborate with other doctors on patient cases</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-[#17406E] text-white px-6 py-3 rounded-full font-bold hover:bg-[#1c5b7e] transition-colors shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    New Conference
                </button>
            </div>

            {/* Search + Filter Toolbar */}
            <div className="flex items-center gap-4 flex-wrap" style={{ padding: '0', margin: '-15px 0 30px' }}>
                <div className="flex items-center gap-3 flex-1 min-w-[280px]" style={{ background: 'white', borderRadius: '20px', padding: '15px 20px' }}>
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text" placeholder="Search conferences..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="search-input w-full bg-transparent !border-0 !outline-none !shadow-none text-sm font-medium text-gray-900 placeholder-gray-400"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>

                <div className="w-44 flex-shrink-0">
                    <CustomSelect value={statusFilter} options={[
                        { value: 'All', label: 'All Status' },
                        { value: 'Open', label: 'Open' },
                        { value: 'Closed', label: 'Closed' },
                    ]} onChange={(val: string) => setStatusFilter(val)} buttonStyle={dropdownBtnStyle} />
                </div>
            </div>

            {/* Room List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-[#17406E] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filteredRooms.length === 0 ? (
                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm py-16 px-8 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No MDT conferences found</h3>
                    <p className="text-gray-500 mb-6 max-w-md">
                        {search || statusFilter !== 'All' 
                            ? "Try adjusting your filters to find what you're looking for."
                            : "You haven't participated in any MDT conferences yet."}
                    </p>
                    {!search && statusFilter === 'All' && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-[#17406E]/10 text-[#17406E] hover:bg-[#17406E]/20 px-6 py-2.5 rounded-full font-bold transition-colors"
                        >
                            Start your first conference
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredRooms.map(room => (
                        <div 
                            key={room.id}
                            onClick={() => navigate(`/mdt/${room.id}`)}
                            className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group flex flex-col h-full relative"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 bg-[#17406E]/10 text-[#17406E] rounded-full flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                                    </svg>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                                    room.status === 'OPEN' 
                                        ? 'bg-green-50 text-green-700 border-green-200' 
                                        : 'bg-gray-50 text-gray-600 border-gray-200'
                                }`}>
                                    <span className={`w-2 h-2 rounded-full ${room.status === 'OPEN' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                    {room.status}
                                </span>
                            </div>
                            
                            <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">
                                {room.title}
                            </h3>
                            
                            <div className="mt-auto">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="flex -space-x-2">
                                        {[...Array(Math.min(room.member_count, 3))].map((_, i) => (
                                            <div key={i} className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white" />
                                        ))}
                                    </div>
                                    <span className="text-sm font-medium text-gray-500">
                                        {room.member_count} doctors
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center text-xs font-medium text-gray-400 border-t border-gray-50 pt-4 mt-2">
                                    <span>Created {getRelativeTime(room.created_at)}</span>
                                    <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-[#17406E] text-gray-400 group-hover:text-white flex items-center justify-center transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <CreateMDTRoomModal 
                isOpen={showCreateModal} 
                onClose={() => setShowCreateModal(false)}
                onCreated={handleCreated}
                showToast={showToast}
                user={user}
            />
        </div>
    );
};

export default MDTPane;
