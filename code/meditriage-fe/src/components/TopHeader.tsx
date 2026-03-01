import React from 'react';
import { CareSetting, UserRole } from '../types';
import CustomSelect from './ui/CustomSelect';

interface TopHeaderProps {
    careSetting: CareSetting;
    onCareSettingChange: (setting: CareSetting) => void;
    onAddPatient: () => void;
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
const TopHeader: React.FC<TopHeaderProps> = ({ careSetting, onCareSettingChange, onAddPatient, userRole }) => {
    return (
        <header
            className="fixed top-0 right-0 z-40 flex items-center justify-end gap-4 animate-slide-down"
            style={{
                left: '330px',
                height: '80px',
                paddingTop: '15px',
                padding: '0 40px',
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
                    className="flex items-center gap-2 px-6 py-3 bg-[#17406E] text-white text-sm font-bold rounded-full hover:bg-[#1c5b7e] transition-all shadow-lg shadow-[#17406E]/20"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Patient
                </button>
            )}
        </header>
    );
};

export default TopHeader;
