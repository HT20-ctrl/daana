import { useState } from 'react';
import { Link } from 'wouter';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="relative">
        {/* Animated gradient circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full filter blur-3xl opacity-15 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full filter blur-3xl opacity-15 animate-blob animation-delay-4000"></div>
        
        <div className="max-w-md w-full backdrop-blur-sm bg-white/10 rounded-2xl border border-white/20 shadow-xl p-8 relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 p-[2px] overflow-hidden">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-800/80 to-indigo-900/80 backdrop-blur-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">D</span>
                </div>
              </div>
              <span className="font-bold text-2xl bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">Dana AI</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Sign in to your account</h2>
            <p className="text-blue-100/70 text-sm">
              Use your Dana AI account credentials to access the platform
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="flex flex-col mt-8 items-center justify-center">
              <a
                href="/api/login" 
                className="w-full relative overflow-hidden group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg px-6 py-3 text-white font-semibold text-center transition-all duration-300 hover:shadow-lg hover:shadow-blue-800/30"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                <span className="relative z-10">Sign in with Replit</span>
              </a>
              
              <div className="mt-8 text-center">
                <p className="text-blue-100/70 text-sm">
                  Don't have an account yet?{' '}
                  <a href="/api/login" className="text-cyan-300 hover:text-cyan-200 transition-colors">
                    Register now
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}