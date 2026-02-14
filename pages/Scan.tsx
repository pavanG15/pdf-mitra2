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

  // Initialize Scanner
  useEffect(() => {
    let checkInterval: any;
    const initScanner = () => {
      if (typeof jscanify !== 'undefined' && typeof cv !== 'undefined' && cv.Mat) {
        try {
          scanner.current = new jscanify();
          setIsScannerReady(true);
          console.log("Scanner ready.");
          if (checkInterval) clearInterval(checkInterval);
        } catch (e) {
          console.warn("Scanner not ready yet...");
        }
      }
    };
    checkInterval = setInterval(initScanner, 1000);
    initScanner();
    return () => {
      if (checkInterval) clearInterval(checkInterval);
      stopCamera();
    };
  }, []);

  // NEW: Handle attaching the stream to the video element once it renders
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Playback failed:", e));
    }
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      // Just set the stream state. The new useEffect will handle the videoRef attachment.
      setStream(mediaStream);
      setState({ status: 'processing', progress: 0, message: 'Camera active' });
    } catch (err) {
      console.error(err);
      alert("Camera permission denied. Please check your browser settings and try again.");
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
      const resultCanvas = scanner.current.extractPaper(canvas, 1200, 1697);
      setCapturedImages(prev => [...prev, resultCanvas.toDataURL('image/jpeg', 0.9)]);
    } catch (e) {
      // Fallback if extraction fails
      setCapturedImages(prev => [...prev, canvas.toDataURL('image/jpeg', 0.9)]);
    }
  };

  const generatePDF = () => {
    if (capturedImages.length === 0) return;
    setState({ status: 'processing', progress: 50, message: 'Compiling PDF...' });
    try {
      const { jsPDF } = jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      capturedImages.forEach((img, idx) => {
        if (idx > 0) doc.addPage();
        doc.addImage(img, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      });
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setState({ status: 'success', progress: 100, resultUrl: url, resultFileName: `scan_${Date.now()}.pdf` });
      stopCamera();
    } catch (error) {
      setState({ status: 'error', progress: 0, message: 'Save failed.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-[900] text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Document Scan</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Capture documents directly into a PDF.</p>
        {!isScannerReady && state.status !== 'success' && (
          <div className="mt-4 inline-flex items-center gap-2 px-6 py-2 bg-slate-100 dark:bg-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
            <i className="fas fa-circle-notch fa-spin text-teal-500"></i> Engine Loading...
          </div>
        )}
      </div>

      {!stream && state.status !== 'success' && (
        <div className="bg-white dark:bg-slate-900 p-20 rounded-[3rem] border-4 border-dashed border-slate-200 dark:border-slate-800 text-center shadow-2xl flex flex-col items-center">
          <div className="w-24 h-24 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-[2rem] flex items-center justify-center text-4xl mb-8">
            <i className="fas fa-camera"></i>
          </div>
          <button 
            onClick={startCamera} 
            disabled={!isScannerReady}
            className="bg-teal-600 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-xl shadow-teal-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Scanning
          </button>
        </div>
      )}

      {stream && (
        <div className="relative rounded-[3rem] overflow-hidden bg-black aspect-[3/4] max-w-lg mx-auto ring-[12px] ring-white dark:ring-slate-900 shadow-2xl">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
          <canvas ref={canvasRef} className="hidden"></canvas>
          <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none">
             <div className="w-full h-full border-2 border-dashed border-white/50 rounded-2xl"></div>
          </div>
          <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-6 z-10">
            <button onClick={captureFrame} className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-teal-600 text-2xl shadow-2xl border-4 border-teal-500/20 active:scale-90 transition-all">
              <i className="fas fa-camera"></i>
            </button>
            {capturedImages.length > 0 && (
              <button onClick={generatePDF} className="bg-teal-600 text-white px-8 py-5 rounded-2xl font-black text-sm shadow-xl flex items-center gap-3">
                Save <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">{capturedImages.length}</span>
              </button>
            )}
            <button onClick={stopCamera} className="w-12 h-12 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all">
               <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {capturedImages.length > 0 && (
        <div className="mt-12 flex gap-4 overflow-x-auto pb-4 no-scrollbar px-4">
            {capturedImages.map((img, i) => (
              <div key={i} className="flex-shrink-0 w-24 aspect-[3/4] rounded-xl border-4 border-white dark:border-slate-800 overflow-hidden shadow-lg relative group">
                <img src={img} className="w-full h-full object-cover" alt={`Scanned page ${i + 1}`} />
                <button 
                  onClick={() => setCapturedImages(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute inset-0 bg-rose-500/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <i className="fas fa-trash text-sm"></i>
                </button>
              </div>
            ))}
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] border-2 border-teal-500 text-center shadow-2xl">
          <div className="w-20 h-20 bg-teal-500 text-white text-3xl rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
            <i className="fas fa-check"></i>
          </div>
          <h2 className="text-4xl font-black dark:text-white mb-10 tracking-tighter">Scan Ready!</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all">
              Download PDF
            </a>
            <button onClick={() => { setCapturedImages([]); setState({ status: 'idle', progress: 0 }); }} className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-12 py-5 rounded-2xl font-black text-sm uppercase">
              New Scan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scan;
