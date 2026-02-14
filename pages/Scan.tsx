
import React, { useState, useRef, useEffect } from 'react';
import { ProcessingState } from '../types';

declare const jspdf: any;

type ScanFilter = 'none' | 'document' | 'bw' | 'grayscale' | 'vibrant';
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
  
  // UI Steps: 'camera' | 'edit' | 'gallery' | 'idle'
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
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      alert("Camera access denied. Please allow permissions.");
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

  const processImage = (dataUrl: string, filterType: ScanFilter): string => {
    if (filterType === 'none') return dataUrl;
    
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    const img = new Image();
    
    // This is synchronous-like because we use a promise wrapper if needed, 
    // but for simple filtering we can do it on the fly.
    return dataUrl; // Placeholder - actual processing happens in Edit view via canvas
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    
    const rawData = canvas.toDataURL('image/jpeg', 0.9);
    setCurrentCapture(rawData);
    setUiStep('edit');
  };

  const applyFilterToPreview = (filterType: ScanFilter) => {
    setCurrentFilter(filterType);
  };

  const confirmPage = () => {
    if (!currentCapture) return;
    
    // We actually save the processed version to the gallery
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Apply filter logic here one last time for the final save
    const img = new Image();
    img.src = currentCapture;
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Use the same logic as our dynamic preview filter
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        if (currentFilter === 'document') {
            for (let i = 0; i < data.length; i += 4) {
                let g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                let enhanced = (g - 90) * 2.2 + 90;
                if (enhanced > 180) enhanced = 255;
                if (enhanced < 60) enhanced *= 0.6;
                data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, enhanced));
            }
        } else if (currentFilter === 'bw') {
            for (let i = 0; i < data.length; i += 4) {
                let g = (data[i] + data[i + 1] + data[i + 2]) / 3;
                let v = g > 120 ? 255 : 0;
                data[i] = data[i + 1] = data[i + 2] = v;
            }
        } else if (currentFilter === 'grayscale') {
            for (let i = 0; i < data.length; i += 4) {
                let g = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
                data[i] = data[i + 1] = data[i + 2] = g;
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
    setState({ status: 'processing', progress: 50, message: 'Finalizing PDF...' });
    
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
      setState({ status: 'error', progress: 0, message: 'PDF Error' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
      
      {uiStep === 'idle' && state.status !== 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
           <div className="w-24 h-24 bg-teal-500/10 text-teal-600 rounded-[2.5rem] flex items-center justify-center text-4xl mb-8 shadow-inner border border-teal-500/20">
             <i className="fas fa-camera"></i>
           </div>
           <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">Pro Scanner</h1>
           <p className="text-slate-500 dark:text-slate-400 mb-10 font-medium max-w-xs">Professional document enhancement with instant PDF export.</p>
           <button onClick={startCamera} className="bg-teal-600 text-white px-12 py-5 rounded-3xl font-black text-xl shadow-2xl active:scale-95 transition-all">
             Start Scanning
           </button>
        </div>
      )}

      {uiStep === 'camera' && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="p-5 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-10">
            <button onClick={stopCamera} className="text-white w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md">
              <i className="fas fa-times"></i>
            </button>
            <div className="flex flex-col items-center">
               <span className="text-teal-400 font-black text-[10px] tracking-[0.4em] uppercase">Auto</span>
               <span className="text-white font-black text-[12px] uppercase mt-0.5">{capturedPages.length} PAGES</span>
            </div>
            <button className="text-white/40 w-10 h-10 flex items-center justify-center"><i className="fas fa-bolt"></i></button>
          </div>

          {/* Viewfinder */}
          <div className="flex-1 relative flex items-center justify-center bg-slate-900">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
            
            {/* Guide Grid */}
            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
               <div className="w-full h-full border-2 border-dashed border-teal-500/30 rounded-[2.5rem] relative">
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-teal-500 rounded-tl-3xl"></div>
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-teal-500 rounded-tr-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-teal-500 rounded-bl-3xl"></div>
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-teal-500 rounded-br-3xl"></div>
               </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="p-8 bg-black">
            {/* Mode Switcher */}
            <div className="flex justify-center gap-8 mb-8">
               {['ID CARD', 'DOCUMENT', 'BOOK', 'PHOTO'].map(m => (
                 <button 
                  key={m} 
                  className={`text-[10px] font-black tracking-widest uppercase transition-colors ${m.toLowerCase().replace(' ','') === currentMode ? 'text-teal-500' : 'text-white/40'}`}
                  onClick={() => setCurrentMode(m.toLowerCase().replace(' ','') as any)}
                 >
                   {m}
                 </button>
               ))}
            </div>

            <div className="flex items-center justify-between max-w-sm mx-auto">
               <button 
                 onClick={() => capturedPages.length > 0 && setUiStep('gallery')}
                 className="w-14 h-14 rounded-2xl border-2 border-white/10 overflow-hidden bg-white/5 flex items-center justify-center relative shadow-inner"
               >
                 {capturedPages.length > 0 ? (
                   <img src={capturedPages[capturedPages.length-1].processed} className="w-full h-full object-cover" />
                 ) : (
                   <i className="fas fa-layer-group text-white/20"></i>
                 )}
               </button>

               <button onClick={capturePhoto} className="w-24 h-24 rounded-full bg-white flex items-center justify-center group active:scale-90 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                  <div className="w-20 h-20 rounded-full border-[5px] border-slate-950 flex items-center justify-center">
                    <div className="w-14 h-14 bg-teal-500 rounded-full shadow-inner"></div>
                  </div>
               </button>

               <button 
                 onClick={generatePDF}
                 disabled={capturedPages.length === 0}
                 className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all ${capturedPages.length > 0 ? 'bg-teal-600 text-white shadow-xl shadow-teal-500/20' : 'bg-white/5 text-white/10'}`}
               >
                 <i className="fas fa-check"></i>
               </button>
            </div>
          </div>
        </div>
      )}

      {uiStep === 'edit' && currentCapture && (
        <div className="fixed inset-0 z-[110] bg-slate-950 flex flex-col p-6 animate-in slide-in-from-right duration-300">
           <div className="flex justify-between items-center mb-6">
              <button onClick={() => setUiStep('camera')} className="text-white font-black text-xs uppercase tracking-widest"><i className="fas fa-arrow-left mr-2"></i> Retake</button>
              <h2 className="text-teal-500 font-black text-sm uppercase tracking-[0.3em]">Edit Page</h2>
              <button onClick={confirmPage} className="bg-teal-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg">Done</button>
           </div>

           <div className="flex-1 rounded-3xl overflow-hidden bg-black shadow-2xl relative">
              <img 
                src={currentCapture} 
                className={`w-full h-full object-contain transition-all duration-300 ${currentFilter === 'document' ? 'contrast-[1.1] brightness-[1.05]' : currentFilter === 'bw' ? 'grayscale contrast-[2] brightness-[1.2]' : currentFilter === 'grayscale' ? 'grayscale' : ''}`} 
              />
              {/* Filter Overlay Visualizer */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-[9px] font-black text-white/60 uppercase tracking-widest">
                Preview: {currentFilter}
              </div>
           </div>

           <div className="py-8 grid grid-cols-4 gap-3">
              {[
                { id: 'none', label: 'Original', icon: 'fa-camera' },
                { id: 'document', label: 'Magic', icon: 'fa-magic' },
                { id: 'bw', label: 'B&W', icon: 'fa-adjust' },
                { id: 'grayscale', label: 'Gray', icon: 'fa-ghost' },
              ].map(f => (
                <button 
                  key={f.id}
                  onClick={() => applyFilterToPreview(f.id as any)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${currentFilter === f.id ? 'bg-teal-600 text-white shadow-xl shadow-teal-500/20' : 'bg-white/5 text-white/40'}`}
                >
                  <i className={`fas ${f.icon}`}></i>
                  <span className="text-[8px] font-black uppercase tracking-tighter">{f.label}</span>
                </button>
              ))}
           </div>
        </div>
      )}

      {uiStep === 'gallery' && (
        <div className="fixed inset-0 z-[120] bg-slate-950 p-6 flex flex-col animate-in fade-in duration-300">
           <div className="flex justify-between items-center mb-8">
              <h2 className="text-white font-black uppercase tracking-[0.3em] text-sm">{capturedPages.length} Pages</h2>
              <button onClick={() => setUiStep('camera')} className="text-white/50 text-[10px] font-black tracking-widest uppercase">Back to Camera</button>
           </div>
           
           <div className="flex-1 grid grid-cols-2 gap-4 overflow-y-auto no-scrollbar pb-10">
              {capturedPages.map((p, i) => (
                <div key={i} className="relative aspect-[3/4] bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl group">
                   <img src={p.processed} className="w-full h-full object-cover" />
                   <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-lg border border-white/10">PG {i+1}</div>
                   <button 
                     onClick={() => setCapturedPages(prev => prev.filter((_, idx) => idx !== i))}
                     className="absolute top-3 right-3 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                   >
                     <i className="fas fa-trash"></i>
                   </button>
                </div>
              ))}
           </div>
           
           <button onClick={generatePDF} className="w-full bg-teal-600 text-white py-6 rounded-3xl font-black text-xl shadow-2xl shadow-teal-500/20 active:scale-95 transition-all">
             Export as PDF
           </button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-950 text-center animate-in zoom-in duration-500">
           <div className="w-24 h-24 bg-teal-500 text-white text-4xl rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl shadow-teal-500/30 border-4 border-white dark:border-slate-800">
             <i className="fas fa-check-double"></i>
           </div>
           <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter leading-none">PDF Created!</h2>
           <p className="text-slate-500 dark:text-slate-400 mb-12 font-medium text-lg leading-relaxed max-w-xs mx-auto">Your high-fidelity document is ready for secure download.</p>
           
           <div className="flex flex-col gap-4 w-full max-w-xs">
              <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white py-6 rounded-3xl font-black text-xl shadow-xl shadow-orange-500/30 active:scale-95 transition-all flex items-center justify-center gap-4">
                <i className="fas fa-download"></i> DOWNLOAD
              </a>
              <button onClick={() => { setCapturedPages([]); setState({status:'idle', progress: 0}); setUiStep('idle'); }} className="bg-slate-100 dark:bg-slate-800 text-slate-500 py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em]">
                New Session
              </button>
           </div>
        </div>
      )}

      {state.status === 'processing' && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-12 text-center text-white">
           <div className="w-20 h-20 border-[6px] border-white/10 border-t-teal-500 rounded-full animate-spin mb-10"></div>
           <h2 className="text-2xl font-black mb-3 uppercase tracking-tighter">Optimizing...</h2>
           <p className="text-white/40 font-bold uppercase text-[9px] tracking-[0.4em]">{state.message}</p>
        </div>
      )}
    </div>
  );
};

export default Scan;
