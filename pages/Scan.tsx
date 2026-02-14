
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
        }
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
    
    // Maintain video aspect ratio
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    
    const rawData = canvas.toDataURL('image/jpeg', 0.85);
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
      
      if (currentFilter === 'document') {
        // High-performance Document/Magic Filter
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          // Grayscale with focus on green channel for better text contrast
          let gray = 0.21 * r + 0.72 * g + 0.07 * b;
          
          // Contrast stretch: make whites whiter, blacks blacker
          // This removes yellow tint and soft shadows
          let enhanced = (gray - 100) * 1.8 + 100;
          
          // Hard clipping for background whitening
          if (enhanced > 190) enhanced = 255;
          // Soft deepening for text
          if (enhanced < 80) enhanced *= 0.7;
          
          const val = Math.max(0, Math.min(255, enhanced));
          data[i] = data[i+1] = data[i+2] = val;
        }
      } else if (currentFilter === 'bw') {
        // Sharp Binary Filter
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const val = avg > 128 ? 255 : 0;
          data[i] = data[i+1] = data[i+2] = val;
        }
      } else if (currentFilter === 'grayscale') {
        for (let i = 0; i < data.length; i += 4) {
          const g = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
          data[i] = data[i+1] = data[i+2] = g;
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      const processedData = canvas.toDataURL('image/jpeg', 0.8);
      
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
      setState({ status: 'error', progress: 0, message: 'PDF Generation failed.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col transition-all overflow-hidden">
      
      {uiStep === 'idle' && state.status !== 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
           <div className="w-20 h-20 bg-teal-500/10 text-teal-500 rounded-3xl flex items-center justify-center text-3xl mb-6 border border-teal-500/20">
             <i className="fas fa-camera"></i>
           </div>
           <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Mobile Scan</h1>
           <p className="text-slate-400 mb-8 font-medium text-sm">Scan documents privately. 100% on-device.</p>
           <button onClick={startCamera} className="bg-teal-500 text-slate-950 px-10 py-4 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all uppercase tracking-tighter">
             New Scan
           </button>
        </div>
      )}

      {uiStep === 'camera' && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden">
          {/* Top Bar - Compact */}
          <div className="px-4 py-3 flex justify-between items-center bg-black/40 backdrop-blur-sm z-20">
            <button onClick={stopCamera} className="text-white w-8 h-8 flex items-center justify-center rounded-full bg-white/10">
              <i className="fas fa-times text-sm"></i>
            </button>
            <div className="text-center">
               <span className="text-teal-400 font-bold text-[10px] tracking-widest uppercase block">Ready</span>
               <span className="text-white font-black text-[12px] uppercase">{capturedPages.length} PAGES</span>
            </div>
            <div className="w-8"></div>
          </div>

          {/* Viewfinder - Centralized */}
          <div className="flex-1 relative flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
            <div className="absolute inset-x-8 inset-y-16 border-2 border-dashed border-teal-500/40 rounded-2xl pointer-events-none">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-teal-500 rounded-tl-xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-teal-500 rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-teal-500 rounded-bl-xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-teal-500 rounded-br-xl"></div>
            </div>
            <canvas ref={canvasRef} className="hidden"></canvas>
          </div>

          {/* Bottom Bar - Redesigned for Mobile */}
          <div className="pb-8 pt-4 bg-black/90 px-4">
            {/* Mode Switcher - Horizontal Scroll */}
            <div className="flex gap-4 overflow-x-auto no-scrollbar justify-start sm:justify-center mb-6 px-4">
               {['DOCUMENT', 'ID CARD', 'BOOK', 'PHOTO'].map(m => (
                 <button 
                  key={m} 
                  className={`text-[10px] font-black tracking-widest uppercase whitespace-nowrap px-4 py-2 rounded-full border transition-all ${m.toLowerCase().replace(' ','') === currentMode ? 'bg-teal-500 text-black border-teal-500' : 'text-slate-500 border-white/5'}`}
                  onClick={() => setCurrentMode(m.toLowerCase().replace(' ','') as any)}
                 >
                   {m}
                 </button>
               ))}
            </div>

            <div className="flex items-center justify-between max-w-sm mx-auto gap-4">
               {/* Gallery Button */}
               <button 
                 onClick={() => capturedPages.length > 0 && setUiStep('gallery')}
                 className="w-12 h-12 rounded-xl border border-white/10 overflow-hidden bg-white/5 flex items-center justify-center relative active:scale-90 transition-transform"
               >
                 {capturedPages.length > 0 ? (
                   <img src={capturedPages[capturedPages.length-1].processed} className="w-full h-full object-cover" />
                 ) : (
                   <i className="fas fa-layer-group text-slate-500"></i>
                 )}
               </button>

               {/* Shutter Button - Always visible & central */}
               <button onClick={capturePhoto} className="w-20 h-20 rounded-full border-2 border-white p-1.5 active:scale-90 transition-transform">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 rounded-sm bg-black opacity-10"></div>
                  </div>
               </button>

               {/* Finish/Done Button */}
               <button 
                 onClick={generatePDF}
                 disabled={capturedPages.length === 0}
                 className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${capturedPages.length > 0 ? 'bg-teal-500 text-black' : 'bg-white/5 text-slate-700 pointer-events-none'}`}
               >
                 <i className="fas fa-check"></i>
               </button>
            </div>
          </div>
        </div>
      )}

      {uiStep === 'edit' && currentCapture && (
        <div className="fixed inset-0 z-[110] bg-slate-950 flex flex-col animate-in slide-in-from-bottom duration-300">
           <div className="p-4 flex justify-between items-center border-b border-white/5">
              <button onClick={() => setUiStep('camera')} className="text-slate-400 font-bold text-xs uppercase"><i className="fas fa-arrow-left mr-2"></i> Back</button>
              <h2 className="text-white font-black text-xs uppercase tracking-widest">Enhance Page</h2>
              <button onClick={confirmPage} className="text-teal-500 font-black text-xs uppercase tracking-widest">Keep</button>
           </div>

           <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
              <img 
                src={currentCapture} 
                className={`max-w-full max-h-full object-contain transition-all duration-200 ${currentFilter === 'document' ? 'contrast-125' : currentFilter === 'bw' ? 'grayscale contrast-[2]' : currentFilter === 'grayscale' ? 'grayscale' : ''}`} 
              />
           </div>

           <div className="p-4 grid grid-cols-4 gap-2 bg-black">
              {[
                { id: 'none', label: 'Raw', icon: 'fa-camera' },
                { id: 'document', label: 'Magic', icon: 'fa-magic' },
                { id: 'bw', label: 'B&W', icon: 'fa-adjust' },
                { id: 'grayscale', label: 'Gray', icon: 'fa-ghost' },
              ].map(f => (
                <button 
                  key={f.id}
                  onClick={() => setCurrentFilter(f.id as any)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${currentFilter === f.id ? 'bg-teal-500 text-black' : 'bg-white/5 text-slate-500'}`}
                >
                  <i className={`fas ${f.icon} text-sm`}></i>
                  <span className="text-[9px] font-black uppercase">{f.label}</span>
                </button>
              ))}
           </div>
        </div>
      )}

      {uiStep === 'gallery' && (
        <div className="fixed inset-0 z-[120] bg-slate-950 p-6 flex flex-col animate-in fade-in duration-300">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-white font-black uppercase tracking-widest text-xs">{capturedPages.length} Pages</h2>
              <button onClick={() => setUiStep('camera')} className="text-teal-500 text-[10px] font-black tracking-widest uppercase">Add More</button>
           </div>
           
           <div className="flex-1 grid grid-cols-2 gap-4 overflow-y-auto no-scrollbar pb-6">
              {capturedPages.map((p, i) => (
                <div key={i} className="relative aspect-[3/4] bg-white/5 rounded-2xl overflow-hidden border border-white/10 group shadow-lg">
                   <img src={p.processed} className="w-full h-full object-cover" />
                   <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-md">#{i+1}</div>
                   <button 
                     onClick={() => setCapturedPages(prev => prev.filter((_, idx) => idx !== i))}
                     className="absolute top-2 right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px]"
                   >
                     <i className="fas fa-trash"></i>
                   </button>
                </div>
              ))}
           </div>
           
           <button onClick={generatePDF} className="w-full bg-teal-500 text-black py-5 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all uppercase tracking-tighter">
             Save PDF
           </button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500">
           <div className="w-16 h-16 bg-teal-500 text-black text-2xl rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-teal-500/20">
             <i className="fas fa-check"></i>
           </div>
           <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Success</h2>
           <p className="text-slate-400 mb-10 text-sm">Your PDF is ready for sharing.</p>
           
           <div className="flex flex-col gap-4 w-full max-w-xs">
              <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white py-4 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-2">
                <i className="fas fa-download"></i> DOWNLOAD
              </a>
              <button onClick={() => { setCapturedPages([]); setState({status:'idle', progress: 0}); setUiStep('idle'); }} className="text-slate-500 font-bold text-xs uppercase tracking-widest py-4">
                Done
              </button>
           </div>
        </div>
      )}

      {state.status === 'processing' && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center text-white">
           <div className="w-12 h-12 border-2 border-white/10 border-t-teal-500 rounded-full animate-spin mb-4"></div>
           <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{state.message}</p>
        </div>
      )}
    </div>
  );
};

export default Scan;
