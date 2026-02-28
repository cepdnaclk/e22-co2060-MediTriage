import React, { useState, useRef, useEffect } from 'react';
import { User, PatientCase, TriageStatus, Message, UrgencyLevel } from '../types';
import * as triageService from '../services/triageService';
import * as patientService from '../services/patientService';
import ConfirmModal from './ui/ConfirmModal';
import { ToastType } from './ui/Toast';

// Sub-Components
import OverviewPane from './nurse/OverviewPane';
import QueuePane from './nurse/QueuePane';
import HistoryPane from './nurse/HistoryPane';
import ChatPane from './nurse/ChatPane';
import SettingsPane from './nurse/SettingsPane';
import AdmitPatientModal from './nurse/AdmitPatientModal';
import ReviewModal from './nurse/ReviewModal';
import PatientViewModal from './nurse/PatientViewModal';

interface NurseDashboardProps {
   user: User;
   cases: PatientCase[];
   onAddCase: (c: PatientCase) => void;
   onRemoveCase: (id: string) => void;
   onUpdateCase: (c: PatientCase) => void;
   activeView: string;
   onNavigate: (view: string) => void;
   showToast: (msg: string, type: ToastType) => void;
}

const NurseDashboard: React.FC<NurseDashboardProps> = ({ user, cases, onAddCase, onRemoveCase, onUpdateCase, activeView, onNavigate, showToast }) => {
   // Modal / Flow State
   const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
   const [isChatActive, setIsChatActive] = useState(false);
   const [isReviewOpen, setIsReviewOpen] = useState(false);
   const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
   const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
   const [selectedPatientForView, setSelectedPatientForView] = useState<PatientCase | null>(null);
   const [patientToDelete, setPatientToDelete] = useState<string | null>(null);

   // Filter States
   const [queueFilter, setQueueFilter] = useState('All');
   const [queueSearch, setQueueSearch] = useState('');
   const [queueGenderFilter, setQueueGenderFilter] = useState('All');
   const [historyFilter, setHistoryFilter] = useState('All');
   const [historySearch, setHistorySearch] = useState('');
   const [historyGenderFilter, setHistoryGenderFilter] = useState('All');
   const [queueVisibleCount, setQueueVisibleCount] = useState(10);

   // Settings State
   const [sensitivity, setSensitivity] = useState(2);
   const [maxQuestions, setMaxQuestions] = useState(5);
   const [department, setDepartment] = useState('Emergency / OPD');

   // Data State
   const [formData, setFormData] = useState({ firstName: '', lastName: '', birthYear: '', birthMonth: '', birthDay: '', gender: '', complaint: '' });
   const [messages, setMessages] = useState<Message[]>([]);
   const [chatInput, setChatInput] = useState('');
   const [isTyping, setIsTyping] = useState(false);
   const [generatedSoap, setGeneratedSoap] = useState<any>(null);
   const [activeEncounterId, setActiveEncounterId] = useState<string | null>(null);

   // Derived Data
   const activeCases = cases.filter(c => c.status === TriageStatus.WAITING || c.status === TriageStatus.URGENT);
   const historyCases = cases.filter(c => c.status === TriageStatus.TREATED || c.status === TriageStatus.REMOVED);

   // Handlers
   const openAdmitModal = () => {
      setFormData({ firstName: '', lastName: '', birthYear: '', birthMonth: '', birthDay: '', gender: '', complaint: '' });
      setEditingCaseId(null);
      setIsAdmitModalOpen(true);
   };

   const startInterview = async () => {
      setIsAdmitModalOpen(false);
      setIsChatActive(true);
      setMessages([]);
      setActiveEncounterId(null); // Clear previous
      setIsTyping(true); // Show loading indicator immediately

      try {
         // 1. Create Patient
         const firstName = formData.firstName.trim();
         const lastName = formData.lastName.trim();

         // Construct DOB
         const monthMap: { [key: string]: string } = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
            'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
         };
         const month = monthMap[formData.birthMonth] || '01';
         const day = formData.birthDay.padStart(2, '0') || '01';
         const year = formData.birthYear || '1990';
         const dob = `${year}-${month}-${day}`;

         const patient = await patientService.createPatient({
            national_id: `NIC-${Date.now().toString().slice(-6)}`,
            first_name: firstName,
            last_name: lastName,
            date_of_birth: dob
         });

         // 2. Create Encounter
         const encounter = await patientService.createEncounter(patient.id, formData.complaint);
         setActiveEncounterId(encounter.id);

         // 3. Start Triage Session
         const res = await triageService.startInterview(encounter.id);
         setMessages([{
            id: 'init', role: 'model', text: res.ai_message, timestamp: Date.now()
         }]);

      } catch (err) {
         console.error("Failed to start triage flow", err);
         setMessages([{
            id: 'error', role: 'model', text: "Error starting session. Please checks backend logs.", timestamp: Date.now()
         }]);
      } finally {
         setIsTyping(false); // Hide loading indicator
      }
   };

   const sendChatMessage = async () => {
      if (!chatInput.trim()) return;
      const text = chatInput;
      setChatInput('');
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() }]);
      setIsTyping(true);

      try {
         if (activeEncounterId) {
            const result = await triageService.sendMessage(activeEncounterId, text);
            setIsTyping(false);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: result.ai_message, timestamp: Date.now() }]);

            if (result.is_interview_complete && result.soap_note) {
               // Backend auto-generated the SOAP note
               setGeneratedSoap({
                  subjective: result.soap_note.subjective,
                  objective: result.soap_note.objective,
                  assessment: result.soap_note.assessment,
                  plan: result.soap_note.plan,
                  urgency: result.soap_note.risk_score === 'HIGH' ? 'RED' : result.soap_note.risk_score === 'LOW' ? 'GREEN' : 'YELLOW'
               });
               finishInterview();
            }
         } else {
            // No encounter
            setIsTyping(false);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'Backend not connected. Please ensure the API server is running.', timestamp: Date.now() }]);
         }
      } catch (err) {
         setIsTyping(false);
         setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'An error occurred communicating with the server.', timestamp: Date.now() }]);
      }
   };

   const finishInterview = async () => {
      setIsChatActive(false);
      setEditingCaseId(null);
      setIsReviewOpen(true);
      // generatedSoap is already set by the chat response when interview completes
      // If not yet set (manual finish), try to fetch from backend
      if (!generatedSoap && activeEncounterId) {
         try {
            const note = await triageService.getClinicalNote(activeEncounterId);
            setGeneratedSoap({
               subjective: note.subjective || '',
               objective: note.objective || '',
               assessment: note.assessment || '',
               plan: note.plan || '',
               urgency: 'YELLOW'
            });
         } catch {
            // Note may not exist yet if interview was manually ended
         }
      }
   };

   const cancelInterview = () => {
      setIsChatActive(false);
      setMessages([]);
   };

   const handleEditPatient = async (patient: PatientCase) => {
      setEditingCaseId(patient.id);

      const nameParts = patient.patientName.trim().split(' ');
      const lastName = nameParts.length > 1 ? nameParts.pop() || '' : '';
      const firstName = nameParts.join(' ');
      const birthYear = (new Date().getFullYear() - parseInt(patient.age || '30')).toString();

      setFormData({
         firstName,
         lastName,
         birthYear,
         birthMonth: 'January',
         birthDay: '1',
         gender: patient.gender,
         complaint: patient.chiefComplaint
      });

      // SHow loading state in ReviewModal
      setGeneratedSoap(null);
      setSelectedPatientForView(null);
      setIsReviewOpen(true);

      try {
         // If it's a backend case (UUID), fetch the note
         // MTP IDs are local-only
         if (!patient.id.startsWith('MTP')) {
            const note = await triageService.getClinicalNote(patient.id);
            setGeneratedSoap({
               subjective: note.subjective || '',
               objective: note.objective || '',
               assessment: note.assessment || '',
               plan: note.plan || '',
               urgency: patient.status === TriageStatus.URGENT ? UrgencyLevel.IMMEDIATE : UrgencyLevel.ROUTINE
            });
         } else {
            throw new Error("Local case");
         }
      } catch (error) {
         // Fallback: Use existing local note or dummy
         // This handles 404s (no note yet) or local cases
         setGeneratedSoap(patient.soapNote || {
            subjective: '',
            objective: '',
            assessment: '',
            plan: '',
            urgency: UrgencyLevel.ROUTINE
         });
      }
   };


   const submitCase = () => {
      if (!generatedSoap) return;

      if (editingCaseId) {
         const originalCase = cases.find(c => c.id === editingCaseId);
         if (originalCase) {
            const updatedCase: PatientCase = {
               ...originalCase,
               patientName: `${formData.firstName} ${formData.lastName}`,
               age: formData.birthYear ? (new Date().getFullYear() - parseInt(formData.birthYear)).toString() : originalCase.age,
               gender: formData.gender,
               chiefComplaint: formData.complaint,
               status: generatedSoap.urgency === 'RED' ? TriageStatus.URGENT : originalCase.status,
               soapNote: generatedSoap
            };
            onUpdateCase(updatedCase);
            showToast(`Updated record for ${updatedCase.patientName}`, 'success');
         }
      } else {
         const maxId = cases.reduce((max, c) => {
            const num = parseInt(c.id.replace('MTP', '')) || 0;
            return num > max ? num : max;
         }, 1000);

         const newId = `MTP${maxId + 1}`;

         const newCase: PatientCase = {
            id: newId,
            patientName: `${formData.firstName} ${formData.lastName}`,
            age: formData.birthYear ? (new Date().getFullYear() - parseInt(formData.birthYear)).toString() : '30',
            gender: formData.gender,
            chiefComplaint: formData.complaint,
            nurseId: user.id,
            startTime: Date.now(),
            status: generatedSoap.urgency === 'RED' ? TriageStatus.URGENT : TriageStatus.WAITING,
            messages: messages,
            soapNote: generatedSoap
         };
         onAddCase(newCase);
         showToast(`Admitted ${newCase.patientName} to Queue`, 'success');
      }

      setIsReviewOpen(false);
      setEditingCaseId(null);
   };

   const initiateRemovePatient = (id: string) => {
      setPatientToDelete(id);
      setIsDeleteConfirmOpen(true);
   };

   const confirmRemovePatient = () => {
      if (patientToDelete) {
         onRemoveCase(patientToDelete);
         setSelectedPatientForView(null);
         setIsDeleteConfirmOpen(false);
         setPatientToDelete(null);
         showToast('Patient removed from queue', 'info');
      }
   };

   const handleClearCache = () => {
      showToast('Local cache cleared successfully', 'success');
   };

   const handleExportCSV = () => {
      const headers = "ID,Name,Age,Gender,Complaint,Urgency,Time\n";
      const rows = cases.map(c =>
         `${c.id},"${c.patientName}",${c.age},${c.gender},"${c.chiefComplaint}",${c.soapNote?.urgency || 'N/A'},${new Date(c.startTime).toISOString()}`
      ).join("\n");
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `triage_log_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      showToast('Exporting CSV...', 'info');
   };

   // Main Render
   return (
      <>
         <div className={`h-full bg-[#f2f2f7] relative font-sans ${isChatActive ? 'overflow-hidden' : 'p-10 overflow-y-auto'}`}>

            {/* Top Header - Hide if Chat is active */}
            {!isChatActive && (
               <div className="flex justify-between items-center mb-10 animate-fade-in">
                  <div>
                     <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        {activeView === 'dashboard' && 'Overview'}
                        {activeView === 'queue' && 'Patient Queue'}
                        {activeView === 'history' && 'History Log'}
                        {activeView === 'settings' && 'Settings'}
                     </h1>
                     <p className="text-gray-500 font-medium mt-1">Overview of the system</p>
                  </div>
                  <div className="flex items-center gap-4">
                     <button
                        onClick={openAdmitModal}
                        className="flex items-center gap-2 bg-[#17406E] text-white px-6 py-3 rounded-full font-bold  hover:bg-[#1c5b7e] transition-all transform "
                     >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                        Admit Patient
                     </button>
                  </div>
               </div>
            )}

            {/* View Switcher */}
            {isChatActive ? (
               <ChatPane
                  messages={messages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  isTyping={isTyping}
                  onSendMessage={sendChatMessage}
                  onFinishInterview={finishInterview}
                  onCancelInterview={cancelInterview}
                  formData={formData}
               />
            ) : (
               <>
                  {activeView === 'dashboard' && (
                     <OverviewPane
                        activeCases={activeCases}
                        onViewPatient={setSelectedPatientForView}
                        onNavigate={onNavigate}
                     />
                  )}
                  {activeView === 'queue' && (
                     <QueuePane
                        activeCases={activeCases}
                        queueFilter={queueFilter}
                        setQueueFilter={setQueueFilter}
                        queueSearch={queueSearch}
                        setQueueSearch={setQueueSearch}
                        queueGenderFilter={queueGenderFilter}
                        setQueueGenderFilter={setQueueGenderFilter}
                        queueVisibleCount={queueVisibleCount}
                        setQueueVisibleCount={setQueueVisibleCount}
                        onViewPatient={setSelectedPatientForView}
                     />
                  )}
                  {activeView === 'history' && (
                     <HistoryPane
                        historyCases={historyCases}
                        historyFilter={historyFilter}
                        setHistoryFilter={setHistoryFilter}
                        historySearch={historySearch}
                        setHistorySearch={setHistorySearch}
                        historyGenderFilter={historyGenderFilter}
                        setHistoryGenderFilter={setHistoryGenderFilter}
                        onViewPatient={setSelectedPatientForView}
                        onRemove={initiateRemovePatient}
                     />
                  )}
                  {activeView === 'settings' && (
                     <SettingsPane
                        user={user}
                        sensitivity={sensitivity}
                        setSensitivity={setSensitivity}
                        maxQuestions={maxQuestions}
                        setMaxQuestions={setMaxQuestions}
                        department={department}
                        setDepartment={setDepartment}
                        onClearCache={handleClearCache}
                        onExportCSV={handleExportCSV}
                     />
                  )}
               </>
            )}

            {/* Modals */}
            <AdmitPatientModal
               isOpen={isAdmitModalOpen}
               formData={formData}
               setFormData={setFormData}
               onStartInterview={startInterview}
               onClose={() => setIsAdmitModalOpen(false)}
            />

            <ReviewModal
               isOpen={isReviewOpen}
               generatedSoap={generatedSoap}
               setGeneratedSoap={setGeneratedSoap}
               formData={formData}
               setFormData={setFormData}
               editingCaseId={editingCaseId}
               onSubmit={submitCase}
               onDiscard={() => { setIsReviewOpen(false); setEditingCaseId(null); }}
            />

            <PatientViewModal
               patient={selectedPatientForView}
               isActive={activeCases.some(c => c.id === selectedPatientForView?.id)}
               onClose={() => setSelectedPatientForView(null)}
               onRemove={initiateRemovePatient}
               onEdit={handleEditPatient}
            />

            <ConfirmModal
               isOpen={isDeleteConfirmOpen}
               title="Remove Patient"
               description={activeView === 'history' ? "Are you sure you want to permanently delete this record from the history log?" : "Are you sure you want to remove this patient from the active queue? This action cannot be undone."}
               confirmLabel="Remove"
               isDestructive={true}
               onConfirm={confirmRemovePatient}
               onCancel={() => setIsDeleteConfirmOpen(false)}
            />

         </div>
      </>
   );
};

export default NurseDashboard;
