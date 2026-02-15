import React, { useState, useEffect } from 'react';
import { User, UserRole, PatientCase, TriageStatus, UrgencyLevel } from './types';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import NurseDashboard from './components/NurseDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import Toast, { ToastType } from './components/ui/Toast';
import * as authService from './services/authService';
import * as triageService from './services/triageService';
import { getToken } from './services/api';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [cases, setCases] = useState<PatientCase[]>([]);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
        message: '',
        type: 'info',
        isVisible: false
    });

    const showToast = (message: string, type: ToastType = 'info') => {
        setToast({ message, type, isVisible: true });
    };

    // Check for existing JWT on mount
    useEffect(() => {
        const checkAuth = async () => {
            if (getToken()) {
                try {
                    const user = await authService.getCurrentUser();
                    setCurrentUser(user);
                } catch {
                    // Token expired or invalid — clear it
                    authService.logout();
                }
            }
            setIsCheckingAuth(false);
        };
        checkAuth();
    }, []);

    // Fetch cases from backend queue & history
    useEffect(() => {
        if (currentUser) {
            const fetchCases = async () => {
                try {
                    if (currentUser.role === UserRole.NURSE) {
                        const [queue, history] = await Promise.all([
                            triageService.getQueue(),
                            triageService.getHistory()
                        ]);

                        const mapToCase = (item: any): PatientCase => ({
                            id: item.id,
                            patientName: item.patient_name,
                            age: item.patient_age.toString(),
                            gender: item.patient_gender,
                            chiefComplaint: item.chief_complaint || "No complaint",
                            nurseId: item.nurse_id,
                            startTime: new Date(item.created_at.endsWith('Z') ? item.created_at : item.created_at + 'Z').getTime(),
                            status: item.status === 'COMPLETED' ? TriageStatus.TREATED :
                                item.risk_score === 'HIGH' ? TriageStatus.URGENT : TriageStatus.WAITING,

                            messages: [], // Details loaded on demand
                        });

                        setCases([...queue.map(mapToCase), ...history.map(mapToCase)]);
                    }
                } catch (err) {
                    console.error("Failed to load queue", err);
                    showToast("Failed to sync dashboard data (Is backend running?)", 'error');
                }
            };
            fetchCases();
        }
    }, [currentUser]);

    const handleLogin = (user: User) => {
        setCurrentUser(user);
        setActiveTab('dashboard');
    };

    const handleLogout = () => {
        authService.logout();
        setCurrentUser(null);
    };

    const handleAddCase = (newCase: PatientCase) => {
        setCases(prev => [newCase, ...prev]);
    };

    const handleRemoveCase = (caseId: string) => {
        setCases(prev => prev.map(c =>
            c.id === caseId ? { ...c, status: TriageStatus.REMOVED } : c
        ));
    };

    const handleUpdateCase = (updatedCase: PatientCase) => {
        setCases(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c));
    };

    const handleTreatCase = (caseId: string) => {
        setCases(prev => prev.map(c =>
            c.id === caseId ? { ...c, status: TriageStatus.TREATED } : c
        ));
    };

    // Show nothing while checking existing auth
    if (isCheckingAuth) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#f2f2f7]">
                <div className="w-8 h-8 border-4 border-[#17406E] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full bg-[#f2f2f7] font-sans text-gray-900 overflow-hidden">
            {/* Global Toast */}
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />

            {!currentUser ? (
                <Login onLogin={handleLogin} />
            ) : (
                <>
                    <Sidebar
                        user={currentUser}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        onLogout={handleLogout}
                        queueCount={cases.filter(c => c.status === TriageStatus.WAITING || c.status === TriageStatus.URGENT).length}
                    />

                    <main className="flex-1 ml-[19rem] h-full relative overflow-hidden">
                        {currentUser.role === UserRole.NURSE ? (
                            <NurseDashboard
                                user={currentUser}
                                cases={cases}
                                onAddCase={handleAddCase}
                                onRemoveCase={handleRemoveCase}
                                onUpdateCase={handleUpdateCase}
                                activeView={activeTab}
                                onNavigate={setActiveTab}
                                showToast={showToast}
                            />
                        ) : (
                            <DoctorDashboard
                                user={currentUser}
                                cases={cases}
                                activeView={activeTab}
                                onTreatCase={handleTreatCase}
                                showToast={showToast}
                            />
                        )}
                    </main>
                </>
            )}
        </div>
    );
};

export default App;
