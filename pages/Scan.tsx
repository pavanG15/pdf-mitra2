
import React, { useState, useRef, useEffect } from 'react';
import { ProcessingState } from '../types';

// Access external libraries from the window object
declare const jspdf: any;
declare const jscanify: any;
declare const JSZip: any;

type ScanFilter = 'none' | 'document' | 'magic_color' | 'bw' | 'grayscale';

interface CapturedPage {
  original: string;
  processed: string;
  filter: ScanFilter;
  id: string;
  name: string;
  date: string;
}

const Scan: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scannerRef = useRef<any>(null); 
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPages, setCapturedPages] = useState<CapturedPage[]>([]);
  
  // UI Steps: 'camera' | 'gallery' | 'preview'
  const [uiStep, setUiStep] = useState<'camera' | 'gallery' | 'preview'>('gallery');
  
  const [previewPage, setPreviewPage] = useState<CapturedPage | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(true);
  
  const [folderName, setFolderName] = useState("Scan_Project_01");
  const [isRenamingFolder, setIsRenamingFolder] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'PDF' | 'JPG'>('PDF');
  
  // Share Modal Toggles
  const [enablePassword, setEnablePassword] = useState(false);
  const [enableOCR, setEnableOCR] = useState(false);
  const [saveSeparately, setSaveSeparately] = useState(false);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Processing State
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });

  useEffect(() => {
    if (typeof jscanify !== 'undefined') {
      scannerRef.current = new jscanify();
    }
  }, []);

  // CRITICAL FIX: Ensure video stream is attached to the video element whenever uiStep is 'camera'
  useEffect(() => {
    if (uiStep === 'camera' && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [uiStep, stream]);

  const startCamera = async () => {
    try {
      setState({ status: 'loading', progress: 0, message: 'Waking up camera...' });
      const constraints = {
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setUiStep('camera');
      setState({ status: 'idle', progress: 0 });
    } catch (err) {
      console.error(err);
      alert("Camera access failed. Please check site permissions.");
      setState({ status: 'idle', progress: 0 });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setUiStep('gallery');
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Set canvas dimensions to match video stream
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const rawData = canvas.toDataURL('image/jpeg', 0.95);
    processImage(rawData);
  };

  const processImage = (imageSrc: string) => {
    setState({ status: 'processing', progress: 40, message: 'Processing Document...' });
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      if (!canvasRef.current || !scannerRef.current) return;
      let finalCanvas = canvasRef.current;
      
      if (isAutoMode) {
        try {
          // jscanify edge detection and perspective correction
          finalCanvas = scannerRef.current.extractPaper(img, img.width, img.height);
        } catch (e) {
          console.warn("Auto extraction failed, using raw capture", e);
        }
      }

      const processedData = finalCanvas.toDataURL('image/jpeg', 0.85);
      const newPage: CapturedPage = { 
        original: imageSrc, 
        processed: processedData, 
        filter: 'bw',
        id: Math.random().toString(36).substr(2, 9),
        name: `Page ${capturedPages.length + 1}`,
        date: new Date().toLocaleDateString('en-GB')
      };
      
      setCapturedPages(prev => [...prev, newPage]);
      setState({ status: 'idle', progress: 0 });
      
      // If auto mode is on, we stay in camera to allow continuous scanning
      if (!isAutoMode) {
         setUiStep('gallery');
         stopCamera();
      }
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

  const handleExport = async () => {
    const targets = isSelectMode 
      ? capturedPages.filter(p => selectedIds.has(p.id))
      : capturedPages;

    if (targets.length === 0) return;
    
    setState({ status: 'processing', progress: 10, message: 'Building PDF...' });

    try {
      const { jsPDF } = (window as any).jspdf;
      
      if (saveSeparately) {
        const zip = new JSZip();
        for (let i = 0; i < targets.length; i++) {
          const page = targets[i];
          const doc = new jsPDF('p', 'mm', 'a4');
          doc.addImage(page.processed, 'JPEG', 0, 0, 210, 297);
          const pdfBlob = doc.output('blob');
          zip.file(`${page.name}.pdf`, pdfBlob);
          setState({ status: 'processing', progress: 30 + Math.round((i/targets.length)*60), message: `Zipping ${page.name}...` });
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        setState({ 
          status: 'success', 
          resultUrl: URL.createObjectURL(zipBlob), 
          resultFileName: `${folderName}.zip`,
          progress: 100 
        });
      } else {
        const doc = new jsPDF('p', 'mm', 'a4');
        for (let i = 0; i < targets.length; i++) {
          if (i > 0) doc.addPage();
          doc.addImage(targets[i].processed, 'JPEG', 0, 0, 210, 297);
          setState({ status: 'processing', progress: Math.round((i/targets.length)*90), message: `Adding Page ${i+1}...` });
        }
        const blob = doc.output('blob');
        setState({ 
          status: 'success', 
          resultUrl: URL.createObjectURL(blob), 
          resultFileName: `${folderName}.pdf`,
          progress: 100 
        });
      }
      setShowShareModal(false);
    } catch (e) {
      console.error(e);
      setState({ status: 'error', progress: 0, message: 'Export Error. Please try again.' });
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020617] text-white flex flex-col overflow-hidden h-screen w-screen select-none font-sans transition-colors duration-500">
      <canvas ref={canvasRef} className="hidden"></canvas>

      {/* 1. TOP NAVBAR (Gallery & Preview Mode) */}
      {(uiStep === 'gallery' || uiStep === 'preview') && (
        <div className="pt-12 pb-4 px-6 border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-[100]">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <button onClick={() => uiStep === 'preview' ? setUiStep('gallery') : stopCamera()} className="w-10 h-10 flex items-center justify-center text-white/60 text-xl active:scale-90 transition-transform">
                   <i className="fas fa-arrow-left"></i>
                 </button>
                 <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Home <i className="fas fa-chevron-right mx-1 text-[7px]"></i></span>
                      {isRenamingFolder ? (
                        <input 
                          autoFocus
                          defaultValue={folderName}
                          onBlur={(e) => { setFolderName(e.target.value || "New Document"); setIsRenamingFolder(false); }}
                          onKeyDown={(e) => e.key === 'Enter' && (setFolderName((e.target as any).value || "New Document"), setIsRenamingFolder(false))}
                          className="text-[10px] font-black text-teal-400 bg-teal-400/10 rounded px-2 outline-none border border-teal-400/30"
                        />
                      ) : (
                        <span onClick={() => setIsRenamingFolder(true)} className="text-[10px] font-black text-teal-400 uppercase tracking-widest cursor-pointer flex items-center gap-1.5 hover:text-teal-300">
                          {folderName} <i className="fas fa-pen text-[7px] opacity-30"></i>
                        </span>
                      )}
                    </div>
                    <h2 className="text-sm font-black text-white uppercase mt-1 tracking-tight">
                      {isSelectMode ? `${selectedIds.size} Selected` : `DOCUMENTS (${capturedPages.length})`}
                    </h2>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <button 
                  onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds(new Set()); }}
                  className={`w-10 h-10 flex items-center justify-center text-lg transition-all active:scale-90 ${isSelectMode ? 'text-teal-400' : 'text-white/40'}`}
                 >
                   <i className="fas fa-check-double"></i>
                 </button>
                 <button className="w-10 h-10 flex items-center justify-center text-white/40 text-lg active:scale-90 transition-transform"><i className="fas fa-ellipsis-v"></i></button>
              </div>
           </div>
        </div>
      )}

      {/* 2. MAIN GALLERY CONTENT */}
      {uiStep === 'gallery' && (
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar pb-40 bg-[#020617]">
          <div className="grid grid-cols-3 gap-6">
             {/* ADD PAGE CARD (Matches screenshot style) */}
             {!isSelectMode && (
                <div 
                  onClick={startCamera}
                  className="aspect-[3/4] rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center text-white/40 active:scale-95 transition-all cursor-pointer hover:bg-white/10 hover:border-white/20"
                >
                   <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3 text-xl">
                      <i className="fas fa-camera"></i>
                   </div>
                   <span className="text-[8px] font-black uppercase tracking-[0.2em]">Add Page</span>
                </div>
             )}

             {capturedPages.map((p) => (
               <div key={p.id} className="flex flex-col animate-in zoom-in duration-300">
                  <div 
                    onClick={() => isSelectMode ? toggleSelect(p.id) : (setPreviewPage(p), setUiStep('preview'))}
                    className={`relative aspect-[3/4] bg-white/5 rounded-2xl overflow-hidden shadow-2xl border-2 transition-all cursor-pointer ${selectedIds.has(p.id) ? 'border-teal-500 ring-4 ring-teal-500/20' : 'border-white/5'}`}
                  >
                     <img src={p.processed} className="w-full h-full object-cover" alt="" />
                     
                     {/* Blue Checkmark Badge */}
                     {selectedIds.has(p.id) && (
                        <div className="absolute inset-0 bg-teal-500/20 flex items-center justify-center animate-in fade-in duration-200">
                           <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white text-lg shadow-xl border-4 border-white">
                              <i className="fas fa-check"></i>
                           </div>
                        </div>
                     )}

                     {/* Overflow Menu Icon */}
                     <button className="absolute top-2 right-2 w-7 h-7 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white text-[10px]">
                        <i className="fas fa-ellipsis-h"></i>
                     </button>

                     {/* PDF Badge */}
                     <div className="absolute bottom-2 right-2 bg-white/10 backdrop-blur-md text-white text-[8px] font-black px-1.5 py-0.5 rounded-md border border-white/10 flex items-center gap-1 shadow-sm">
                        <span className="opacity-60">1</span>
                        <i className="fas fa-file-pdf text-teal-400"></i>
                     </div>
                  </div>
                  
                  <div className="pt-2.5 px-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-black text-white/80 uppercase truncate max-w-[60px]">{p.name}</span>
                      <i className="fas fa-ellipsis-v text-[8px] text-white/20"></i>
                    </div>
                    <span className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">{p.date}</span>
                  </div>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* 3. FLOATING CAMERA & SHARE BUTTONS */}
      {uiStep === 'gallery' && !isSelectMode && (
        <div className="fixed bottom-12 right-8 flex flex-col items-end gap-5 z-[200]">
           <button 
            onClick={() => setShowShareModal(true)} 
            disabled={capturedPages.length === 0}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-2xl transition-all active:scale-90 ${capturedPages.length > 0 ? 'bg-white/10 text-white backdrop-blur-xl border border-white/10' : 'bg-white/5 text-white/10 cursor-not-allowed border border-white/5'}`}
           >
             <i className="fas fa-share-nodes"></i>
           </button>
           <button 
            onClick={startCamera} 
            className="w-20 h-20 bg-teal-500 rounded-[2rem] flex items-center justify-center text-white text-3xl shadow-[0_20px_60px_-15px_rgba(20,184,166,0.6)] active:scale-90 transition-all border-4 border-white/20 hover:brightness-110"
           >
             <i className="fas fa-camera"></i>
           </button>
        </div>
      )}

      {/* 4. SELECTION FOOTER (Delete Button) */}
      {uiStep === 'gallery' && isSelectMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0f172a] p-8 pb-14 border-t border-white/5 flex gap-5 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-[300] animate-in slide-in-from-bottom duration-300">
           <button 
             onClick={() => {
                setCapturedPages(prev => prev.filter(p => !selectedIds.has(p.id)));
                setSelectedIds(new Set());
                setIsSelectMode(false);
             }} 
             disabled={selectedIds.size === 0} 
             className="flex-1 bg-rose-500/10 text-rose-500 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest disabled:opacity-20 active:scale-95 transition-all border border-rose-500/20 flex items-center justify-center gap-3"
           >
             <i className="fas fa-trash-alt"></i> DELETE ({selectedIds.size})
           </button>
           <button 
             onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }} 
             className="flex-1 bg-white/5 text-white/40 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest active:scale-95 transition-all border border-white/5"
           >
             CANCEL
           </button>
        </div>
      )}

      {/* 5. FULLSCREEN CAMERA INTERFACE */}
      {uiStep === 'camera' && (
        <div className="absolute inset-0 z-[500] flex flex-col bg-black animate-in fade-in duration-300">
          <div className="absolute top-12 left-0 right-0 px-8 flex justify-between items-center z-[510]">
            <button onClick={stopCamera} className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full text-white active:scale-90 transition-transform flex items-center justify-center">
              <i className="fas fa-times text-xl"></i>
            </button>
            <div className="bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/10 flex">
               <button onClick={() => setIsAutoMode(true)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${isAutoMode ? 'bg-teal-500 text-black shadow-lg shadow-teal-500/30' : 'text-white/60'}`}>Auto</button>
               <button onClick={() => setIsAutoMode(false)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${!isAutoMode ? 'bg-teal-500 text-black shadow-lg shadow-teal-500/30' : 'text-white/60'}`}>Manual</button>
            </div>
            <button onClick={() => setIsFlashOn(!isFlashOn)} className={`w-12 h-12 rounded-full backdrop-blur-md transition-all active:scale-90 flex items-center justify-center ${isFlashOn ? 'bg-orange-500 text-white' : 'bg-white/10 text-white border border-white/10'}`}>
              <i className="fas fa-bolt"></i>
            </button>
          </div>
          
          <video ref={videoRef} autoPlay playsInline muted className="flex-1 object-cover" onLoadedMetadata={() => videoRef.current?.play()}></video>
          
          <div className="bg-[#020617] p-10 pb-16 flex items-center justify-between px-16 border-t border-white/5">
             <div className="w-16 h-16 rounded-2xl border-2 border-white/10 overflow-hidden bg-white/5 cursor-pointer flex items-center justify-center" onClick={() => setUiStep('gallery')}>
                {capturedPages.length > 0 ? <img src={capturedPages[capturedPages.length-1].processed} className="w-full h-full object-cover" alt="" /> : <i className="fas fa-folder text-white/10"></i>}
             </div>
             
             {/* SHUTTER BUTTON */}
             <button 
              onClick={capturePhoto} 
              className="w-24 h-24 rounded-full border-[8px] border-white/10 p-2 active:scale-95 transition-all shadow-2xl group"
             >
                <div className="w-full h-full bg-white rounded-full group-hover:scale-95 transition-transform"></div>
             </button>
             
             <button onClick={() => setUiStep('gallery')} className="w-16 h-16 flex flex-col items-center justify-center text-white bg-white/5 rounded-2xl border border-white/5 active:scale-95 transition-all">
                <span className="text-xl font-black">{capturedPages.length}</span>
                <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Docs</span>
             </button>
          </div>
        </div>
      )}

      {/* 6. SHARE MODAL (Fidelity to Screenshot 2) */}
      {showShareModal && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-xl animate-in fade-in flex items-end">
           <div className="w-full bg-white text-slate-900 rounded-t-[3rem] p-8 pb-16 animate-in slide-in-from-bottom duration-500 max-w-2xl mx-auto shadow-2xl flex flex-col gap-8">
              <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                 <div className="w-16 h-16 bg-blue-500 text-white rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-blue-500/20">
                    <i className="fas fa-share"></i>
                 </div>
                 <div className="flex-1">
                    <h3 className="text-xl font-black truncate">{folderName}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{capturedPages.length} Documents | Local Assets</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-bold text-slate-700">Output Mode</span>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                       <button onClick={() => setExportFormat('PDF')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${exportFormat === 'PDF' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>PDF</button>
                       <button onClick={() => setExportFormat('JPG')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${exportFormat === 'JPG' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>JPG</button>
                    </div>
                 </div>

                 {[
                   { label: 'Save Separately (ZIP File)', value: saveSeparately, setter: setSaveSeparately },
                   { label: 'Enable Password Protection', value: enablePassword, setter: setEnablePassword },
                   { label: 'Extract OCR Text (Pro)', value: enableOCR, setter: setEnableOCR },
                 ].map((item, idx) => (
                   <div key={idx} className="flex items-center justify-between py-3.5 border-b border-slate-50">
                      <span className="text-sm font-bold text-slate-700">{item.label}</span>
                      <button 
                        onClick={() => item.setter(!item.value)} 
                        className={`w-12 h-6 rounded-full transition-all relative ${item.value ? 'bg-blue-500' : 'bg-slate-200'}`}
                      >
                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${item.value ? 'left-7' : 'left-1'}`}></div>
                      </button>
                   </div>
                 ))}
              </div>

              <div className="flex gap-4 mt-4">
                 <button onClick={() => setShowShareModal(false)} className="flex-1 py-5 bg-slate-100 rounded-2xl font-black text-slate-400 uppercase tracking-widest text-xs active:scale-95 transition-all">CANCEL</button>
                 <button onClick={handleExport} className="flex-1 py-5 bg-[#1d3345] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">SAVE & SHARE</button>
              </div>
           </div>
        </div>
      )}

      {/* 7. PROCESSING & SUCCESS OVERLAYS */}
      {(state.status === 'processing' || state.status === 'loading') && (
        <div className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center text-white animate-in fade-in">
           <div className="relative w-32 h-32 mb-10">
              <div className="absolute inset-0 border-[8px] border-white/5 rounded-full"></div>
              <div className="absolute inset-0 border-[8px] border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-teal-500 text-2xl font-black">{state.progress}%</div>
           </div>
           <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">Working...</h2>
           <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.4em]">{state.message}</p>
        </div>
      )}

      {state.status === 'success' && (
        <div className="fixed inset-0 z-[3000] bg-[#020617] flex flex-col items-center justify-center p-12 text-center animate-in zoom-in duration-500">
           <div className="w-32 h-32 bg-teal-500 text-white text-5xl rounded-[3rem] flex items-center justify-center mb-10 shadow-2xl border-4 border-white/20 animate-bounce">
              <i className="fas fa-check-double"></i>
           </div>
           <h2 className="text-5xl font-black text-white mb-6 uppercase tracking-tighter">DONE!</h2>
           <p className="text-white/30 mb-14 font-black text-xs uppercase tracking-[0.3em]">Project exported to local disk.</p>
           <div className="flex flex-col gap-4 w-full max-w-sm">
              <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white py-6 rounded-[2rem] font-black text-2xl shadow-2xl active:scale-95 transition-transform flex items-center justify-center gap-4 uppercase tracking-tight">
                <i className="fas fa-file-download"></i> DOWNLOAD
              </a>
              <button onClick={() => { setState({status:'idle', progress: 0}); setUiStep('gallery'); }} className="text-white/40 font-black text-[10px] uppercase tracking-[0.4em] py-6 hover:text-teal-400 transition-colors">BACK TO FOLDER</button>
           </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Scan;
