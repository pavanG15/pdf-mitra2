
import React, { useState, useRef, useEffect } from 'react';
import { ProcessingState } from '../types';

declare const jspdf: any;

type ScanFilter = 'none' | 'bw' | 'grayscale' | 'vibrant';

const Scan: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [filter, setFilter] = useState<ScanFilter>('none');
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });
  const [isCameraActive, setIsCameraActive] = useState(false);

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
      alert("Please allow camera access to use this tool.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const applyFiltersToCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    if (filter === 'bw') {
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const threshold = 128;
        const val = avg > threshold ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = val;
      }
    } else if (filter === 'grayscale') {
      for (let i = 0; i < data.length; i += 4) {
        const avg = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = avg;
      }
    } else if (filter === 'vibrant') {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * 1.2);
        data[i + 1] = Math.min(255, data[i + 1] * 1.2);
        data[i + 2] = Math.min(255, data[i + 2] * 1.2);
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
    
    // Set canvas size to match video resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Apply selected scan filter
    if (filter !== 'none') {
      applyFiltersToCanvas(ctx, canvas.width, canvas.height);
    }
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImages(prev => [...prev, dataUrl]);
    
    // Simple feedback animation
    video.classList.add('opacity-50');
    setTimeout(() => video.classList.remove('opacity-50'), 100);
  };

  const saveToPDF = () => {
    if (capturedImages.length === 0) return;
    setState({ status: 'processing', progress: 50, message: 'Creating PDF Document...' });
    
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
        resultFileName: `scan_${new Date().getTime()}.pdf` 
      });
      stopCamera();
    } catch (error) {
      setState({ status: 'error', progress: 0, message: 'Conversion failed.' });
    }
  };

  const filters = [
    { id: 'none', label: 'Original', icon: 'fa-camera' },
    { id: 'bw', label: 'B&W Scan', icon: 'fa-adjust' },
    { id: 'grayscale', label: 'Grayscale', icon: 'fa-ghost' },
    { id: 'vibrant', label: 'Enhance', icon: 'fa-wand-magic-sparkles' },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col bg-slate-950">
      {!isCameraActive && state.status !== 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-teal-500/10 text-teal-500 rounded-[2.5rem] flex items-center justify-center text-4xl mb-8 shadow-2xl">
            <i className="fas fa-camera"></i>
          </div>
          <h1 className="text-3xl font-[900] text-white uppercase tracking-tighter mb-4">Mobile Scanner</h1>
          <p className="text-slate-400 max-w-xs mb-10 font-medium">Convert your paper documents into high-quality PDFs with live filters.</p>
          
          <button 
            onClick={startCamera}
            className="bg-teal-600 text-white px-10 py-5 rounded-3xl font-black text-lg shadow-xl shadow-teal-600/20 active:scale-95 transition-all flex items-center gap-3"
          >
            <i className="fas fa-plus-circle"></i> Open Camera
          </button>
        </div>
      )}

      {isCameraActive && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          {/* Top Bar */}
          <div className="p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
            <button onClick={stopCamera} className="text-white w-10 h-10 flex items-center justify-center bg-white/10 rounded-full">
              <i className="fas fa-arrow-left"></i>
            </button>
            <div className="text-white font-black uppercase text-[10px] tracking-widest bg-white/10 px-4 py-2 rounded-full backdrop-blur-md">
              {capturedImages.length} Pages Captured
            </div>
          </div>

          {/* Camera Preview */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-opacity duration-100 ${filter === 'bw' ? 'contrast-150 grayscale' : filter === 'grayscale' ? 'grayscale' : ''}`}
            ></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            
            {/* Guide Overlay */}
            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
              <div className="w-full h-full border-2 border-dashed border-white/30 rounded-3xl relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-teal-500 rounded-tl-xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-teal-500 rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-teal-500 rounded-bl-xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-teal-500 rounded-br-xl"></div>
              </div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="p-8 bg-gradient-to-t from-black/90 to-transparent">
            {/* Filter Selector */}
            <div className="flex justify-center gap-2 mb-8 overflow-x-auto no-scrollbar py-2">
              {filters.map(f => (
                <button 
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${filter === f.id ? 'bg-teal-600 text-white' : 'bg-white/10 text-white/50'}`}
                >
                  <i className={`fas ${f.icon}`}></i> {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-6 max-w-sm mx-auto">
              {/* Gallery Preview / Thumbnail */}
              <div className="w-14 h-14 rounded-xl border-2 border-white/20 overflow-hidden bg-white/5">
                {capturedImages.length > 0 ? (
                  <img src={capturedImages[capturedImages.length - 1]} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <i className="fas fa-images"></i>
                  </div>
                )}
              </div>

              {/* Shutter Button */}
              <button 
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full bg-white flex items-center justify-center group active:scale-90 transition-transform"
              >
                <div className="w-16 h-16 rounded-full border-4 border-slate-900 flex items-center justify-center">
                   <div className="w-12 h-12 bg-teal-500 rounded-full"></div>
                </div>
              </button>

              {/* Done Button */}
              <button 
                onClick={saveToPDF}
                disabled={capturedImages.length === 0}
                className="w-14 h-14 bg-teal-600 text-white rounded-xl flex items-center justify-center shadow-lg disabled:opacity-20 active:scale-95 transition-all"
              >
                <i className="fas fa-check"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {state.status === 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-950">
           <div className="w-24 h-24 bg-teal-500 text-white text-4xl rounded-full flex items-center justify-center mb-10 shadow-2xl shadow-teal-500/30 animate-in zoom-in duration-500">
             <i className="fas fa-file-circle-check"></i>
           </div>
           <h2 className="text-4xl font-[900] text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">PDF Created!</h2>
           <p className="text-slate-500 dark:text-slate-400 mb-12 font-medium">Your photos have been enhanced and merged successfully.</p>
           
           <div className="flex flex-col gap-4 w-full max-w-xs">
              <a 
                href={state.resultUrl} 
                download={state.resultFileName} 
                className="bg-teal-600 text-white py-5 rounded-3xl font-black text-xl shadow-xl shadow-teal-600/20 active:scale-95 transition-all text-center flex items-center justify-center gap-3"
              >
                <i className="fas fa-download"></i> Download PDF
              </a>
              <button 
                onClick={() => { setCapturedImages([]); setState({status:'idle', progress: 0}); setIsCameraActive(false); }} 
                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-5 rounded-3xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all"
              >
                New Scan
              </button>
           </div>
        </div>
      )}

      {state.status === 'processing' && (
        <div className="fixed inset-0 z-[200] bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-10 text-center">
           <div className="w-20 h-20 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mb-8"></div>
           <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Processing...</h2>
           <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest">{state.message}</p>
        </div>
      )}
    </div>
  );
};

export default Scan;
