import React, { useState } from 'react';
import { 
  MessageSquare, 
  CheckCircle, 
  AlertCircle, 
  HelpCircle, 
  Award, 
  Compass, 
  Check, 
  ArrowRight,
  Clock
} from 'lucide-react';
import type { FeedbackMessage, FeedbackType } from '../../types';

interface FeedbackInboxProps {
  feedback: FeedbackMessage[];
  onAcknowledge: (id: string) => Promise<void>;
  onSelectActivityId: (activityId: string) => void;
}

const TYPE_CONFIG: Record<FeedbackType, { label: string; icon: any; colorClass: string }> = {
  commendation: {
    label: 'Commendation',
    icon: Award,
    colorClass: 'text-[#247A58]',
  },
  improvement_suggestion: {
    label: 'Improvement Note',
    icon: HelpCircle,
    colorClass: 'text-[#176B68]',
  },
  revision_request: {
    label: 'Revision Required',
    icon: AlertCircle,
    colorClass: 'text-[#C34D4D]',
  },
  operational_guidance: {
    label: 'Operational Guidance',
    icon: Compass,
    colorClass: 'text-[#17252B]',
  },
  follow_up_required: {
    label: 'Follow-Up Needed',
    icon: Clock,
    colorClass: 'text-[#B7791F]',
  },
};

export const FeedbackInbox: React.FC<FeedbackInboxProps> = ({
  feedback,
  onAcknowledge,
  onSelectActivityId,
}) => {
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const handleAcknowledgeClick = async (id: string) => {
    setAcknowledgingId(id);
    try {
      await onAcknowledge(id);
    } finally {
      setAcknowledgingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-4 sm:p-6 shadow-xs">
        <h1 className="text-xl font-bold tracking-tight text-[#17252B]">
          Private Supervisory Feedback & Directives
        </h1>
        <p className="text-xs text-[#64737A] mt-0.5">
          Confidential feedback, commendations, and revision requests from regional operations managers.
        </p>
      </div>

      {feedback.length > 0 ? (
        <div className="space-y-4">
          {feedback.map((msg) => {
            const config = TYPE_CONFIG[msg.type] || TYPE_CONFIG.operational_guidance;
            const Icon = config.icon;
            const isUnacknowledged = msg.status === 'open';

            return (
              <div
                key={msg.id}
                className={`bg-white border rounded-2xl p-4 sm:p-6 transition-all ${
                  isUnacknowledged
                    ? 'border-[#B7791F]/40 shadow-xs ring-1 ring-[#B7791F]/20'
                    : 'border-[#E4E9E7]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 pb-3 border-b border-[#E4E9E7]">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <Icon className={`w-4 h-4 ${config.colorClass}`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#17252B]">
                      {config.label}
                    </span>
                    <span aria-hidden="true" className="text-[#64737A]">·</span>
                    <span className="text-xs text-[#64737A]">
                      From {msg.authorName} ({msg.authorRole.replace('_', ' ')})
                    </span>
                  </div>

                  <div className="text-xs font-mono text-[#64737A]">
                    {new Date(msg.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                <div className="py-4 text-sm text-[#17252B] leading-relaxed">
                  "{msg.message}"
                </div>

                {/* Footer Controls: Linked Dossier & Acknowledgement Button */}
                <div className="pt-3 border-t border-[#E4E9E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <button
                    onClick={() => onSelectActivityId(msg.activityId)}
                    className="text-xs font-semibold text-[#176B68] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Linked Activity Report (#{msg.activityId.slice(0, 8)})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div>
                    {isUnacknowledged ? (
                      <button
                        onClick={() => handleAcknowledgeClick(msg.id)}
                        disabled={acknowledgingId === msg.id}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#17252B] hover:bg-[#176B68] rounded-lg transition-colors shadow-2xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {acknowledgingId === msg.id ? 'Confirming...' : 'Acknowledge Directive'}
                        </span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-[#247A58] font-semibold font-mono">
                        <CheckCircle className="w-4 h-4" />
                        <span>
                          Acknowledged {msg.acknowledgedAt && new Date(msg.acknowledgedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-[#E4E9E7] rounded-2xl p-12 text-center">
          <MessageSquare className="w-10 h-10 text-[#64737A]/30 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#17252B]">You're all caught up</h3>
          <p className="text-xs text-[#64737A] mt-1 max-w-sm mx-auto">
            Feedback and guidance from your coordinator will appear here.
          </p>
        </div>
      )}
    </div>
  );
};
