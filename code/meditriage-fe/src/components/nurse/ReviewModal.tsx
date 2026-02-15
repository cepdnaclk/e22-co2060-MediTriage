import React from 'react';
import { SoapNote } from '../../types';

interface ReviewModalProps {
    isOpen: boolean;
    generatedSoap: SoapNote | null;
    setGeneratedSoap: (soap: any) => void;
    formData: { name: string; age: string; gender: string; complaint: string };
    setFormData: (data: { name: string; age: string; gender: string; complaint: string }) => void;
    editingCaseId: string | null;
    onSubmit: () => void;
    onDiscard: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
    isOpen,
    generatedSoap,
    setGeneratedSoap,
    formData,
    setFormData,
    editingCaseId,
    onSubmit,
    onDiscard,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] flex flex-col relative z-10 shadow-2xl overflow-hidden animate-scale-up">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50" style={{ background: 'white' }}>
                    <h2 className="text-2xl font-extrabold text-gray-900">{editingCaseId ? 'Edit Patient Record' : 'Review Summary'}</h2>
                    <div className="flex gap-2">
                        <div onClick={() => generatedSoap && setGeneratedSoap({ ...generatedSoap, urgency: 'RED' })} className={`px-4 py-2 rounded-full font-bold text-xs border cursor-pointer select-none transition-all ${generatedSoap?.urgency === 'RED' ? 'bg-red-500 text-white border-red-600' : 'bg-gray-100 text-gray-400 border-transparent hover:bg-gray-200'}`}>IMMEDIATE</div>
                        <div onClick={() => generatedSoap && setGeneratedSoap({ ...generatedSoap, urgency: 'YELLOW' })} className={`px-4 py-2 rounded-full font-bold text-xs border cursor-pointer select-none transition-all ${generatedSoap?.urgency === 'YELLOW' ? 'bg-yellow-400 text-black border-yellow-500' : 'bg-gray-100 text-gray-400 border-transparent hover:bg-gray-200'}`}>URGENT</div>
                        <div onClick={() => generatedSoap && setGeneratedSoap({ ...generatedSoap, urgency: 'GREEN' })} className={`px-4 py-2 rounded-full font-bold text-xs border cursor-pointer select-none transition-all ${generatedSoap?.urgency === 'GREEN' ? 'bg-green-500 text-white border-green-600' : 'bg-gray-100 text-gray-400 border-transparent hover:bg-gray-200'}`}>ROUTINE</div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10" style={{ background: '#f2f2f7', padding: 0 }}>
                    {!generatedSoap ? (
                        <div className="flex flex-col items-center justify-center h-full bg-white" style={{ background: '#ffffffff', padding: '30px 0' }}>
                            <div className="w-16 h-16 border-4 border-gray-100 border-t-[#17406E] rounded-full animate-spin mb-6" />
                            <p className="text-gray-900 font-bold text-lg">{editingCaseId ? 'Loading Patient Record...' : 'AI is analyzing interview...'}</p>
                            <p className="text-gray-400 mt-2">{editingCaseId ? 'Fetching latest data from database' : 'Generating SOAP note & calculating urgency'}</p>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto space-y-10" style={{ background: 'white', margin: '25px', padding: '35px', maxWidth: '-webkit-fill-available', borderRadius: '20px' }}>

                            {/* Section 1: Patient Specifications (Only if editing) */}
                            {editingCaseId && (
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-1 h-5 bg-[#17406E]"></div>
                                        <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: '#17406E', fontWeight: 900 }}>Patient Specifications</h3>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="col-span-1 space-y-2">
                                            <label className="text-xs font-bold text-gray-500 ml-1">Patient Name <span className="text-red-500">*</span></label>
                                            <input
                                                className="w-full bg-[#f2f2f7] border-transparent rounded-xl px-5 py-4 font-semibold text-gray-900 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-1 space-y-2">
                                            <label className="text-xs font-bold text-gray-500 ml-1">Age <span className="text-red-500">*</span></label>
                                            <input
                                                className="w-full bg-[#f2f2f7] border-transparent rounded-xl px-5 py-4 font-semibold text-gray-900 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                                value={formData.age}
                                                onChange={e => setFormData({ ...formData, age: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-1 space-y-2">
                                            <label className="text-xs font-bold text-gray-500 ml-1">Gender</label>
                                            <div className="relative">
                                                <select
                                                    className="w-full appearance-none bg-[#f2f2f7] border-transparent rounded-xl px-5 py-4 font-semibold text-gray-900 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                                    value={formData.gender}
                                                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                                >
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                </select>
                                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-xs font-bold text-gray-500 ml-1">Chief Complaint</label>
                                            <input
                                                disabled
                                                className="w-full bg-gray-100 text-gray-400 border-transparent rounded-xl px-5 py-4 font-semibold outline-none cursor-not-allowed"
                                                value={formData.complaint}
                                            />
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Section 2: Clinical SOAP Note */}
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-1 h-5 bg-[#17406E]"></div>
                                    <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: '#17406E', fontWeight: 900 }}>Clinical Assessment & Plan</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    {/* Subjective */}
                                    <div className="col-span-2 md:col-span-1 space-y-2">
                                        <label className="text-xs font-bold text-gray-500 ml-1">Subjective</label>
                                        <textarea
                                            className="w-full bg-[#f2f2f7] border-transparent rounded-xl px-5 py-4 font-medium text-gray-900 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all resize-none h-40 leading-relaxed"
                                            value={generatedSoap.subjective}
                                            onChange={(e) => setGeneratedSoap({ ...generatedSoap, subjective: e.target.value })}
                                        />
                                    </div>

                                    {/* Objective */}
                                    <div className="col-span-2 md:col-span-1 space-y-2">
                                        <label className="text-xs font-bold text-gray-500 ml-1">Objective</label>
                                        <textarea
                                            className="w-full bg-[#f2f2f7] border-transparent rounded-xl px-5 py-4 font-medium text-gray-900 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all resize-none h-40 leading-relaxed"
                                            value={generatedSoap.objective}
                                            onChange={(e) => setGeneratedSoap({ ...generatedSoap, objective: e.target.value })}
                                        />
                                    </div>

                                    {/* Assessment */}
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-bold ml-1" style={{ color: '#17406E' }}>AI Assessment</label>
                                        <textarea
                                            className="w-full bg-blue-50/50 border-blue-100/50 rounded-xl px-5 py-4 font-bold text-blue-900 text-lg focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none h-24 leading-relaxed"
                                            value={generatedSoap.assessment}
                                            onChange={(e) => setGeneratedSoap({ ...generatedSoap, assessment: e.target.value })}
                                        />
                                    </div>

                                    {/* Plan */}
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-gray-500 ml-1">Suggested Plan</label>
                                        <textarea
                                            className="w-full bg-[#f2f2f7] border-transparent rounded-xl px-5 py-4 font-medium text-gray-900 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all resize-none h-32 leading-relaxed"
                                            value={generatedSoap.plan}
                                            onChange={(e) => setGeneratedSoap({ ...generatedSoap, plan: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </section>

                        </div>
                    )}
                </div>

                <div className="p-8 border-t border-gray-50 bg-gray-50/50 flex justify-end gap-4" style={{ border: 'none', background: 'white' }}>
                    <button onClick={onDiscard} className="relative inline-flex items-center justify-center text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed font-bold" style={{ border: '1px solid #cfcfcf', padding: '12px 23px', color: '#4b5563', borderRadius: '25px', background: 'white' }}>Discard</button>
                    <button onClick={onSubmit} disabled={!generatedSoap} className="relative inline-flex items-center justify-center text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed font-bold" style={{ border: '1px solid #17406e', background: '#17406e', padding: '12px 23px', boxShadow: 'none', borderRadius: '25px', color: 'white' }}>
                        {editingCaseId ? 'Save Changes' : 'Confirm & Submit'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewModal;
