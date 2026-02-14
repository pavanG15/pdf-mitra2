
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Merge from './pages/Merge';
import Split from './pages/Split';
import Compress from './pages/Compress';
import PDFtoWord from './pages/PDFtoWord';
import WordToPDF from './pages/WordToPDF';
import PDFtoJPG from './pages/PDFtoJPG';
import JPGtoPDF from './pages/JPGtoPDF';
import Rotate from './pages/Rotate';
import Reorder from './pages/Reorder';
import Scan from './pages/Scan';
import Protect from './pages/Protect';
import Unlock from './pages/Unlock';
import Watermark from './pages/Watermark';
import Repair from './pages/Repair';
import Numbering from './pages/Numbering';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import IDCardMerge from './pages/IDCardMerge';
import ExtractPages from './pages/ExtractPages';
import DeletePages from './pages/DeletePages';
import CropPDF from './pages/CropPDF';
import Legal from './pages/Legal';

interface HeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
  isHidden?: boolean;
}

const Header: React.FC<HeaderProps> = ({ isDark, toggleTheme, isHidden }) => {
  if (isHidden) return null;
  return (
    <nav className="sticky top-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-900 transition-all duration-300">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-3 group active:scale-95 transition-transform">
            <div className="relative">
              <div className="bg-gradient-to-br from-teal-500 to-teal-600 w-11 h-11 rounded-[14px] text-white flex items-center justify-center shadow-lg shadow-teal-500/20">
                <i className="fas fa-file-pdf text-xl"></i>
              </div>
              <div className="absolute -top-1 -right-1 bg-orange-500 w-4 h-4 rounded-full border-2 border-white dark:border-slate-950 flex items-center justify-center">
                <i className="fas fa-star text-[6px] text-white"></i>
              </div>
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-xl font-[900] tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                PDF<span className="text-teal-600">MITRA</span>
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 leading-none mt-0.5">
                Pro Suite
              </span>
            </div>
          </Link>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-500 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-100 dark:border-slate-800"
              aria-label="Toggle Dark Mode"
            >
              <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'} text-sm`}></i>
            </button>
            <button className="hidden sm:flex bg-orange-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
              Support <i className="fas fa-heart ml-1"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const MobileNav: React.FC<{ isHidden?: boolean }> = ({ isHidden }) => {
  const location = useLocation();
  const path = location.pathname;
  if (isHidden) return null;

  const navItems = [
    { icon: 'fa-house', label: 'Home', path: '/' },
    { icon: 'fa-shapes', label: 'Tools', path: '/#tools' },
    { icon: 'fa-camera', label: 'Scan', path: '/scan', isCenter: true },
    { icon: 'fa-book-open', label: 'Blog', path: '/blog' },
    { icon: 'fa-shield-halved', label: 'Legal', path: '/legal' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] px-4 pb-6 pointer-events-none">
      <div className="bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] flex items-center justify-between px-6 py-3 pointer-events-auto">
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path}
            className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${item.isCenter ? 'relative -top-6' : ''}`}
          >
            {item.isCenter ? (
              <div className="w-14 h-14 bg-gradient-to-tr from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white text-xl shadow-xl shadow-teal-500/40 ring-4 ring-white dark:ring-slate-950">
                <i className={`fas ${item.icon}`}></i>
              </div>
            ) : (
              <>
                <i className={`fas ${item.icon} text-sm ${path === item.path ? 'text-teal-600' : 'text-slate-400 dark:text-slate-500'}`}></i>
                <span className={`text-[8px] font-black uppercase tracking-widest ${path === item.path ? 'text-teal-600' : 'text-slate-400 dark:text-slate-500'}`}>
                  {item.label}
                </span>
              </>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

function AppContent({ isDark, toggleTheme }: { isDark: boolean; toggleTheme: () => void }) {
  const location = useLocation();
  // Hide global navigation if on scanner page (it has its own immersive UI)
  const isScannerActive = location.pathname === '/scan';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Header isDark={isDark} toggleTheme={toggleTheme} isHidden={isScannerActive} />
      <main className={`flex-grow ${isScannerActive ? '' : 'pb-32 md:pb-0'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/merge" element={<Merge />} />
          <Route path="/split" element={<Split />} />
          <Route path="/extract-pages" element={<ExtractPages />} />
          <Route path="/delete-pages" element={<DeletePages />} />
          <Route path="/crop" element={<CropPDF />} />
          <Route path="/compress" element={<Compress />} />
          <Route path="/pdf-to-word" element={<PDFtoWord />} />
          <Route path="/word-to-pdf" element={<WordToPDF />} />
          <Route path="/pdf-to-jpg" element={<PDFtoJPG />} />
          <Route path="/jpg-to-pdf" element={<JPGtoPDF />} />
          <Route path="/rotate" element={<Rotate />} />
          <Route path="/reorder" element={<Reorder />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/protect" element={<Protect />} />
          <Route path="/unlock" element={<Unlock />} />
          <Route path="/watermark" element={<Watermark />} />
          <Route path="/repair" element={<Repair />} />
          <Route path="/numbering" element={<Numbering />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:id" element={<BlogPost />} />
          <Route path="/id-merge" element={<IDCardMerge />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <footer className={`bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 py-12 px-6 hidden md:${isScannerActive ? 'hidden' : 'block'}`}>
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-6">
          <div className="flex gap-6 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">
            <Link to="/legal" className="hover:text-teal-600 transition-colors">Privacy Policy</Link>
            <Link to="/legal" className="hover:text-teal-600 transition-colors">Terms of Service</Link>
            <Link to="/blog" className="hover:text-teal-600 transition-colors">Blog</Link>
          </div>
          <div className="text-[11px] font-black tracking-widest text-slate-300 dark:text-slate-800 uppercase">
            © 2026 PDFMITRA PRO SUITE • BUILT FOR PRIVACY
          </div>
        </div>
      </footer>
      <MobileNav isHidden={isScannerActive} />
    </div>
  );
}

export default function App() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <Router>
      <AppContent isDark={isDark} toggleTheme={toggleTheme} />
    </Router>
  );
}
