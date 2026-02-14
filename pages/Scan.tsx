
import React, { useState, useRef, useEffect } from 'react';
import { ProcessingState } from '../types';

declare const jscanify: any;
declare const jspdf: any;
declare const cv: any;

const Scan: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });
  const [isScannerReady, setIsScannerReady] = useState(false);
  const scanner = useRef<any>(null);

  // Initialize Scanner Engine - Listen for OpenCV Ready
  useEffect(() => {
    const initScanner = () => {
      if (typeof jscanify !== 'undefined' && typeof cv !== 'undefined' && cv.Mat) {
        try {
          scanner.current = new jscanify();
          setIsScannerReady(true);
          console.log("Scanner engine initialized successfully.");
        } catch (e) {
          console.error("Scanner init error:", e);
        }
      }
    };

    // If OpenCV is already loaded
    if (typeof cv !== 'undefined' && cv.Mat) {
      initScanner();
    } else {
      // Listen for the custom event from index.html
      window.addEventListener('opencv-ready', initScanner);
    }

    return () => {
      window.removeEventListener('opencv-ready', initScanner);
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      // Relaxed constraints for better mobile success
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false 
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait for metadata to ensure video has dimensions before playing
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Play error:", e));
        };
      }
      
      setState({ status: 'processing', progress: 0, message: 'Camera active' });
    } catch (err) {
      console.error("Camera access failed:", err);
      alert("Unable to open camera. Please check permissions and ensure you're on HTTPS.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current || !scanner.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    
    try {
      // Attempt paper extraction
      const resultCanvas = scanner.current.extractPaper(canvas, 1200, 1697);
      setCapturedImages(prev => [...prev, resultCanvas.toDataURL('image/jpeg', 0.85)]);
    } catch (e) {
      console.warn("Paper extraction failed, using raw frame instead.");
      setCapturedImages(prev => [...prev, canvas.toDataURL('image/jpeg', 0.85)]);
    }
  };

  const generatePDF = () => {
    if (capturedImages.length === 0) return;
    setState({ status: 'processing', progress: 50, message: 'Creating Document...' });
    
    try {
      const { jsPDF } = jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      
      capturedImages.forEach((img, idx) => {
        if (idx > 0) doc.addPage();
        doc.addImage(img, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
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
      setState({ status: 'error', progress: 0, message: 'Save failed.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-[900] text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Document Scan</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Capture paper documents instantly.</p>
        
        {!isScannerReady && (
          <div className="mt-8 bg-slate-100 dark:bg-slate-900 px-6 py-3 rounded-full inline-flex items-center gap-3 border border-teal-500/20">
            <i className="fas fa-circle-notch fa-spin text-teal-600"></i>
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">INITIALIZING SCANNING ENGINE...</span>
          </div>
        )}
      </div>

      {!stream && state.status !== 'success' && (
        <div className="bg-white dark:bg-slate-900 p-20 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-slate-800 text-center shadow-2xl flex flex-col items-center">
          <div className="w-24 h-24 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-[2rem] flex items-center justify-center text-4xl mb-8">
            <i className="fas fa-camera"></i>
          </div>
          <button 
            onClick={startCamera} 
            disabled={!isScannerReady}
            className="bg-teal-600 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-xl shadow-teal-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            Start Scanning
          </button>
          <p className="mt-6 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Uses back camera by default</p>
        </div>
      )}

      {stream && (
        <div className="relative rounded-[3rem] overflow-hidden bg-black aspect-[3/4] max-w-lg mx-auto ring-[12px] ring-white dark:ring-slate-900 shadow-2xl">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover"
          ></video>
          <canvas ref={canvasRef} className="hidden"></canvas>
          
          <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none">
             <div className="w-full h-full border-2 border-dashed border-white/50 rounded-2xl"></div>
          </div>

          <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-6 z-10">
            <button 
              onClick={captureFrame} 
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-teal-600 text-3xl shadow-2xl border-4 border-teal-500/20 active:scale-90 transition-all"
            >
              <i className="fas fa-circle"></i>
            </button>
            {capturedImages.length > 0 && (
              <button onClick={generatePDF} className="bg-teal-600 text-white px-8 py-5 rounded-2xl font-black text-sm shadow-xl flex items-center gap-3">
                Finish <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">{capturedImages.length}</span>
              </button>
            )}
            <button onClick={stopCamera} className="w-12 h-12 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg">
               <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {capturedImages.length > 0 && (
        <div className="mt-12 flex gap-4 overflow-x-auto pb-4 no-scrollbar px-4">
            {capturedImages.map((img, i) => (
              <div key={i} className="flex-shrink-0 w-24 aspect-[3/4] rounded-2xl border-4 border-white dark:border-slate-800 overflow-hidden shadow-lg relative group">
                <img src={img} className="w-full h-full object-cover" />
                <button 
                  onClick={() => setCapturedImages(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute inset-0 bg-rose-500/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <i className="fas fa-trash text-sm"></i>
                </button>
              </div>
            ))}
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] border-2 border-teal-500 text-center shadow-2xl">
          <div className="w-20 h-20 bg-teal-500 text-white text-3xl rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-teal-500/20">
            <i className="fas fa-check"></i>
          </div>
          <h2 className="text-4xl font-[900] text-slate-900 dark:text-white mb-10 tracking-tighter uppercase">Scan Complete!</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all">
              Download PDF
            </a>
            <button onClick={() => { setCapturedImages([]); setState({ status: 'idle', progress: 0 }); }} className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-12 py-5 rounded-2xl font-black text-sm uppercase">
              Start New
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scan;
