import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Message, User, PatientCase, TriageStatus } from '../../types';
import { ToastType } from '../ui/Toast';
import ConfirmModal from '../ui/ConfirmModal';
import AnalyzingModal from './AnalyzingModal';
import ReviewModal from './ReviewModal';
import * as triageService from '../../services/triageService';

interface ChatPaneProps {
    user: User;
    cases: PatientCase[];
    pendingCase: PatientCase | null;
    onAddCase: (c: PatientCase) => void;
    onUpdateCase: (c: PatientCase) => void;
    onRemoveCase: (id: string) => void;
    onClearPendingCase: () => void;
    showToast: (msg: string, type: ToastType) => void;
}

/**
 * AI Triage Chat — routed at /chat/:encounterId.
 * Manages messages, typing state, and interview lifecycle.
 */
const ChatPane: React.FC<ChatPaneProps> = ({ user, cases, pendingCase, onAddCase, onUpdateCase, onRemoveCase, onClearPendingCase, showToast }) => {
    const { encounterId } = useParams<{ encounterId: string }>();
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [messages, setMessages] = useState<Message[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // End-interview flow state
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [showAnalyzing, setShowAnalyzing] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [soapData, setSoapData] = useState<{ subjective: string; objective: string }>({ subjective: '', objective: '' });

    // Load existing messages on mount
    useEffect(() => {
        if (!encounterId) return;
        const loadMessages = async () => {
            try {
                const resp = await triageService.getMessages(encounterId);
                const mapped: Message[] = resp.map((m: any, i: number) => ({
                    id: m.id || `msg-${i}`,
                    role: m.sender_type === 'AI' ? 'model' : 'user',
                    text: m.message_content,
                    timestamp: new Date(m.timestamp).getTime(),
                }));
                setMessages(mapped);
            } catch (err) {
                console.error('Failed to load chat history', err);
            }
            setIsLoaded(true);
        };
        loadMessages();
    }, [encounterId]);

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !encounterId || isTyping) return;

        const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', text: chatInput.trim(), timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setChatInput('');
        setIsTyping(true);

        try {
            const resp = await triageService.sendMessage(encounterId, userMsg.text);
            const aiMsg: Message = { id: `ai-${Date.now()}`, role: 'model', text: resp.ai_message, timestamp: Date.now() };
            setMessages(prev => [...prev, aiMsg]);

            // AI decided interview is complete
            if (resp.is_interview_complete && resp.soap_note) {
                setSoapData({ subjective: resp.soap_note.subjective, objective: resp.soap_note.objective });
                setShowAnalyzing(true);
                setTimeout(() => {
                    setShowAnalyzing(false);
                    setShowReview(true);
                }, 2500);
            }
        } catch (err) {
            showToast('Unable to send message', 'error');
        } finally {
            setIsTyping(false);
        }
    };

    // Nurse clicks "End & Report"
    const handleEndInterview = () => {
        // Count how many messages are from the user
        const userMessageCount = messages.filter(m => m.role === 'user').length;
        
        if (userMessageCount === 0) {
            showToast('Insufficient data. At least one patient response is required.', 'error');
            return;
        }
        setShowEndConfirm(true);
    };

    // Nurse confirms ending
    const handleConfirmEnd = async () => {
        setShowEndConfirm(false);
        setShowAnalyzing(true);

        try {
            // Use the new reliable force-finish endpoint
            const note = await triageService.finishInterview(encounterId!);
            setSoapData({ 
                subjective: note.subjective || '', 
                objective: note.objective || '' 
            });
        } catch (err) {
            console.error('Failed to force finish triage', err);
            showToast('Unable to generate clinical summary. Please try again.', 'error');
            setSoapData({ subjective: '', objective: '' });
        }

        setTimeout(() => {
            setShowAnalyzing(false);
            setShowReview(true);
        }, 1500);
    };


    // Review confirmed — add patient to queue with doctor assignment
    const handleReviewConfirm = async (doctorId: string, doctorName: string, editedSubjective: string, editedObjective: string) => {
        // Persist nurse's SOAP edits and doctor assignment to backend
        if (encounterId) {
            try {
                // Save nurse-edited Subjective & Objective to the clinical note
                await triageService.updateClinicalNote(encounterId, {
                    subjective: editedSubjective,
                    objective: editedObjective,
                });
            } catch {
                // Continue even if note update fails — local state update is the priority
            }
            try {
                await triageService.updateEncounter(encounterId, {
                    doctor_id: doctorId,
                    status: 'AWAITING_REVIEW',
                });
            } catch {
                // Continue even if PATCH fails — local state update is the priority
            }
        }

        if (pendingCase) {
            onAddCase({
                ...pendingCase,
                status: TriageStatus.AWAITING_REVIEW,
                doctorId,
                doctorName,
            });
            onClearPendingCase();
        } else {
            const existing = cases.find(c => c.id === encounterId || c.encounterId === encounterId);
            if (existing) {
                onUpdateCase({ ...existing, status: TriageStatus.AWAITING_REVIEW, doctorId, doctorName });
            }
        }
        setShowReview(false);
        showToast('Patient successfully added', 'success');
        navigate('/overview');
    };

    const handleCancelInterview = () => {
        setShowCancelConfirm(true);
    };

    const handleConfirmCancel = async () => {
        // Delete the abandoned encounter from the backend
        if (encounterId) {
            try {
                await triageService.deleteEncounter(encounterId);
            } catch {
                // Continue even if delete fails — still navigate away
            }
            onRemoveCase(encounterId);
        }
        setShowCancelConfirm(false);
        navigate('/overview');
    };

    return (
        <div className="flex flex-col h-full relative bg-[#f2f2f7] animate-fade-in font-sans" style={{ margin: '-20px', height: 'calc(100vh - 15px)' }}>
            {/* Header */}
            <div className="px-6 py-4 pt-8 flex justify-between items-center bg-[#f2f2f7] sticky top-0 z-20">
                <div className="flex items-center" style={{ gap: '10px' }}>
                    <img src="/assets/branding/MediTriageAI.png" alt="MediTriage AI" className="rounded-full object-cover" style={{ width: '3.5rem', height: '3.5rem' }} />
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight" style={{ marginBottom: '4px' }}>MediTriage AI</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                            <p className="text-xs text-gray-500 font-medium">Session Active</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleCancelInterview} className="text-sm font-medium text-gray-600 hover:bg-gray-200/50 rounded-full transition-colors" style={{ border: '1px solid #cfcfcf', padding: '12px 23px' }}>Cancel</button>
                    <button 
                        onClick={handleEndInterview} 
                        disabled={!messages.some(m => m.role === 'user')}
                        className={`text-sm font-bold rounded-full transition-all ${
                            messages.some(m => m.role === 'user') 
                                ? 'bg-[#17406E] text-white hover:bg-[#1c5b7e]' 
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                        style={{ border: '1px solid transparent', padding: '12px 23px' }}
                    >
                        End & Report
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4">
                <div className="max-w-3xl mx-auto w-full pt-8 flex flex-col gap-6 pb-40">
                    {!isLoaded ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-4 border-[#17406E] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        messages.map(m => (
                            <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                {m.role === 'model' && (
                                    <div className="w-8 h-8 bg-[#17406E] rounded-full flex-shrink-0 flex items-center justify-center mt-1">
                                        <svg className="w-[18px] h-[18px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="8" width="16" height="12" rx="3" /><line x1="12" y1="2" x2="12" y2="8" /><circle cx="12" cy="2" r="1.5" fill="currentColor" /><circle cx="9" cy="13.5" r="1.5" fill="currentColor" stroke="none" /><circle cx="15" cy="13.5" r="1.5" fill="currentColor" stroke="none" /><path d="M9.5 17.5a2.5 2.5 0 005 0" /><line x1="1" y1="13" x2="4" y2="13" /><line x1="20" y1="13" x2="23" y2="13" /></svg>
                                    </div>
                                )}
                                <div className={`relative max-w-[85%] ${m.role === 'user' ? 'ml-auto' : ''}`}>
                                    {m.role === 'model' ? (
                                        <div className="bg-white shadow-sm border border-gray-100" style={{ borderRadius: '20px', padding: '15px 20px 20px' }}>
                                            <span className="block text-sm" style={{ color: '#17406E', fontWeight: 900, marginBottom: '10px' }}>MediTriage Assistant</span>
                                            <div className="text-gray-800 text-[16px] leading-relaxed whitespace-pre-wrap">{m.text}</div>
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl p-4 text-right" style={{ backgroundColor: '#17406E' }}>
                                            <div className="text-left text-[16px] leading-relaxed whitespace-pre-wrap font-medium text-white">{m.text}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    {isTyping && (
                        <div className="flex gap-4">
                            <div className="w-8 h-8 bg-[#17406E] rounded-full flex-shrink-0 flex items-center justify-center mt-1">
                                <svg className="w-[18px] h-[18px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="8" width="16" height="12" rx="3" /><line x1="12" y1="2" x2="12" y2="8" /><circle cx="12" cy="2" r="1.5" fill="currentColor" /><circle cx="9" cy="13.5" r="1.5" fill="currentColor" stroke="none" /><circle cx="15" cy="13.5" r="1.5" fill="currentColor" stroke="none" /><path d="M9.5 17.5a2.5 2.5 0 005 0" /><line x1="1" y1="13" x2="4" y2="13" /><line x1="20" y1="13" x2="23" y2="13" /></svg>
                            </div>
                            <div className="bg-white shadow-sm border border-gray-100 flex items-center gap-2.5" style={{ borderRadius: '20px', padding: '12px 20px' }}>
                                <div className="w-4 h-4 border-2 border-gray-300 border-t-[#17406E] rounded-full animate-spin" />
                                <span className="text-sm font-semibold text-gray-500">Thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 px-0 py-[10px] pb-[15px] z-30 bg-[#f2f2f7]">
                <div className="max-w-3xl mx-auto w-full">
                    <div className="relative flex items-center bg-white rounded-full p-2 pl-6 shadow-sm border border-gray-200 focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black/10 transition-all">
                        <input
                            autoFocus
                            className="chat-input flex-1 bg-transparent border-0 py-3 focus:ring-0 outline-none text-lg text-gray-900 placeholder-gray-500"
                            style={{ outline: 'none', border: 'none' }}
                            placeholder="Type your symptoms..."
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        />
                        <button onClick={handleSendMessage} disabled={!chatInput.trim() || isTyping} className="w-10 h-10 bg-[#17406E] text-white rounded-full flex items-center justify-center hover:bg-[#1c5b7e] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md m-1">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                        </button>
                    </div>
                    <p className="text-center text-[11px] text-gray-400 mt-3 font-medium">MediTriage AI can make mistakes. Verify important medical info.</p>
                </div>
            </div>

            {/* End Interview Confirmation */}
            <ConfirmModal
                isOpen={showEndConfirm}
                title="End Interview?"
                description="This will finalize the triage interview and generate a clinical assessment. Are you sure?"
                confirmLabel="Analyze"
                cancelLabel="Cancel"
                onConfirm={handleConfirmEnd}
                onCancel={() => setShowEndConfirm(false)}
            />

            {/* AI Analyzing */}
            <AnalyzingModal isOpen={showAnalyzing} />

            {/* Review SOAP */}
            <ReviewModal
                isOpen={showReview}
                onClose={async () => {
                    // Delete the abandoned encounter from the backend
                    if (encounterId) {
                        try {
                            await triageService.deleteEncounter(encounterId);
                        } catch {
                            // Continue even if delete fails
                        }
                        onRemoveCase(encounterId);
                    }
                    setShowReview(false);
                    navigate('/overview');
                }}
                onConfirm={handleReviewConfirm}
                subjective={soapData.subjective}
                objective={soapData.objective}
                showToast={showToast}
            />

            {/* Cancel Interview Confirmation */}
            <ConfirmModal
                isOpen={showCancelConfirm}
                title="Cancel Interview?"
                description="This will discard the current triage session. The patient record will not be saved."
                confirmLabel="Discard"
                cancelLabel="Continue"
                isDestructive
                onConfirm={handleConfirmCancel}
                onCancel={() => setShowCancelConfirm(false)}
            />
        </div>
    );
};

export default ChatPane;
