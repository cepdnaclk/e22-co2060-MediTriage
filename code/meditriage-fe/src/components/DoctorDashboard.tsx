import React, { useState } from 'react';
import { User, PatientCase, TriageStatus, UrgencyLevel } from '../types';
import { ToastType } from './ui/Toast';


interface DoctorDashboardProps {
    user: User;
    cases: PatientCase[];
    activeView: string;
    onTreatCase: (id: string) => void;
    showToast: (msg: string, type: ToastType) => void;
}

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ user, cases, activeView, onTreatCase, showToast }) => {
    return (
        <div className="h-full bg-[#f2f2f7] p-10 flex flex-col items-center justify-center font-sans">
            <div className="text-center animate-fade-in">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-4">Doctor Dashboard</h1>
                <p className="text-gray-500 font-medium">
                    Not yet implemented.
                </p>
            </div>
        </div>
    );
};

export default DoctorDashboard;
