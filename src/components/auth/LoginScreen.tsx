import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  Shield, 
  Key, 
  UserPlus, 
  LogIn, 
  CheckCircle2,
  Clock,
  Send,
  Eye,
  EyeOff
} from 'lucide-react';
import type { User, UserRole } from '../../types';
import { api } from '../../services/api';
import { isSupabaseConfigured, supabaseAuth } from '../../services/supabase';

interface LoginScreenProps {
  onLogin: (credentials: { email?: string; password?: string; role?: UserRole; user?: User }) => Promise<void>;
  sessionExpired?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, sessionExpired }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // OTP Password Reset State
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetStatus, setResetStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [otpHint, setOtpHint] = useState<string | null>(null);

  // Google SSO Modal State
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googleRole, setGoogleRole] = useState<UserRole>('field_staff');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (authMode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please verify your password entry.');
        return;
      }
      if (password.length < 5) {
        setError('Password must be at least 5 characters long.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (authMode === 'signup') {
        const res = await api.register({
          email: email.trim(),
          password,
          name: fullName.trim() || email.split('@')[0],
          role: 'field_staff',
        });

        if (res.pendingApproval) {
          setSuccessNotice(res.message || 'Registration submitted! Your access request has been routed to the Operations Manager for clearance. You can log in once approved.');
          setAuthMode('signin');
          setPassword('');
          setConfirmPassword('');
        } else {
          setSuccessNotice('Account created successfully. Authenticating into workspace...');
          await onLogin({ email: email.trim(), password });
        }
      } else {
        await onLogin({ email: email.trim(), password });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async (options?: { email?: string; name?: string; role?: UserRole }) => {
    // If Supabase Auth is configured, trigger the standard OAuth flow
    if (isSupabaseConfigured()) {
      setIsGoogleLoading(true);
      setError(null);
      try {
        await supabaseAuth.signInWithGoogle();
        return;
      } catch (err: any) {
        setError(err.message || 'Google OAuth failed to initialize.');
        setIsGoogleLoading(false);
        return;
      }
    }

    const targetEmail = (options?.email || googleEmail).trim();
    const targetName = (options?.name || googleName).trim();
    const targetRole = options?.role || googleRole;

    if (!targetEmail) {
      setIsGoogleModalOpen(true);
      return;
    }

    setIsGoogleLoading(true);
    setError(null);
    try {
      const res = await api.loginWithGoogle({
        email: targetEmail,
        name: targetName || targetEmail.split('@')[0],
        role: targetRole,
      });

      setIsGoogleModalOpen(false);

      if (res.user) {
        // Direct authenticated login with mapped role - avoids invalid credential password checks
        await onLogin({ user: res.user });
      } else if (res.pendingApproval) {
        setSuccessNotice(res.message || 'Google account registered! Awaiting Operations Manager clearance.');
        setAuthMode('signin');
      }
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetStatus({ message: 'Please enter your organizational email.', type: 'error' });
      return;
    }
    setIsResetting(true);
    setResetStatus(null);
    try {
      const res = await api.requestPasswordOtp(resetEmail.trim());
      setResetStatus({ message: res.message, type: 'success' });
      if (res.otpHint) {
        setOtpHint(res.otpHint);
      }
      setResetStep('verify');
    } catch (err: any) {
      setResetStatus({ message: err.message || 'Failed to dispatch verification code.', type: 'error' });
    } finally {
      setIsResetting(false);
    }
  };

  // Step 2: Verify OTP & Reset Password
  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtp.trim()) {
      setResetStatus({ message: 'Please enter the 6-digit OTP code received in your email.', type: 'error' });
      return;
    }
    if (newPassword.length < 5) {
      setResetStatus({ message: 'New password must be at least 5 characters long.', type: 'error' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetStatus({ message: 'Passwords do not match.', type: 'error' });
      return;
    }

    setIsResetting(true);
    setResetStatus(null);
    try {
      const res = await api.resetPasswordWithOtp({
        email: resetEmail.trim(),
        otp: resetOtp.trim(),
        newPassword,
      });

      setResetStatus({ message: res.message, type: 'success' });
      setSuccessNotice('Password reset successfully! You can now log in with your new password.');
      setTimeout(() => {
        setIsResetOpen(false);
        setResetStep('request');
        setResetOtp('');
        setNewPassword('');
        setConfirmNewPassword('');
        setResetStatus(null);
        setOtpHint(null);
      }, 2000);
    } catch (err: any) {
      setResetStatus({ message: err.message || 'Invalid or expired OTP code.', type: 'error' });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8F6] flex flex-col justify-center items-center px-4 py-8 text-[#17252B]">
      {/* Brand Header */}
      <div className="w-full max-w-md text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#17252B] flex items-center justify-center text-white font-bold text-lg mx-auto shadow-md mb-3">
          <span className="text-[#176B68] font-black mr-0.5">P</span>R
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17252B]">
          Project Rescue Foundation
        </h1>
        <p className="text-xs text-[#64737A] mt-1">
          Field Operations & Confidential Case Management Platform
        </p>

        {/* Security & Access Banner */}
        <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#E4E9E7] text-[#17252B]">
            <Shield className="w-3 h-3 text-[#176B68]" />
            Enterprise Identity & Access Governance
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#176B68]/10 text-[#176B68]">
            <ShieldCheck className="w-3 h-3" />
            Zero-Trust Access Active
          </span>
        </div>
      </div>

      {/* Main Auth Card */}
      <div className="w-full max-w-md bg-white border border-[#E4E9E7] rounded-2xl p-6 sm:p-8 shadow-sm">
        {sessionExpired && (
          <div className="mb-4 p-3.5 bg-[#B7791F]/10 border border-[#B7791F]/30 rounded-xl text-xs text-[#B7791F] flex items-start gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Your session has expired. Please sign in to resume operations.</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3.5 bg-[#C34D4D]/10 border border-[#C34D4D]/30 rounded-xl text-xs text-[#C34D4D] flex items-start gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successNotice && (
          <div className="mb-4 p-3.5 bg-[#247A58]/10 border border-[#247A58]/30 rounded-xl text-xs text-[#247A58] flex items-start gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Google Sign In Button */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setIsGoogleModalOpen(true)}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white hover:bg-[#F7F8F6] border border-[#D5DCD9] hover:border-[#BFCBC7] rounded-xl text-xs font-bold text-[#17252B] shadow-2xs transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E4E9E7]"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-semibold">
              <span className="bg-white px-2 text-[#64737A]">Or continue with organizational credentials</span>
            </div>
          </div>
        </div>

        {/* Auth Mode Toggle Tabs */}
        <div className="flex border-b border-[#E4E9E7] mb-5">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin');
              setError(null);
            }}
            className={`flex-1 pb-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              authMode === 'signin'
                ? 'border-[#176B68] text-[#176B68]'
                : 'border-transparent text-[#64737A] hover:text-[#17252B]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setError(null);
            }}
            className={`flex-1 pb-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              authMode === 'signup'
                ? 'border-[#176B68] text-[#176B68]'
                : 'border-transparent text-[#64737A] hover:text-[#17252B]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Account</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-[#17252B] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#64737A] absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Amar Sharma"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg focus:outline-hidden focus:border-[#176B68] text-[#17252B]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#17252B] mb-1.5">
              Organizational Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#64737A] absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="caseworker@projectrescue.org"
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg focus:outline-hidden focus:border-[#176B68] text-[#17252B]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#17252B]">
                Password
              </label>
              {authMode === 'signin' && (
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setResetStep('request');
                    setResetStatus(null);
                    setIsResetOpen(true);
                  }}
                  className="text-[11px] text-[#176B68] hover:underline font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64737A] absolute left-3 top-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter account password"
                className="w-full pl-9 pr-9 py-2 text-xs bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg focus:outline-hidden focus:border-[#176B68] text-[#17252B]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-[#64737A] hover:text-[#17252B]"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {authMode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-[#17252B] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64737A] absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter account password"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg focus:outline-hidden focus:border-[#176B68] text-[#17252B]"
                />
              </div>
              <p className="text-[11px] text-[#64737A] mt-2 bg-[#F7F8F6] p-2.5 rounded-lg border border-[#E4E9E7] leading-relaxed">
                <strong className="text-[#17252B]">Notice:</strong> New registrations require acceptance by the Operations Manager before access is granted. You will receive an approval confirmation email once activated.
              </p>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-[#176B68] hover:bg-[#208783] active:scale-[0.99] rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{authMode === 'signup' ? 'Submitting Registration...' : 'Authenticating...'}</span>
                </>
              ) : (
                <>
                  <span>{authMode === 'signup' ? 'Submit Registration for Manager Approval' : 'Sign In to Workspace'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>

      {/* Google Sign-In Modal */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#17252B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E9E7] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <div>
                <h3 className="font-bold text-sm text-[#17252B]">Sign in with Google</h3>
                <p className="text-[11px] text-[#64737A]">Google Workspace & SSO authentication</p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-[#17252B] mb-1">Google Email Address</label>
                <input
                  type="email"
                  required
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="e.g. name@organization.org or name@gmail.com"
                  className="w-full px-3 py-2 text-xs bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg text-[#17252B] focus:outline-hidden focus:border-[#176B68]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#17252B] mb-1">Full Name (Optional)</label>
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="e.g. Operations Officer"
                  className="w-full px-3 py-2 text-xs bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg text-[#17252B] focus:outline-hidden focus:border-[#176B68]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#17252B] mb-1.5">
                  Initial Workspace Role (Role Mapping)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGoogleRole('field_staff')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      googleRole === 'field_staff'
                        ? 'border-[#176B68] bg-[#176B68]/10 text-[#176B68]'
                        : 'border-[#E4E9E7] bg-[#F7F8F6] text-[#64737A] hover:text-[#17252B]'
                    }`}
                  >
                    <div className="font-bold">Field Staff</div>
                    <div className="text-[10px] font-normal opacity-80">Caseworker report entry</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGoogleRole('operations_manager')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      googleRole === 'operations_manager'
                        ? 'border-[#176B68] bg-[#176B68]/10 text-[#176B68]'
                        : 'border-[#E4E9E7] bg-[#F7F8F6] text-[#64737A] hover:text-[#17252B]'
                    }`}
                  >
                    <div className="font-bold">Manager</div>
                    <div className="text-[10px] font-normal opacity-80">Review & regional oversight</div>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={isGoogleLoading || !googleEmail.trim()}
                  onClick={() => handleGoogleSignIn()}
                  className="w-full py-2.5 px-3 text-xs font-bold text-white bg-[#176B68] hover:bg-[#208783] rounded-xl cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
                >
                  {isGoogleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Sign In with Google</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsGoogleModalOpen(false)}
              className="w-full py-2 text-xs font-semibold text-[#64737A] hover:bg-[#F7F8F6] rounded-xl cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* OTP Password Reset Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 bg-[#17252B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E9E7] rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-5 h-5 text-[#176B68]" />
              <h3 className="font-bold text-sm text-[#17252B]">
                {resetStep === 'request' ? 'Reset Password via OTP' : 'Verify OTP & Set New Password'}
              </h3>
            </div>
            <p className="text-xs text-[#64737A] mb-4">
              {resetStep === 'request'
                ? 'Enter your registered email to receive a single-use 6-digit verification code.'
                : 'Enter the 6-digit OTP code sent from security-alerts@projectrescue.org and specify your new password.'}
            </p>

            {resetStatus && (
              <div
                className={`p-3 rounded-xl text-xs mb-4 flex items-start gap-2 ${
                  resetStatus.type === 'success'
                    ? 'bg-[#247A58]/10 text-[#247A58] border border-[#247A58]/20'
                    : 'bg-[#C34D4D]/10 text-[#C34D4D] border border-[#C34D4D]/20'
                }`}
              >
                {resetStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{resetStatus.message}</span>
              </div>
            )}

            {/* Live OTP Preview Badge */}
            {otpHint && resetStep === 'verify' && (
              <div className="p-3 bg-[#176B68]/10 border border-[#176B68]/30 rounded-xl mb-4 text-xs">
                <div className="flex items-center justify-between text-[#176B68] font-semibold">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Generated Security OTP:
                  </span>
                  <span className="font-mono font-black text-sm bg-white px-2 py-0.5 rounded-md border border-[#176B68]/30">
                    {otpHint}
                  </span>
                </div>
                <div className="text-[10px] text-[#64737A] mt-1">
                  Sent from: <span className="font-mono">security-alerts@projectrescue.org</span>
                </div>
              </div>
            )}

            {resetStep === 'request' ? (
              <form onSubmit={handleRequestOtp} className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-bold text-[#17252B] mb-1">
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="caseworker@projectrescue.org"
                    className="w-full px-3 py-2 text-xs bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg text-[#17252B] focus:outline-hidden focus:border-[#176B68]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-full py-2.5 px-3 text-xs font-bold text-white bg-[#176B68] hover:bg-[#208783] rounded-xl cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send 6-Digit OTP</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtpAndReset} className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-bold text-[#17252B] mb-1">
                    6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 849201"
                    className="w-full px-3 py-2 text-sm font-mono tracking-widest text-center font-bold bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg text-[#17252B] focus:outline-hidden focus:border-[#176B68]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#17252B] mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 5 characters"
                    className="w-full px-3 py-2 text-xs bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg text-[#17252B] focus:outline-hidden focus:border-[#176B68]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#17252B] mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3 py-2 text-xs bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg text-[#17252B] focus:outline-hidden focus:border-[#176B68]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-full py-2.5 px-3 text-xs font-bold text-white bg-[#176B68] hover:bg-[#208783] rounded-xl cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify OTP & Set Password</span>
                    </>
                  )}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep('request');
                      setResetStatus(null);
                    }}
                    className="text-[11px] text-[#176B68] hover:underline"
                  >
                    Resend code or change email
                  </button>
                </div>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setIsResetOpen(false);
                setResetStep('request');
                setResetStatus(null);
                setOtpHint(null);
              }}
              className="w-full py-2 px-3 text-xs font-semibold text-[#64737A] hover:bg-[#F7F8F6] rounded-lg cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Security Footer Notice */}
      <div className="mt-6 text-center text-[11px] text-[#64737A] max-w-xs space-y-1">
        <div className="flex items-center justify-center gap-1 font-mono text-[#247A58]">
          <Lock className="w-3 h-3" /> TLS 1.3 · End-to-End Cryptographic Security
        </div>
        <p>Restricted to authorized Project Rescue Foundation personnel only.</p>
      </div>
    </div>
  );
};
