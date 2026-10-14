import React, { useState, useEffect } from 'react';
import type { 
  Activity, 
  AuditEvent, 
  DashboardMetrics, 
  FeedbackMessage, 
  Region, 
  User, 
  UserRole,
  AppNotification
} from './types';
import { api } from './services/api';
import { syncEngine, type SyncEngineState } from './services/sync';
import { localDb } from './services/db';
import { supabaseAuth } from './services/supabase';

import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { LoginScreen } from './components/auth/LoginScreen';
import { CreateActivityModal } from './components/field/CreateActivityModal';
import { StaffHome } from './components/field/StaffHome';
import { ActivityHistory } from './components/field/ActivityHistory';
import { FeedbackInbox } from './components/field/FeedbackInbox';
import { StaffSettings } from './components/field/StaffSettings';

import { ManagerOverview } from './components/manager/ManagerOverview';
import { ActivityReview } from './components/manager/ActivityReview';
import { GeographicOperations } from './components/manager/GeographicOperations';
import { TeamCompliance } from './components/manager/TeamCompliance';

import { AdminUserManagement } from './components/admin/AdminUserManagement';
import { SecurityAuditViewer } from './components/admin/SecurityAuditViewer';
import { ToastContainer } from './components/common/Toast';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [feedback, setFeedback] = useState<FeedbackMessage[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Sync Engine State
  const [syncState, setSyncState] = useState<SyncEngineState>(syncEngine.getState());

  // Bootstrap app
  useEffect(() => {
    const unsub = syncEngine.subscribe(setSyncState);
    loadInitialData().finally(() => setIsInitializing(false));

    const unsubAuth = supabaseAuth.onAuthStateChange((user) => {
      if (user) {
        setCurrentUser(user);
        if (user.role === 'field_staff') {
          setActiveTab('home');
        } else if (user.role === 'operations_manager') {
          setActiveTab('manager_overview');
        } else {
          setActiveTab('admin_users');
        }
        loadInitialData();
      }
    });

    return () => {
      unsub();
      unsubAuth();
    };
  }, []);

  const loadInitialData = async () => {
    try {
      // Load session
      try {
        const sessionRes = await api.getSession();
        setCurrentUser(sessionRes.user);
      } catch (e) {
        console.warn('Session inspection unauthenticated:', e);
      }

      // Load regions
      try {
        const regRes = await api.getRegions();
        setRegions(regRes);
      } catch (e) {
        console.warn('Regions load error:', e);
      }

      // Load activities (try server, fallback to Dexie cache if offline)
      try {
        const actRes = await api.getActivities();
        setActivities(actRes.activities);
        await localDb.activityCache.bulkPut(actRes.activities);
      } catch {
        const cached = await localDb.activityCache.toArray();
        setActivities(cached);
      }

      // Load feedback
      try {
        const fbRes = await api.getFeedback();
        setFeedback(fbRes);
        await localDb.feedbackCache.bulkPut(fbRes);
      } catch {
        const cachedFb = await localDb.feedbackCache.toArray();
        setFeedback(cachedFb);
      }

      // Load notifications
      try {
        const notifRes = await api.getNotifications();
        setNotifications(notifRes);
      } catch (e) {
        console.warn('Notifications load offline:', e);
      }

      // Load metrics & admin data if available
      try {
        const mRes = await api.getMetrics();
        setMetrics(mRes);
      } catch (e) {
        console.warn('Metrics load offline:', e);
      }

      try {
        const uRes = await api.getUsers();
        setUsers(uRes);
      } catch (e) {
        // Only works for admin
      }

      try {
        const aRes = await api.getAuditLogs();
        setAuditLogs(aRes);
      } catch (e) {
        // Only works for admin
      }
    } catch (err) {
      console.error('[Bootstrap Failed]', err);
    }
  };

  // In-App Non-Blocking Toast Notification state
  const [toasts, setToasts] = useState<{ id: string; type: 'success' | 'error' | 'info'; message: string }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleLogin = async (credentials: { email?: string; password?: string; user?: User }) => {
    let authUser: User;
    if (credentials.user) {
      authUser = credentials.user;
    } else {
      const res = await api.login({ email: credentials.email, password: credentials.password });
      authUser = res.user;
    }
    setCurrentUser(authUser);
    localStorage.setItem('project_rescue_auth_user', JSON.stringify(authUser));
    if (authUser.role === 'field_staff') {
      setActiveTab('home');
    } else if (authUser.role === 'operations_manager') {
      setActiveTab('manager_overview');
    } else {
      setActiveTab('admin_users');
    }
    await loadInitialData();
    showToast(`Authenticated as ${authUser.name} (${authUser.role.replace('_', ' ')})`, 'success');
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setCurrentUser(null);
    showToast('Session logged out successfully.', 'info');
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      const res = await api.markNotificationRead(id);
      setNotifications(res.notifications);
    } catch (err) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    }
  };

  const handleManualSync = async () => {
    const res = await syncEngine.sync();
    await loadInitialData();
    if (res.errors.length > 0) {
      showToast(`Sync completed with notices: ${res.errors.join(', ')}`, 'info');
    } else {
      showToast('Cloud synchronization completed successfully.', 'success');
    }
  };

  const handleToggleSimulatedOffline = () => {
    const isNowOffline = syncEngine.toggleSimulatedOffline();
    showToast(
      isNowOffline
        ? 'Offline mode simulated. Field operations will queue locally.'
        : 'Network link restored. Ready for sync.',
      isNowOffline ? 'info' : 'success'
    );
  };

  const handleSubmitActivity = async (newActivity: Activity) => {
    if (syncEngine.isNetworkAvailable()) {
      try {
        const res = await api.createActivity(newActivity);
        setActivities((prev) => [res.activity, ...prev]);
        await localDb.activityCache.put(res.activity);
        showToast('Activity report submitted for supervisory review.', 'success');
      } catch {
        // Fallback to queue if network drop occurs during post
        await syncEngine.queueActivitySubmission(newActivity);
        setActivities((prev) => [newActivity, ...prev]);
        showToast('Network interrupted. Activity safely queued in local IndexedDB.', 'info');
      }
    } else {
      // Offline queue
      await syncEngine.queueActivitySubmission(newActivity);
      setActivities((prev) => [newActivity, ...prev]);
      showToast('Report stored offline in IndexedDB queue. Will sync automatically.', 'info');
    }
  };

  const handleAcknowledgeFeedback = async (id: string) => {
    try {
      const updated = await api.acknowledgeFeedback(id);
      setFeedback((prev) => prev.map((f) => (f.id === id ? updated : f)));
      showToast('Supervisory directive confirmed and acknowledged.', 'success');
    } catch (err: any) {
      showToast(`Acknowledgement error: ${err.message}`, 'error');
    }
  };

  const handleUpdateActivityStatus = async (
    id: string, 
    status: Activity['status'], 
    reviewNote?: string
  ) => {
    try {
      const res = await api.updateActivityStatus(id, status, reviewNote);
      setActivities((prev) => prev.map((a) => (a.id === id ? res.activity : a)));
      setSelectedActivity(res.activity);
      // Refresh feedback list if a review note was added
      const fbRes = await api.getFeedback();
      setFeedback(fbRes);
      showToast(`Case status updated to ${status.replace('_', ' ')}.`, 'success');
    } catch (err: any) {
      showToast(`Status update notice: ${err.message}`, 'error');
    }
  };

  const handleSendFeedback = async (payload: {
    activityId: string;
    type: any;
    message: string;
  }) => {
    try {
      const newFb = await api.sendFeedback(payload);
      setFeedback((prev) => [newFb, ...prev]);
      showToast('Directive dispatched to caseworker inbox.', 'success');
    } catch (err: any) {
      showToast(`Feedback dispatch notice: ${err.message}`, 'error');
    }
  };

  const handleToggleUserStatus = async (
    userId: string, 
    currentStatus: User['status']
  ) => {
    try {
      const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
      const updated = await api.updateUserStatus(userId, nextStatus);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      showToast(`Account status updated to ${nextStatus}.`, 'success');
    } catch (err: any) {
      showToast(`User status update notice: ${err.message}`, 'error');
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#F7F8F6] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#17252B] flex items-center justify-center text-white font-bold mx-auto shadow-xs">
            <span className="text-[#176B68] font-black mr-0.5">P</span>R
          </div>
          <div className="text-sm font-semibold text-[#17252B]">
            Initializing Project Rescue Foundation Workspace...
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const unreadFeedbackCount = feedback.filter((f) => f.status === 'open').length;

  return (
    <div className="min-h-screen bg-[#F7F8F6] flex flex-col text-[#17252B]">
      {/* Header with Top Bar Contract */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        isOnline={syncState.isOnline}
        isSyncing={syncState.isSyncing}
        pendingCount={syncState.pendingCount}
        onManualSync={handleManualSync}
        onToggleSimulatedOffline={handleToggleSimulatedOffline}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onProfileUpdated={(updated) => setCurrentUser(updated)}
      />

      {/* Main Viewport Container with Bottom Nav clearance */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-28 lg:pb-12 min-w-0">
        {/* Field Staff Views */}
        {currentUser.role === 'field_staff' && (
          <>
            {activeTab === 'home' && (
              <StaffHome
                currentUser={currentUser}
                activities={activities}
                feedback={feedback}
                pendingSyncCount={syncState.pendingCount}
                isOnline={syncState.isOnline}
                onOpenCreate={() => setIsCreateOpen(true)}
                onSelectTab={setActiveTab}
                onSelectActivity={(act) => setSelectedActivity(act)}
              />
            )}

            {activeTab === 'activities' && (
              <ActivityHistory
                activities={activities}
                selectedActivity={selectedActivity}
                onSelectActivity={setSelectedActivity}
                onOpenCreate={() => setIsCreateOpen(true)}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'feedback' && (
              <FeedbackInbox
                feedback={feedback}
                onAcknowledge={handleAcknowledgeFeedback}
                onSelectActivityId={(actId) => {
                  const target = activities.find((a) => a.id === actId);
                  if (target) {
                    setSelectedActivity(target);
                    setActiveTab('activities');
                  }
                }}
              />
            )}

            {activeTab === 'settings' && (
              <StaffSettings
                currentUser={currentUser}
                isOnline={syncState.isOnline}
                isSyncing={syncState.isSyncing}
                pendingCount={syncState.pendingCount}
                lastSyncAt={syncState.lastSyncAt}
                onManualSync={handleManualSync}
                onToggleSimulatedOffline={handleToggleSimulatedOffline}
              />
            )}
          </>
        )}

        {/* Operations Manager Views */}
        {currentUser.role === 'operations_manager' && (
          <>
            {activeTab === 'manager_overview' && (
              <ManagerOverview
                metrics={metrics}
                activities={activities}
                regions={regions}
                onSelectTab={setActiveTab}
                currentUser={currentUser}
                onSelectActivity={(act) => {
                  setSelectedActivity(act);
                  setActiveTab('manager_activities');
                }}
              />
            )}

            {activeTab === 'manager_activities' && (
              <ActivityReview
                activities={activities}
                regions={regions}
                selectedActivity={selectedActivity}
                onSelectActivity={setSelectedActivity}
                onUpdateStatus={handleUpdateActivityStatus}
                onSendFeedback={handleSendFeedback}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'manager_geo' && (
              <GeographicOperations
                activities={activities}
                regions={regions}
                onSelectActivity={(act) => {
                  setSelectedActivity(act);
                  setActiveTab('manager_activities');
                }}
              />
            )}

            {activeTab === 'manager_compliance' && (
              <TeamCompliance
                metrics={metrics}
                activities={activities}
                regions={regions}
              />
            )}
          </>
        )}

        {/* System Administrator Views */}
        {currentUser.role === 'system_admin' && (
          <>
            {activeTab === 'admin_users' && (
              <AdminUserManagement
                users={users}
                onToggleUserStatus={handleToggleUserStatus}
              />
            )}

            {activeTab === 'admin_audit' && (
              <SecurityAuditViewer auditLogs={auditLogs} />
            )}

            {activeTab === 'manager_overview' && (
              <ManagerOverview
                metrics={metrics}
                activities={activities}
                regions={regions}
                onSelectTab={setActiveTab}
                currentUser={currentUser}
                onSelectActivity={(act) => setSelectedActivity(act)}
              />
            )}
          </>
        )}
      </main>

      {/* Field Staff Mobile Bottom Navigation */}
      <BottomNav
        role={currentUser.role}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenCreate={() => setIsCreateOpen(true)}
        unreadFeedbackCount={unreadFeedbackCount}
        pendingSyncCount={syncState.pendingCount}
      />

      {/* Create Activity Modal */}
      <CreateActivityModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        currentUser={currentUser}
        regions={regions}
        isOnline={syncState.isOnline}
        onSubmit={handleSubmitActivity}
      />

      {/* In-App Non-Blocking Notifications Container */}
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
