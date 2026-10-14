import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  X, 
  RefreshCw, 
  Clock, 
  Send, 
  ShieldCheck, 
  UserCheck, 
  FileText, 
  CheckCircle, 
  Loader2 
} from 'lucide-react';
import type { OutboxEmail } from '../../types';
import { api } from '../../services/api';

interface EmailOutboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailOutboxModal: React.FC<EmailOutboxModalProps> = ({ isOpen, onClose }) => {
  const [emails, setEmails] = useState<OutboxEmail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<OutboxEmail | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadEmails();
    }
  }, [isOpen]);

  const loadEmails = async () => {
    setIsLoading(true);
    try {
      const data = await api.getOutboxEmails();
      setEmails(data);
      if (data.length > 0 && !selectedEmail) {
        setSelectedEmail(data[0]);
      }
    } catch (e) {
      console.warn('Failed to load outbox emails:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#17252B]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-[#E4E9E7] rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E4E9E7] bg-[#F7F8F6] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#17252B] text-white flex items-center justify-center">
              <Mail className="w-4 h-4 text-[#176B68]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#17252B]">System Email Dispatch Log</h3>
                <span className="text-[10px] bg-[#176B68]/10 text-[#176B68] font-mono px-2 py-0.5 rounded-full font-bold">
                  {emails.length} Dispatched
                </span>
              </div>
              <p className="text-[11px] text-[#64737A]">
                Audit log of all notification and verification emails sent to caseworkers & personnel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadEmails}
              disabled={isLoading}
              className="p-1.5 text-[#64737A] hover:text-[#17252B] hover:bg-[#E4E9E7] rounded-lg transition-colors cursor-pointer"
              title="Refresh Outbox"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#176B68]' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#64737A] hover:text-[#17252B] hover:bg-[#E4E9E7] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-hidden">
          {/* Email List Left Column */}
          <div className="w-full sm:w-2/5 border-b sm:border-b-0 sm:border-r border-[#E4E9E7] overflow-y-auto p-3 space-y-2 bg-[#FBFDFB]">
            {isLoading && emails.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-[#64737A] text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading email dispatches...</span>
              </div>
            ) : emails.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#64737A]">
                <Mail className="w-8 h-8 text-[#A0AEC0] mx-auto mb-2 opacity-50" />
                <p>No emails dispatched yet.</p>
                <p className="text-[10px] mt-1">Actions like account acceptance, OTP resets, and manager reviews will populate this log.</p>
              </div>
            ) : (
              emails.map((mail) => {
                const isSelected = selectedEmail?.id === mail.id;
                const isManagerSender = mail.category !== 'security_otp';
                return (
                  <button
                    key={mail.id}
                    onClick={() => setSelectedEmail(mail)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-[#176B68] shadow-xs'
                        : 'bg-white hover:bg-[#F7F8F6] border-[#E4E9E7]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide ${
                          mail.category === 'account_approval'
                            ? 'bg-[#247A58]/10 text-[#247A58] border border-[#247A58]/20'
                            : mail.category === 'activity_review'
                            ? 'bg-[#176B68]/10 text-[#176B68] border border-[#176B68]/20'
                            : 'bg-[#B7791F]/10 text-[#B7791F] border border-[#B7791F]/20'
                        }`}
                      >
                        {mail.category.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-[#64737A]">
                        {new Date(mail.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="font-bold text-xs text-[#17252B] truncate mb-0.5">
                      {mail.subject}
                    </div>

                    <div className="text-[10px] text-[#64737A] flex items-center justify-between">
                      <span className="truncate max-w-[120px]">To: {mail.to}</span>
                      <span className="font-mono text-[9px] text-[#176B68] font-semibold">
                        {isManagerSender ? 'Manager Mail' : 'Security OTP'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Email Preview Right Column */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white flex flex-col justify-between">
            {selectedEmail ? (
              <div className="space-y-4 text-xs">
                {/* Meta details */}
                <div className="p-3.5 bg-[#F7F8F6] rounded-xl border border-[#E4E9E7] space-y-2">
                  <div className="flex items-center justify-between border-b border-[#E4E9E7]/80 pb-2">
                    <span className="font-semibold text-[#64737A]">Subject:</span>
                    <span className="font-bold text-[#17252B] text-xs sm:text-sm">{selectedEmail.subject}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-[#64737A]">From (Sender): </span>
                      <span className="font-mono font-bold text-[#176B68]">{selectedEmail.from}</span>
                    </div>
                    <div>
                      <span className="text-[#64737A]">To (Recipient): </span>
                      <span className="font-mono font-bold text-[#17252B]">{selectedEmail.to}</span>
                    </div>
                    <div>
                      <span className="text-[#64737A]">Dispatched: </span>
                      <span className="text-[#17252B]">{new Date(selectedEmail.sentAt).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[#64737A]">Classification: </span>
                      <span className="font-semibold capitalize text-[#247A58]">
                        {selectedEmail.category.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Email Body */}
                <div>
                  <div className="text-[11px] font-bold text-[#64737A] mb-1.5 uppercase tracking-wide">
                    Message Payload
                  </div>
                  <div className="p-4 bg-[#FBFDFB] rounded-xl border border-[#E4E9E7] font-sans text-xs leading-relaxed text-[#17252B] whitespace-pre-wrap">
                    {selectedEmail.body}
                  </div>
                </div>

                <div className="text-[10px] text-[#64737A] flex items-center gap-1.5 pt-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#247A58]" />
                  <span>Message delivery verified by Project Rescue Outbox Protocol.</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-[#64737A]">
                Select an email from the left pane to view dispatch details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
