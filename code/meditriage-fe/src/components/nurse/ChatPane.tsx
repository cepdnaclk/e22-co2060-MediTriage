import React, { useRef, useEffect } from 'react';
import { Message } from '../../types';

interface ChatPaneProps {
    messages: Message[];
    chatInput: string;
    setChatInput: (val: string) => void;
    isTyping: boolean;
    onSendMessage: () => void;
    onFinishInterview: () => void;
    onCancelInterview: () => void;
    formData: { firstName: string; lastName: string; birthYear: string; birthMonth: string; birthDay: string; gender: string; complaint: string };
}

const ChatPane: React.FC<ChatPaneProps> = ({
    messages,
    chatInput,
    setChatInput,
    isTyping,
    onSendMessage,
    onFinishInterview,
    onCancelInterview,
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex flex-col h-full relative bg-[#f2f2f7] animate-fade-in font-sans" style={{ margin: '20px 15px 0px', height: '-webkit-fill-available' }}>
            {/* Header */}
            <div className="px-6 py-4 flex justify-between items-center bg-[#f2f2f7] sticky top-0 z-20">
                <div className="flex items-center" style={{ gap: '10px' }}>
                    <img src="/assets/branding/MediTriageAI.png" alt="MediTriage AI" className="rounded-full object-cover" style={{ width: '3.5rem', height: '3.5rem' }} />
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight" style={{ marginBottom: '4px' }}>MediTriage AI</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <p className="text-xs text-gray-500 font-medium">Session Active</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={onCancelInterview} className="text-sm font-medium text-gray-600 hover:bg-gray-200/50 rounded-full transition-colors" style={{ border: '1px solid #cfcfcf', padding: '12px 23px' }}>Cancel</button>
                    <button onClick={onFinishInterview} className="text-sm font-bold bg-[#17406E] text-white rounded-full hover:bg-[#1c5b7e] transition-all" style={{ border: '1px solid #17406E', padding: '12px 23px' }}>End & Report</button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4">
                <div className="max-w-3xl mx-auto w-full pt-8 flex flex-col gap-6 pb-40">
                    {messages.map(m => (
                        <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar Icon (Assistant only) */}
                            {m.role === 'model' && (
                                <div className="w-8 h-8 bg-[#17406E] rounded-full flex-shrink-0 flex items-center justify-center mt-1">
                                    <svg className="w-[18px] h-[18px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="8" width="16" height="12" rx="3" /><line x1="12" y1="2" x2="12" y2="8" /><circle cx="12" cy="2" r="1.5" fill="currentColor" /><circle cx="9" cy="13.5" r="1.5" fill="currentColor" stroke="none" /><circle cx="15" cy="13.5" r="1.5" fill="currentColor" stroke="none" /><path d="M9.5 17.5a2.5 2.5 0 005 0" /><line x1="1" y1="13" x2="4" y2="13" /><line x1="20" y1="13" x2="23" y2="13" /></svg>
                                </div>
                            )}

                            {/* Message Bubble */}
                            <div className={`relative max-w-[85%] ${m.role === 'user' ? 'ml-auto' : ''}`}>
                                {m.role === 'model' ? (
                                    <div className="bg-white shadow-sm border border-gray-100" style={{ borderRadius: '20px', padding: '15px 20px 20px' }}>
                                        <span className="block text-sm" style={{ color: '#17406E', fontWeight: 900, marginBottom: '10px' }}>MediTriage Assistant</span>
                                        <div className="text-gray-800 text-[16px] leading-relaxed whitespace-pre-wrap">
                                            {m.text}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl p-4 text-right" style={{ backgroundColor: '#17406E' }}>
                                        <div className="text-left text-[16px] leading-relaxed whitespace-pre-wrap font-medium text-white">
                                            {m.text}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex gap-4">
                            <div className="w-8 h-8 bg-[#17406E] rounded-full flex-shrink-0 flex items-center justify-center mt-1">
                                <svg className="w-[18px] h-[18px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="8" width="16" height="12" rx="3" /><line x1="12" y1="2" x2="12" y2="8" /><circle cx="12" cy="2" r="1.5" fill="currentColor" /><circle cx="9" cy="13.5" r="1.5" fill="currentColor" stroke="none" /><circle cx="15" cy="13.5" r="1.5" fill="currentColor" stroke="none" /><path d="M9.5 17.5a2.5 2.5 0 005 0" /><line x1="1" y1="13" x2="4" y2="13" /><line x1="20" y1="13" x2="23" y2="13" /></svg>
                            </div>
                            <div className="bg-white shadow-sm border border-gray-100 flex items-center gap-2" style={{ borderRadius: '20px', padding: '15px 20px 20px' }}>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 px-0 py-[10px] pb-[25px] z-30 bg-[#f2f2f7]">
                <div className="max-w-3xl mx-auto w-full">
                    <div className="relative flex items-center bg-white rounded-full p-2 pl-6 shadow-sm border border-gray-200 focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black/10 transition-all">
                        <input
                            autoFocus
                            className="chat-input flex-1 bg-transparent border-0 py-3 focus:ring-0 outline-none text-lg text-gray-900 placeholder-gray-500"
                            style={{ outline: 'none', border: 'none' }}
                            placeholder="Type your symptoms..."
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    onSendMessage();
                                }
                            }}
                        />
                        <button
                            onClick={onSendMessage}
                            disabled={!chatInput.trim() || isTyping}
                            className="w-10 h-10 bg-[#17406E] text-white rounded-full flex items-center justify-center hover:bg-[#1c5b7e] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md m-1"
                        >
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                        </button>
                    </div>
                    <p className="text-center text-[11px] text-gray-400 mt-3 font-medium">MediTriage AI can make mistakes. Verify important medical info.</p>
                </div>
            </div>
        </div>
    );
};

export default ChatPane;
