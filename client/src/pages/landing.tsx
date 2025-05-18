import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero section with nav */}
      <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto">
          {/* Navigation */}
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white font-bold">D</span>
              </div>
              <span className="font-bold text-xl">Dana AI</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="/api/login" className="text-sm font-medium hover:text-blue-300">Sign in</a>
              <a 
                href="/api/login"
                className="bg-white text-slate-900 rounded-full px-4 py-2 text-sm font-medium hover:bg-blue-50"
              >
                Get Started
              </a>
            </div>
          </div>

          {/* Hero content */}
          <div className="px-6 py-16 max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold">
              All your customer interactions, <span className="text-blue-400">powered by AI</span>
            </h1>
            <p className="mt-6 text-lg text-slate-300 max-w-3xl mx-auto">
              Dana AI connects with all your communication channels to deliver intelligent, 
              consistent customer interactions.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              <a
                href="/api/login" 
                className="rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-2 text-white font-medium"
              >
                Start for free
              </a>
              <a 
                href="/app"
                className="rounded-full bg-slate-700 hover:bg-slate-600 px-6 py-2 text-white font-medium"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <section className="py-12 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-900">Key Platform Features</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Feature 1 */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Multi-Platform Messaging</h3>
            <p className="text-slate-600">
              Connect all your communication channels in one place, including Facebook, WhatsApp, 
              Gmail, Slack, and more.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">AI-Powered Responses</h3>
            <p className="text-slate-600">
              Generate intelligent responses based on your knowledge base and customer history.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Knowledge Base</h3>
            <p className="text-slate-600">
              Upload documents and create a structured knowledge base for accurate AI responses.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Advanced Analytics</h3>
            <p className="text-slate-600">
              Track performance metrics, sentiment analysis, and AI efficiency.
            </p>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-12 px-6 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold">Ready to transform your customer communications?</h2>
          <div className="mt-6">
            <a 
              href="/api/login"
              className="inline-block rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-2 text-white font-medium"
            >
              Get started for free
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-6 px-6 border-t border-slate-200">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <span className="font-bold text-slate-900">Dana AI © {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-slate-600 hover:text-blue-600">Privacy</a>
            <a href="#" className="text-slate-600 hover:text-blue-600">Terms</a>
            <a href="#" className="text-slate-600 hover:text-blue-600">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}