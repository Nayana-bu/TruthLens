import React, { useState } from 'react';
import { UserSession } from '../types';

interface AuthPageProps {
  onLogin: (user: UserSession) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  
  // Sign in fields
  const [identifier, setIdentifier] = useState('nayanabumesh22@gmail.com');
  const [password, setPassword] = useState('Auditor@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign up fields
  const [fullName, setFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('Citizen Fact-Checker');

  // Forgot password fields
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetStage, setResetStage] = useState<'request' | 'otp' | 'success'>('request');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // UI state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const idClean = identifier.trim();
    if (!idClean) {
      setErrorMsg('Please enter your email or username.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your account password.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const isEmail = idClean.includes('@');
      const user: UserSession = {
        id: `user-${Date.now()}`,
        name: isEmail && idClean.startsWith('nayana') ? 'Nayana Umesh' : idClean.split('@')[0],
        username: isEmail ? idClean.split('@')[0] : idClean,
        email: isEmail ? idClean : `${idClean}@truthlens.civic.in`,
        role: 'Verified Civic Researcher',
        isVerified: true,
        authProvider: 'password',
        loginTime: new Date().toISOString(),
      };

      if (rememberMe) {
        localStorage.setItem('truthlens_user_session', JSON.stringify(user));
      } else {
        sessionStorage.setItem('truthlens_user_session', JSON.stringify(user));
      }

      onLogin(user);
    }, 450);
  };

  const handleGoogleSignIn = () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    setTimeout(() => {
      setIsSubmitting(false);
      const googleUser: UserSession = {
        id: `google-${Date.now()}`,
        name: 'Nayana Umesh',
        username: 'nayana_umesh',
        email: 'nayanabumesh22@gmail.com',
        role: 'Authorized Fact-Checking Analyst',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        isVerified: true,
        authProvider: 'google',
        loginTime: new Date().toISOString(),
      };

      localStorage.setItem('truthlens_user_session', JSON.stringify(googleUser));
      onLogin(googleUser);
    }, 400);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim() || !regEmail.trim() || !regPassword) {
      setErrorMsg('Please fill in all mandatory fields.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const newUser: UserSession = {
        id: `user-${Date.now()}`,
        name: fullName.trim(),
        username: regUsername.trim() || regEmail.split('@')[0],
        email: regEmail.trim(),
        role: regRole,
        isVerified: true,
        authProvider: 'password',
        loginTime: new Date().toISOString(),
      };

      localStorage.setItem('truthlens_user_session', JSON.stringify(newUser));
      onLogin(newUser);
    }, 500);
  };

  const handleSendResetCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) {
      setErrorMsg('Please enter your email or username to send the reset code.');
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setResetStage('otp');
      setOtpCode('849201'); // Pre-fill sample security code
    }, 400);
  };

  const handleConfirmReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Please enter a new password of at least 6 characters.');
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setResetStage('success');
    }, 400);
  };

  return (
    <div className="min-h-screen w-full bg-[#f8f9ff] flex flex-col justify-center items-center p-4 sm:p-6 font-['Inter'] relative selection:bg-[#dce1ff] selection:text-[#00164e]">
      {/* Decorative top pattern */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4059aa] via-[#8fa7fe] to-[#10b981]" />

      <div className="w-full max-w-md mx-auto">
        {/* Brand identity header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center gap-3 mb-2">
            <img
              alt="TruthLens Logo"
              className="h-10 w-auto object-contain"
              src="https://lh3.googleusercontent.com/aida/AEtjO1Uu69U-0rHZRJ9UsAiwHXK-EZ3Zf4oxFellkglw3LYSOp2eqHI6bPQcOKdslK0tM05DYw7kpwAH_IrDQRY-yfPi6wnqcIcnXSRj3JoqTIjgSCXpwlp2bunXRe_wRLd3E2z_-6nXHu3DJt7eHFdhEvo3ZAEVoiFUk9QuzzVWlXqn-f6mPrLHiID1XnITQPpNPFC4Q6k16IF8Trzyok6fq1nKupxttrQvKvVAKrkLU-PPbyyzf1wod7hx"
            />
            <span className="font-['Plus Jakarta Sans'] font-extrabold text-2xl text-[#0b1c30] tracking-tight">
              TruthLens Verify
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e5eeff] text-[#00164e] text-xs font-semibold">
            <span className="material-symbols-outlined text-[15px] text-[#4059aa]">verified_user</span>
            <span>National Civic Fact-Checking Portal</span>
          </div>
        </div>

        {/* Auth Card Container */}
        <div className="bg-white rounded-2xl border border-[#dbe6fd] shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 sm:p-8">
          {/* Sign In & Sign Up Tab Headers */}
          {authMode !== 'forgot' && (
            <div className="flex border-b border-[#e5eeff] mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setErrorMsg(null);
                }}
                className={`flex-1 pb-3 text-sm font-['Plus Jakarta Sans'] font-bold text-center border-b-2 transition-all cursor-pointer ${
                  authMode === 'signin'
                    ? 'border-[#000000] text-[#0b1c30]'
                    : 'border-transparent text-[#76777d] hover:text-[#0b1c30]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setErrorMsg(null);
                }}
                className={`flex-1 pb-3 text-sm font-['Plus Jakarta Sans'] font-bold text-center border-b-2 transition-all cursor-pointer ${
                  authMode === 'signup'
                    ? 'border-[#000000] text-[#0b1c30]'
                    : 'border-transparent text-[#76777d] hover:text-[#0b1c30]'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Error Message banner */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-[#fff1f2] border border-[#fecdd3] text-[#ba1a1a] text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* VIEW 1: SIGN IN MODE */}
          {authMode === 'signin' && (
            <div className="space-y-4">
              {/* Google SSO Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleGoogleSignIn}
                className="w-full h-11 px-4 rounded-xl border border-[#cbd5e1] hover:border-[#94a3b8] bg-white hover:bg-[#f8f9ff] text-[#0b1c30] text-xs sm:text-sm font-semibold flex items-center justify-center gap-3 transition-all shadow-xs cursor-pointer active:scale-[0.99]"
              >
                {/* Official Google G Logo */}
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
                <span>Login through Google</span>
              </button>

              {/* Divider */}
              <div className="flex items-center my-3">
                <div className="flex-1 border-t border-[#e2e8f0]" />
                <span className="px-3 text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
                  Or enter credentials
                </span>
                <div className="flex-1 border-t border-[#e2e8f0]" />
              </div>

              {/* Credential Form */}
              <form onSubmit={handleSignIn} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                    Email or Username
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#76777d] text-[18px]">
                      alternate_email
                    </span>
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. nayanabumesh22@gmail.com"
                      className="w-full pl-9 pr-3 py-2 bg-[#f8f9ff] focus:bg-white rounded-xl border border-[#cbd5e1] focus:border-[#4059aa] text-xs sm:text-sm text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4059aa]/20"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#0b1c30]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot');
                        setResetIdentifier(identifier);
                        setErrorMsg(null);
                      }}
                      className="text-xs font-semibold text-[#4059aa] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#76777d] text-[18px]">
                      lock
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-9 pr-10 py-2 bg-[#f8f9ff] focus:bg-white rounded-xl border border-[#cbd5e1] focus:border-[#4059aa] text-xs sm:text-sm text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4059aa]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-[#76777d] hover:text-[#0b1c30] cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#45464d]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded text-[#000000] focus:ring-0"
                    />
                    <span>Remember my session</span>
                  </label>
                </div>

                {/* Primary Sign In Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl bg-[#000000] hover:bg-[#131b2e] text-white font-['Plus Jakarta Sans'] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] cursor-pointer disabled:opacity-75"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Enter TruthLens Verify</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              {/* 1-Click Quick Demo Access Button */}
              <div className="pt-3 border-t border-[#f1f5f9]">
                <button
                  type="button"
                  onClick={() => {
                    const demoUser: UserSession = {
                      id: 'auditor-nayana',
                      name: 'Nayana Umesh',
                      username: 'nayanabumesh22',
                      email: 'nayanabumesh22@gmail.com',
                      role: 'Verified Civic Researcher',
                      isVerified: true,
                      authProvider: 'demo',
                      loginTime: new Date().toISOString(),
                    };
                    localStorage.setItem('truthlens_user_session', JSON.stringify(demoUser));
                    onLogin(demoUser);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00164e] border border-[#d3e4fe] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#4059aa]">
                    verified
                  </span>
                  <span>1-Click Test Access: Nayana Umesh (Verified Researcher)</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: SIGN UP / CREATE ACCOUNT */}
          {authMode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#76777d] text-[18px]">
                    person
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Nayana Umesh"
                    className="w-full pl-9 pr-3 py-2 bg-[#f8f9ff] focus:bg-white rounded-xl border border-[#cbd5e1] focus:border-[#4059aa] text-xs sm:text-sm text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4059aa]/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                  Username
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#76777d] text-[18px]">
                    badge
                  </span>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. auditor_nayana"
                    className="w-full pl-9 pr-3 py-2 bg-[#f8f9ff] focus:bg-white rounded-xl border border-[#cbd5e1] focus:border-[#4059aa] text-xs sm:text-sm text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4059aa]/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#76777d] text-[18px]">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-[#f8f9ff] focus:bg-white rounded-xl border border-[#cbd5e1] focus:border-[#4059aa] text-xs sm:text-sm text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4059aa]/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                  Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#76777d] text-[18px]">
                    lock
                  </span>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a secure password"
                    className="w-full pl-9 pr-3 py-2 bg-[#f8f9ff] focus:bg-white rounded-xl border border-[#cbd5e1] focus:border-[#4059aa] text-xs sm:text-sm text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4059aa]/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                  Civic Auditor Role
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8f9ff] focus:bg-white rounded-xl border border-[#cbd5e1] text-xs sm:text-sm text-[#0b1c30] focus:outline-none"
                >
                  <option value="Citizen Fact-Checker">Citizen Fact-Checker</option>
                  <option value="Journalist / Media Researcher">Journalist / Media Researcher</option>
                  <option value="Civic Volunteer">Civic Volunteer</option>
                  <option value="Legal & Cyber Security Analyst">Legal & Cyber Security Analyst</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl bg-[#000000] hover:bg-[#131b2e] text-white font-['Plus Jakarta Sans'] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] cursor-pointer disabled:opacity-75"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                    <span>Registering Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Free Account</span>
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-[#76777d]">Already registered? </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setErrorMsg(null);
                  }}
                  className="text-xs font-bold text-[#4059aa] hover:underline cursor-pointer"
                >
                  Sign In instead
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3: FORGOT PASSWORD */}
          {authMode === 'forgot' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#e5eeff]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setErrorMsg(null);
                    setResetStage('request');
                  }}
                  className="w-8 h-8 rounded-full hover:bg-[#eff4ff] flex items-center justify-center text-[#76777d] hover:text-[#0b1c30] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <div>
                  <h3 className="font-['Plus Jakarta Sans'] font-bold text-base text-[#0b1c30]">
                    Reset Account Password
                  </h3>
                  <span className="text-[11px] text-[#76777d]">
                    TruthLens Secure Account Recovery
                  </span>
                </div>
              </div>

              {resetStage === 'request' && (
                <form onSubmit={handleSendResetCode} className="space-y-3.5">
                  <p className="text-xs text-[#45464d] leading-relaxed">
                    Enter your registered email address or username. We will issue a secure 6-digit verification code to reset your credentials.
                  </p>

                  <div>
                    <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                      Email or Username
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#76777d] text-[18px]">
                        mail
                      </span>
                      <input
                        type="text"
                        required
                        value={resetIdentifier}
                        onChange={(e) => setResetIdentifier(e.target.value)}
                        placeholder="nayanabumesh22@gmail.com"
                        className="w-full pl-9 pr-3 py-2 bg-[#f8f9ff] focus:bg-white rounded-xl border border-[#cbd5e1] focus:border-[#4059aa] text-xs sm:text-sm text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4059aa]/20"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 rounded-xl bg-[#000000] hover:bg-[#131b2e] text-white font-['Plus Jakarta Sans'] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    {isSubmitting ? 'Sending Code...' : 'Send Recovery Code'}
                  </button>
                </form>
              )}

              {resetStage === 'otp' && (
                <form onSubmit={handleConfirmReset} className="space-y-3.5">
                  <div className="p-3 bg-[#eff4ff] border border-[#d3e4fe] rounded-xl text-xs text-[#00164e]">
                    <span className="font-bold block mb-0.5">Verification Code Dispatched</span>
                    Enter the 6-digit security OTP sent to <strong>{resetIdentifier || 'your account'}</strong>.
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                      6-Digit Recovery Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full py-2 px-3 text-center tracking-widest font-mono font-bold text-base bg-[#f8f9ff] rounded-xl border border-[#cbd5e1] focus:border-[#4059aa] text-[#0b1c30] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full py-2 px-3 bg-[#f8f9ff] rounded-xl border border-[#cbd5e1] focus:border-[#4059aa] text-xs sm:text-sm text-[#0b1c30] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 rounded-xl bg-[#000000] hover:bg-[#131b2e] text-white font-['Plus Jakarta Sans'] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    {isSubmitting ? 'Updating...' : 'Update & Save New Password'}
                  </button>
                </form>
              )}

              {resetStage === 'success' && (
                <div className="py-4 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#ecfdf5] border-2 border-[#10b981] flex items-center justify-center text-[#059669] mx-auto">
                    <span className="material-symbols-outlined text-[28px]">check</span>
                  </div>
                  <h4 className="font-bold text-base text-[#0b1c30]">
                    Password Updated Successfully!
                  </h4>
                  <p className="text-xs text-[#76777d]">
                    Your account has been secured with the new password. You can now log in.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setErrorMsg(null);
                      setResetStage('request');
                      setPassword(newPassword || 'Auditor@2026');
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#000000] text-white font-bold text-xs hover:bg-[#131b2e] cursor-pointer"
                  >
                    Proceed to Sign In
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Security & Official Verification Disclaimer Footer */}
        <div className="mt-6 text-center space-y-1 text-[11px] text-[#76777d]">
          <p className="flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-[#16a34a]">shield</span>
            <span>Protected by Constitutional Evidentiary Standards</span>
          </p>
          <p>
            Connected to 48 statutory gazettes & verified fact-checking bureaus.
          </p>
        </div>
      </div>
    </div>
  );
};
