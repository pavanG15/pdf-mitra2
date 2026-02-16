
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ProcessingState } from '../types';

// Access external libraries from the window object
declare const jspdf: any;
declare const jscanify: any;
declare const JSZip: any;

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
  name: string;
  date: string;
}

const Scan: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const scannerRef = useRef<any>(null); 
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPages, setCapturedPages] = useState<CapturedPage[]>([]);
  
  // UI Steps: 'camera' | 'crop' | 'edit' | 'gallery' | 'preview' | 'idle'
  const [uiStep, setUiStep] = useState<'camera' | 'crop' | 'edit' | 'gallery' | 'preview' | 'idle'>('idle');
  
  const [currentCapture, setCurrentCapture] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState<CapturedPage | null>(null);
  const [currentFilter, setCurrentFilter] = useState<ScanFilter>('bw');
  const [currentMode, setCurrentMode] = useState<ScanMode>('document');
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(true);
  
  const [folderName, setFolderName] = useState("Gorakh_kachru_khope");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'PDF' | 'JPG'>('PDF');
  
  // Share Modal Toggles
  const [enablePassword, setEnablePassword] = useState(false);
  const [enableOCR, setEnableOCR] = useState(true);
  const [saveSeparately, setSaveSeparately] = useState(false); // New: Save separate files
  const [pageSize, setPageSize] = useState<'A4' | 'Auto'>('A4');

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Processing State
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });

  useEffect(() => {
    if (typeof jscanify !== 'undefined') {
      scannerRef.current = new jscanify();
    }
  }, []);

  const startCamera = async () => {
    try {
      setState({ status: 'loading', progress: 0 });
      const constraints = {
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setUiStep('camera');
      setState({ status: 'idle', progress: 0 });
    } catch (err) {
      alert("Unable to access camera.");
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
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const rawData = canvas.toDataURL('image/jpeg', 0.95);
    setCurrentCapture(rawData);
    
    if (isAutoMode) {
      processAutoImage(rawData);
    } else {
      setUiStep('crop');
    }
  };

  const processAutoImage = (imageSrc: string) => {
    setState({ status: 'processing', progress: 50, message: 'Detecting Edges...' });
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      if (!canvasRef.current || !scannerRef.current) return;
      let finalCanvas = canvasRef.current;
      try {
        finalCanvas = scannerRef.current.extractPaper(img, img.width, img.height);
      } catch (e) { console.warn(e); }

      const processedData = finalCanvas.toDataURL('image/jpeg', 0.85);
      const newPage: CapturedPage = { 
        original: imageSrc, 
        processed: processedData, 
        filter: 'bw',
        id: Math.random().toString(36).substr(2, 9),
        name: `Document ${capturedPages.length + 1}`,
        date: new Date().toLocaleDateString('en-GB')
      };
      setCapturedPages(prev => [...prev, newPage]);
      setState({ status: 'idle', progress: 0 });
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

  const updateDocName = (id: string, newName: string) => {
    setCapturedPages(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
    setEditingId(null);
  };

  const handleExport = async () => {
    const targets = isSelectMode 
      ? capturedPages.filter(p => selectedIds.has(p.id))
      : capturedPages;

    if (targets.length === 0) return;
    
    setState({ status: 'processing', progress: 10, message: 'Preparing Export...' });

    try {
      const { jsPDF } = (window as any).jspdf;
      
      if (saveSeparately) {
        // ZIP individual files
        setState({ status: 'processing', progress: 30, message: 'Creating Separate Files...' });
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
          resultFileName: `${folderName}_separated.zip`,
          progress: 100 
        });
      } else {
        // Merged PDF
        const doc = new jsPDF('p', 'mm', 'a4');
        for (let i = 0; i < targets.length; i++) {
          if (i > 0) doc.addPage();
          doc.addImage(targets[i].processed, 'JPEG', 0, 0, 210, 297);
          setState({ status: 'processing', progress: Math.round((i/targets.length)*90), message: `Merging Page ${i+1}...` });
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
      setState({ status: 'error', progress: 0, message: 'Export failed.' });
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#f8fafc] dark:bg-slate-950 flex flex-col overflow-hidden h-screen w-screen select-none font-sans">
      <canvas ref={canvasRef} className="hidden"></canvas>
      <canvas ref={cropCanvasRef} className="hidden"></canvas>

      {/* TOP NAVIGATION (Screenshot 8/9 Style) */}
      {(uiStep === 'gallery' || uiStep === 'preview') && (
        <div className="bg-white dark:bg-slate-900 pt-10 pb-4 px-4 border-b border-slate-200 dark:border-slate-800 shadow-sm z-50">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <button onClick={() => uiStep === 'preview' ? setUiStep('gallery') : stopCamera()} className="text-slate-600 dark:text-slate-400 text-xl active:scale-90 transition-transform">
                   <i className="fas fa-arrow-left"></i>
                 </button>
                 <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Home <i className="fas fa-chevron-right mx-1 text-[8px]"></i></span>
                      <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest">{folderName}</span>
                    </div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase mt-1">
                      {isSelectMode ? `${selectedIds.size} Selected` : `Documents (${capturedPages.length})`}
                    </h2>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <button 
                  onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds(new Set()); }}
                  className={`text-lg transition-colors ${isSelectMode ? 'text-teal-500' : 'text-slate-400'}`}
                 >
                   <i className="fas fa-check-double"></i>
                 </button>
                 <button className="text-slate-400 text-lg"><i className="fas fa-ellipsis-v"></i></button>
              </div>
           </div>
        </div>
      )}

      {/* GALLERY VIEW (High Fidelity Screenshot 8 Style) */}
      {uiStep === 'gallery' && (
        <div className="flex-1 overflow-y-auto p-5 bg-[#f0f4f7] dark:bg-slate-950 no-scrollbar">
          <div className="grid grid-cols-3 gap-5">
             {capturedPages.map((p, i) => (
               <div key={p.id} className="flex flex-col animate-in zoom-in duration-300">
                  <div 
                    onClick={() => isSelectMode ? toggleSelect(p.id) : (setPreviewPage(p), setUiStep('preview'))}
                    className={`relative aspect-[3/4] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-md border-2 transition-all ${selectedIds.has(p.id) ? 'border-teal-500 ring-4 ring-teal-500/10' : 'border-transparent'}`}
                  >
                     <img src={p.processed} className="w-full h-full object-cover" alt="" />
                     
                     {/* Blue Checkmark Badge */}
                     <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${selectedIds.has(p.id) ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white text-xl shadow-xl ring-4 ring-white">
                           <i className="fas fa-check"></i>
                        </div>
                     </div>

                     {/* Overflow Menu Icon */}
                     <button className="absolute top-2 right-2 w-7 h-7 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white text-[10px]">
                        <i className="fas fa-ellipsis-h"></i>
                     </button>

                     {/* Document Index Badge */}
                     <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-md text-teal-600 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-slate-100 flex items-center gap-1 shadow-sm">
                        <span className="opacity-60">1</span>
                        <i className="fas fa-file-pdf"></i>
                     </div>
                  </div>
                  
                  {/* METADATA SECTION (Renameable) */}
                  <div className="pt-2 px-1">
                    <div className="flex items-center justify-between mb-0.5">
                      {editingId === p.id ? (
                        <input 
                          autoFocus
                          defaultValue={p.name}
                          onBlur={(e) => updateDocName(p.id, e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && updateDocName(p.id, (e.target as any).value)}
                          className="text-[10px] font-black text-teal-600 bg-teal-50 rounded px-1 outline-none w-full"
                        />
                      ) : (
                        <span 
                          onClick={(e) => { e.stopPropagation(); setEditingId(p.id); }}
                          className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase truncate max-w-[60px] cursor-text"
                        >
                          {p.name}
                        </span>
                      )}
                    </div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{p.date}</span>
                  </div>
               </div>
             ))}
             
             {/* ADD NEW BUTTON */}
             {!isSelectMode && (
                <button onClick={() => setUiStep('camera')} className="aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 bg-white/20 flex flex-col items-center justify-center text-slate-400 hover:text-teal-500 transition-all active:scale-95">
                   <i className="fas fa-camera text-2xl mb-2"></i>
                   <span className="text-[8px] font-black uppercase tracking-widest">Add Page</span>
                </button>
             )}
          </div>
        </div>
      )}

      {/* SELECTION FOOTER (Screenshot 1 Style) */}
      {uiStep === 'gallery' && isSelectMode && (
        <div className="bg-white dark:bg-slate-900 p-8 pb-14 border-t border-slate-100 dark:border-slate-800 flex gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 animate-in slide-in-from-bottom duration-300">
           <button 
             onClick={deleteSelected} 
             disabled={selectedIds.size === 0} 
             className="flex-1 bg-[#ffeef0] dark:bg-rose-950/30 text-rose-500 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest disabled:opacity-30 border border-rose-100 dark:border-rose-900 active:scale-95 transition-all"
           >
             DELETE ({selectedIds.size})
           </button>
           <button 
             onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }} 
             className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-400 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
           >
             CANCEL
           </button>
        </div>
      )}

      {/* FLOATING ACTION BUTTONS (Screenshot 8/9 Style) */}
      {uiStep === 'gallery' && !isSelectMode && (
        <div className="fixed bottom-12 right-6 flex flex-col gap-4 z-50">
           <button 
            onClick={() => setShowShareModal(true)} 
            disabled={capturedPages.length === 0}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-2xl transition-all active:scale-90 ${capturedPages.length > 0 ? 'bg-white text-teal-600' : 'bg-slate-200 text-slate-400 opacity-50'}`}
           >
             <i className="fas fa-share-nodes"></i>
           </button>
           <button 
            onClick={startCamera} 
            className="w-20 h-20 bg-teal-500 rounded-3xl flex items-center justify-center text-white text-3xl shadow-2xl shadow-teal-500/40 active:scale-90 transition-all border-4 border-white"
           >
             <i className="fas fa-camera"></i>
           </button>
        </div>
      )}

      {/* SHARE MODAL (Screenshot 2 Fidelity) */}
      {showShareModal && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm animate-in fade-in flex items-end">
           <div className="w-full bg-white dark:bg-slate-900 rounded-t-[3rem] p-8 pb-16 animate-in slide-in-from-bottom duration-500 max-w-2xl mx-auto shadow-2xl flex flex-col gap-8">
              
              {/* Header Info */}
              <div className="flex items-center gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                 <div className="w-16 h-16 bg-blue-500 text-white rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                    <i className="fas fa-share"></i>
                 </div>
                 <div className="flex-1">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white truncate">vc and other {capturedPages.length - 1} documents</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{capturedPages.length} Document | {capturedPages.length} Files</p>
                 </div>
              </div>

              {/* Toggles List (Exactly like Screenshot 2) */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Share as PDF</span>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                       <button onClick={() => setExportFormat('PDF')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${exportFormat === 'PDF' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md' : 'text-slate-400'}`}>PDF</button>
                       <button onClick={() => setExportFormat('JPG')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${exportFormat === 'JPG' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md' : 'text-slate-400'}`}>IMAGE(JPG)</button>
                    </div>
                 </div>

                 {[
                   { label: 'Enable Password Protection', value: enablePassword, setter: setEnablePassword },
                   { label: 'Searchable PDF with OCR Text', value: enableOCR, setter: setEnableOCR },
                   { label: 'Save Separately (ZIP)', value: saveSeparately, setter: setSaveSeparately },
                 ].map((item, idx) => (
                   <div key={idx} className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800/50">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                      <button 
                        onClick={() => item.setter(!item.value)} 
                        className={`w-12 h-6 rounded-full transition-all relative ${item.value ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${item.value ? 'left-7' : 'left-1'}`}></div>
                      </button>
                   </div>
                 ))}

                 <div className="flex items-center justify-between py-3">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">PDF Page Size: <span className="text-blue-500 ml-2">{pageSize}</span></span>
                    <i className="fas fa-chevron-right text-slate-300 text-xs"></i>
                 </div>

                 <button className="text-blue-500 text-[11px] font-black uppercase tracking-widest underline underline-offset-4 decoration-2">Compress Now</button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-4">
                 <button onClick={() => setShowShareModal(false)} className="flex-1 py-5 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-black text-slate-400 uppercase tracking-widest text-xs">CANCEL</button>
                 <button onClick={handleExport} className="flex-1 py-5 bg-[#1d3345] text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">SHARE</button>
              </div>
           </div>
        </div>
      )}

      {/* CAMERA VIEW */}
      {uiStep === 'camera' && (
        <div className="flex-1 flex flex-col h-full bg-black relative animate-in fade-in duration-300">
          <div className="absolute top-10 left-0 right-0 px-6 flex justify-between items-center z-20">
            <button onClick={() => setUiStep('gallery')} className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full text-white"><i className="fas fa-times"></i></button>
            <div className="bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/5">
               <button onClick={() => setIsAutoMode(true)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${isAutoMode ? 'bg-teal-500 text-black' : 'text-white'}`}>Auto</button>
               <button onClick={() => setIsAutoMode(false)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${!isAutoMode ? 'bg-teal-500 text-black' : 'text-white'}`}>Manual</button>
            </div>
            <button onClick={() => setIsFlashOn(!isFlashOn)} className={`w-12 h-12 rounded-full backdrop-blur-md transition-all ${isFlashOn ? 'bg-orange-500 text-white' : 'bg-white/10 text-white'}`}><i className="fas fa-bolt"></i></button>
          </div>
          <video ref={videoRef} autoPlay playsInline muted className="flex-1 object-cover" onLoadedMetadata={() => videoRef.current?.play()}></video>
          
          <div className="bg-black/90 p-10 pb-16 flex items-center justify-between px-12 border-t border-white/5">
             <div className="w-16 h-16 rounded-2xl border-2 border-white/10 overflow-hidden" onClick={() => setUiStep('gallery')}>
                {capturedPages.length > 0 ? <img src={capturedPages[capturedPages.length-1].processed} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-white/5"></div>}
             </div>
             <button onClick={capturePhoto} className="w-24 h-24 rounded-full border-[6px] border-white/20 p-2 active:scale-95 transition-all">
                <div className="w-full h-full bg-white rounded-full"></div>
             </button>
             <button onClick={() => setUiStep('gallery')} className="w-16 h-16 flex flex-col items-center justify-center text-white bg-white/10 rounded-2xl">
                <span className="text-xl font-black">{capturedPages.length}</span>
                <span className="text-[8px] font-black uppercase">Docs</span>
             </button>
          </div>
        </div>
      )}

      {/* IDLE LANDING */}
      {uiStep === 'idle' && state.status !== 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-950">
           <div className="w-24 h-24 bg-teal-500/10 text-teal-500 rounded-[2rem] flex items-center justify-center text-4xl mb-8 border border-teal-500/20 shadow-2xl"><i className="fas fa-camera"></i></div>
           <h1 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase">Pro Scanner</h1>
           <p className="text-slate-500 mb-12 font-medium text-xs tracking-widest uppercase">Privacy-First • Local Renaming</p>
           <button onClick={startCamera} className="bg-teal-600 text-white px-14 py-6 rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all">OPEN CAMERA</button>
           <button onClick={() => setUiStep('gallery')} className="mt-8 text-slate-600 font-black text-[10px] uppercase tracking-[0.3em]">View Saved Documents ({capturedPages.length})</button>
        </div>
      )}

      {/* SUCCESS VIEW */}
      {state.status === 'success' && (
        <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center p-12 text-center animate-in zoom-in duration-500">
           <div className="w-28 h-28 bg-teal-500 text-white text-5xl rounded-[3rem] flex items-center justify-center mb-12 shadow-2xl border-4 border-white/10"><i className="fas fa-check-double"></i></div>
           <h2 className="text-5xl font-black text-white mb-6 uppercase tracking-tighter">PDF READY!</h2>
           <p className="text-slate-500 mb-14 font-black text-xs uppercase tracking-widest opacity-80">Export successful</p>
           <div className="flex flex-col gap-5 w-full max-w-sm">
              <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white py-7 rounded-[2.5rem] font-black text-2xl shadow-2xl active:scale-95 transition-transform flex items-center justify-center gap-5 uppercase">
                <i className="fas fa-file-download"></i> DOWNLOAD
              </a>
              <button onClick={() => { setState({status:'idle', progress: 0}); setUiStep('gallery'); }} className="text-slate-500 font-black text-[11px] uppercase tracking-[0.4em] py-6 hover:text-teal-500 transition-colors">BACK TO FOLDER</button>
           </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {(state.status === 'processing' || state.status === 'loading') && (
        <div className="fixed inset-0 z-[30000] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center text-white animate-in fade-in">
           <div className="relative w-28 h-28 mb-12">
              <div className="absolute inset-0 border-[10px] border-white/5 rounded-full"></div>
              <div className="absolute inset-0 border-[10px] border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-teal-500 text-xl font-black">{state.progress}%</div>
           </div>
           <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">Working...</h2>
           <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.6em]">{state.message}</p>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes scan { 0%, 100% { top: 0%; opacity: 0; } 50% { top: 100%; opacity: 1; } }
      `}</style>
    </div>
  );
};

export default Scan;
