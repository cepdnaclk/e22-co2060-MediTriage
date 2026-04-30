import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole, PatientCase, TriageStatus, CareSetting } from './types';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import OverviewPane from './components/nurse/OverviewPane';
import PatientsPane from './components/nurse/PatientsPane';
import SettingsPane from './components/nurse/SettingsPane';
import ChatPane from './components/nurse/ChatPane';
import NicGatekeeperModal from './components/nurse/NicGatekeeperModal';
import AdmitPatientModal from './components/nurse/AdmitPatientModal';
import Toast, { ToastType } from './components/ui/Toast';
import ConfirmModal from './components/ui/ConfirmModal';
import * as authService from './services/authService';
import * as triageService from './services/triageService';
import { getToken, setOnUnauthorized } from './services/api';

// -- Doctor Components --
import DoctorOverviewPane from './components/doctor/OverviewPane';
import DoctorPatientsPane from './components/doctor/PatientsPane';
import DoctorSettingsPane from './components/doctor/SettingsPane';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [cases, setCases] = useState<PatientCase[]>([]);
    const [careSetting, setCareSetting] = useState<CareSetting>(CareSetting.OPD);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // Patient registration flow
    const [showNicModal, setShowNicModal] = useState(false);
    const [showAdmitModal, setShowAdmitModal] = useState(false);
    const [prefillPatient, setPrefillPatient] = useState<any>(null);
    const [pendingCase, setPendingCase] = useState<PatientCase | null>(null);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
        message: '', type: 'info', isVisible: false,
    });

    const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        setToast({ message, type, isVisible: true });
    }, []);

    const navigate = useNavigate();
    const location = useLocation();
    const isChatRoute = location.pathname.startsWith('/chat');

    // Check for existing JWT on mount
    useEffect(() => {
        const checkAuth = async () => {
            if (getToken()) {
                try {
                    const user = await authService.getCurrentUser();
                    setCurrentUser(user);
                } catch {
                    authService.logout();
                }
            }
            setIsCheckingAuth(false);
        };
        checkAuth();

        // Register session expiration callback
        setOnUnauthorized(() => {
            setShowSessionExpiredModal(true);
        });

        return () => setOnUnauthorized(null);
    }, []);

    // Load existing encounters from backend when user is authenticated
    useEffect(() => {
        if (!currentUser) return;
        triageService.listEncounters().then(encounters => {
            const mapped: PatientCase[] = encounters.map(enc => {
                // Map backend status to frontend enum
                let status = TriageStatus.IN_PROGRESS;
                if (enc.status === 'AWAITING_REVIEW') status = TriageStatus.AWAITING_REVIEW;
                else if (enc.status === 'COMPLETED') status = TriageStatus.COMPLETED;

                return {
                    id: enc.id,
                    patientId: enc.patient_id,
                    patientName: enc.patient_name,
                    age: enc.patient_age || '',
                    gender: enc.patient_gender || '',
                    chiefComplaint: enc.chief_complaint || '',
                    nurseId: '',
                    doctorId: enc.doctor_id || undefined,
                    doctorName: enc.doctor_name || undefined,
                    startTime: new Date(enc.encounter_timestamp).getTime(),
                    status,
                    messages: [],
                    encounterId: enc.id,
                };
            });
            const sorted = mapped.sort((a, b) => b.startTime - a.startTime);
            setCases(sorted);
        }).catch(() => { });
    }, [currentUser]);

    /* ── Handlers ──────────────────────────────────── */

    const handleLogin = (user: User) => {
        setCurrentUser(user);
        setShowSessionExpiredModal(false);
        navigate('/overview');
    };

    const handleLogout = () => {
        authService.logout();
        setCurrentUser(null);
        setCases([]);
        navigate('/');
    };

    const handleAddCase = useCallback((newCase: PatientCase) => {
        setCases(prev => [newCase, ...prev]);
    }, []);

    const handleUpdateCase = useCallback((updatedCase: PatientCase) => {
        setCases(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c));
    }, []);

    const handleRemoveCase = useCallback((caseId: string) => {
        setCases(prev => prev.filter(c => c.id !== caseId));
    }, []);

    const handleUpdateUser = useCallback((updatedUser: User) => {
        setCurrentUser(updatedUser);
    }, []);

    // Patient registration flow
    const handleAddPatientClick = () => {
        setPrefillPatient(null);
        setShowNicModal(true);
    };

    const handleNicProceed = (patientData: any) => {
        // Guard: Check if patient already has an active encounter (Frontend-only check)
        if (patientData.id) {
            const hasActiveEncounter = cases.some(c => 
                (c.patientId === patientData.id || c.patientId === undefined) && 
                c.status !== TriageStatus.COMPLETED
            );

            if (hasActiveEncounter) {
                showToast('This patient already has an active session. Please cancel the existing session before starting a new one.', 'error');
                return;
            }
        }
        
        setPrefillPatient(patientData);
        setShowNicModal(false);
        setShowAdmitModal(true);
    };

    const handleStartChat = (encounterId: string, newCase: PatientCase) => {
        // Store case but don't add to list yet — added after SOAP review
        setPendingCase(newCase);
        setShowAdmitModal(false);
        navigate(`/chat/${encounterId}`);
    };

    /* ── Auth check spinner ───────────────────────── */

    if (isCheckingAuth) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#f2f2f7]">
                <div className="w-8 h-8 border-4 border-[#17406E] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    /* ── Unauthenticated ──────────────────────────── */

    if (!currentUser) {
        return (
            <div className="flex h-screen w-full bg-[#f2f2f7] font-sans text-gray-900 overflow-hidden">
                <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast(p => ({ ...p, isVisible: false }))} />
                <Login onLogin={handleLogin} />
            </div>
        );
    }

    /* ── Authenticated Layout ─────────────────────── */

    const waitingCount = currentUser.role === UserRole.DOCTOR
        ? cases.filter(c => c.status !== TriageStatus.COMPLETED && c.doctorName === currentUser.name).length
        : cases.filter(c => c.status !== TriageStatus.COMPLETED).length;

    return (
        <div className="flex h-screen w-full bg-[#f2f2f7] font-sans text-gray-900 overflow-hidden">
            {/* Global Toast */}
            <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast(p => ({ ...p, isVisible: false }))} />

            {/* Sidebar */}
            <Sidebar user={currentUser} onLogout={handleLogout} queueCount={waitingCount} />

            {/* Top Header — hidden on chat route */}
            {!isChatRoute && (
                <TopHeader
                    careSetting={careSetting}
                    onCareSettingChange={setCareSetting}
                    onAddPatient={handleAddPatientClick}
                    userRole={currentUser.role}
                />
            )}

            {/* Main Content Area */}
            <main className={`flex-1 ml-[19rem] h-full relative overflow-y-auto ${isChatRoute ? 'pt-0' : 'pt-[80px]'}`}>
                <div className="p-8">
                    <Routes>
                        {currentUser.role === UserRole.DOCTOR ? (
                            <>
                                <Route path="/overview" element={
                                    <DoctorOverviewPane
                                        activeCases={cases}
                                        careSetting={careSetting}
                                        user={currentUser}
                                        onNavigate={(view: string) => navigate(`/${view}`)}
                                        showToast={showToast}
                                        onRemoveCase={handleRemoveCase}
                                        onUpdateCase={handleUpdateCase}
                                    />
                                } />
                                <Route path="/patients" element={
                                    <DoctorPatientsPane
                                        cases={cases}
                                        user={currentUser}
                                        showToast={showToast}
                                        onRemoveCase={handleRemoveCase}
                                        onUpdateCase={handleUpdateCase}
                                    />
                                } />
                                <Route path="/settings" element={
                                    <DoctorSettingsPane
                                        user={currentUser}
                                        onLogout={handleLogout}
                                        onUpdateUser={handleUpdateUser}
                                        showToast={showToast}
                                    />
                                } />
                                <Route path="*" element={<Navigate to="/overview" replace />} />
                            </>
                        ) : (
                            <>
                                <Route path="/overview" element={
                                    <OverviewPane
                                        activeCases={cases}
                                        careSetting={careSetting}
                                        user={currentUser}
                                        onNavigate={(view: string) => navigate(`/${view}`)}
                                        showToast={showToast}
                                        onRemoveCase={handleRemoveCase}
                                    />
                                } />
                                <Route path="/patients" element={
                                    <PatientsPane
                                        cases={cases}
                                        user={currentUser}
                                        showToast={showToast}
                                        onRemoveCase={handleRemoveCase}
                                    />
                                } />
                                <Route path="/settings" element={
                                    <SettingsPane
                                        user={currentUser}
                                        onLogout={handleLogout}
                                        onUpdateUser={handleUpdateUser}
                                        showToast={showToast}
                                    />
                                } />
                                <Route path="/chat/:encounterId" element={
                                    <ChatPane
                                        user={currentUser}
                                        cases={cases}
                                        pendingCase={pendingCase}
                                        onAddCase={handleAddCase}
                                        onUpdateCase={handleUpdateCase}
                                        onRemoveCase={handleRemoveCase}
                                        onClearPendingCase={() => setPendingCase(null)}
                                        showToast={showToast}
                                    />
                                } />
                                <Route path="*" element={<Navigate to="/overview" replace />} />
                            </>
                        )}
                    </Routes>
                </div>
            </main>

            {/* Patient Registration Modals */}
            <NicGatekeeperModal
                isOpen={showNicModal}
                onClose={() => setShowNicModal(false)}
                onProceed={handleNicProceed}
            />

            <AdmitPatientModal
                isOpen={showAdmitModal}
                onClose={() => setShowAdmitModal(false)}
                onStartInterview={handleStartChat}
                prefillData={prefillPatient}
                showToast={showToast}
            />

            <ConfirmModal
                isOpen={showSessionExpiredModal}
                title="Session Expired"
                description="Your session has expired. Please login again to continue."
                confirmLabel="Continue"
                onConfirm={handleLogout}
                onCancel={handleLogout} // Force logout regardless of which button they press
            />
        </div>
    );
};

export default App;
