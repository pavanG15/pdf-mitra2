
import React, { useState } from 'react';

const Legal: React.FC = () => {
  const [tab, setTab] = useState<'privacy' | 'terms'>('privacy');

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="flex gap-4 mb-12 bg-slate-100 dark:bg-slate-900 p-2 rounded-2xl w-fit mx-auto">
        <button 
          onClick={() => setTab('privacy')}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'privacy' ? 'bg-white dark:bg-slate-800 text-teal-600 shadow-sm' : 'text-slate-500'}`}
        >
          Privacy Policy
        </button>
        <button 
          onClick={() => setTab('terms')}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'terms' ? 'bg-white dark:bg-slate-800 text-teal-600 shadow-sm' : 'text-slate-500'}`}
        >
          Terms of Service
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-12 rounded-[3rem] shadow-sm prose prose-slate dark:prose-invert max-w-none">
        {tab === 'privacy' ? (
          <div>
            <h1 className="text-3xl font-black mb-6">Privacy Policy</h1>
            <p className="text-slate-500 dark:text-slate-400">Last Updated: February 13, 2026</p>
            <h2 className="text-xl font-bold mt-8 mb-4">1. Local Processing Guarantee</h2>
            <p>PDF MITRA is built on a "Privacy-First" architecture. All PDF manipulations, conversions, and scanning processes happen exclusively within your device's browser memory (Client-Side). We do not upload your documents to any server.</p>
            <h2 className="text-xl font-bold mt-8 mb-4">2. Data Collection</h2>
            <p>We do not collect personal identification information. We may use basic analytics to track tool usage patterns to improve performance, but this data is anonymized.</p>
            <h2 className="text-xl font-bold mt-8 mb-4">3. Camera Access</h2>
            <p>Our "Scan to PDF" tool requires camera access. This stream is processed locally via WebAssembly and OpenCV. No images from your camera are ever stored or transmitted by our software.</p>
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-black mb-6">Terms of Service</h1>
            <p className="text-slate-500 dark:text-slate-400">Last Updated: February 13, 2026</p>
            <h2 className="text-xl font-bold mt-8 mb-4">1. Usage Agreement</h2>
            <p>By using PDF MITRA, you agree to these terms. This suite is provided "as-is" for document management purposes.</p>
            <h2 className="text-xl font-bold mt-8 mb-4">2. Limitation of Liability</h2>
            <p>While we strive for 100% accuracy, PDF MITRA is not responsible for any data loss or document corruption that may occur during browser-based processing. Always keep backups of your original files.</p>
            <h2 className="text-xl font-bold mt-8 mb-4">3. Prohibited Use</h2>
            <p>You may not use this tool to process illegal or malicious content. The software is for personal and professional legal document management.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Legal;
