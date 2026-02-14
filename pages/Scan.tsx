
import React, { useState, useRef, useEffect } from 'react';
import { ProcessingState } from '../types';

declare const jspdf: any;

type ScanFilter = 'none' | 'document' | 'bw' | 'grayscale';
type ScanMode = 'document' | 'idcard' | 'book' | 'photo';

interface CapturedPage {
  original: string;
  processed: string;
  filter: ScanFilter;
}

const Scan: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // Persistent hidden canvas for processing
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPages, setCapturedPages] = useState<CapturedPage[]>([]);
  
  // UI Steps: 'idle' | 'camera' | 'edit' | 'gallery'
  const [uiStep, setUiStep] = useState<'camera' | 'edit' | 'gallery' | 'idle'>('idle');
  const [currentCapture, setCurrentCapture] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<ScanFilter>('document');
  const [currentMode, setCurrentMode] = useState<ScanMode>('document');
  
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });

  const startCamera = async () => {
    try {
      setState({ status: 'loading', progress: 0 });
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setUiStep('camera');
      setState({ status: 'idle', progress: 0 });
    } catch (err) {
      console.error(err);
      alert("Camera access denied. Please allow camera permissions in your settings.");
      setUiStep('idle');
    }
  };

  useEffect(() => {
    if (uiStep === 'camera' && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [uiStep, stream]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setUiStep('idle');
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Set canvas to match video source resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    
    // Add visual shutter feedback
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-white z-[300] pointer-events-none opacity-100 transition-opacity duration-150';
    document.body.appendChild(overlay);
    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 150);
    }, 50);

    const rawData = canvas.toDataURL('image/jpeg', 0.92);
    setCurrentCapture(rawData);
    setUiStep('edit');
  };

  const confirmPage = () => {
    if (!currentCapture || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.src = currentCapture;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Professional Grade Per-Pixel Filtering
      if (currentFilter === 'document') {
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          // Grayscale conversion focused on luminance
          let gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          
          // Aadhaar-optimized whitening: Remove shadows and yellow tint
          // Threshold logic for background vs text
          let val = (gray - 95) * 2.1 + 128;
          if (val > 200) val = 255; // Clip highlights to pure white
          if (val < 70) val *= 0.7;  // Deepen blacks for text clarity

          val = Math.max(0, Math.min(255, val));
          data[i] = data[i+1] = data[i+2] = val;
        }
      } else if (currentFilter === 'bw') {
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const val = avg > 125 ? 255 : 0;
          data[i] = data[i+1] = data[i+2] = val;
        }
      } else if (currentFilter === 'grayscale') {
        for (let i = 0; i < data.length; i += 4) {
          const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = data[i+1] = data[i+2] = g;
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      const processedData = canvas.toDataURL('image/jpeg', 0.88);
      
      setCapturedPages(prev => [...prev, { 
        original: currentCapture, 
        processed: processedData, 
        filter: currentFilter 
      }]);
      
      setCurrentCapture(null);
      setUiStep('camera');
    };
  };

  const generatePDF = () => {
    if (capturedPages.length === 0) return;
    setState({ status: 'processing', progress: 50, message: 'Constructing high-quality PDF...' });
    
    // Small delay to let the processing overlay render
    setTimeout(() => {
      try {
        const { jsPDF } = jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = 210;
        const pageHeight = 297;

        capturedPages.forEach((page, idx) => {
          if (idx > 0) doc.addPage();
          doc.addImage(page.processed, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        });

        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        setState({ 
          status: 'success', 
          resultUrl: url, 
          resultFileName: `scan_${Date.now()}.pdf`,
          progress: 100 
        });
        stopCamera();
      } catch (e) {
        console.error(e);
        setState({ status: 'error', progress: 0, message: 'PDF creation failed. Please try again.' });
      }
    }, 100);
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden font-sans">
      {/* Persistent Hidden Canvas for processing images even when UI switches */}
      <canvas ref={canvasRef} className="hidden"></canvas>

      {/* Welcome / Idle Screen */}
      {uiStep === 'idle' && state.status !== 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950 animate-in fade-in duration-500">
           <div className="w-24 h-24 bg-teal-500 text-white rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-xl shadow-teal-500/20">
             <i className="fas fa-camera"></i>
           </div>
           <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Pro Scanner</h1>
           <p className="text-slate-500 dark:text-slate-400 mb-10 text-sm max-w-xs font-medium uppercase tracking-[0.3em]">Privacy First • Local Processing</p>
           <button onClick={startCamera} className="bg-teal-600 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-2xl active:scale-95 transition-all">
             Start Scanning
           </button>
        </div>
      )}

      {/* Viewfinder Step */}
      {uiStep === 'camera' && (
        <div className="flex flex-col h-full bg-black relative">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 px-4 py-4 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent z-20">
            <button onClick={stopCamera} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md active:scale-90 transition-transform">
              <i className="fas fa-arrow-left"></i>
            </button>
            <div className="flex flex-col items-center">
               <span className="text-teal-400 font-bold text-[9px] tracking-[0.4em] uppercase">Document Scanner</span>
               <span className="text-white font-black text-sm uppercase">{capturedPages.length} PAGES READY</span>
            </div>
            <div className="w-10"></div>
          </div>

          {/* Viewfinder */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
            
            {/* Guide Grid Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[85%] h-[65%] border-2 border-dashed border-teal-500/30 rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-teal-500 rounded-tl-xl"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-teal-500 rounded-tr-xl"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-teal-500 rounded-bl-xl"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-teal-500 rounded-br-xl"></div>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="bg-black/95 px-4 pt-4 pb-8 flex flex-col gap-6 z-20">
            {/* Mode Selector */}
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-1 mask-fade-edges">
               {['DOCUMENT', 'ID CARD', 'BOOK', 'PHOTO'].map(m => (
                 <button 
                  key={m} 
                  className={`text-[9px] font-black tracking-widest uppercase whitespace-nowrap px-5 py-2 rounded-full border transition-all ${m.toLowerCase().replace(' ','') === currentMode ? 'bg-teal-500 text-black border-teal-500 shadow-lg shadow-teal-500/20' : 'text-slate-500 border-white/5 bg-white/5'}`}
                  onClick={() => setCurrentMode(m.toLowerCase().replace(' ','') as any)}
                 >
                   {m}
                 </button>
               ))}
            </div>

            {/* Main Action Bar */}
            <div className="flex items-center justify-between max-w-sm mx-auto w-full px-4">
               {/* Gallery Preview */}
               <button 
                 onClick={() => capturedPages.length > 0 && setUiStep('gallery')}
                 className="w-14 h-14 rounded-2xl border-2 border-white/10 overflow-hidden bg-white/5 flex items-center justify-center relative active:scale-90 transition-transform shadow-inner"
               >
                 {capturedPages.length > 0 ? (
                   <img src={capturedPages[capturedPages.length-1].processed} className="w-full h-full object-cover" />
                 ) : (
                   <i className="fas fa-images text-slate-700"></i>
                 )}
               </button>

               {/* Shutter Button - Guaranteed Visibility */}
               <button 
                 onClick={capturePhoto} 
                 className="w-22 h-22 rounded-full border-4 border-white/30 p-1 active:scale-95 transition-all shadow-[0_0_50px_rgba(20,184,166,0.3)] bg-white/10"
               >
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full bg-teal-500/10 flex items-center justify-center">
                       <i className="fas fa-camera text-slate-900 text-xl"></i>
                    </div>
                  </div>
               </button>

               {/* Finish / Batch Review */}
               <button 
                 onClick={() => capturedPages.length > 0 ? setUiStep('gallery') : null}
                 disabled={capturedPages.length === 0}
                 className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all ${capturedPages.length > 0 ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20' : 'bg-white/5 text-slate-800 pointer-events-none'}`}
               >
                 <i className="fas fa-check"></i>
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhance / Edit Step */}
      {uiStep === 'edit' && currentCapture && (
        <div className="fixed inset-0 z-[110] bg-slate-950 flex flex-col animate-in slide-in-from-bottom duration-300">
           <div className="p-4 flex justify-between items-center bg-black/50 border-b border-white/5">
              <button onClick={() => setUiStep('camera')} className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest px-3 py-2 rounded-lg bg-white/5">
                <i className="fas fa-arrow-left"></i> Retake
              </button>
              <h2 className="text-white font-black text-xs uppercase tracking-[0.4em]">Enhance Scan</h2>
              <button onClick={confirmPage} className="bg-teal-600 text-white px-5 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                Accept
              </button>
           </div>

           <div className="flex-1 rounded-3xl overflow-hidden bg-black flex items-center justify-center m-4 shadow-2xl relative border border-white/5">
              <img 
                src={currentCapture} 
                className={`max-w-full max-h-full object-contain transition-all duration-300 shadow-2xl ${currentFilter === 'document' ? 'contrast-[1.2] grayscale' : currentFilter === 'bw' ? 'grayscale contrast-[2]' : currentFilter === 'grayscale' ? 'grayscale' : ''}`} 
              />
              <div className="absolute bottom-6 right-6 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest text-teal-400">
                Mode: {currentFilter === 'document' ? 'Magic Scan' : currentFilter.toUpperCase()}
              </div>
           </div>

           <div className="bg-black/80 backdrop-blur-xl p-6 grid grid-cols-4 gap-3 border-t border-white/5">
              {[
                { id: 'none', label: 'Original', icon: 'fa-image' },
                { id: 'document', label: 'Magic', icon: 'fa-wand-magic-sparkles' },
                { id: 'bw', label: 'B&W', icon: 'fa-circle-half-stroke' },
                { id: 'grayscale', label: 'Gray', icon: 'fa-ghost' },
              ].map(f => (
                <button 
                  key={f.id}
                  onClick={() => setCurrentFilter(f.id as any)}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl transition-all border ${currentFilter === f.id ? 'bg-teal-600 border-teal-500 text-black shadow-xl scale-105' : 'bg-white/5 border-white/5 text-slate-500'}`}
                >
                  <i className={`fas ${f.icon} text-lg`}></i>
                  <span className="text-[9px] font-black uppercase tracking-tighter">{f.label}</span>
                </button>
              ))}
           </div>
        </div>
      )}

      {/* Gallery / Review Step */}
      {uiStep === 'gallery' && (
        <div className="fixed inset-0 z-[120] bg-slate-950 flex flex-col animate-in fade-in duration-300">
           <div className="p-6 flex justify-between items-center bg-black/50 border-b border-white/5">
              <h2 className="text-white font-black uppercase tracking-[0.3em] text-xs">{capturedPages.length} Pages Scanned</h2>
              <button onClick={() => setUiStep('camera')} className="text-teal-500 text-[10px] font-black tracking-widest uppercase bg-teal-500/10 px-5 py-2 rounded-xl border border-teal-500/20 active:scale-95 transition-all">
                <i className="fas fa-plus mr-1"></i> Scan More
              </button>
           </div>
           
           <div className="flex-1 grid grid-cols-2 gap-6 overflow-y-auto no-scrollbar p-6">
              {capturedPages.map((p, i) => (
                <div key={i} className="relative aspect-[3/4] bg-white/5 rounded-3xl overflow-hidden border border-white/10 shadow-2xl group animate-in slide-in-from-bottom-4 duration-300">
                   <img src={p.processed} className="w-full h-full object-cover" />
                   <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-lg border border-white/10 shadow-lg">PG {i+1}</div>
                   <button 
                     onClick={() => setCapturedPages(prev => prev.filter((_, idx) => idx !== i))}
                     className="absolute top-4 right-4 w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all shadow-xl active:scale-90"
                   >
                     <i className="fas fa-trash"></i>
                   </button>
                </div>
              ))}
           </div>
           
           <div className="p-6 bg-black/80 backdrop-blur-xl border-t border-white/5">
              <button onClick={generatePDF} className="w-full bg-teal-600 text-white py-6 rounded-3xl font-black text-xl shadow-2xl shadow-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-4 group">
                <i className="fas fa-file-pdf group-hover:animate-bounce"></i> GENERATE FINAL PDF
              </button>
           </div>
        </div>
      )}

      {/* Success / Result Screen */}
      {state.status === 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-950 text-center animate-in zoom-in duration-500">
           <div className="w-24 h-24 bg-teal-500 text-white text-4xl rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-teal-500/30 border-4 border-white dark:border-slate-800">
             <i className="fas fa-check-double"></i>
           </div>
           <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter leading-none">PDF Created!</h2>
           <p className="text-slate-500 dark:text-slate-400 mb-12 font-medium text-lg leading-relaxed max-w-xs mx-auto uppercase tracking-widest text-[10px] opacity-60">Professional High-Fidelity Output</p>
           
           <div className="flex flex-col gap-4 w-full max-w-xs">
              <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white py-6 rounded-[2rem] font-black text-xl shadow-xl shadow-orange-500/30 active:scale-95 transition-all flex items-center justify-center gap-4 group">
                <i className="fas fa-download group-hover:animate-bounce"></i> DOWNLOAD PDF
              </a>
              <button onClick={() => { setCapturedPages([]); setState({status:'idle', progress: 0}); setUiStep('idle'); }} className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] py-4 hover:text-teal-600 transition-colors">
                Start New Session
              </button>
           </div>
        </div>
      )}

      {/* Processing State Overlay */}
      {state.status === 'processing' && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-12 text-center text-white">
           <div className="relative w-24 h-24 mb-10">
              <div className="absolute inset-0 border-8 border-white/5 rounded-full"></div>
              <div className="absolute inset-0 border-8 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
           </div>
           <h2 className="text-2xl font-black mb-3 uppercase tracking-tighter">Optimizing...</h2>
           <p className="text-white/40 font-bold uppercase text-[10px] tracking-[0.4em] max-w-xs">{state.message}</p>
        </div>
      )}
    </div>
  );
};

export default Scan;
