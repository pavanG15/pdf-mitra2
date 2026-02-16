
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ProcessingState } from '../types';

declare const jspdf: any;

type ScanFilter = 'none' | 'document' | 'bw' | 'grayscale';
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
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPages, setCapturedPages] = useState<CapturedPage[]>([]);
  
  // UI Steps: 'camera' | 'crop' | 'edit' | 'gallery' | 'idle'
  const [uiStep, setUiStep] = useState<'camera' | 'crop' | 'edit' | 'gallery' | 'idle'>('idle');
  
  const [currentCapture, setCurrentCapture] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<ScanFilter>('document');
  const [currentMode, setCurrentMode] = useState<ScanMode>('document');
  
  // New features
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

  const startCamera = async () => {
    try {
      setState({ status: 'loading', progress: 0 });
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setUiStep('camera');
      setState({ status: 'idle', progress: 0 });
    } catch (err) {
      alert("Camera access denied. Please allow camera permissions in your settings.");
      setUiStep('idle');
    }
  };

  useEffect(() => {
    if (uiStep === 'camera' && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [uiStep, stream]);

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

    const flash = document.createElement('div');
    flash.className = 'fixed inset-0 bg-white z-[99999] animate-pulse';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 100);

    const rawData = canvas.toDataURL('image/jpeg', 0.95);
    setCurrentCapture(rawData);
    setCropPoints([{ x: 15, y: 15 }, { x: 85, y: 15 }, { x: 85, y: 85 }, { x: 15, y: 85 }]);
    setUiStep('crop');
  };

  const handlePointMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (draggingIdx === null || !cropContainerRef.current) return;
    const rect = cropContainerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
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
          data[i] = data[i+1] = data[i+2] = (avg > 120 ? 255 : 0);
        }
      } else if (currentFilter === 'grayscale') {
        for (let i = 0; i < data.length; i += 4) {
          const g = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
          data[i] = data[i+1] = data[i+2] = g;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      setCapturedPages(prev => [...prev, { 
        original: currentCapture, 
        processed: canvas.toDataURL('image/jpeg', compressionQuality / 100), 
        filter: currentFilter,
        id: Math.random().toString(36).substr(2, 9)
      }]);
      setCurrentCapture(null);
      setUiStep('camera');
    };
  };

  const performExport = () => {
    if (capturedPages.length === 0) return;
    setState({ status: 'processing', progress: 50, message: `Generating ${exportFormat}...` });
    setShowShareModal(false);
    
    setTimeout(() => {
      try {
        if (exportFormat === 'PDF') {
          const { jsPDF } = jspdf;
          const doc = new jsPDF('p', 'mm', pageSize === 'A4' ? 'a4' : [210, 297]);
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
          // Export as individual JPGs (or first page for now)
          setState({ 
            status: 'success', 
            resultUrl: capturedPages[0].processed, 
            resultFileName: `${fileName}.jpg`,
            progress: 100 
          });
        }
        stopCamera();
      } catch (e) {
        setState({ status: 'error', progress: 0, message: 'Export failed.' });
      }
    }, 200);
  };

  const deleteSelected = () => {
    setCapturedPages(prev => prev.filter(p => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-slate-950 flex flex-col overflow-hidden h-screen w-screen select-none">
      <canvas ref={canvasRef} className="hidden"></canvas>
      <canvas ref={cropCanvasRef} className="hidden"></canvas>

      {/* Camera View */}
      {uiStep === 'camera' && (
        <div className="flex-1 flex flex-col h-full bg-black relative animate-in fade-in duration-300">
          <div className="absolute top-0 left-0 right-0 px-4 pt-6 pb-12 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-20">
            <button onClick={stopCamera} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
              <i className="fas fa-times text-white"></i>
            </button>
            <div className="flex flex-col items-center">
               <span className="text-teal-400 font-bold text-[10px] tracking-widest uppercase">Scanner</span>
               <span className="text-white font-black text-xs uppercase">{capturedPages.length} PAGES</span>
            </div>
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
              <i className="fas fa-bolt text-white"></i>
            </button>
          </div>

          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[85%] h-[65%] border-2 border-dashed border-teal-500/30 rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-teal-500 rounded-tl-xl"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-teal-500 rounded-tr-xl"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-teal-500 rounded-bl-xl"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-teal-500 rounded-br-xl"></div>
              </div>
            </div>
          </div>

          <div className="bg-black/95 px-6 pt-4 pb-12 flex flex-col gap-6 z-20">
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-1">
               {['DOCUMENT', 'ID CARD', 'BOOK', 'PHOTO'].map(m => (
                 <button key={m} className={`text-[10px] font-black tracking-widest uppercase whitespace-nowrap px-6 py-2.5 rounded-full border ${m.toLowerCase().replace(' ','') === currentMode ? 'bg-teal-500 text-black border-teal-500 shadow-lg' : 'text-slate-500 border-white/5 bg-white/5'}`} onClick={() => setCurrentMode(m.toLowerCase().replace(' ','') as any)}>
                   {m}
                 </button>
               ))}
            </div>
            <div className="flex items-center justify-between max-w-sm mx-auto w-full px-2">
               <button onClick={() => capturedPages.length > 0 && setUiStep('gallery')} className="w-14 h-14 rounded-2xl border border-white/10 overflow-hidden bg-white/5 flex items-center justify-center">
                 {capturedPages.length > 0 ? <img src={capturedPages[capturedPages.length-1].processed} className="w-full h-full object-cover" /> : <i className="fas fa-images text-slate-800"></i>}
               </button>
               <button onClick={capturePhoto} className="w-22 h-22 rounded-full border-4 border-white/20 p-1 active:scale-95 transition-all shadow-xl bg-white/5">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center"><i className="fas fa-camera text-black text-2xl"></i></div>
               </button>
               <button onClick={() => capturedPages.length > 0 && setUiStep('gallery')} disabled={capturedPages.length === 0} className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl ${capturedPages.length > 0 ? 'bg-teal-600 text-white shadow-lg' : 'bg-white/5 text-slate-800 pointer-events-none'}`}>
                 <i className="fas fa-check"></i>
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Step */}
      {uiStep === 'gallery' && (
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 animate-in fade-in duration-300">
           {/* Top Bar with Rename Option */}
           <div className="p-4 pt-10 flex flex-col bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setUiStep('camera')} className="text-slate-500 text-xl"><i className="fas fa-arrow-left"></i></button>
                <div className="flex-1 px-4 text-center">
                   {isRenaming ? (
                     <input 
                       autoFocus 
                       value={fileName} 
                       onChange={e => setFileName(e.target.value)}
                       onBlur={() => setIsRenaming(false)}
                       onKeyDown={e => e.key === 'Enter' && setIsRenaming(false)}
                       className="w-full bg-slate-100 p-1 rounded font-black text-sm text-center outline-none border-2 border-teal-500" 
                     />
                   ) : (
                     <h2 onClick={() => setIsRenaming(true)} className="text-slate-900 dark:text-white font-black text-sm uppercase truncate max-w-[200px] mx-auto group">
                       {fileName} <i className="fas fa-pen text-[10px] ml-1 opacity-0 group-hover:opacity-100 text-teal-500"></i>
                     </h2>
                   )}
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{capturedPages.length} Documents</p>
                </div>
                <div className="flex gap-4">
                   <button onClick={() => setIsSelectMode(!isSelectMode)} className={`text-xl ${isSelectMode ? 'text-teal-500' : 'text-slate-400'}`}><i className="fas fa-check-double"></i></button>
                   <button className="text-slate-400 text-xl"><i className="fas fa-ellipsis-v"></i></button>
                </div>
              </div>
           </div>

           {/* Grid View */}
           <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto p-4 no-scrollbar">
              {capturedPages.map((p, i) => (
                <div key={p.id} onClick={() => isSelectMode && toggleSelect(p.id)} className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-2 transition-all group ${selectedIds.has(p.id) ? 'border-teal-500 scale-95 shadow-inner' : 'border-transparent bg-white shadow-md'}`}>
                   <img src={p.processed} className="w-full h-full object-cover" />
                   <div className="absolute top-3 left-3 bg-black/40 text-white text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-md">#{i+1}</div>
                   {isSelectMode && (
                     <div className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${selectedIds.has(p.id) ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white/20 border-white text-transparent'}`}>
                       <i className="fas fa-check text-[10px]"></i>
                     </div>
                   )}
                   {!isSelectMode && (
                     <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setCapturedPages(prev => prev.filter(pg => pg.id !== p.id)) }} className="w-8 h-8 bg-rose-500 text-white rounded-lg flex items-center justify-center shadow-lg"><i className="fas fa-trash-alt text-xs"></i></button>
                     </div>
                   )}
                </div>
              ))}
           </div>

           {/* Bottom Toolbar */}
           <div className="bg-white dark:bg-slate-900 p-6 pb-12 border-t border-slate-100 dark:border-slate-800 flex gap-4">
              {isSelectMode ? (
                <>
                  <button onClick={deleteSelected} disabled={selectedIds.size === 0} className="flex-1 bg-rose-100 text-rose-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-30"><i className="fas fa-trash mr-2"></i> Delete Selected</button>
                  <button onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={() => setUiStep('camera')} className="w-14 h-14 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center text-xl shadow-inner active:scale-95"><i className="fas fa-plus"></i></button>
                  <button onClick={() => setShowShareModal(true)} className="flex-1 bg-teal-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-teal-500/20 flex items-center justify-center gap-3 active:scale-95">
                    <i className="fas fa-share-alt"></i> SHARE OPTIONS
                  </button>
                </>
              )}
           </div>

           {/* Share Modal Backdrop */}
           {showShareModal && (
             <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 flex items-end">
                <div className="w-full bg-white dark:bg-slate-900 rounded-t-[3rem] p-8 pb-14 animate-in slide-in-from-bottom duration-500 max-w-lg mx-auto shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
                   <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center text-xl"><i className="fas fa-share-nodes"></i></div>
                        <div>
                           <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{fileName}</h3>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{capturedPages.length} Files | {exportFormat}</p>
                        </div>
                      </div>
                      <button onClick={() => setShowShareModal(false)} className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center"><i className="fas fa-times"></i></button>
                   </div>

                   <div className="space-y-8">
                      {/* Format Selector */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Share as {exportFormat}</label>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                           <button onClick={() => setExportFormat('PDF')} className={`flex-1 py-3.5 rounded-xl font-black text-sm transition-all ${exportFormat === 'PDF' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-lg' : 'text-slate-500'}`}>PDF</button>
                           <button onClick={() => setExportFormat('JPG')} className={`flex-1 py-3.5 rounded-xl font-black text-sm transition-all ${exportFormat === 'JPG' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-lg' : 'text-slate-500'}`}>IMAGE (JPG)</button>
                        </div>
                      </div>

                      {/* Compression Options */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                         <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Compression Quality</span>
                            <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded">{compressionQuality}%</span>
                         </div>
                         <input type="range" min="10" max="95" value={compressionQuality} onChange={e => setCompressionQuality(parseInt(e.target.value))} className="w-full h-2 rounded-lg appearance-none bg-slate-200 dark:bg-slate-800 accent-teal-500" />
                         <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase mt-2">
                           <span>High Compr. (Small)</span>
                           <span>Best Quality (Large)</span>
                         </div>
                      </div>

                      {/* Settings List */}
                      <div className="space-y-4">
                         <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">PDF Page Size</span>
                            <button onClick={() => setPageSize(prev => prev === 'A4' ? 'Auto' : 'A4')} className="text-[10px] font-black uppercase text-teal-500 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100">{pageSize}</button>
                         </div>
                         <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 opacity-50">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Password Protection</span>
                            <div className="w-10 h-5 bg-slate-200 rounded-full relative"><div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full"></div></div>
                         </div>
                         <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Searchable PDF (OCR)</span>
                            <div className="w-10 h-5 bg-teal-500 rounded-full relative"><div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div></div>
                         </div>
                      </div>

                      <div className="flex gap-4">
                         <button onClick={() => setShowShareModal(false)} className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest">Cancel</button>
                         <button onClick={performExport} className="flex-1 bg-teal-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-teal-500/20">Share Now</button>
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>
      )}

      {/* Crop/Edit screens (Kept from previous version for brevity) */}
      {uiStep === 'crop' && currentCapture && (
        <div className="flex-1 flex flex-col bg-slate-950 animate-in slide-in-from-right duration-300">
          <div className="p-4 pt-8 flex justify-between items-center bg-black/50 border-b border-white/5">
            <button onClick={() => setUiStep('camera')} className="text-slate-400 font-black text-[10px] uppercase tracking-widest px-3 py-2 rounded-lg bg-white/5">Retake</button>
            <h2 className="text-white font-black text-xs uppercase tracking-[0.4em]">Adjust Borders</h2>
            <button onClick={applyCrop} className="bg-teal-600 text-white px-5 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest">Next</button>
          </div>
          <div className="flex-1 relative p-6 flex items-center justify-center" ref={cropContainerRef} onTouchMove={handlePointMove}>
            <img src={currentCapture} className="max-w-full max-h-full object-contain pointer-events-none" />
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
               <polygon points={cropPoints.map(p => `${p.x}%,${p.y}%`).join(' ')} className="fill-teal-500/10 stroke-teal-500 stroke-2" />
            </svg>
            {cropPoints.map((p, i) => (
              <div key={i} className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full flex items-center justify-center" style={{ left: `${p.x}%`, top: `${p.y}%` }} onPointerDown={() => setDraggingIdx(i)} onPointerUp={() => setDraggingIdx(null)}>
                <div className="w-6 h-6 bg-white rounded-full border-4 border-teal-500 shadow-xl"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {uiStep === 'edit' && currentCapture && (
        <div className="flex-1 flex flex-col bg-slate-950 animate-in slide-in-from-bottom duration-300">
           <div className="p-4 pt-8 flex justify-between items-center bg-black/50 border-b border-white/5">
              <button onClick={() => setUiStep('crop')} className="text-slate-400 font-black text-[10px] uppercase tracking-widest px-3 py-2 rounded-lg bg-white/5">Back</button>
              <h2 className="text-white font-black text-xs uppercase tracking-[0.4em]">Enhance</h2>
              <button onClick={acceptEnhancedPage} className="bg-teal-600 text-white px-6 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-xl">Accept</button>
           </div>
           <div className="flex-1 p-6 flex items-center justify-center overflow-hidden">
              <img src={currentCapture} className={`max-w-full max-h-full object-contain transition-all duration-300 shadow-2xl ${currentFilter === 'document' ? 'contrast-[1.2] grayscale' : currentFilter === 'bw' ? 'grayscale contrast-[2]' : currentFilter === 'grayscale' ? 'grayscale' : ''}`} />
           </div>
           <div className="bg-black/95 p-6 grid grid-cols-4 gap-3 border-t border-white/5 pb-12">
              {[
                { id: 'none', label: 'Original', icon: 'fa-image' },
                { id: 'document', label: 'Magic', icon: 'fa-wand-magic-sparkles' },
                { id: 'bw', label: 'B&W', icon: 'fa-circle-half-stroke' },
                { id: 'grayscale', label: 'Gray', icon: 'fa-ghost' },
              ].map(f => (
                <button key={f.id} onClick={() => setCurrentFilter(f.id as any)} className={`flex flex-col items-center gap-3 p-4 rounded-2xl transition-all border ${currentFilter === f.id ? 'bg-teal-600 border-teal-500 text-black shadow-xl' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                  <i className={`fas ${f.icon} text-lg`}></i>
                  <span className="text-[9px] font-black uppercase tracking-tighter">{f.label}</span>
                </button>
              ))}
           </div>
        </div>
      )}

      {/* States */}
      {uiStep === 'idle' && state.status !== 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-950 h-full">
           <div className="w-28 h-28 bg-teal-500/10 text-teal-500 rounded-[2.5rem] flex items-center justify-center text-5xl mb-10 border border-teal-500/20 shadow-2xl">
             <i className="fas fa-camera"></i>
           </div>
           <h1 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">Pro Scanner</h1>
           <p className="text-slate-500 mb-12 font-medium text-sm max-w-xs mx-auto uppercase tracking-[0.3em]">Privacy-First • Local Export</p>
           <button onClick={startCamera} className="bg-teal-600 text-white px-14 py-6 rounded-3xl font-black text-xl shadow-2xl shadow-teal-600/20 active:scale-95 transition-all">Start Scanning</button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center p-12 text-center animate-in zoom-in duration-500">
           <div className="w-24 h-24 bg-teal-500 text-white text-4xl rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl shadow-teal-500/30">
             <i className="fas fa-check-double"></i>
           </div>
           <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">Done!</h2>
           <p className="text-slate-500 mb-12 font-medium text-lg uppercase tracking-widest text-[10px] opacity-60">Professional Output Ready</p>
           <div className="flex flex-col gap-4 w-full max-w-xs">
              <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white py-6 rounded-3xl font-black text-xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-4 group">
                <i className="fas fa-download"></i> DOWNLOAD
              </a>
              <button onClick={() => { setCapturedPages([]); setState({status:'idle', progress: 0}); setUiStep('idle'); }} className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] py-4">New Session</button>
           </div>
        </div>
      )}

      {state.status === 'processing' && (
        <div className="fixed inset-0 z-[30000] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-12 text-center text-white">
           <div className="relative w-24 h-24 mb-10">
              <div className="absolute inset-0 border-8 border-white/5 rounded-full"></div>
              <div className="absolute inset-0 border-8 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
           </div>
           <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">Working...</h2>
           <p className="text-white/40 font-bold uppercase text-[9px] tracking-[0.4em]">{state.message}</p>
        </div>
      )}
    </div>
  );
};

export default Scan;
