
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

    if (filter === 'bw' || filter === 'document') {
      for (let i = 0; i < data.length; i += 4) {
        let avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        if (filter === 'document') {
          // Document Mode: Aggressive contrast stretch to whiten background and darken text
          avg = (avg - 100) * 1.8 + 100;
          const val = avg > 160 ? 255 : Math.max(0, avg - 30);
          data[i] = data[i + 1] = data[i + 2] = val;
        } else {
          // Pure B&W: Thresholding
          const val = avg > 128 ? 255 : 0;
          data[i] = data[i + 1] = data[i + 2] = val;
        }
      }
    } else if (filter === 'grayscale') {
      for (let i = 0; i < data.length; i += 4) {
        const avg = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = avg;
      }
    } else if (filter === 'vibrant') {
      for (let i = 0; i < data.length; i += 4) {
        // Boost vibrancy and light
        data[i] = Math.min(255, (data[i] - 128) * 1.2 + 128 + 15);
        data[i + 1] = Math.min(255, (data[i + 1] - 128) * 1.2 + 128 + 15);
        data[i + 2] = Math.min(255, (data[i + 2] - 128) * 1.2 + 128 + 15);
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
    
    // Maintain high resolution for the PDF
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    if (filter !== 'none') {
      applyFiltersToCanvas(ctx, canvas.width, canvas.height);
    }
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImages(prev => [...prev, dataUrl]);
    
    // Shutter flash effect
    video.style.opacity = '0';
    setTimeout(() => { if(video) video.style.opacity = '1'; }, 70);
  };

  const deletePage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
    if (capturedImages.length <= 1) setShowGallery(false);
  };

  const generatePDF = () => {
    if (capturedImages.length === 0) return;
    setState({ status: 'processing', progress: 50, message: 'Creating PDF...' });
    
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
    { id: 'document', label: 'Magic Scan', icon: 'fa-magic' },
    { id: 'bw', label: 'B&W', icon: 'fa-adjust' },
    { id: 'none', label: 'Original', icon: 'fa-camera' },
    { id: 'grayscale', label: 'Grayscale', icon: 'fa-ghost' },
    { id: 'vibrant', label: 'Vibrant', icon: 'fa-sun' },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      {!isCameraActive && state.status !== 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-[2.5rem] flex items-center justify-center text-4xl mb-8 shadow-inner border border-teal-500/20">
            <i className="fas fa-camera"></i>
          </div>
          <h1 className="text-4xl font-[900] text-slate-900 dark:text-white mb-4 tracking-tighter uppercase">Professional Scanner</h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-10 font-medium leading-relaxed">High-quality document capture with real-time text enhancement.</p>
          
          <button 
            onClick={startCamera}
            className="bg-teal-600 text-white px-12 py-5 rounded-[2rem] font-black text-xl shadow-2xl shadow-teal-500/20 active:scale-95 transition-all flex items-center gap-4"
          >
            <i className="fas fa-video"></i> Start Session
          </button>
        </div>
      )}

      {isCameraActive && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          {/* Top Control Bar */}
          <div className="p-6 flex justify-between items-center bg-gradient-to-b from-black/95 to-transparent z-20">
            <button onClick={stopCamera} className="text-white w-12 h-12 flex items-center justify-center bg-white/10 rounded-full backdrop-blur-xl hover:bg-white/20 transition-colors">
              <i className="fas fa-times text-lg"></i>
            </button>
            <div className="flex flex-col items-center">
                <span className="text-white font-black uppercase text-[10px] tracking-[0.4em] opacity-80">Document Scanner</span>
                <span className="text-teal-400 font-black text-[11px] uppercase tracking-widest mt-0.5">{capturedImages.length} PAGES CAPTURED</span>
            </div>
            <div className="w-12 h-12 flex items-center justify-center">
                <i className="fas fa-shield-halved text-white/30"></i>
            </div>
          </div>

          {/* Viewfinder Section */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-900">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-all duration-300 ${filter === 'bw' ? 'grayscale contrast-200' : filter === 'grayscale' ? 'grayscale' : filter === 'document' ? 'contrast-125' : ''}`}
            ></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            
            {/* Guide Grid & Corner Markers */}
            <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none flex items-center justify-center">
              <div className="w-full h-full border-2 border-dashed border-white/20 rounded-[2.5rem] relative">
                <div className="absolute top-0 left-0 w-12 h-12 border-t-[5px] border-l-[5px] border-teal-500 rounded-tl-[1.5rem] shadow-[0_0_15px_rgba(20,184,166,0.3)]"></div>
                <div className="absolute top-0 right-0 w-12 h-12 border-t-[5px] border-r-[5px] border-teal-500 rounded-tr-[1.5rem] shadow-[0_0_15px_rgba(20,184,166,0.3)]"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-[5px] border-l-[5px] border-teal-500 rounded-bl-[1.5rem] shadow-[0_0_15px_rgba(20,184,166,0.3)]"></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-[5px] border-r-[5px] border-teal-500 rounded-br-[1.5rem] shadow-[0_0_15px_rgba(20,184,166,0.3)]"></div>
              </div>
            </div>
          </div>

          {/* Bottom Control Section */}
          <div className="p-8 bg-gradient-to-t from-black via-black/90 to-transparent space-y-8 z-20">
            {/* Horizontal Filter Selector */}
            <div className="flex justify-center gap-4 overflow-x-auto no-scrollbar py-2 px-4">
              {filterOptions.map(f => (
                <button 
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap shadow-lg ${filter === f.id ? 'bg-teal-600 text-white scale-105' : 'bg-white/10 text-white/50 hover:bg-white/15'}`}
                >
                  <i className={`fas ${f.icon} text-xs`}></i> {f.label}
                </button>
              ))}
            </div>

            {/* Main Action Bar */}
            <div className="flex items-center justify-between max-w-md mx-auto px-6 pb-2">
              {/* Gallery Thumbnail */}
              <button 
                onClick={() => capturedImages.length > 0 && setShowGallery(true)}
                className="w-16 h-16 rounded-2xl border-4 border-white/15 overflow-hidden bg-white/5 shadow-2xl transition-transform active:scale-90 group"
              >
                {capturedImages.length > 0 ? (
                  <img src={capturedImages[capturedImages.length - 1]} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <i className="fas fa-images"></i>
                  </div>
                )}
              </button>

              {/* Aggressive Shutter Button */}
              <button 
                onClick={capturePhoto}
                className="w-24 h-24 rounded-full bg-white flex items-center justify-center group active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]"
              >
                <div className="w-20 h-20 rounded-full border-[7px] border-slate-900 flex items-center justify-center">
                   <div className="w-14 h-14 bg-teal-500 rounded-full shadow-inner group-active:scale-90 transition-transform"></div>
                </div>
              </button>

              {/* Finish Checkmark */}
              <button 
                onClick={generatePDF}
                disabled={capturedImages.length === 0}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl shadow-2xl transition-all ${capturedImages.length > 0 ? 'bg-teal-600 text-white hover:bg-teal-500 active:scale-95' : 'bg-white/5 text-white/10 cursor-not-allowed'}`}
              >
                <i className={`fas ${capturedImages.length > 0 ? 'fa-check' : 'fa-check-double'} ${capturedImages.length > 0 ? 'animate-pulse' : ''}`}></i>
              </button>
            </div>
          </div>

          {/* Session Gallery Overlay */}
          {showGallery && (
            <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col p-8 animate-in fade-in duration-300">
               <div className="flex justify-between items-center mb-10">
                  <h2 className="text-white font-black uppercase tracking-[0.3em] text-sm">Review {capturedImages.length} Pages</h2>
                  <button onClick={() => setShowGallery(false)} className="text-white/60 hover:text-white uppercase font-black text-[10px] tracking-widest bg-white/10 px-4 py-2 rounded-xl transition-all">Close</button>
               </div>
               
               <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 overflow-y-auto no-scrollbar pb-10">
                  {capturedImages.map((img, i) => (
                    <div key={i} className="relative aspect-[3/4] bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl group">
                       <img src={img} className="w-full h-full object-cover" />
                       <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-2 py-1 rounded-lg border border-white/10">PG {i+1}</div>
                       <button 
                         onClick={() => deletePage(i)}
                         className="absolute top-3 right-3 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                       >
                         <i className="fas fa-trash"></i>
                       </button>
                    </div>
                  ))}
               </div>
               
               <button onClick={generatePDF} className="w-full bg-teal-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl shadow-teal-500/30 active:scale-95 transition-all">
                 Merge & Create PDF
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
           <h2 className="text-4xl font-[900] text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">Scan Ready!</h2>
           <p className="text-slate-500 dark:text-slate-400 mb-12 font-medium leading-relaxed max-w-xs mx-auto">Your multi-page document has been enhanced and optimized for sharing.</p>
           
           <div className="flex flex-col gap-4 w-full max-w-xs">
              <a 
                href={state.resultUrl} 
                download={state.resultFileName} 
                className="bg-orange-500 text-white py-6 rounded-[2rem] font-black text-xl shadow-xl shadow-orange-500/30 active:scale-95 transition-all flex items-center justify-center gap-4 group"
              >
                <i className="fas fa-download group-hover:animate-bounce"></i> DOWNLOAD PDF
              </a>
              <button 
                onClick={() => { setCapturedImages([]); setState({status:'idle', progress: 0}); setIsCameraActive(false); }} 
                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] active:scale-95 transition-all"
              >
                New Scanning Session
              </button>
           </div>
        </div>
      )}

      {state.status === 'processing' && (
        <div className="fixed inset-0 z-[200] bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-12 text-center">
           <div className="w-24 h-24 border-[6px] border-teal-500/10 border-t-teal-500 rounded-full animate-spin mb-10"></div>
           <h2 className="text-3xl font-[900] text-slate-900 dark:text-white mb-3 uppercase tracking-tighter">Generating PDF</h2>
           <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">{state.message}</p>
        </div>
      )}
    </div>
  );
};

export default Scan;
