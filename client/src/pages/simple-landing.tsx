import { Button } from "@/components/ui/button";

export default function SimpleLandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Hero section with nav */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white font-bold">D</span>
              </div>
              <span className="font-bold text-xl">Dana AI</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="/api/login" className="text-sm font-medium hover:text-blue-300">Sign in</a>
              <a 
                href="/app"
                className="bg-white text-slate-900 rounded px-3 py-1 text-sm font-medium"
              >
                Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-white px-4 py-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold">
            Dana AI
          </h1>
          <p className="mt-4 text-slate-300">
            Unified customer communications powered by AI
          </p>
          <div className="mt-6">
            <a
              href="/api/login" 
              className="inline-block rounded bg-blue-600 hover:bg-blue-700 px-5 py-2 text-white font-medium"
            >
              Get Started →
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white py-4 px-4 border-t border-slate-200">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <span className="text-sm text-slate-600">Dana AI © {new Date().getFullYear()}</span>
          <div className="flex gap-4">
            <a href="#" className="text-sm text-slate-600 hover:text-blue-600">Privacy</a>
            <a href="#" className="text-sm text-slate-600 hover:text-blue-600">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}