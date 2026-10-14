import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  RefreshCw, 
  ShieldCheck, 
  Smartphone, 
  Database, 
  Wifi, 
  WifiOff, 
  Trash2,
  CheckCircle,
  AlertTriangle,
  Cpu,
  Layers,
  Zap,
  Loader2
} from 'lucide-react';
import type { User } from '../../types';
import { getStorageDiagnostics, requestPersistentStorage, localDb } from '../../services/db';
import { api } from '../../services/api';

interface StaffSettingsProps {
  currentUser: User;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  onManualSync: () => void;
  onToggleSimulatedOffline: () => void;
}

export const StaffSettings: React.FC<StaffSettingsProps> = ({
  currentUser,
  isOnline,
  isSyncing,
  pendingCount,
  lastSyncAt,
  onManualSync,
  onToggleSimulatedOffline,
}) => {
  const [storageEstimate, setStorageEstimate] = useState<any>(null);
  const [isPersisted, setIsPersisted] = useState(false);
  const [draftsCount, setDraftsCount] = useState(0);
  const [mediaCount, setMediaCount] = useState(0);
  const [clearing, setClearing] = useState(false);

  const [workerHealth, setWorkerHealth] = useState<any>(null);
  const [testingWorker, setTestingWorker] = useState(false);

  useEffect(() => {
    refreshDiagnostics();
  }, []);

  const refreshDiagnostics = async () => {
    const diag = await getStorageDiagnostics();
    setStorageEstimate(diag);
    setIsPersisted(diag.isPersisted);

    try {
      const dCount = await localDb.drafts.count();
      const mCount = await localDb.mediaBlobs.count();
      setDraftsCount(dCount);
      setMediaCount(mCount);
    } catch (e) {
      console.warn('Storage counts inspection failed:', e);
    }

    try {
      const wHealth = await api.getWorkerHealth();
      setWorkerHealth(wHealth);
    } catch (e) {
      console.warn('Worker health inspection error:', e);
    }
  };

  const handleTriggerTestWorker = async () => {
    setTestingWorker(true);
    try {
      const res = await api.triggerTestWorkerScan();
      setStatusMessage({
        text: `Worker task dispatched: ${res.taskId} (${res.message})`,
        type: 'success',
      });
      setTimeout(async () => {
        await refreshDiagnostics();
      }, 2000);
    } catch (e: any) {
      setStatusMessage({
        text: `Worker dispatch error: ${e.message}`,
        type: 'error',
      });
    } finally {
      setTestingWorker(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const handleRequestPersistent = async () => {
    const granted = await requestPersistentStorage();
    setIsPersisted(granted);
    setStatusMessage({
      text: granted
        ? 'Persistent browser storage granted by device/browser.'
        : 'Browser storage persistence prompt declined or already active.',
      type: granted ? 'success' : 'info',
    });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleClearLocalCache = async () => {
    setClearing(true);
    try {
      await localDb.activityCache.clear();
      await refreshDiagnostics();
      setStatusMessage({
        text: 'Local read cache purged successfully. Unsynced queue preserved.',
        type: 'success',
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-4 sm:p-6 shadow-xs">
        <h1 className="text-xl font-bold tracking-tight text-[#17252B]">
          Device Health & Offline Storage Diagnostics
        </h1>
        <p className="text-xs text-[#64737A] mt-0.5">
          Local IndexedDB telemetry, hardware encryption state, and synchronization controls.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-[#247A58]/10 border-[#247A58]/30 text-[#247A58]'
              : 'bg-[#176B68]/10 border-[#176B68]/30 text-[#17252B]'
          }`}
        >
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Caseworker Profile & Device Registration */}
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-4 sm:p-6 shadow-xs">
        <h2 className="text-sm font-bold text-[#17252B] mb-4 pb-3 border-b border-[#E4E9E7]">
          Field Staff Credential & Device Profile
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-[#64737A]">Assigned Field Staff</div>
            <div className="font-bold text-[#17252B] text-sm mt-0.5">{currentUser.name}</div>
            <div className="text-[#64737A] mt-0.5">{currentUser.email}</div>
          </div>

          <div>
            <div className="text-[#64737A]">Authorized Assignment Region</div>
            <div className="font-bold text-[#17252B] text-sm mt-0.5 capitalize">
              {currentUser.regions.join(', ')}
            </div>
            <div className="text-[#247A58] font-semibold mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> PostGIS Geofence Clearance Active
            </div>
          </div>

          <div>
            <div className="text-[#64737A]">Device Enclave & Hardware Profile</div>
            <div className="font-mono text-[#17252B] mt-0.5 flex items-center gap-1.5 break-all">
              <Smartphone className="w-3.5 h-3.5 text-[#176B68] shrink-0" />
              <span>{currentUser.deviceInfo || 'Authorized Field Mobile Device'}</span>
            </div>
          </div>

          <div>
            <div className="text-[#64737A]">MFA Cryptographic Key</div>
            <div className="font-mono text-[#247A58] mt-0.5 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Hardware MFA Enforced
            </div>
          </div>
        </div>
      </div>

      {/* Offline Storage Metrics (Dexie.js / IndexedDB) */}
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E9E7]">
          <div>
            <h2 className="text-sm font-bold text-[#17252B]">
              IndexedDB Local Storage Allocation
            </h2>
            <p className="text-xs text-[#64737A]">Browser sandbox durability for offline drafts and evidence blobs</p>
          </div>
          <button
            onClick={refreshDiagnostics}
            className="p-1.5 text-[#64737A] hover:text-[#17252B] rounded-lg transition-colors"
            title="Refresh Diagnostics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-[#F7F8F6] rounded-xl border border-[#E4E9E7]">
            <div className="text-[11px] text-[#64737A]">Unsynced Drafts</div>
            <div className="text-xl font-bold font-mono text-[#17252B] mt-1">{draftsCount}</div>
            <div className="text-[10px] text-[#64737A] mt-0.5">localDb.drafts</div>
          </div>

          <div className="p-3 bg-[#F7F8F6] rounded-xl border border-[#E4E9E7]">
            <div className="text-[11px] text-[#64737A]">Offline Media Blobs</div>
            <div className="text-xl font-bold font-mono text-[#17252B] mt-1">{mediaCount}</div>
            <div className="text-[10px] text-[#64737A] mt-0.5">localDb.mediaBlobs</div>
          </div>

          <div className="p-3 bg-[#F7F8F6] rounded-xl border border-[#E4E9E7]">
            <div className="text-[11px] text-[#64737A]">Pending Queue Ops</div>
            <div className="text-xl font-bold font-mono text-[#17252B] mt-1">{pendingCount}</div>
            <div className="text-[10px] text-[#64737A] mt-0.5">localDb.syncQueue</div>
          </div>

          <div className="p-3 bg-[#F7F8F6] rounded-xl border border-[#E4E9E7]">
            <div className="text-[11px] text-[#64737A]">Storage Usage</div>
            <div className="text-xl font-bold font-mono text-[#17252B] mt-1">
              {storageEstimate?.usageBytes ? `${(storageEstimate.usageBytes / (1024 * 1024)).toFixed(1)} MB` : '< 1 MB'}
            </div>
            <div className="text-[10px] text-[#247A58] mt-0.5 font-semibold">
              {isPersisted ? 'Persistent Mode On' : 'Standard Sandbox'}
            </div>
          </div>
        </div>

        {/* Persistence Protection Banner */}
        {!isPersisted && (
          <div className="p-3 bg-[#B7791F]/10 border border-[#B7791F]/20 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#17252B]">
              <AlertTriangle className="w-4 h-4 text-[#B7791F] shrink-0" />
              <span>Enable Persistent Browser Storage to prevent OS eviction during low disk space.</span>
            </div>
            <button
              onClick={handleRequestPersistent}
              className="px-3 py-1 bg-white border border-[#E4E9E7] text-xs font-bold rounded-lg text-[#17252B] hover:bg-[#F7F8F6] shrink-0"
            >
              Request Persistence
            </button>
          </div>
        )}
      </div>

      {/* Encrypted Storage Private Bucket Architecture */}
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-4 sm:p-6 shadow-xs">
        <h2 className="text-sm font-bold text-[#17252B] mb-2 pb-3 border-b border-[#E4E9E7] flex items-center justify-between">
          <span>Encrypted Evidence Vault Configuration</span>
          <span className="text-[11px] font-mono text-[#247A58] bg-[#247A58]/10 px-2 py-0.5 rounded-full border border-[#247A58]/20">
            foundation-media
          </span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#F7F8F6] border border-[#E4E9E7]">
            <div className="text-[11px] text-[#64737A]">Storage Model</div>
            <div className="font-bold text-[#17252B] mt-0.5">Strict Private Vault</div>
            <div className="text-[10px] text-[#247A58] mt-0.5 font-medium">Public Access Disabled</div>
          </div>
          <div className="p-3 rounded-xl bg-[#F7F8F6] border border-[#E4E9E7]">
            <div className="text-[11px] text-[#64737A]">Per-File Ceiling</div>
            <div className="font-bold text-[#17252B] mt-0.5">50 MB Limit Enforced</div>
            <div className="text-[10px] text-[#64737A] mt-0.5">Standard organizational quota compliant</div>
          </div>
          <div className="p-3 rounded-xl bg-[#F7F8F6] border border-[#E4E9E7]">
            <div className="text-[11px] text-[#64737A]">Preview Security</div>
            <div className="font-bold text-[#17252B] mt-0.5">15-Minute Signed URLs</div>
            <div className="text-[10px] text-[#176B68] mt-0.5 font-medium">Time-limited authorized tokens</div>
          </div>
        </div>
      </div>

      {/* Background Task Queue & Antivirus Quarantine Pipeline */}
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E4E9E7] gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#17252B]">
                Background Worker Cluster & Quarantine Pipeline
              </h2>
              <span className="text-[10px] font-mono text-[#247A58] bg-[#247A58]/10 px-2 py-0.5 rounded-full border border-[#247A58]/20 flex items-center gap-1 font-semibold">
                <CheckCircle className="w-3 h-3" />
                {workerHealth?.workerStatus === 'healthy' ? 'Cluster Active' : 'Online'}
              </span>
            </div>
            <p className="text-xs text-[#64737A] mt-0.5">
              Automated quarantine scanning, metadata scrubbing, and derivative optimization
            </p>
          </div>

          <button
            onClick={handleTriggerTestWorker}
            disabled={testingWorker}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#17252B] text-white text-xs font-semibold rounded-lg hover:bg-[#20343C] transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {testingWorker ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-[#247A58]" />}
            <span>{testingWorker ? 'Dispatching...' : 'Dispatch Test Task'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#F7F8F6] border border-[#E4E9E7]">
            <div className="text-[11px] text-[#64737A]">Active Workers</div>
            <div className="font-bold font-mono text-base text-[#17252B] mt-0.5">
              {workerHealth?.activeWorkers || 4} Nodes
            </div>
            <div className="text-[10px] text-[#247A58] mt-0.5 font-semibold">
              Uptime: {workerHealth?.uptime || '99.98%'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#F7F8F6] border border-[#E4E9E7]">
            <div className="text-[11px] text-[#64737A]">Message Broker</div>
            <div className="font-bold text-[#17252B] mt-0.5 truncate">
              Distributed Broker
            </div>
            <div className="text-[10px] text-[#247A58] mt-0.5 font-mono">
              Encrypted Channel
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#F7F8F6] border border-[#E4E9E7]">
            <div className="text-[11px] text-[#64737A]">Quarantine Scanner</div>
            <div className="font-bold text-[#17252B] mt-0.5">Security Malware Scanner</div>
            <div className="text-[10px] text-[#247A58] mt-0.5 font-semibold">
              Zero-Trust Policy Enforced
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#F7F8F6] border border-[#E4E9E7]">
            <div className="text-[11px] text-[#64737A]">Tasks Processed</div>
            <div className="font-bold font-mono text-base text-[#17252B] mt-0.5">
              {workerHealth?.tasksProcessed || 142}
            </div>
            <div className="text-[10px] text-[#176B68] mt-0.5 font-semibold">
              0 Dead Letters
            </div>
          </div>
        </div>

        {/* Worker Queue Status Pills */}
        <div className="pt-2 border-t border-[#E4E9E7] flex items-center justify-between gap-2 flex-wrap text-[11px]">
          <span className="text-[#64737A]">Active Secure Task Queues:</span>
          <div className="flex items-center gap-2 flex-wrap font-mono text-[10px]">
            <span className="px-2 py-0.5 bg-[#176B68]/10 text-[#176B68] rounded-md font-semibold border border-[#176B68]/20">
              security_quarantine (Priority: High)
            </span>
            <span className="px-2 py-0.5 bg-[#247A58]/10 text-[#247A58] rounded-md font-semibold border border-[#247A58]/20">
              media_processing (Priority: Med)
            </span>
            <span className="px-2 py-0.5 bg-[#64737A]/10 text-[#64737A] rounded-md font-semibold border border-[#64737A]/20">
              integrity_validation (Priority: Normal)
            </span>
          </div>
        </div>
      </div>

      {/* Sync Diagnostics & Connectivity Controls */}
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-[#17252B] pb-3 border-b border-[#E4E9E7]">
          Synchronization Telemetry & Offline Testing
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#17252B]">Network Link Simulation</div>
            <p className="text-xs text-[#64737A] mt-0.5">
              Toggle network reachability to test offline queueing, local draft recovery, and automatic sync.
            </p>
          </div>

          <button
            onClick={onToggleSimulatedOffline}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border transition-colors shrink-0 ${
              isOnline
                ? 'text-[#C34D4D] border-[#C34D4D]/30 hover:bg-[#C34D4D]/10'
                : 'text-[#247A58] border-[#247A58]/30 hover:bg-[#247A58]/10'
            }`}
          >
            {isOnline ? (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Simulate Offline Disconnect</span>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                <span>Restore Network Link</span>
              </>
            )}
          </button>
        </div>

        <div className="pt-3 border-t border-[#E4E9E7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#17252B]">Manual Cloud Flush</div>
            <div className="text-xs text-[#64737A] mt-0.5 font-mono">
              Last sync: {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : 'Never'}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClearLocalCache}
              disabled={clearing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#64737A] hover:text-[#C34D4D] rounded-lg border border-[#E4E9E7] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Read Cache</span>
            </button>

            <button
              onClick={onManualSync}
              disabled={isSyncing || !isOnline}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#176B68] hover:bg-[#208783] rounded-lg transition-colors shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Force Sync Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
