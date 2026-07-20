import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, MDTRoom, MDTMessage, MDTRoomStatus } from '../../types';
import { ToastType } from '../ui/Toast';
import ConfirmModal from '../ui/ConfirmModal';
import ManageMDTMembersModal from './ManageMDTMembersModal';
import * as mdtService from '../../services/mdtService';
import { getToken } from '../../services/api';

interface MDTRoomPageProps {
    user: User;
    showToast: (msg: string, type: ToastType) => void;
}

const MDTRoomPage: React.FC<MDTRoomPageProps> = ({ user, showToast }) => {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    
    const [roomDetail, setRoomDetail] = useState<MDTRoom | null>(null);
    const [messages, setMessages] = useState<MDTMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [chatInput, setChatInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    
    // Modals & Dropdowns
    const [showManageModal, setShowManageModal] = useState(false);
    const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    
    const wsRef = useRef<WebSocket | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // Fetch room details and history
    const loadRoomData = async () => {
        if (!roomId) return;
        try {
            const [detail, history] = await Promise.all([
                mdtService.getRoomDetails(roomId),
                mdtService.getMessages(roomId)
            ]);
            setRoomDetail(detail);
            setMessages(history.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
        } catch (error) {
            showToast('Unable to retrieve conference details', 'error');
            navigate('/mdt');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRoomData();
    }, [roomId]);

    // WebSocket Connection
    useEffect(() => {
        const token = getToken();
        if (!token || !roomId) return;
        
        const ws = mdtService.createMDTRoomWebSocket(roomId, token);
        wsRef.current = ws;
        
        ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                // The backend sends raw MDTMessage JSON or a wrapper depending on implementation.
                // Assuming it sends the raw message object for "message", "attachment", "system".
                if (payload.type === 'message' || payload.type === 'attachment' || payload.type === 'system') {
                    setMessages(prev => [...prev, payload.data]);
                }
            } catch (e) {
                console.error("Failed to parse WS message", e);
            }
        };
        
        ws.onclose = (e) => {
            if (e.code === 4002 || e.code === 4003) {
                setRoomDetail(prev => prev ? { ...prev, status: 'CLOSED' } : null);
                showToast('This conference is currently closed.', 'info');
            }
        };
        
        return () => {
            ws.close();
            wsRef.current = null;
        };
    }, [roomId]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handlers
    const handleSendMessage = () => {
        if (!chatInput.trim() || !wsRef.current || roomDetail?.status === 'CLOSED') return;
        
        const msgStr = JSON.stringify({ type: 'message', content: chatInput.trim() });
        wsRef.current.send(msgStr);
        setChatInput('');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !roomId) return;
        
        // Check size (e.g. max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showToast('File size exceeds the 10MB limit', 'error');
            return;
        }

        setIsUploading(true);
        try {
            await mdtService.uploadAttachment(roomId, file);
            // Attachment is broadcast via WS, no need to manually append
        } catch (error) {
            showToast('Unable to upload file', 'error');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDownload = async (attachmentId: string, filename: string) => {
        if (!roomId) return;
        try {
            const blob = await mdtService.downloadAttachmentBlob(roomId, attachmentId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            showToast('Unable to download file', 'error');
        }
    };

    const handleCloseRoom = async () => {
        if (!roomId) return;
        try {
            await mdtService.closeRoom(roomId);
            setRoomDetail(prev => prev ? { ...prev, status: 'CLOSED' } : null);
            setShowCloseConfirm(false);
            showToast('Conference successfully closed', 'success');
        } catch (error) {
            showToast('Unable to close conference', 'error');
        }
    };

    // Close settings dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (showSettingsDropdown && !(e.target as Element).closest('.settings-dropdown-container')) {
                setShowSettingsDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSettingsDropdown]);

    if (isLoading || !roomDetail) {
        return (
            <div className="flex flex-col h-full relative bg-[#f2f2f7] justify-center items-center font-sans" style={{ margin: '-20px', height: 'calc(100vh - 15px)' }}>
                <div className="w-8 h-8 border-4 border-[#17406E] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const isCreator = roomDetail.created_by?.doctor_id === user.id;
    const isClosed = roomDetail.status === 'CLOSED';

    const getInitials = (name: string) => {
        const cleanName = name.replace(/^Dr\.\s*/i, '');
        return cleanName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    return (
        <div className="flex flex-col h-full relative bg-[#f2f2f7] animate-fade-in font-sans">
            
            {/* Sticky Header */}
            <div className="px-6 py-4 flex justify-between items-center bg-[#f2f2f7] sticky top-0 z-20 border-b border-gray-200/50 pt-8">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/mdt')} 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200/50 transition-colors"
                        style={{ border: '1px solid #cfcfcf' }}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-bold text-gray-900 truncate max-w-md">{roomDetail.title}</h2>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${
                                isClosed ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-green-50 text-green-700 border-green-200'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isClosed ? 'bg-gray-400' : 'bg-green-500'}`} />
                                {roomDetail.status}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">Linked to Patient ID: {roomDetail.encounter_id}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Avatars */}
                    <div 
                        className="flex -space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setShowManageModal(true)}
                        title={isCreator ? "Manage Members" : "View Members"}
                    >
                        {(roomDetail.members || []).slice(0, 3).map(m => (
                            <div key={m.doctor_id} className="w-9 h-9 rounded-full bg-white border-2 border-[#f2f2f7] text-[#17406E] flex items-center justify-center font-bold text-xs shadow-sm">
                                {getInitials(m.full_name)}
                            </div>
                        ))}
                        {(roomDetail.members?.length || 0) > 3 && (
                            <div className="w-9 h-9 rounded-full bg-gray-100 border-2 border-[#f2f2f7] text-gray-600 flex items-center justify-center font-bold text-xs shadow-sm z-10">
                                +{(roomDetail.members?.length || 0) - 3}
                            </div>
                        )}
                    </div>

                    {/* Settings Dropdown */}
                    <div className="relative settings-dropdown-container">
                        <button 
                            onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-[#17406E] hover:bg-[#17406E]/10 transition-colors"
                            style={{ border: '1px solid #cfcfcf' }}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                        </button>
                        
                        {showSettingsDropdown && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 z-50 animate-fade-in-up">
                                <button 
                                    onClick={() => { setShowSettingsDropdown(false); setShowManageModal(true); }}
                                    className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-[#f0f2f7] rounded-xl font-bold transition-colors flex items-center gap-2.5"
                                >
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    {isCreator ? "Manage Members" : "View Members"}
                                </button>
                                {isCreator && !isClosed && (
                                    <>
                                        <div className="h-px bg-gray-100 my-1 mx-2"></div>
                                        <button 
                                            onClick={() => { setShowSettingsDropdown(false); setShowCloseConfirm(true); }}
                                            className="w-full text-left px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl font-bold transition-colors flex items-center gap-2.5"
                                        >
                                            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            Close Conference
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4">
                <div className="max-w-4xl mx-auto w-full pt-6 flex flex-col gap-4 pb-40">
                    {messages.map((m, idx) => {
                        const isMe = m.sender_id === user.id;
                        
                        // System message
                        if (m.message_type === 'SYSTEM') {
                            return (
                                <div key={m.id || idx} className="flex justify-center my-2">
                                    <span className="text-xs text-gray-400 font-medium italic bg-white/50 px-3 py-1 rounded-full border border-gray-200/50">
                                        · {m.content} ·
                                    </span>
                                </div>
                            );
                        }

                        // Attachment message
                        if (m.message_type === 'ATTACHMENT' && m.attachment) {
                            return (
                                <div key={m.id || idx} className={`flex gap-3 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                                    {!isMe && (
                                        <div className="w-8 h-8 rounded-full bg-[#17406E]/10 text-[#17406E] flex items-center justify-center font-bold text-xs shrink-0 mt-1">
                                            {getInitials(m.sender_name || 'U')}
                                        </div>
                                    )}
                                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`p-4 rounded-[20px] border flex flex-col gap-3 ${
                                            isMe ? 'bg-[#17406E] text-white border-transparent rounded-tr-[4px]' : 'bg-white text-gray-800 border-gray-100 shadow-sm rounded-tl-[4px]'
                                        }`}>
                                            {!isMe && <span className="block text-[13px] font-black text-[#17406E] mb-0.5 tracking-wide">{(m.sender_name || '').startsWith('Dr. ') ? m.sender_name : `Dr. ${m.sender_name}`}</span>}
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isMe ? 'bg-white/20' : 'bg-gray-50 border border-gray-100'}`}>
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold truncate max-w-[200px]">{m.attachment.original_filename}</p>
                                                    <p className={`text-xs mt-0.5 font-medium ${isMe ? 'text-white/70' : 'text-gray-500'}`}>
                                                        {(m.attachment.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDownload(m.attachment!.id, m.attachment!.original_filename)}
                                                className={`w-full py-2.5 mt-1 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors ${
                                                    isMe ? 'bg-white text-[#17406E] hover:bg-white/90' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                                                }`}
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                Download
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        // Normal Text message
                        return (
                            <div key={m.id || idx} className={`flex gap-3 max-w-[80%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                                {!isMe && (
                                    <div className="w-8 h-8 rounded-full bg-[#17406E]/10 text-[#17406E] flex items-center justify-center font-bold text-xs shrink-0 mt-1">
                                        {getInitials(m.sender_name || 'U')}
                                    </div>
                                )}
                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`px-5 py-3.5 text-[15px] leading-relaxed whitespace-pre-wrap rounded-[20px] ${
                                        isMe ? 'bg-[#17406E] text-white rounded-tr-[4px]' : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-tl-[4px]'
                                    }`}>
                                        {!isMe && <span className="block text-[13px] font-black text-[#17406E] mb-1.5 tracking-wide">{(m.sender_name || '').startsWith('Dr. ') ? m.sender_name : `Dr. ${m.sender_name}`}</span>}
                                        {m.content}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 px-0 py-[10px] pb-[15px] z-30 bg-[#f2f2f7]">
                <div className="max-w-4xl mx-auto w-full px-4">
                    {isClosed ? (
                        <div className="flex items-center justify-center bg-gray-100/80 border border-gray-200 text-gray-500 rounded-full p-3.5 shadow-sm mx-auto w-full transition-all backdrop-blur-sm mb-[5px]">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span className="text-[13px] font-bold tracking-wide uppercase text-gray-400">This conference is closed</span>
                        </div>
                    ) : (
                        <>
                            <div className={`relative flex items-center bg-white rounded-full p-2 pl-3 shadow-sm border transition-all ${
                                isUploading ? 'border-gray-200 opacity-70' : 'border-gray-200 focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black/10'
                            }`}>
                                {/* Hidden file input */}
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*,application/pdf,.doc,.docx"
                                    onChange={handleFileUpload}
                                />
                                
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-[#17406E] hover:bg-gray-50 transition-colors disabled:cursor-not-allowed"
                                    title="Attach file"
                                >
                                    <svg className="w-5 h-5 transform -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                </button>

                                <input
                                    autoFocus
                                    className="chat-input flex-1 bg-transparent border-0 py-2 px-3 focus:ring-0 outline-none text-[15px] text-gray-900 placeholder-gray-400 disabled:bg-transparent"
                                    style={{ outline: 'none', border: 'none' }}
                                    placeholder={isUploading ? "Uploading file..." : "Type a message..."}
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                    disabled={isUploading}
                                />
                                
                                <button 
                                    onClick={handleSendMessage} 
                                    disabled={!chatInput.trim() || isUploading} 
                                    className="w-10 h-10 bg-[#17406E] text-white rounded-full flex items-center justify-center hover:bg-[#1c5b7e] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shrink-0"
                                >
                                    {isUploading ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <p className="text-center text-[11px] text-gray-400 mt-2.5 font-medium">Messages are end-to-end encrypted and HIPAA-compliant.</p>
                        </>
                    )}
                </div>
            </div>

            {/* Manage Members Modal */}
            <ManageMDTMembersModal
                isOpen={showManageModal}
                onClose={() => setShowManageModal(false)}
                roomId={roomId || ''}
                members={roomDetail.members || []}
                isCreator={isCreator}
                currentUser={user}
                showToast={showToast}
                onMembersChanged={loadRoomData}
            />

            {/* Close Room Confirm Modal */}
            <ConfirmModal
                isOpen={showCloseConfirm}
                title="Close Conference?"
                description="Are you sure you want to close this MDT conference? No further messages or files can be sent once closed."
                confirmLabel="Close Conference"
                cancelLabel="Cancel"
                isDestructive
                onConfirm={handleCloseRoom}
                onCancel={() => setShowCloseConfirm(false)}
            />

        </div>
    );
};

export default MDTRoomPage;
