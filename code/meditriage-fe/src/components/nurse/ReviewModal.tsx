import React, { useState, useEffect } from "react";
import AnimatedModal from "../ui/AnimatedModal";
import CustomSelect from "../ui/CustomSelect";
import { ToastType } from "../ui/Toast";
import * as triageService from "../../services/triageService";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (doctorId: string, doctorName: string) => void;
  subjective: string;
  objective: string;
  showToast: (msg: string, type: ToastType) => void;
}

/**
 * Review modal — shown after AI analysis.
 * Displays only Subjective & Objective fields (AI-generated).
 * Includes doctor assignment dropdown (fetched from backend) and Add Patient button.
 */
const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  subjective,
  objective,
  showToast,
}) => {
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [doctorOptions, setDoctorOptions] = useState<
    { value: string; label: string }[]
  >([{ value: "", label: "Select a Doctor" }]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Fetch real doctors from backend when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingDoctors(true);
      triageService
        .getDoctors()
        .then((doctors) => {
          const options = [
            { value: "", label: "Select a Doctor" },
            ...doctors.map((d) => ({ value: d.id, label: d.full_name })),
          ];
          setDoctorOptions(options);
        })
        .catch(() => {
          showToast("Failed to load doctors", "error");
        })
        .finally(() => setLoadingDoctors(false));
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (!selectedDoctor) {
      showToast("Please assign a doctor", "error");
      return;
    }
    const doctorLabel =
      doctorOptions.find((d) => d.value === selectedDoctor)?.label ||
      selectedDoctor;
    onConfirm(selectedDoctor, doctorLabel);
  };

  const fieldStyle: React.CSSProperties = {
    background: "#f0f2f7",
    borderRadius: "18px",
    padding: "16px 20px",
    fontSize: "14px",
    lineHeight: "1.7",
    color: "#374151",
    border: "none",
    fontWeight: 500,
  };

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-xl"
      zIndex={75}
    >
      <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-3">
          <h3 className="text-xl font-bold text-gray-900">Clinical Summary</h3>
          <p className="text-sm text-gray-500 mt-1">
            Review the AI-generated notes and assign a physician
          </p>
        </div>

        {/* Content */}
        <div
          className="px-8 pb-4 space-y-5"
          style={{ maxHeight: "50vh", overflowY: "auto" }}
        >
          {/* Subjective */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Subjective
            </label>
            <div style={fieldStyle} className="whitespace-pre-wrap">
              {subjective || "No data"}
            </div>
          </div>

          {/* Objective */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Objective
            </label>
            <div style={fieldStyle} className="whitespace-pre-wrap">
              {objective || "No data"}
            </div>
          </div>

          {/* Doctor Assignment */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Attending Physician
            </label>
            {loadingDoctors ? (
              <div className="flex items-center gap-2 px-5 py-3.5 bg-[#f0f2f7] rounded-[18px]">
                <div className="w-4 h-4 border-2 border-[#17406E] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-500">
                  Loading doctors...
                </span>
              </div>
            ) : (
              <CustomSelect
                value={selectedDoctor}
                options={doctorOptions}
                onChange={(val: string) => setSelectedDoctor(val)}
                dropUp
                buttonStyle={{
                  borderRadius: "18px",
                  background: "#f0f2f7",
                  padding: "14px 20px",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-8 py-5 flex gap-3"
          style={{ borderTop: "1px solid #f0f0f0" }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-3.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3.5 text-sm font-bold text-white bg-[#17406E] rounded-full hover:bg-[#1c5b7e] transition-all flex items-center justify-center gap-2"
          >
            Add Patient
          </button>
        </div>
      </div>
    </AnimatedModal>
  );
};

export default ReviewModal;
