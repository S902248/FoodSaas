import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  ChefHat,
  Mail,
  KeyRound,
  Lock,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

const API = 'http://localhost:5000/api/auth/forgot-password';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);        // 1=email, 2=otp, 3=new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [devOtp, setDevOtp] = useState(''); // shown in dev/simulated mode

  // Countdown for OTP resend
  useEffect(() => {
    let interval;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // --- Step 1: Send OTP to email ---
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setDevOtp('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/send-email-otp`, { email });
      const msg = res.data.isSimulated
        ? `Dev mode: OTP is ${res.data.otp} (email not configured)`
        : res.data.message;
      setSuccess(msg);
      if (res.data.isSimulated) setDevOtp(res.data.otp);
      setStep(2);
      setTimer(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: Verify OTP ---
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post(`${API}/verify-email-otp`, { email, otp });
      setSuccess('OTP verified! Create your new password.');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  // --- Resend OTP ---
  const handleResendOtp = async () => {
    if (timer > 0) return;
    setError('');
    setDevOtp('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/send-email-otp`, { email });
      const msg = res.data.isSimulated
        ? `Dev mode: OTP is ${res.data.otp}`
        : 'A new OTP has been sent to your email.';
      setSuccess(msg);
      if (res.data.isSimulated) setDevOtp(res.data.otp);
      setTimer(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 3: Reset Password ---
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/reset-password-email`, { email, otp, newPassword });
      setSuccess('Password updated successfully! Redirecting to login…');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Please request a new OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side – Food Photo */}
      <div
        className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop')" }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 p-12 flex flex-col justify-end h-full">
          <p className="text-white text-lg font-medium opacity-90">
            "BitsCon has completely transformed how we manage orders and tables. The QR system is flawless."
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold">SV</div>
            <div className="text-white">
              <p className="font-semibold text-sm">Spice Villa</p>
              <p className="text-xs opacity-75">Premium Partner</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side – Glassmorphism Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-[#6C4DFF] via-[#5235DB] to-[#3B28CC] relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full filter blur-[100px] mix-blend-overlay animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-400/20 rounded-full filter blur-[100px] mix-blend-overlay" />

        {/* Card */}
        <div className="w-full max-w-md bg-white/10 backdrop-blur-2xl p-10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] border border-white/20 relative z-10 text-white animate-in fade-in duration-300">

          {/* Logo */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center mb-4 shadow-inner">
              <ChefHat size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-wide">BitsCon</h1>
          </div>

          <h2 className="text-2xl font-bold mb-2 text-center">Reset Password</h2>
          <p className="text-white/70 mb-8 text-center text-sm">
            {step === 1 && 'Enter your registered email address to receive an OTP.'}
            {step === 2 && `Enter the 6-digit OTP sent to ${email}.`}
            {step === 3 && 'Secure your account with a brand new password.'}
          </p>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? 'w-8 bg-white' : s < step ? 'w-4 bg-white/60' : 'w-4 bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-500/20 backdrop-blur-md text-red-100 p-3 rounded-xl mb-5 text-sm border border-red-500/30 flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/20 backdrop-blur-md text-emerald-100 p-3 rounded-xl mb-5 text-sm border border-emerald-500/30 flex items-center gap-2">
              <CheckCircle size={16} className="flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Dev-mode OTP hint */}
          {devOtp && (
            <div className="bg-amber-500/20 border border-amber-400/30 text-amber-100 p-3 rounded-xl mb-5 text-sm text-center">
              <span className="font-semibold">Dev OTP:</span>{' '}
              <span className="font-mono tracking-widest text-lg">{devOtp}</span>
            </div>
          )}

          {/* STEP 1 – Email Input */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                <input
                  id="fp-email"
                  type="email"
                  required
                  placeholder="Registered Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:bg-white/10 focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all outline-none"
                />
              </div>
              <button
                id="fp-send-otp"
                type="submit"
                disabled={loading}
                className="w-full bg-white text-[#6C4DFF] hover:bg-white/90 font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl mt-2 flex items-center justify-center gap-2"
              >
                {loading ? 'Sending OTP…' : 'Send Reset OTP'}
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          {/* STEP 2 – OTP Verification */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                <input
                  id="fp-otp"
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6-Digit OTP Code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-12 pr-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 font-semibold focus:bg-white/10 focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all outline-none tracking-widest text-center text-lg"
                />
              </div>

              <div className="flex justify-between items-center text-xs text-white/70">
                <span>Didn't get the code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={timer > 0 || loading}
                  className={`font-semibold hover:underline ${timer > 0 ? 'text-white/40 cursor-not-allowed' : 'text-white'}`}
                >
                  {timer > 0 ? `Resend in ${timer}s` : 'Resend Code'}
                </button>
              </div>

              <button
                id="fp-verify-otp"
                type="submit"
                disabled={loading}
                className="w-full bg-white text-[#6C4DFF] hover:bg-white/90 font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl mt-2 flex items-center justify-center gap-2"
              >
                {loading ? 'Verifying…' : 'Verify OTP Code'}
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                onClick={() => { setStep(1); setError(''); setSuccess(''); setDevOtp(''); }}
                className="w-full bg-transparent border border-white/10 hover:bg-white/5 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
              >
                <ArrowLeft size={14} />
                Back to Email Input
              </button>
            </form>
          )}

          {/* STEP 3 – New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                <input
                  id="fp-new-password"
                  type="password"
                  required
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-12 pr-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:bg-white/10 focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all outline-none"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                <input
                  id="fp-confirm-password"
                  type="password"
                  required
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:bg-white/10 focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all outline-none"
                />
              </div>
              <button
                id="fp-reset-submit"
                type="submit"
                disabled={loading}
                className="w-full bg-white text-[#6C4DFF] hover:bg-white/90 font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl mt-2 flex items-center justify-center gap-2"
              >
                {loading ? 'Saving…' : 'Save New Password'}
                <CheckCircle size={18} />
              </button>
            </form>
          )}

          <p className="text-center text-white/70 mt-8 text-sm">
            Remembered your password?{' '}
            <Link to="/login" className="text-white font-semibold hover:underline">
              Log In
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 flex gap-6 text-white/50 text-xs z-10">
          <span>© 2026 BitsCon. All rights reserved.</span>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
