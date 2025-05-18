import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState } from "react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero section with nav */}
      <div className="relative bg-gradient-to-br from-blue-800 via-blue-700 to-indigo-900 text-white overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-800/50 via-blue-600/40 to-indigo-900/50"></div>
        <div className="absolute inset-0 backdrop-blur-[120px] bg-grid-white/[0.05] bg-[length:20px_20px]"></div>
        
        {/* Animated gradient circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-gradient-to-br from-blue-400 to-blue-700 rounded-full filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-gradient-to-br from-cyan-500 to-blue-700 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Navigation */}
          <div className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-8">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 p-[2px] overflow-hidden group">
                <div className="w-full h-full rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center transition group-hover:bg-white/5">
                  <span className="text-white font-bold text-xl">D</span>
                </div>
              </div>
              <span className="font-bold text-2xl bg-gradient-to-r from-white via-cyan-100 to-blue-100 bg-clip-text text-transparent">Dana AI</span>
            </div>
            
            <div className="flex items-center gap-6">
              <a href="tel:+254759745785" className="hidden sm:flex items-center gap-2 text-white/90 hover:text-white transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <span className="text-sm font-medium">+254 759 745 785</span>
              </a>
              
              <a 
                href="/api/login" 
                className="text-sm font-medium relative overflow-hidden group"
              >
                <span className="relative z-10 text-white group-hover:text-white transition-colors duration-300">Sign in</span>
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:w-full transition-all duration-300"></span>
              </a>
              
              <a 
                href="/api/login"
                className="relative overflow-hidden group bg-white/10 backdrop-blur-xl text-white border border-white/20 rounded-full px-5 py-2.5 text-sm font-medium hover:bg-white/20 hover:border-white/30 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full blur"></div>
                <span className="relative z-10">Get Started</span>
              </a>
            </div>
          </div>

          {/* Hero content */}
          <div className="relative px-6 py-24 sm:py-32 lg:px-8 lg:py-40 max-w-5xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
              All your customer interactions, <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">powered by AI</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl leading-relaxed text-white/80 max-w-3xl mx-auto">
              Dana AI connects with all your communication channels to deliver intelligent, 
              consistent customer interactions. Manage conversations, build knowledge, and analyze 
              performance—all in one place.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/api/login" 
                className="relative overflow-hidden group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full px-8 py-3.5 text-white font-semibold text-lg transition-all duration-300"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                <span className="relative z-10">Schedule a Demo</span>
              </a>
              <a 
                href="#how-it-works"
                className="relative overflow-hidden group bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 hover:border-white/30 rounded-full px-8 py-3.5 text-white font-semibold text-lg transition-all duration-300"
              >
                <span className="relative z-10">See how it works</span>
              </a>
            </div>
          </div>
        </div>
        
        {/* Decorative wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 48L48 48C96 48 192 48 288 42.7C384 37.3 480 26.7 576 32C672 37.3 768 58.7 864 64C960 69.3 1056 58.7 1152 53.3C1248 48 1344 48 1392 48L1440 48V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0V48Z" fill="white"/>
          </svg>
        </div>
      </div>

      {/* ROI Calculator Section */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-700 to-blue-600 bg-clip-text text-transparent">See Your Potential Savings</h2>
          <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">
            Businesses using Dana AI save an average of 60% on customer service costs while improving response times by 85%.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-sm opacity-75 group-hover:opacity-100 transition-all duration-300 -z-10"></div>
            <div className="relative overflow-hidden backdrop-blur-sm bg-white/95 border border-gray-200 rounded-xl p-8 shadow-xl transition-all duration-300 group-hover:translate-y-[-4px]">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">$120,000+</h3>
              <p className="text-purple-700 font-semibold mb-4">Annual Savings</p>
              <p className="text-gray-600">
                Average savings for a business handling 10,000 customer inquiries per month.
              </p>
            </div>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-xl blur-sm opacity-75 group-hover:opacity-100 transition-all duration-300 -z-10"></div>
            <div className="relative overflow-hidden backdrop-blur-sm bg-white/95 border border-gray-200 rounded-xl p-8 shadow-xl transition-all duration-300 group-hover:translate-y-[-4px]">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">85%</h3>
              <p className="text-blue-600 font-semibold mb-4">Faster Response Time</p>
              <p className="text-gray-600">
                Our AI responds instantly to customer inquiries, dramatically reducing wait times.
              </p>
            </div>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-400 rounded-xl blur-sm opacity-75 group-hover:opacity-100 transition-all duration-300 -z-10"></div>
            <div className="relative overflow-hidden backdrop-blur-sm bg-white/95 border border-gray-200 rounded-xl p-8 shadow-xl transition-all duration-300 group-hover:translate-y-[-4px]">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">40%</h3>
              <p className="text-orange-600 font-semibold mb-4">Higher Customer Satisfaction</p>
              <p className="text-gray-600">
                Consistent, accurate responses lead to happier customers and increased loyalty.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-700 to-blue-600 bg-clip-text text-transparent">Key Platform Features</h2>
          <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">
            Everything you need to deliver exceptional customer experiences across all communication channels.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="group relative overflow-hidden backdrop-blur-sm bg-white/80 border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:border-blue-200 hover:bg-gradient-to-b from-white to-blue-50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full -z-10 transition-transform duration-500 group-hover:scale-150 group-hover:opacity-80"></div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center text-blue-600 mb-4 shadow-md group-hover:shadow-blue-100 transition-all duration-300 group-hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors duration-300">Multi-Platform Messaging</h3>
            <p className="text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
              Connect all your communication channels in one place, including Facebook, WhatsApp, 
              Gmail, Slack, and more.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group relative overflow-hidden backdrop-blur-sm bg-white/80 border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:border-indigo-200 hover:bg-gradient-to-b from-white to-indigo-50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-bl-full -z-10 transition-transform duration-500 group-hover:scale-150 group-hover:opacity-80"></div>
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center text-indigo-600 mb-4 shadow-md group-hover:shadow-indigo-100 transition-all duration-300 group-hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-indigo-700 transition-colors duration-300">AI-Powered Responses</h3>
            <p className="text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
              Generate intelligent responses based on your knowledge base and customer history 
              to deliver consistent and personalized service.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group relative overflow-hidden backdrop-blur-sm bg-white/80 border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:border-green-200 hover:bg-gradient-to-b from-white to-green-50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-transparent rounded-bl-full -z-10 transition-transform duration-500 group-hover:scale-150 group-hover:opacity-80"></div>
            <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center text-green-600 mb-4 shadow-md group-hover:shadow-green-100 transition-all duration-300 group-hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-green-700 transition-colors duration-300">Knowledge Base</h3>
            <p className="text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
              Upload documents, PDFs, and create a structured knowledge base that your AI uses to 
              provide accurate responses.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="group relative overflow-hidden backdrop-blur-sm bg-white/80 border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:border-amber-200 hover:bg-gradient-to-b from-white to-amber-50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/20 to-transparent rounded-bl-full -z-10 transition-transform duration-500 group-hover:scale-150 group-hover:opacity-80"></div>
            <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg flex items-center justify-center text-amber-600 mb-4 shadow-md group-hover:shadow-amber-100 transition-all duration-300 group-hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-amber-700 transition-colors duration-300">Advanced Analytics</h3>
            <p className="text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
              Track performance metrics, sentiment analysis, and AI efficiency to continuously 
              improve your customer service quality.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="group relative overflow-hidden backdrop-blur-sm bg-white/80 border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:border-rose-200 hover:bg-gradient-to-b from-white to-rose-50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rose-500/20 to-transparent rounded-bl-full -z-10 transition-transform duration-500 group-hover:scale-150 group-hover:opacity-80"></div>
            <div className="w-14 h-14 bg-gradient-to-br from-rose-100 to-rose-200 rounded-lg flex items-center justify-center text-rose-600 mb-4 shadow-md group-hover:shadow-rose-100 transition-all duration-300 group-hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-rose-700 transition-colors duration-300">Team Collaboration</h3>
            <p className="text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
              Collaborate with your team on customer communications, share knowledge, and 
              maintain consistency across all customer touchpoints.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="group relative overflow-hidden backdrop-blur-sm bg-white/80 border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:border-purple-200 hover:bg-gradient-to-b from-white to-purple-50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-bl-full -z-10 transition-transform duration-500 group-hover:scale-150 group-hover:opacity-80"></div>
            <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center text-purple-600 mb-4 shadow-md group-hover:shadow-purple-100 transition-all duration-300 group-hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-purple-700 transition-colors duration-300">Easy Integrations</h3>
            <p className="text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
              Connect with popular CRM tools, including HubSpot, Salesforce, and other 
              business-critical systems with just a few clicks.
            </p>
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section id="how-it-works" className="py-24 px-6 bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">How Dana AI Works</h2>
            <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">
              Experience the power of AI-driven customer communication in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Step 1 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-md -z-10 group-hover:translate-y-1"></div>
              <div className="flex flex-col items-center text-center backdrop-blur-sm bg-white/80 rounded-xl p-8 shadow-lg border border-indigo-100/50 transition-all duration-300 group-hover:translate-y-[-4px] group-hover:shadow-xl">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-6 shadow-md shadow-blue-200 group-hover:shadow-blue-300 transition-all duration-300 group-hover:scale-110">
                  1
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-blue-700 transition-colors duration-300">Connect Your Platforms</h3>
                <p className="text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                  Link all your communication channels with our 30-second OAuth flows. No technical 
                  expertise required.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-md -z-10 group-hover:translate-y-1"></div>
              <div className="flex flex-col items-center text-center backdrop-blur-sm bg-white/80 rounded-xl p-8 shadow-lg border border-purple-100/50 transition-all duration-300 group-hover:translate-y-[-4px] group-hover:shadow-xl">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-6 shadow-md shadow-purple-200 group-hover:shadow-purple-300 transition-all duration-300 group-hover:scale-110">
                  2
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-purple-700 transition-colors duration-300">Build Your Knowledge</h3>
                <p className="text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                  Upload documents and create a knowledge base that the AI will use to generate 
                  informed responses.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-md -z-10 group-hover:translate-y-1"></div>
              <div className="flex flex-col items-center text-center backdrop-blur-sm bg-white/80 rounded-xl p-8 shadow-lg border border-blue-100/50 transition-all duration-300 group-hover:translate-y-[-4px] group-hover:shadow-xl">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-6 shadow-md shadow-cyan-200 group-hover:shadow-cyan-300 transition-all duration-300 group-hover:scale-110">
                  3
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-cyan-700 transition-colors duration-300">Engage & Analyze</h3>
                <p className="text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                  Start managing conversations with AI assistance and track performance metrics to 
                  continuously improve.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-purple-900"></div>
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[length:20px_20px]"></div>
        
        {/* Animated blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-br from-purple-500 to-pink-400 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-3000"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl font-bold text-white">Ready to transform your customer communications?</h2>
          <p className="mt-4 text-lg text-indigo-100 max-w-3xl mx-auto">
            Join leading businesses using Dana AI to deliver exceptional customer experiences.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/api/login"
              className="relative overflow-hidden group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full px-8 py-3.5 text-white font-semibold text-lg transition-all duration-300"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
              <span className="relative z-10">Schedule a Demo</span>
            </a>
            <a 
              href="tel:+254759745785"
              className="relative overflow-hidden group bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 hover:border-white/30 rounded-full px-8 py-3.5 text-white font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              <span className="relative z-10">Call Us</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-6 md:mb-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 p-[2px] overflow-hidden group">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center transition group-hover:bg-white/90">
                  <span className="text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-bold text-xl">D</span>
                </div>
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Dana AI</span>
            </div>
            <div className="flex gap-8">
              <a href="#" className="text-slate-600 hover:text-indigo-600 transition-colors duration-300">About</a>
              <a href="#" className="text-slate-600 hover:text-indigo-600 transition-colors duration-300">Features</a>
              <a href="#" className="text-slate-600 hover:text-indigo-600 transition-colors duration-300">Pricing</a>
              <a href="tel:+254759745785" className="text-slate-600 hover:text-indigo-600 transition-colors duration-300">Contact</a>
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-500 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} Dana AI. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-slate-500 hover:text-indigo-600 transition-colors duration-300">Privacy Policy</a>
              <a href="#" className="text-slate-500 hover:text-indigo-600 transition-colors duration-300">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}