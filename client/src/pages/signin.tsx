import { useState } from 'react';
import { Link } from 'wouter';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For demo purposes, this would normally connect to an authentication API
    // For now, we'll just redirect to the app
    window.location.href = '/app';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="relative">
        {/* Animated gradient circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full filter blur-3xl opacity-15 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full filter blur-3xl opacity-15 animate-blob animation-delay-4000"></div>
        
        <div className="max-w-md w-full backdrop-blur-sm bg-white/10 rounded-2xl border border-white/20 shadow-xl p-8 relative z-10">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 p-[2px] overflow-hidden">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-800/80 to-indigo-900/80 backdrop-blur-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">D</span>
                </div>
              </div>
              <span className="font-bold text-2xl bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">Dana AI</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">
              {isRegistering ? 'Create your account' : 'Sign in to your account'}
            </h2>
            <p className="text-blue-100/70 text-sm">
              {isRegistering
                ? 'Register to access the Dana AI platform'
                : 'Use your Dana AI credentials to access the platform'}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-blue-100 mb-1">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="Enter your name"
                  required
                />
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-blue-100 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="you@example.com"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-blue-100 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="••••••••"
                required
              />
            </div>
            
            {!isRegistering && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember"
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-blue-600 focus:ring-blue-500/50"
                  />
                  <label htmlFor="remember" className="ml-2 block text-sm text-blue-100/70">
                    Remember me
                  </label>
                </div>
                <a href="#" className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors">
                  Forgot password?
                </a>
              </div>
            )}
            
            <button
              type="submit"
              className="w-full relative overflow-hidden group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg px-6 py-3 text-white font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-blue-800/30"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
              <span className="relative z-10">{isRegistering ? 'Create Account' : 'Sign In'}</span>
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-blue-100/70 text-sm">
              {isRegistering
                ? 'Already have an account? '
                : "Don't have an account? "}
              <button
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-cyan-300 hover:text-cyan-200 transition-colors"
              >
                {isRegistering ? 'Sign in' : 'Register now'}
              </button>
            </p>
          </div>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-blue-100/50">Or continue with</span>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-1 gap-3">
              <Link
                to="/app"
                className="flex items-center justify-center gap-3 bg-white/10 backdrop-blur-xl border border-white/20 py-2 px-4 rounded-lg text-white hover:bg-white/15 transition-colors"
              >
                <svg className="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span>Continue to Demo</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}