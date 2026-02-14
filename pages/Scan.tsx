
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
      alert("Camera permission is required. Please check your browser settings.");
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
        // Boost saturation/contrast simply
        data[i] = Math.min(255, data[i] * 1.1 + 10);
        data[i + 1] = Math.min(255, data[i + 1] * 1.1 + 10);
        data[i + 2] = Math.min(255, data[i + 2] * 1.1 + 10);
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
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImages(prev => [...prev, dataUrl]);
    
    // Feedback flash
    video.style.opacity = '0.3';
    setTimeout(() => { if(video) video.style.opacity = '1'; }, 50);
  };

  const generatePDF = () => {
    if (capturedImages.length === 0) return;
    setState({ status: 'processing', progress: 50, message: 'Encoding into PDF...' });
    
    try {
      const { jsPDF } = jspdf;
      // Orientation 'p', unit 'mm', format 'a4'
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

  const filters = [
    { id: 'none', label: 'ORIGINAL', icon: 'fa-camera' },
    { id: 'bw', label: 'B&W SCAN', icon: 'fa-adjust' },
    { id: 'grayscale', label: 'GRAY', icon: 'fa-ghost' },
    { id: 'vibrant', label: 'VIBRANT', icon: 'fa-wand-magic-sparkles' },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      {!isCameraActive && state.status !== 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-[2.5rem] flex items-center justify-center text-4xl mb-8 shadow-inner">
            <i className="fas fa-camera"></i>
          </div>
          <h1 className="text-4xl font-[900] text-slate-900 dark:text-white mb-4 tracking-tighter uppercase">Instant Scanner</h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-10 font-medium">Capture documents and apply professional scan filters locally.</p>
          
          <button 
            onClick={startCamera}
            className="bg-teal-600 text-white px-12 py-5 rounded-[2rem] font-black text-xl shadow-2xl shadow-teal-500/20 active:scale-95 transition-all flex items-center gap-4"
          >
            <i className="fas fa-video"></i> Start Camera
          </button>
        </div>
      )}

      {isCameraActive && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in slide-in-from-bottom-20 duration-500">
          {/* Top Bar */}
          <div className="p-6 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent">
            <button onClick={stopCamera} className="text-white w-12 h-12 flex items-center justify-center bg-white/10 rounded-full backdrop-blur-xl">
              <i className="fas fa-times"></i>
            </button>
            <div className="flex flex-col items-center">
                <span className="text-white font-[900] uppercase text-[10px] tracking-[0.3em]">Scanner Active</span>
                <span className="text-teal-400 font-black text-[9px] uppercase tracking-widest">{capturedImages.length} PAGES READY</span>
            </div>
            <div className="w-12"></div> {/* Spacer */}
          </div>

          {/* Viewfinder */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-all duration-300 ${filter === 'bw' ? 'grayscale contrast-200' : filter === 'grayscale' ? 'grayscale' : ''}`}
            ></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            
            {/* Guide Grid */}
            <div className="absolute inset-0 border-[50px] border-black/30 pointer-events-none flex items-center justify-center">
              <div className="w-full h-full border-2 border-dashed border-white/20 rounded-3xl relative">
                <div className="absolute top-1/2 left-0 w-full h-px bg-white/10"></div>
                <div className="absolute top-0 left-1/2 w-px h-full bg-white/10"></div>
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-teal-500 rounded-tl-xl"></div>
                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-teal-500 rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-teal-500 rounded-bl-xl"></div>
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-teal-500 rounded-br-xl"></div>
              </div>
            </div>
          </div>

          {/* Bottom Bar Controls */}
          <div className="p-8 bg-gradient-to-t from-black to-transparent space-y-8">
            {/* Filter Chips */}
            <div className="flex justify-center gap-3 overflow-x-auto no-scrollbar py-2">
              {filters.map(f => (
                <button 
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${filter === f.id ? 'bg-teal-600 text-white shadow-lg' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
                >
                  <i className={`fas ${f.icon} text-[12px]`}></i> {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between max-w-md mx-auto px-4">
              {/* Thumbnail of last page */}
              <div className="w-16 h-16 rounded-2xl border-4 border-white/10 overflow-hidden bg-white/5 shadow-inner">
                {capturedImages.length > 0 ? (
                  <img src={capturedImages[capturedImages.length - 1]} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/10">
                    <i className="fas fa-image"></i>
                  </div>
                )}
              </div>

              {/* Shutter */}
              <button 
                onClick={capturePhoto}
                className="w-24 h-24 rounded-full bg-white flex items-center justify-center group active:scale-90 transition-transform shadow-2xl"
              >
                <div className="w-20 h-20 rounded-full border-[6px] border-slate-950 flex items-center justify-center">
                   <div className="w-14 h-14 bg-teal-500 rounded-full shadow-inner"></div>
                </div>
              </button>

              {/* Confirm/Done Button */}
              <button 
                onClick={generatePDF}
                disabled={capturedImages.length === 0}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl shadow-xl active:scale-95 transition-all ${capturedImages.length > 0 ? 'bg-teal-600 text-white animate-pulse' : 'bg-white/5 text-white/10 cursor-not-allowed'}`}
              >
                <i className="fas fa-check"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {state.status === 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-950 text-center animate-in zoom-in duration-500">
           <div className="w-24 h-24 bg-teal-500 text-white text-4xl rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl shadow-teal-500/20">
             <i className="fas fa-check-double"></i>
           </div>
           <h2 className="text-4xl font-[900] text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">PDF Generated!</h2>
           <p className="text-slate-500 dark:text-slate-400 mb-12 font-medium leading-relaxed max-w-xs mx-auto">Your photos have been merged into a professional document.</p>
           
           <div className="flex flex-col gap-4 w-full max-w-xs">
              <a 
                href={state.resultUrl} 
                download={state.resultFileName} 
                className="bg-orange-500 text-white py-6 rounded-[2rem] font-black text-xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <i className="fas fa-cloud-download-alt"></i> DOWNLOAD PDF
              </a>
              <button 
                onClick={() => { setCapturedImages([]); setState({status:'idle', progress: 0}); setIsCameraActive(false); }} 
                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-6 rounded-[2rem] font-black text-sm uppercase tracking-widest active:scale-95 transition-all"
              >
                Start New Session
              </button>
           </div>
        </div>
      )}

      {state.status === 'processing' && (
        <div className="fixed inset-0 z-[200] bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center">
           <div className="w-20 h-20 border-[6px] border-teal-500/20 border-t-teal-500 rounded-full animate-spin mb-10"></div>
           <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tighter">Finishing Up...</h2>
           <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">{state.message}</p>
        </div>
      )}
    </div>
  );
};

export default Scan;
