
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

  useEffect(() => {
    // Check for dependencies and wait for OpenCV runtime
    const initScanner = () => {
      if (typeof jscanify !== 'undefined' && typeof cv !== 'undefined') {
        // OpenCV might be defined but not ready
        if (cv.onRuntimeInitialized) {
          cv.onRuntimeInitialized = () => {
            scanner.current = new jscanify();
            setIsScannerReady(true);
          };
          // If already initialized
          if (cv.getBuildInformation) {
             scanner.current = new jscanify();
             setIsScannerReady(true);
          }
        } else {
          // Standard check if onRuntimeInitialized isn't used
          scanner.current = new jscanify();
          setIsScannerReady(true);
        }
      }
    };

    const interval = setInterval(() => {
      if (isScannerReady) {
        clearInterval(interval);
        return;
      }
      initScanner();
    }, 500);

    return () => {
      clearInterval(interval);
      stopCamera();
    };
  }, [isScannerReady]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
      setState({ status: 'processing', progress: 0, message: 'Camera active' });
    } catch (err) {
      console.error(err);
      alert("Camera access denied. Please enable camera permissions in your browser settings.");
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

    // Set canvas size to video source size
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    try {
      // jscanify attempts to find the document corners and "flatten" it
      const resultCanvas = scanner.current.extractPaper(canvas, 1000, 1414); // A4 aspect ratio
      setCapturedImages(prev => [...prev, resultCanvas.toDataURL('image/jpeg', 0.85)]);
    } catch (e) {
      console.warn("Auto-extraction failed, capturing full frame:", e);
      setCapturedImages(prev => [...prev, canvas.toDataURL('image/jpeg', 0.85)]);
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
        // A4 is 210 x 297 mm
        doc.addImage(img, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      });

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setState({ 
        status: 'success', 
        progress: 100, 
        resultUrl: url, 
        resultFileName: `scanned_${new Date().getTime()}.pdf` 
      });
      stopCamera();
    } catch (error) {
      console.error(error);
      setState({ status: 'error', progress: 0, message: 'Failed to generate PDF.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 transition-colors duration-300">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">Scan to PDF</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Capture documents with your camera and auto-align them.</p>
        
        {!isScannerReady && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-100 dark:border-orange-800">
            <i className="fas fa-cog fa-spin"></i> Initializing Scan Engine...
          </div>
        )}
      </div>

      {!stream && state.status !== 'success' && (
        <div className="bg-white dark:bg-slate-900 p-20 rounded-[3rem] border-4 border-dashed border-slate-200 dark:border-slate-800 text-center shadow-2xl shadow-slate-200/50 dark:shadow-black/50">
          <div className="w-24 h-24 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center text-4xl mx-auto mb-8">
            <i className="fas fa-camera"></i>
          </div>
          <button 
            onClick={startCamera} 
            disabled={!isScannerReady}
            className="bg-teal-600 dark:bg-teal-500 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-teal-600/20 dark:shadow-teal-400/20 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
          >
            {isScannerReady ? 'Start Scanning' : 'Wait for engine...'}
          </button>
          <p className="mt-6 text-slate-400 text-xs font-bold uppercase tracking-widest">Supports Auto Edge Detection</p>
        </div>
      )}

      {stream && (
        <div className="relative rounded-[2.5rem] overflow-hidden bg-black shadow-2xl aspect-[3/4] md:aspect-video max-w-2xl mx-auto ring-8 ring-slate-100 dark:ring-slate-800">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          ></video>
          <canvas ref={canvasRef} className="hidden"></canvas>
          
          {/* Overlay Guide */}
          <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none">
            <div className="w-full h-full border-2 border-dashed border-white/50 rounded-xl"></div>
          </div>

          <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8">
            <button 
              onClick={captureFrame} 
              className="w-20 h-20 bg-white dark:bg-slate-100 border-8 border-teal-500/30 rounded-full flex items-center justify-center text-teal-600 text-2xl active:scale-90 transition-all shadow-2xl"
              title="Capture Page"
            >
              <i className="fas fa-camera"></i>
            </button>
            
            {capturedImages.length > 0 && (
              <button 
                onClick={generatePDF} 
                className="bg-teal-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl flex items-center gap-2 animate-in slide-in-from-right-4"
              >
                Finish PDF <span className="bg-white/20 px-2 py-0.5 rounded-lg">{capturedImages.length}</span>
              </button>
            )}
            
            <button 
              onClick={stopCamera} 
              className="w-12 h-12 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
            >
               <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {capturedImages.length > 0 && (
        <div className="mt-12 max-w-2xl mx-auto">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 text-center">Captured Pages</h3>
          <div className="flex gap-4 overflow-x-auto pb-6 px-2 no-scrollbar">
            {capturedImages.map((img, i) => (
              <div key={i} className="flex-shrink-0 w-24 aspect-[3/4] rounded-xl border-2 border-teal-500 overflow-hidden relative group shadow-lg">
                <img src={img} className="w-full h-full object-cover" />
                <button 
                  onClick={() => setCapturedImages(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute inset-0 bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
                <div className="absolute bottom-1 left-1 bg-teal-500 text-white text-[8px] px-1.5 py-0.5 rounded font-black">
                  #{i+1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] border-2 border-teal-500 text-center shadow-2xl animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-teal-500 text-white text-3xl rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-teal-500/20">
            <i className="fas fa-check"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Scan Saved!</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-10">Your documents were processed locally.</p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href={state.resultUrl} 
              download={state.resultFileName} 
              className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-orange-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <i className="fas fa-download mr-2"></i> Download PDF
            </a>
            <button 
              onClick={() => { setCapturedImages([]); setState({ status: 'idle', progress: 0 }); }} 
              className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-10 py-4 rounded-2xl font-black text-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Start New
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scan;
