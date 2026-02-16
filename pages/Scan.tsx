
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ProcessingState } from '../types';

// Access external libraries from the window object
declare const jspdf: any;
declare const jscanify: any;

type ScanFilter = 'none' | 'document' | 'magic_color' | 'bw' | 'grayscale';
type ScanMode = 'document' | 'idcard' | 'book' | 'photo';

interface Point {
  x: number;
  y: number;
}

interface CapturedPage {
  original: string;
  processed: string;
  filter: ScanFilter;
  id: string;
}

const Scan: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const scannerRef = useRef<any>(null); // for jscanify instance
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPages, setCapturedPages] = useState<CapturedPage[]>([]);
  
  // UI Steps: 'camera' | 'crop' | 'edit' | 'gallery' | 'idle'
  const [uiStep, setUiStep] = useState<'camera' | 'crop' | 'edit' | 'gallery' | 'idle'>('idle');
  
  const [currentCapture, setCurrentCapture] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<ScanFilter>('bw');
  const [currentMode, setCurrentMode] = useState<ScanMode>('document');
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(true);
  
  const [fileName, setFileName] = useState(`Scan_${new Date().toLocaleDateString().replace(/\//g, '-')}`);
  const [isRenaming, setIsRenaming] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'PDF' | 'JPG'>('PDF');
  const [compressionQuality, setCompressionQuality] = useState(80);
  const [pageSize, setPageSize] = useState<'A4' | 'Auto'>('A4');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Cropping State
  const [cropPoints, setCropPoints] = useState<Point[]>([
    { x: 10, y: 10 }, { x: 90, y: 10 },
    { x: 90, y: 90 }, { x: 10, y: 90 }
  ]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });

  // Initialize jscanify
  useEffect(() => {
    if (typeof jscanify !== 'undefined') {
      scannerRef.current = new jscanify();
    }
  }, []);

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
      console.error("Camera error:", err);
      alert("Unable to access camera. Please ensure permissions are granted.");
      setUiStep('idle');
      setState({ status: 'idle', progress: 0 });
    }
  };

  const toggleFlash = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    const capabilities = (track as any).getCapabilities?.() || {};
    
    if (capabilities.torch) {
      try {
        const nextFlash = !isFlashOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextFlash }]
        });
        setIsFlashOn(nextFlash);
      } catch (err) {
        console.error("Flash error:", err);
      }
    } else {
      alert("Flashlight is not available on this camera.");
    }
  };

  useEffect(() => {
    if (uiStep === 'camera' && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => console.error("Video play failed:", error));
      }
    }
  }, [uiStep, stream]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setUiStep('idle');
    setIsFlashOn(false);
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

    // Visual feedback (flash effect)
    const flashOverlay = document.createElement('div');
    flashOverlay.className = 'fixed inset-0 bg-white z-[99999] animate-pulse pointer-events-none';
    document.body.appendChild(flashOverlay);
    setTimeout(() => flashOverlay.remove(), 100);

    const rawData = canvas.toDataURL('image/jpeg', 0.95);
    setCurrentCapture(rawData);
    
    if (isAutoMode) {
      processAutoImage(rawData);
    } else {
      setCropPoints([{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 }]);
      setUiStep('crop');
    }
  };

  const processAutoImage = (imageSrc: string) => {
    setState({ status: 'processing', progress: 50, message: 'Enhancing Document...' });
    
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      if (!canvasRef.current || !scannerRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Use jscanify to extract paper if detected, otherwise fallback to standard
      let finalCanvas = canvas;
      try {
        const resultCanvas = scannerRef.current.extractPaper(img, img.width, img.height);
        finalCanvas = resultCanvas;
      } catch (e) {
        console.warn("Auto-extraction failed, using original size", e);
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      }

      const finalCtx = finalCanvas.getContext('2d', { willReadFrequently: true });
      if (finalCtx) {
        const imageData = finalCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
        const data = imageData.data;
        
        // Professional B&W Filter with dynamic thresholding
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
          const val = avg > 115 ? 255 : Math.max(0, avg - 30); // Preserve some contrast
          data[i] = data[i+1] = data[i+2] = val > 160 ? 255 : val;
        }
        finalCtx.putImageData(imageData, 0, 0);
      }
      
      const processedData = finalCanvas.toDataURL('image/jpeg', 0.85);
      
      setCapturedPages(prev => [...prev, { 
        original: imageSrc, 
        processed: processedData, 
        filter: 'bw',
        id: Math.random().toString(36).substr(2, 9)
      }]);
      
      setCurrentCapture(null);
      setState({ status: 'idle', progress: 0 });
      
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-40 left-1/2 -translate-x-1/2 bg-teal-500 text-black font-black text-[10px] uppercase px-6 py-3 rounded-full z-[100000] shadow-2xl animate-in slide-in-from-bottom duration-300';
      toast.innerText = 'DOCUMENT CAPTURED';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('animate-out', 'fade-out');
        setTimeout(() => toast.remove(), 300);
      }, 1500);
    };
  };

  const handlePointMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (draggingIdx === null || !cropContainerRef.current) return;
    const rect = cropContainerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    
    const newPoints = [...cropPoints];
    newPoints[draggingIdx] = { x, y };
    setCropPoints(newPoints);
  }, [draggingIdx, cropPoints]);

  const applyCrop = () => {
    if (!currentCapture || !cropCanvasRef.current) return;
    const canvas = cropCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.src = currentCapture;
    img.onload = () => {
      // Perspective crop would be ideal here with OpenCV, but we use a bounding box fallback
      const minX = Math.min(...cropPoints.map(p => p.x)) * img.width / 100;
      const maxX = Math.max(...cropPoints.map(p => p.x)) * img.width / 100;
      const minY = Math.min(...cropPoints.map(p => p.y)) * img.height / 100;
      const maxY = Math.max(...cropPoints.map(p => p.y)) * img.height / 100;
      
      const cropWidth = maxX - minX;
      const cropHeight = maxY - minY;
      
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      ctx.drawImage(img, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      
      setCurrentCapture(canvas.toDataURL('image/jpeg', 0.95));
      setUiStep('edit');
    };
  };

  const acceptEnhancedPage = () => {
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
        for (let i = 0; i < data.length; i += 4) {
          let gray = 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2];
          let val = (gray - 110) * 2.5 + 128;
          val = Math.max(0, Math.min(255, val > 200 ? 255 : val < 60 ? val * 0.5 : val));
          data[i] = data[i+1] = data[i+2] = val;
        }
      } else if (currentFilter === 'bw') {
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const val = avg > 115 ? 255 : 0;
          data[i] = data[i+1] = data[i+2] = val;
        }
      } else if (currentFilter === 'grayscale') {
        for (let i = 0; i < data.length; i += 4) {
          const g = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
          data[i] = data[i+1] = data[i+2] = g;
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      const processedData = canvas.toDataURL('image/jpeg', compressionQuality / 100);
      
      setCapturedPages(prev => [...prev, { 
        original: currentCapture, 
        processed: processedData, 
        filter: currentFilter,
        id: Math.random().toString(36).substr(2, 9)
      }]);
      setCurrentCapture(null);
      setUiStep('camera');
    };
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelected = () => {
    setCapturedPages(prev => prev.filter(p => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  const performExport = () => {
    if (capturedPages.length === 0) return;
    setState({ status: 'processing', progress: 50, message: `Building your ${exportFormat}...` });
    setShowShareModal(false);
    
    setTimeout(() => {
      try {
        // Fix: Use the correct UMD access for jsPDF
        const jsPDFLib = (window as any).jspdf?.jsPDF || (window as any).jsPDF;
        if (!jsPDFLib) throw new Error("jsPDF library not found");

        if (exportFormat === 'PDF') {
          const doc = new jsPDFLib('p', 'mm', pageSize === 'A4' ? 'a4' : [210, 297]);
          const pw = 210, ph = 297;

          capturedPages.forEach((page, idx) => {
            if (idx > 0) doc.addPage();
            doc.addImage(page.processed, 'JPEG', 0, 0, pw, ph, undefined, 'FAST');
          });

          const blob = doc.output('blob');
          setState({ 
            status: 'success', 
            resultUrl: URL.createObjectURL(blob), 
            resultFileName: `${fileName}.pdf`,
            progress: 100 
          });
        } else {
          // Export JPG (first or selected page)
          setState({ 
            status: 'success', 
            resultUrl: capturedPages[0].processed, 
            resultFileName: `${fileName}.jpg`,
            progress: 100 
          });
        }
        stopCamera();
      } catch (e) {
        console.error("Export error:", e);
        setState({ status: 'error', progress: 0, message: 'Export failed. Try again.' });
      }
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-slate-950 flex flex-col overflow-hidden h-screen w-screen select-none">
      <canvas ref={canvasRef} className="hidden"></canvas>
      <canvas ref={cropCanvasRef} className="hidden"></canvas>

      {/* Camera UI Step */}
      {uiStep === 'camera' && (
        <div className="flex-1 flex flex-col h-full bg-black relative animate-in fade-in duration-300">
          <div className="absolute top-0 left-0 right-0 px-4 pt-6 pb-12 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent z-20">
            <button 
              onClick={stopCamera} 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md active:scale-90 transition-transform"
            >
              <i className="fas fa-times text-white"></i>
            </button>
            
            <div className="flex bg-white/5 backdrop-blur-xl p-1 rounded-2xl border border-white/10">
               <button 
                onClick={() => setIsAutoMode(true)} 
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isAutoMode ? 'bg-teal-500 text-black shadow-lg' : 'text-slate-400'}`}
               >
                 Auto
               </button>
               <button 
                onClick={() => setIsAutoMode(false)} 
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isAutoMode ? 'bg-teal-500 text-black shadow-lg' : 'text-slate-400'}`}
               >
                 Manual
               </button>
            </div>

            <button 
              onClick={toggleFlash} 
              className={`w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md active:scale-90 transition-all ${isFlashOn ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50' : 'bg-white/10 text-white'}`}
            >
              <i className={`fas ${isFlashOn ? 'fa-bolt' : 'fa-bolt-slash'}`}></i>
            </button>
          </div>

          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            ></video>
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-10">
              <div className="w-full h-full border-2 border-dashed border-teal-500/20 rounded-[2.5rem] relative">
                  <div className="absolute top-[-4px] left-[-4px] w-14 h-14 border-t-[6px] border-l-[6px] border-teal-500 rounded-tl-[2rem] shadow-[0_0_20px_rgba(20,184,166,0.3)]"></div>
                  <div className="absolute top-[-4px] right-[-4px] w-14 h-14 border-t-[6px] border-r-[6px] border-teal-500 rounded-tr-[2rem] shadow-[0_0_20px_rgba(20,184,166,0.3)]"></div>
                  <div className="absolute bottom-[-4px] left-[-4px] w-14 h-14 border-b-[6px] border-l-[6px] border-teal-500 rounded-bl-[2rem] shadow-[0_0_20px_rgba(20,184,166,0.3)]"></div>
                  <div className="absolute bottom-[-4px] right-[-4px] w-14 h-14 border-b-[6px] border-r-[6px] border-teal-500 rounded-br-[2rem] shadow-[0_0_20px_rgba(20,184,166,0.3)]"></div>
                  
                  {isAutoMode && (
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-[80%] h-0.5 bg-teal-500/30 animate-[scan_3s_ease-in-out_infinite] blur-sm"></div>
                    </div>
                  )}
              </div>
            </div>
          </div>

          <div className="bg-black/95 px-6 pt-4 pb-14 flex flex-col gap-6 z-20 border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-1">
               {['DOCUMENT', 'ID CARD', 'BOOK', 'PHOTO'].map(m => (
                 <button 
                  key={m} 
                  className={`text-[9px] font-black tracking-widest uppercase whitespace-nowrap px-6 py-2.5 rounded-full border transition-all ${m.toLowerCase().replace(' ','') === currentMode ? 'bg-teal-500 text-black border-teal-500 shadow-xl' : 'text-slate-500 border-white/5 bg-white/5'}`} 
                  onClick={() => setCurrentMode(m.toLowerCase().replace(' ','') as any)}
                 >
                   {m}
                 </button>
               ))}
            </div>
            <div className="flex items-center justify-between max-w-sm mx-auto w-full px-4">
               <button 
                onClick={() => capturedPages.length > 0 && setUiStep('gallery')} 
                className="w-16 h-16 rounded-2xl border-2 border-white/10 overflow-hidden bg-white/5 flex items-center justify-center active:scale-90 transition-transform shadow-inner"
               >
                 {capturedPages.length > 0 ? (
                   <img src={capturedPages[capturedPages.length-1].processed} className="w-full h-full object-cover scale-110" />
                 ) : (
                   <div className="text-white/20 text-2xl"><i className="fas fa-images"></i></div>
                 )}
               </button>
               
               <button 
                onClick={capturePhoto} 
                className="w-24 h-24 rounded-full border-[6px] border-white/10 p-1.5 active:scale-90 transition-all shadow-2xl bg-white/5"
               >
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                    <div className="w-[90%] h-[90%] border-2 border-black/5 rounded-full flex items-center justify-center">
                      <i className="fas fa-camera text-slate-900 text-3xl"></i>
                    </div>
                  </div>
               </button>
               
               <button 
                onClick={() => capturedPages.length > 0 && setUiStep('gallery')} 
                disabled={capturedPages.length === 0} 
                className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all ${capturedPages.length > 0 ? 'bg-teal-600 text-white shadow-xl active:scale-90' : 'bg-white/5 text-slate-700 pointer-events-none'}`}
               >
                 <span className="text-lg font-black">{capturedPages.length}</span>
                 <span className="text-[7px] font-black uppercase tracking-widest">Done</span>
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Crop UI Step */}
      {uiStep === 'crop' && currentCapture && (
        <div className="flex-1 flex flex-col bg-slate-950 animate-in slide-in-from-right duration-300">
           <div className="p-4 pt-8 flex justify-between items-center bg-black/50 border-b border-white/5">
              <button onClick={() => setUiStep('camera')} className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl bg-white/5">
                <i className="fas fa-arrow-left"></i> Retake
              </button>
              <h2 className="text-white font-black text-xs uppercase tracking-[0.4em]">Detect Edges</h2>
              <button onClick={applyCrop} className="bg-teal-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">
                Next <i className="fas fa-arrow-right ml-1"></i>
              </button>
           </div>
           <div className="flex-1 relative p-8 flex items-center justify-center touch-none" ref={cropContainerRef} onMouseMove={handlePointMove} onTouchMove={handlePointMove}>
              <img src={currentCapture} className="max-w-full max-h-full object-contain shadow-2xl rounded-xl pointer-events-none opacity-80" />
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                 <polygon points={cropPoints.map(p => `${p.x}%,${p.y}%`).join(' ')} className="fill-teal-500/20 stroke-teal-500 stroke-2" />
              </svg>
              {cropPoints.map((p, i) => (
                <div key={i} className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full flex items-center justify-center touch-none transition-transform" style={{ left: `${p.x}%`, top: `${p.y}%` }} onMouseDown={() => setDraggingIdx(i)} onTouchStart={() => setDraggingIdx(i)} onMouseUp={() => setDraggingIdx(null)} onTouchEnd={() => setDraggingIdx(null)}>
                  <div className={`w-6 h-6 bg-white rounded-full border-4 border-teal-500 shadow-xl ${draggingIdx === i ? 'scale-150 bg-teal-500' : ''}`}></div>
                </div>
              ))}
           </div>
           <div className="p-10 text-center bg-black/60 border-t border-white/5">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-teal-400">Drag points to document corners</p>
           </div>
        </div>
      )}

      {/* Edit UI Step */}
      {uiStep === 'edit' && currentCapture && (
        <div className="flex-1 flex flex-col bg-slate-950 animate-in slide-in-from-bottom duration-300">
           <div className="p-4 pt-8 flex justify-between items-center bg-black/50 border-b border-white/5 shadow-2xl">
              <button onClick={() => setUiStep('crop')} className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl bg-white/5">
                <i className="fas fa-arrow-left"></i> Crop
              </button>
              <h2 className="text-white font-black text-xs uppercase tracking-[0.4em]">Enhance</h2>
              <button onClick={acceptEnhancedPage} className="bg-teal-600 text-white px-8 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-2xl">
                Accept <i className="fas fa-check ml-1"></i>
              </button>
           </div>
           <div className="flex-1 p-8 flex items-center justify-center overflow-hidden">
              <img src={currentCapture} className={`max-w-full max-h-full object-contain transition-all duration-300 shadow-2xl rounded-xl border border-white/10 ${currentFilter === 'document' ? 'contrast-[1.25] grayscale brightness-110' : currentFilter === 'bw' ? 'grayscale contrast-[2.5]' : currentFilter === 'grayscale' ? 'grayscale' : ''}`} />
           </div>
           <div className="bg-black/90 p-6 flex gap-4 overflow-x-auto no-scrollbar border-t border-white/5 pb-14">
              {[
                { id: 'none', label: 'ORIGINAL', icon: 'fa-image' },
                { id: 'document', label: 'MAGIC B&W', icon: 'fa-wand-magic-sparkles' },
                { id: 'bw', label: 'SHARP B&W', icon: 'fa-circle-half-stroke' },
                { id: 'grayscale', label: 'GRAY', icon: 'fa-ghost' },
              ].map(f => (
                <button key={f.id} onClick={() => setCurrentFilter(f.id as any)} className={`flex flex-col items-center gap-3 p-5 min-w-[100px] rounded-3xl transition-all border-2 ${currentFilter === f.id ? 'bg-teal-600 border-teal-500 text-black shadow-2xl scale-105' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                  <i className={`fas ${f.icon} text-xl`}></i>
                  <span className="text-[9px] font-black uppercase tracking-tighter">{f.label}</span>
                </button>
              ))}
           </div>
        </div>
      )}

      {/* Gallery / Finalize Step */}
      {uiStep === 'gallery' && (
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 animate-in fade-in duration-300">
           <div className="p-4 pt-10 flex flex-col bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-center mb-4 px-2">
                <button onClick={() => setUiStep('camera')} className="text-slate-500 text-xl"><i className="fas fa-arrow-left"></i></button>
                <div className="flex-1 px-4 text-center">
                   {isRenaming ? (
                     <input 
                       autoFocus 
                       value={fileName} 
                       onChange={e => setFileName(e.target.value)}
                       onBlur={() => setIsRenaming(false)}
                       onKeyDown={e => e.key === 'Enter' && setIsRenaming(false)}
                       className="w-full bg-slate-100 dark:bg-slate-800 p-2 rounded-xl font-black text-sm text-center outline-none border-2 border-teal-500 dark:text-white" 
                     />
                   ) : (
                     <h2 onClick={() => setIsRenaming(true)} className="text-slate-900 dark:text-white font-black text-sm uppercase truncate max-w-[200px] mx-auto flex items-center justify-center gap-2">
                       {fileName} <i className="fas fa-pen text-[10px] text-teal-500 opacity-40"></i>
                     </h2>
                   )}
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{capturedPages.length} Documents</p>
                </div>
                <button onClick={() => setIsSelectMode(!isSelectMode)} className={`text-xl transition-colors ${isSelectMode ? 'text-teal-500' : 'text-slate-400'}`}><i className="fas fa-check-double"></i></button>
              </div>
           </div>

           <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-5 overflow-y-auto p-6 no-scrollbar">
              {capturedPages.map((p, i) => (
                <div key={p.id} onClick={() => isSelectMode && toggleSelect(p.id)} className={`relative aspect-[3/4] rounded-[2rem] overflow-hidden border-4 transition-all ${selectedIds.has(p.id) ? 'border-teal-500 scale-95 shadow-inner' : 'border-white dark:border-slate-900 bg-white dark:bg-slate-900 shadow-xl'}`}>
                   <img src={p.processed} className="w-full h-full object-cover" />
                   <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 rounded-lg">#{i+1}</div>
                   {isSelectMode && (
                     <div className={`absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${selectedIds.has(p.id) ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white/20 border-white text-transparent'}`}>
                       <i className="fas fa-check text-xs"></i>
                     </div>
                   )}
                </div>
              ))}
           </div>

           <div className="bg-white dark:bg-slate-900 p-8 pb-14 border-t border-slate-100 dark:border-slate-800 flex gap-4 shadow-2xl">
              {isSelectMode ? (
                <>
                  <button onClick={deleteSelected} disabled={selectedIds.size === 0} className="flex-1 bg-rose-100 text-rose-600 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest disabled:opacity-30">Delete ({selectedIds.size})</button>
                  <button onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest">Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={() => setUiStep('camera')} className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-[2rem] flex items-center justify-center text-2xl"><i className="fas fa-plus"></i></button>
                  <button onClick={() => setShowShareModal(true)} className="flex-1 bg-teal-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl active:scale-95 transition-all">
                    SHARE OPTIONS
                  </button>
                </>
              )}
           </div>

           {showShareModal && (
             <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-md animate-in fade-in flex items-end">
                <div className="w-full bg-white dark:bg-slate-900 rounded-t-[3rem] p-10 pb-16 animate-in slide-in-from-bottom duration-500 max-w-xl mx-auto shadow-2xl">
                   <div className="flex justify-between items-center mb-10">
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Share Options</h3>
                      <button onClick={() => setShowShareModal(false)} className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center"><i className="fas fa-times"></i></button>
                   </div>
                   <div className="space-y-8">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Export Format</label>
                        <div className="flex bg-slate-100 dark:bg-slate-800/50 p-2 rounded-2xl">
                           <button onClick={() => setExportFormat('PDF')} className={`flex-1 py-4 rounded-xl font-black text-sm transition-all ${exportFormat === 'PDF' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-xl' : 'text-slate-500'}`}>PDF</button>
                           <button onClick={() => setExportFormat('JPG')} className={`flex-1 py-4 rounded-xl font-black text-sm transition-all ${exportFormat === 'JPG' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-xl' : 'text-slate-500'}`}>JPG</button>
                        </div>
                      </div>
                      <div className="flex gap-4">
                         <button onClick={() => setShowShareModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 py-6 rounded-[2rem] font-black text-sm uppercase">Cancel</button>
                         <button onClick={performExport} className="flex-1 bg-teal-600 text-white py-6 rounded-[2rem] font-black text-sm uppercase shadow-2xl active:scale-95 transition-transform">Process & Share</button>
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>
      )}

      {/* Idle / Landing Step */}
      {uiStep === 'idle' && state.status !== 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-950 h-full">
           <div className="w-28 h-28 bg-teal-500/10 text-teal-500 rounded-[2.5rem] flex items-center justify-center text-5xl mb-10 border border-teal-500/20 shadow-2xl">
             <i className="fas fa-camera"></i>
           </div>
           <h1 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">Pro Scanner</h1>
           <p className="text-slate-500 mb-12 font-medium text-sm max-w-xs mx-auto uppercase tracking-[0.3em]">Privacy-First • Local Export</p>
           <button 
            onClick={startCamera} 
            className="bg-teal-600 text-white px-14 py-6 rounded-[2.5rem] font-black text-xl shadow-2xl shadow-teal-600/20 active:scale-95 transition-all"
          >
            Start Scanning
          </button>
        </div>
      )}

      {/* Success View */}
      {state.status === 'success' && (
        <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center p-12 text-center animate-in zoom-in duration-500">
           <div className="w-28 h-28 bg-teal-500 text-white text-5xl rounded-[3rem] flex items-center justify-center mb-12 shadow-2xl border-4 border-white/10">
             <i className="fas fa-check-double"></i>
           </div>
           <h2 className="text-5xl font-black text-white mb-6 uppercase tracking-tighter">SUCCESS!</h2>
           <p className="text-slate-500 mb-14 font-black text-xs uppercase tracking-widest opacity-80">Output Ready for download</p>
           <div className="flex flex-col gap-5 w-full max-w-sm">
              <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white py-7 rounded-[2.5rem] font-black text-2xl shadow-2xl active:scale-95 transition-transform flex items-center justify-center gap-5">
                <i className="fas fa-file-download"></i> DOWNLOAD
              </a>
              <button 
                onClick={() => { setCapturedPages([]); setState({status:'idle', progress: 0}); setUiStep('idle'); }} 
                className="text-slate-500 font-black text-[11px] uppercase tracking-[0.4em] py-6 hover:text-teal-500 transition-colors"
              >
                START NEW SESSION
              </button>
           </div>
        </div>
      )}

      {/* Loading / Processing View */}
      {(state.status === 'processing' || state.status === 'loading') && (
        <div className="fixed inset-0 z-[30000] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center text-white">
           <div className="relative w-28 h-28 mb-12">
              <div className="absolute inset-0 border-[10px] border-white/5 rounded-full"></div>
              <div className="absolute inset-0 border-[10px] border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-teal-500 text-xl font-black">{state.progress}%</div>
           </div>
           <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">Working...</h2>
           <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.6em]">{state.message || 'Optimizing Frames'}</p>
        </div>
      )}
      
      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0; }
          50% { top: 100%; opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Scan;
