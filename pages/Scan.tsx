
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPages, setCapturedPages] = useState<CapturedPage[]>([]);
  
  const [uiStep, setUiStep] = useState<'camera' | 'edit' | 'gallery' | 'idle'>('idle');
  const [currentCapture, setCurrentCapture] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<ScanFilter>('document');
  const [currentMode, setCurrentMode] = useState<ScanMode>('document');
  
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });

  const startCamera = async () => {
    try {
      setUiStep('camera');
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      alert("Camera access denied. Please check your permissions.");
      setUiStep('idle');
    }
  };

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
    
    // Use natural video dimensions for quality
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    
    const rawData = canvas.toDataURL('image/jpeg', 0.9);
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
      
      // Optimized Lightweight Document Filter
      if (currentFilter === 'document') {
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          // Grayscale (removing yellow tint)
          let gray = 0.299 * r + 0.587 * g + 0.114 * b;
          
          // Contrast Stretch + Highlight Clipping
          // Removes shadows and whitens background
          let val = (gray - 100) * 1.6 + 128;
          if (val > 210) val = 255;
          if (val < 80) val *= 0.6; // Deepen text

          val = Math.max(0, Math.min(255, val));
          data[i] = data[i+1] = data[i+2] = val;
        }
      } else if (currentFilter === 'bw') {
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const val = avg > 120 ? 255 : 0;
          data[i] = data[i+1] = data[i+2] = val;
        }
      } else if (currentFilter === 'grayscale') {
        for (let i = 0; i < data.length; i += 4) {
          const g = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
          data[i] = data[i+1] = data[i+2] = g;
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      const processedData = canvas.toDataURL('image/jpeg', 0.85);
      
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
    setState({ status: 'processing', progress: 50, message: 'Creating PDF...' });
    
    try {
      const { jsPDF } = jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      capturedPages.forEach((page, idx) => {
        if (idx > 0) doc.addPage();
        doc.addImage(page.processed, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      });
      const blob = doc.output('blob');
      setState({ 
        status: 'success', 
        resultUrl: URL.createObjectURL(blob), 
        resultFileName: `scan_${Date.now()}.pdf`,
        progress: 100 
      });
      stopCamera();
    } catch (e) {
      setState({ status: 'error', progress: 0, message: 'Export failed.' });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden font-sans">
      
      {uiStep === 'idle' && state.status !== 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950 animate-in fade-in duration-500">
           <div className="w-24 h-24 bg-teal-500 text-white rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-xl shadow-teal-500/20">
             <i className="fas fa-camera"></i>
           </div>
           <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">PDF Scanner</h1>
           <p className="text-slate-500 dark:text-slate-400 mb-10 text-sm max-w-xs font-medium uppercase tracking-widest">Local • Fast • Secure</p>
           <button onClick={startCamera} className="bg-teal-600 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-2xl active:scale-95 transition-all">
             Start Scanning
           </button>
        </div>
      )}

      {uiStep === 'camera' && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-4 py-4 flex justify-between items-center bg-black/50 backdrop-blur-md z-20">
            <button onClick={stopCamera} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 active:scale-90 transition-transform">
              <i className="fas fa-times"></i>
            </button>
            <div className="flex flex-col items-center">
               <span className="text-teal-400 font-bold text-[9px] tracking-[0.3em] uppercase">Ready to Scan</span>
               <span className="text-white font-black text-sm uppercase">{capturedPages.length} PAGES</span>
            </div>
            <div className="w-10"></div>
          </div>

          {/* Viewfinder Area */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
            
            {/* Guide Grid */}
            <div className="absolute inset-x-8 inset-y-12 border-2 border-dashed border-teal-500/30 rounded-2xl pointer-events-none">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-teal-500 rounded-tl-xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-teal-500 rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-teal-500 rounded-bl-xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-teal-500 rounded-br-xl"></div>
            </div>
            <canvas ref={canvasRef} className="hidden"></canvas>
          </div>

          {/* Bottom Bar Controls */}
          <div className="bg-black/95 pt-2 pb-8 px-4 flex flex-col gap-4">
            {/* Mode Switcher - Horizontal Scroll */}
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 px-2 mask-fade-edges">
               {['DOCUMENT', 'ID CARD', 'BOOK', 'PHOTO'].map(m => (
                 <button 
                  key={m} 
                  className={`text-[10px] font-black tracking-widest uppercase whitespace-nowrap px-6 py-2.5 rounded-full border transition-all ${m.toLowerCase().replace(' ','') === currentMode ? 'bg-teal-500 text-black border-teal-500' : 'text-slate-500 border-white/5 bg-white/5'}`}
                  onClick={() => setCurrentMode(m.toLowerCase().replace(' ','') as any)}
                 >
                   {m}
                 </button>
               ))}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between max-w-sm mx-auto w-full px-4 mt-2">
               {/* Gallery Thumbnail */}
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

               {/* Large Shutter Button */}
               <button onClick={capturePhoto} className="w-24 h-24 rounded-full border-4 border-white/30 p-1 active:scale-95 transition-all shadow-[0_0_40px_rgba(20,184,166,0.2)]">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full bg-teal-500/10 flex items-center justify-center">
                       <i className="fas fa-camera text-slate-900 text-xl"></i>
                    </div>
                  </div>
               </button>

               {/* Finish Checkmark */}
               <button 
                 onClick={generatePDF}
                 disabled={capturedPages.length === 0}
                 className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all ${capturedPages.length > 0 ? 'bg-teal-500 text-black shadow-lg shadow-teal-500/20' : 'bg-white/5 text-slate-800 pointer-events-none'}`}
               >
                 <i className="fas fa-check"></i>
               </button>
            </div>
          </div>
        </div>
      )}

      {uiStep === 'edit' && currentCapture && (
        <div className="fixed inset-0 z-[110] bg-slate-950 flex flex-col p-4 animate-in slide-in-from-bottom duration-300">
           <div className="flex justify-between items-center mb-4">
              <button onClick={() => setUiStep('camera')} className="text-slate-400 font-black text-[10px] uppercase tracking-widest"><i className="fas fa-arrow-left mr-2"></i> Retake</button>
              <h2 className="text-white font-black text-xs uppercase tracking-[0.4em]">Enhance</h2>
              <button onClick={confirmPage} className="text-teal-400 font-black text-[10px] uppercase tracking-widest">Accept</button>
           </div>

           <div className="flex-1 rounded-3xl overflow-hidden bg-black flex items-center justify-center relative shadow-2xl">
              <img 
                src={currentCapture} 
                className={`max-w-full max-h-full object-contain transition-all duration-300 ${currentFilter === 'document' ? 'contrast-[1.2] grayscale' : currentFilter === 'bw' ? 'grayscale contrast-[2]' : currentFilter === 'grayscale' ? 'grayscale' : ''}`} 
              />
           </div>

           <div className="grid grid-cols-4 gap-2 pt-6 pb-2">
              {[
                { id: 'none', label: 'Original', icon: 'fa-camera' },
                { id: 'document', label: 'Magic', icon: 'fa-magic' },
                { id: 'bw', label: 'B&W', icon: 'fa-adjust' },
                { id: 'grayscale', label: 'Gray', icon: 'fa-ghost' },
              ].map(f => (
                <button 
                  key={f.id}
                  onClick={() => setCurrentFilter(f.id as any)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${currentFilter === f.id ? 'bg-teal-500 text-black shadow-xl' : 'bg-white/5 text-slate-500'}`}
                >
                  <i className={`fas ${f.icon} text-sm`}></i>
                  <span className="text-[8px] font-black uppercase tracking-tighter">{f.label}</span>
                </button>
              ))}
           </div>
        </div>
      )}

      {uiStep === 'gallery' && (
        <div className="fixed inset-0 z-[120] bg-slate-950 p-6 flex flex-col animate-in fade-in duration-300">
           <div className="flex justify-between items-center mb-8">
              <h2 className="text-white font-black uppercase tracking-[0.3em] text-xs">{capturedPages.length} Pages Captured</h2>
              <button onClick={() => setUiStep('camera')} className="text-teal-500 text-[10px] font-black tracking-widest uppercase bg-teal-500/10 px-4 py-2 rounded-xl">Add More</button>
           </div>
           
           <div className="flex-1 grid grid-cols-2 gap-4 overflow-y-auto no-scrollbar pb-10">
              {capturedPages.map((p, i) => (
                <div key={i} className="relative aspect-[3/4] bg-white/5 rounded-3xl overflow-hidden border border-white/10 shadow-2xl group">
                   <img src={p.processed} className="w-full h-full object-cover" />
                   <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-lg border border-white/10">PG {i+1}</div>
                   <button 
                     onClick={() => setCapturedPages(prev => prev.filter((_, idx) => idx !== i))}
                     className="absolute top-3 right-3 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                   >
                     <i className="fas fa-trash"></i>
                   </button>
                </div>
              ))}
           </div>
           
           <button onClick={generatePDF} className="w-full bg-teal-500 text-black py-6 rounded-[2rem] font-black text-xl shadow-2xl shadow-teal-500/20 active:scale-95 transition-all">
             Export Final PDF
           </button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-950 text-center animate-in zoom-in duration-500">
           <div className="w-20 h-20 bg-teal-500 text-white text-3xl rounded-[2rem] flex items-center justify-center mb-8 shadow-xl shadow-teal-500/30">
             <i className="fas fa-check-double"></i>
           </div>
           <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">Done!</h2>
           <p className="text-slate-500 dark:text-slate-400 mb-12 font-medium text-lg leading-relaxed max-w-xs mx-auto uppercase tracking-widest text-xs opacity-60">High-fidelity document exported</p>
           
           <div className="flex flex-col gap-4 w-full max-w-xs">
              <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white py-6 rounded-[2rem] font-black text-xl shadow-xl shadow-orange-500/30 active:scale-95 transition-all flex items-center justify-center gap-4">
                <i className="fas fa-file-download"></i> Download PDF
              </a>
              <button onClick={() => { setCapturedPages([]); setState({status:'idle', progress: 0}); setUiStep('idle'); }} className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] py-4">
                Start New Session
              </button>
           </div>
        </div>
      )}

      {state.status === 'processing' && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-12 text-center text-white">
           <div className="w-16 h-16 border-[5px] border-white/10 border-t-teal-500 rounded-full animate-spin mb-8"></div>
           <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">Processing...</h2>
           <p className="text-white/40 font-bold uppercase text-[9px] tracking-[0.4em]">{state.message}</p>
        </div>
      )}
    </div>
  );
};

export default Scan;
