import React, { useState, useEffect } from 'react';
import { CareSetting, UserRole } from '../types';
import CustomSelect from './ui/CustomSelect';

interface TopHeaderProps {
    careSetting: CareSetting;
    onCareSettingChange: (setting: CareSetting) => void;
    onAddPatient: () => void;
    onNewConference?: () => void;
    showNewConferenceButton?: boolean;
    userRole?: UserRole;
}

const careSettingOptions = [
    { value: CareSetting.OPD, label: 'OPD' },
    { value: CareSetting.WARD, label: 'Ward' },
];

/**
 * Persistent command bar at the top of the dashboard.
 * Contains the Care Setting selector and the + Add Patient button.
 * Never changes when switching panes.
 */
const TopHeader: React.FC<TopHeaderProps> = ({ careSetting, onCareSettingChange, onAddPatient, onNewConference, showNewConferenceButton, userRole }) => {
    // Delay the visibility slightly so the CSS transition triggers even on initial page load
    const [isButtonVisible, setIsButtonVisible] = useState(false);

    useEffect(() => {
        if (showNewConferenceButton) {
            const timer = setTimeout(() => setIsButtonVisible(true), 50);
            return () => clearTimeout(timer);
        } else {
            setIsButtonVisible(false);
        }
    }, [showNewConferenceButton]);

    return (
        <header
            className="fixed top-0 right-0 z-40 flex items-center justify-end animate-slide-down"
            style={{
                left: '0',
                height: '90px',
                paddingTop: '15px',
                padding: '25px 40px 10px',
                background: 'rgba(242, 242, 247, 0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
            }}
        >
            {/* Care Setting Dropdown — left of the Add Patient button */}
            <CustomSelect
                value={careSetting}
                options={careSettingOptions}
                onChange={(val: string) => onCareSettingChange(val as CareSetting)}
                buttonStyle={{
                    borderRadius: '16px',
                    background: 'white',
                    padding: '10px 16px',
                    border: '1px solid #e5e7eb',
                    fontSize: '13px',
                    fontWeight: 600,
                }}
            />

            {/* Primary action — Add Patient (Nurses Only) */}
            {userRole === UserRole.NURSE && (
                <button
                    onClick={onAddPatient}
                    className="ml-4 flex items-center gap-2 px-6 py-3 bg-[#17406E] text-white text-sm font-bold rounded-full hover:bg-[#1c5b7e] transition-all"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Patient
                </button>
            )}

            {/* Primary action — New Conference (Doctors Only, MDT Pane Only) */}
            {userRole === UserRole.DOCTOR && (
                <div
                    className={`transition-all duration-300 ease-in-out flex items-center overflow-hidden ${
                        isButtonVisible ? 'max-w-[200px] opacity-100 ml-4' : 'max-w-0 opacity-0 ml-0'
                    }`}
                >
                    <button
                        onClick={onNewConference}
                        className="flex items-center gap-2 px-6 py-3 bg-[#17406E] text-white text-sm font-bold rounded-full hover:bg-[#1c5b7e] transition-all whitespace-nowrap"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        New Conference
                    </button>
                </div>
            )}
        </header>
    );
};

export default TopHeader;
