import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface UnauthorizedScreenProps {
  onReturnHome: () => void;
  requiredRole?: string;
}

export const UnauthorizedScreen: React.FC<UnauthorizedScreenProps> = ({ onReturnHome, requiredRole }) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center text-[#17252B]">
      <div className="w-14 h-14 rounded-2xl bg-[#C34D4D]/10 text-[#C34D4D] flex items-center justify-center mb-4">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-[#17252B]">
        Access Restricted
      </h1>
      <p className="text-xs text-[#64737A] mt-1.5 max-w-sm leading-relaxed">
        Your account role does not have operational clearance to view this module
        {requiredRole ? ` (requires ${requiredRole})` : ''}.
      </p>
      <button
        onClick={onReturnHome}
        className="mt-6 flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#17252B] hover:bg-[#176B68] rounded-xl transition-colors shadow-2xs"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Authorized Home</span>
      </button>
    </div>
  );
};
