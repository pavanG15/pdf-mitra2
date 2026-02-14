
import React, { useState, useRef, useEffect } from 'react';
import { ProcessingState } from '../types';

declare const jspdf: any;

type ScanFilter = 'none' | 'document' | 'bw' | 'grayscale' | 'vibrant';

const Scan: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [filter, setFilter] = useState<ScanFilter>('document');
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
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

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Camera permission is required for document scanning.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
    setShowGallery(false);
  };

  const applyFiltersToCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    if (filter === 'document') {
      // Professional Document Scan Logic
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // 1. Grayscale conversion
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // 2. Aggressive Contrast and Brightness
        // Shift values to make gray paper white and dark text darker
        let enhanced = (gray - 80) * 2.2 + 80;
        
        // 3. Highlight recovery (whitening)
        if (enhanced > 170) enhanced = 255;
        if (enhanced < 60) enhanced = enhanced * 0.5; // Make text pop

        const val = Math.max(0, Math.min(255, enhanced));
        data[i] = data[i + 1] = data[i + 2] = val;
      }
    } else if (filter === 'bw') {
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const val = avg > 110 ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = val;
      }
    } else if (filter === 'grayscale') {
      for (let i = 0; i < data.length; i += 4) {
        const avg = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = avg;
      }
    } else if (filter === 'vibrant') {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, (data[i] - 128) * 1.3 + 128 + 10);
        data[i + 1] = Math.min(255, (data[i + 1] - 128) * 1.3 + 128 + 10);
        data[i + 2] = Math.min(255, (data[i + 2] - 128) * 1.3 + 128 + 10);
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    if (filter !== 'none') {
      applyFiltersToCanvas(ctx, canvas.width, canvas.height);
    }
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImages(prev => [...prev, dataUrl]);
    
    // UI Flash
    const shutterOverlay = document.createElement('div');
    shutterOverlay.className = 'fixed inset-0 bg-white z-[200] opacity-100 transition-opacity duration-150';
    document.body.appendChild(shutterOverlay);
    setTimeout(() => {
      shutterOverlay.style.opacity = '0';
      setTimeout(() => shutterOverlay.remove(), 150);
    }, 50);
  };

  const deletePage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
    if (capturedImages.length <= 1) setShowGallery(false);
  };

  const generatePDF = () => {
    if (capturedImages.length === 0) return;
    setState({ status: 'processing', progress: 50, message: 'Processing final document...' });
    
    try {
      const { jsPDF } = jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;

      capturedImages.forEach((img, idx) => {
        if (idx > 0) doc.addPage();
        doc.addImage(img, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      });

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setState({ 
        status: 'success', 
        progress: 100, 
        resultUrl: url, 
        resultFileName: `scan_${Date.now()}.pdf` 
      });
      stopCamera();
    } catch (error) {
      setState({ status: 'error', progress: 0, message: 'PDF creation failed.' });
    }
  };

  const filterOptions = [
    { id: 'document', label: 'MAGIC', icon: 'fa-magic' },
    { id: 'bw', label: 'B&W', icon: 'fa-adjust' },
    { id: 'none', label: 'ORIGINAL', icon: 'fa-camera' },
    { id: 'grayscale', label: 'GRAY', icon: 'fa-ghost' },
    { id: 'vibrant', label: 'COLOR', icon: 'fa-sun' },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      {!isCameraActive && state.status !== 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-[2.5rem] flex items-center justify-center text-4xl mb-8 shadow-inner border border-teal-500/20">
            <i className="fas fa-camera"></i>
          </div>
          <h1 className="text-4xl font-[900] text-slate-900 dark:text-white mb-4 tracking-tighter uppercase">Document Scanner</h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-10 font-medium leading-relaxed">Turn your paper receipts and notes into high-quality digital PDFs.</p>
          
          <button 
            onClick={startCamera}
            className="bg-teal-600 text-white px-12 py-5 rounded-[2.5rem] font-black text-xl shadow-2xl shadow-teal-500/20 active:scale-95 transition-all flex items-center gap-4"
          >
            <i className="fas fa-play"></i> Open Camera
          </button>
        </div>
      )}

      {isCameraActive && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col font-sans">
          {/* Header */}
          <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-20">
            <button onClick={stopCamera} className="text-white w-10 h-10 flex items-center justify-center bg-white/10 rounded-full backdrop-blur-md">
              <i className="fas fa-arrow-left"></i>
            </button>
            <div className="text-center">
                <span className="text-white font-black uppercase text-[9px] tracking-[0.4em] opacity-60">Scanning Mode</span>
                <div className="text-teal-400 font-black text-[12px] uppercase tracking-widest leading-none mt-1">{capturedImages.length} PAGES</div>
            </div>
            <div className="w-10 flex justify-center">
              <i className="fas fa-bolt text-white/30"></i>
            </div>
          </div>

          {/* Viewfinder */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-all duration-300 ${filter === 'bw' ? 'grayscale contrast-200' : filter === 'grayscale' ? 'grayscale' : filter === 'document' ? 'contrast-125' : ''}`}
            ></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            
            {/* Focus Indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40">
               <div className="w-16 h-16 border border-white/40 rounded-full flex items-center justify-center">
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-white/60"></div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-white/60"></div>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-0.5 bg-white/60"></div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-0.5 bg-white/60"></div>
               </div>
            </div>

            {/* Document Guide Overlay */}
            <div className="absolute inset-x-8 inset-y-24 border-[2px] border-dashed border-white/20 rounded-[2rem] pointer-events-none">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-[4px] border-l-[4px] border-teal-500 rounded-tl-xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-[4px] border-r-[4px] border-teal-500 rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[4px] border-l-[4px] border-teal-500 rounded-bl-xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[4px] border-r-[4px] border-teal-500 rounded-br-xl"></div>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="p-6 bg-black z-20">
            {/* Professional Filters Strip */}
            <div className="flex justify-start gap-3 overflow-x-auto no-scrollbar py-4 mb-6 px-2">
              {filterOptions.map(f => (
                <button 
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap shadow-xl border-2 ${filter === f.id ? 'bg-teal-600 text-white border-teal-500' : 'bg-white/5 text-white/40 border-transparent'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between max-w-sm mx-auto">
              {/* Previous Scans / Gallery Trigger */}
              <button 
                onClick={() => capturedImages.length > 0 && setShowGallery(true)}
                className="w-14 h-14 rounded-2xl border-2 border-white/10 overflow-hidden bg-white/5 active:scale-90 transition-transform flex items-center justify-center relative"
              >
                {capturedImages.length > 0 ? (
                  <img src={capturedImages[capturedImages.length - 1]} className="w-full h-full object-cover" />
                ) : (
                  <i className="fas fa-image text-white/20"></i>
                )}
                {capturedImages.length > 0 && (
                   <div className="absolute -top-1 -right-1 bg-teal-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-black">
                     {capturedImages.length}
                   </div>
                )}
              </button>

              {/* Pro Shutter Button */}
              <button 
                onClick={capturePhoto}
                className="relative w-24 h-24 flex items-center justify-center active:scale-90 transition-transform"
              >
                <div className="absolute inset-0 rounded-full border-[3px] border-white/20"></div>
                <div className="w-20 h-20 rounded-full border-[4px] border-black bg-white flex items-center justify-center">
                   <div className="w-16 h-16 bg-teal-500 rounded-full shadow-inner"></div>
                </div>
              </button>

              {/* Finish Checkmark */}
              <button 
                onClick={generatePDF}
                disabled={capturedImages.length === 0}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all shadow-xl ${capturedImages.length > 0 ? 'bg-teal-600 text-white animate-pulse' : 'bg-white/5 text-white/10 cursor-not-allowed'}`}
              >
                <i className="fas fa-check"></i>
              </button>
            </div>
          </div>

          {/* Gallery Overlay */}
          {showGallery && (
            <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-2xl flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
               <div className="flex justify-between items-center mb-8">
                  <div className="text-white font-black uppercase tracking-[0.3em] text-[10px]">Document Session</div>
                  <button onClick={() => setShowGallery(false)} className="bg-white/10 text-white text-[10px] font-black px-5 py-2.5 rounded-xl uppercase tracking-widest">Close</button>
               </div>
               
               <div className="flex-1 grid grid-cols-2 gap-5 overflow-y-auto no-scrollbar pb-10">
                  {capturedImages.map((img, i) => (
                    <div key={i} className="relative aspect-[3/4] bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl group">
                       <img src={img} className="w-full h-full object-cover" />
                       <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-lg border border-white/10">PAGE {i+1}</div>
                       <button 
                         onClick={() => deletePage(i)}
                         className="absolute top-3 right-3 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                         <i className="fas fa-trash"></i>
                       </button>
                    </div>
                  ))}
               </div>
               
               <button 
                 onClick={generatePDF} 
                 className="w-full bg-teal-600 text-white py-6 rounded-3xl font-black text-xl shadow-2xl active:scale-95 transition-all mb-4"
               >
                 MERGE & CREATE PDF
               </button>
            </div>
          )}
        </div>
      )}

      {state.status === 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-950 text-center animate-in zoom-in duration-500">
           <div className="w-24 h-24 bg-teal-500 text-white text-4xl rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl shadow-teal-500/30 border-4 border-white dark:border-slate-800">
             <i className="fas fa-file-invoice"></i>
           </div>
           <h2 className="text-4xl font-[900] text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">PDF Generated!</h2>
           <p className="text-slate-500 dark:text-slate-400 mb-12 font-medium leading-relaxed max-w-xs mx-auto text-lg">Your high-fidelity scan is ready to be shared or saved securely.</p>
           
           <div className="flex flex-col gap-4 w-full max-w-xs">
              <a 
                href={state.resultUrl} 
                download={state.resultFileName} 
                className="bg-orange-500 text-white py-6 rounded-3xl font-black text-xl shadow-xl shadow-orange-500/30 active:scale-95 transition-all flex items-center justify-center gap-4 group"
              >
                <i className="fas fa-cloud-download-alt text-2xl group-hover:animate-bounce"></i> DOWNLOAD PDF
              </a>
              <button 
                onClick={() => { setCapturedImages([]); setState({status:'idle', progress: 0}); setIsCameraActive(false); }} 
                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-6 rounded-3xl font-black text-xs uppercase tracking-[0.25em] active:scale-95 transition-all"
              >
                New Session
              </button>
           </div>
        </div>
      )}

      {state.status === 'processing' && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-12 text-center text-white">
           <div className="w-24 h-24 border-[6px] border-white/10 border-t-teal-500 rounded-full animate-spin mb-10"></div>
           <h2 className="text-3xl font-black mb-3 uppercase tracking-tighter">Optimizing...</h2>
           <p className="text-white/40 font-bold uppercase text-[10px] tracking-[0.4em]">{state.message}</p>
        </div>
      )}
    </div>
  );
};

export default Scan;
