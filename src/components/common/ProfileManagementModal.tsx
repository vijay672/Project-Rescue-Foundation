import React, { useState } from 'react';
import { 
  User as UserIcon, 
  Lock, 
  Mail, 
  Key, 
  Save, 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Hash
} from 'lucide-react';
import type { User } from '../../types';
import { api } from '../../services/api';

interface ProfileManagementModalProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (updatedUser: User) => void;
}

export const ProfileManagementModal: React.FC<ProfileManagementModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onProfileUpdated,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [customId, setCustomId] = useState(currentUser.id);
  const [email, setEmail] = useState(currentUser.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (newPassword) {
      if (!currentPassword) {
        setStatusMessage({ text: 'Current password is required to change password.', type: 'error' });
        return;
      }
      if (newPassword.length < 5) {
        setStatusMessage({ text: 'New password must be at least 5 characters.', type: 'error' });
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setStatusMessage({ text: 'New passwords do not match.', type: 'error' });
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await api.updateProfile({
        name: name.trim(),
        id: customId.trim(),
        email: email.trim(),
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });

      setStatusMessage({ text: res.message || 'Profile updated successfully.', type: 'success' });
      onProfileUpdated(res.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => {
        onClose();
        setStatusMessage(null);
      }, 1500);
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to update profile settings.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#17252B]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E4E9E7] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E4E9E7] bg-[#F7F8F6] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#17252B] text-white flex items-center justify-center font-bold text-xs">
              <UserIcon className="w-4 h-4 text-[#176B68]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#17252B]">Account & Security Settings</h3>
              <p className="text-[11px] text-[#64737A]">
                Manage personal profile credentials and access authentication keys
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#64737A] hover:text-[#17252B] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 font-medium ${
                statusMessage.type === 'success'
                  ? 'bg-[#247A58]/10 border-[#247A58]/20 text-[#247A58]'
                  : 'bg-[#C34D4D]/10 border-[#C34D4D]/20 text-[#C34D4D]'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Current Role Clearance Card */}
          <div className="p-3 bg-[#F7F8F6] rounded-xl border border-[#E4E9E7] flex items-center justify-between">
            <div>
              <div className="text-[10px] text-[#64737A] uppercase tracking-wide font-bold">Assigned Clearance</div>
              <div className="font-bold text-sm text-[#17252B] capitalize mt-0.5">
                {currentUser.role.replace('_', ' ')}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-[#247A58] bg-[#247A58]/10 px-2.5 py-1 rounded-full font-semibold border border-[#247A58]/20 inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Status: {currentUser.status}
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <h4 className="font-bold text-xs text-[#17252B] uppercase tracking-wider text-[11px] pb-1 border-b border-[#E4E9E7]">
              Identity & Profile Information
            </h4>

            <div>
              <label className="block font-bold text-[#17252B] mb-1">
                Full Legal / Operational Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#64737A] absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg text-[#17252B] focus:outline-hidden focus:border-[#176B68]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#17252B] mb-1">
                  Caseworker / Account ID
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-[#64737A] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg font-mono text-[#17252B] focus:outline-hidden focus:border-[#176B68]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#17252B] mb-1">
                  Organizational Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64737A] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg text-[#17252B] focus:outline-hidden focus:border-[#176B68]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Password Change Section */}
          <div className="space-y-3 pt-3">
            <h4 className="font-bold text-xs text-[#17252B] uppercase tracking-wider text-[11px] pb-1 border-b border-[#E4E9E7] flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#176B68]" />
              <span>Change Account Password (Optional)</span>
            </h4>

            <div>
              <label className="block font-bold text-[#17252B] mb-1">
                Current Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64737A] absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Required if changing password"
                  className="w-full pl-9 pr-3 py-2 bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg text-[#17252B] focus:outline-hidden focus:border-[#176B68]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#17252B] mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64737A] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 5 characters"
                    className="w-full pl-9 pr-3 py-2 bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg text-[#17252B] focus:outline-hidden focus:border-[#176B68]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#17252B] mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64737A] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-9 pr-3 py-2 bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg text-[#17252B] focus:outline-hidden focus:border-[#176B68]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E4E9E7] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64737A] hover:bg-[#F7F8F6] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#176B68] hover:bg-[#208783] transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Saving Updates...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
