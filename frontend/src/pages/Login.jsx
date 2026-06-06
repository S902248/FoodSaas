import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ChefHat } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Realistic Food Photography */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop')" }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 p-12 flex flex-col justify-end h-full">
          <p className="text-white text-lg font-medium opacity-90">"BitsCon has completely transformed how we manage orders and tables. The QR system is flawless."</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold">SV</div>
            <div className="text-white">
              <p className="font-semibold text-sm">Spice Villa</p>
              <p className="text-xs opacity-75">Premium Partner</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Glassmorphism Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-[#6C4DFF] via-[#5235DB] to-[#3B28CC] relative overflow-hidden">
        {/* Animated Background Shapes */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full filter blur-[100px] mix-blend-overlay animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-400/20 rounded-full filter blur-[100px] mix-blend-overlay"></div>

        {/* Glassmorphism Card */}
        <div className="w-full max-w-md bg-white/10 backdrop-blur-2xl p-10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] border border-white/20 relative z-10 text-white">
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center mb-4 shadow-inner">
              <ChefHat size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-wide">BitsCon</h1>
          </div>
          
          <h2 className="text-3xl font-bold mb-2 text-center">Welcome back!</h2>
          <p className="text-white/70 mb-8 text-center text-sm">Sign in to manage your restaurant.</p>

          {error && (
            <div className="bg-red-500/20 backdrop-blur-md text-red-100 p-3 rounded-xl mb-6 text-sm border border-red-500/30 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                type="email"
                required
                className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:bg-white/10 focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all outline-none"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <input
                type="password"
                required
                className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:bg-white/10 focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all outline-none"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex justify-end mt-2">
                <Link to="/forgot-password" className="text-xs text-white/70 hover:text-white transition-colors">Forgot Password?</Link>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-white text-[#6C4DFF] hover:bg-white/90 font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl mt-4"
            >
              Sign In
            </button>
            
            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-white/50 text-xs">OR</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>
            
            <button
              type="button"
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3.5 rounded-xl transition-all flex items-center justify-center gap-3"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25C22.56 11.47 22.49 10.73 22.36 10H12V14.26H17.92C17.67 15.63 16.89 16.79 15.72 17.57V20.33H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                <path d="M12 23C14.97 23 17.46 22.02 19.28 20.33L15.72 17.57C14.73 18.23 13.48 18.63 12 18.63C9.13 18.63 6.7 16.69 5.84 14.1H2.18V16.94C4.01 20.57 7.7 23 12 23Z" fill="#34A853"/>
                <path d="M5.84 14.1C5.62 13.44 5.5 12.74 5.5 12C5.5 11.26 5.62 10.56 5.84 9.9V7.06H2.18C1.43 8.55 1 10.22 1 12C1 13.78 1.43 15.45 2.18 16.94L5.84 14.1Z" fill="#FBBC05"/>
                <path d="M12 5.38C13.62 5.38 15.06 5.93 16.2 7.02L19.36 3.86C17.46 2.09 14.97 1 12 1C7.7 1 4.01 3.43 2.18 7.06L5.84 9.9C6.7 7.31 9.13 5.38 12 5.38Z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </form>

          <p className="text-center text-white/70 mt-8 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-white font-semibold hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
        
        {/* Footer links */}
        <div className="absolute bottom-6 flex gap-6 text-white/50 text-xs z-10">
          <span>© 2026 BitsCon. All rights reserved.</span>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
