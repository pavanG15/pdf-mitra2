
import React, { useState, useEffect, useRef } from 'react';
import Dropzone from '../components/Dropzone';
import { ProcessingState } from '../types';

declare const PDFLib: any;
declare const pdfjsLib: any;
declare const JSZip: any;

const Split: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Share Options
  const [exportFormat, setExportFormat] = useState<'PDF' | 'JPG'>('PDF');
  const [createZip, setCreateZip] = useState(true);
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [pageSize, setPageSize] = useState<'A4' | 'Original'>('A4');

  const handleFile = async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setState({ status: 'loading', progress: 0, message: 'Generating previews...' });
    
    try {
      const arrayBuffer = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const thumbs: string[] = [];
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        thumbs.push(canvas.toDataURL());
      }
      
      setThumbnails(thumbs);
      setSelectedIndices(new Set(Array.from({ length: numPages }, (_, i) => i)));
      setState({ status: 'idle', progress: 0 });
    } catch (err) {
      console.error(err);
      setState({ status: 'error', progress: 0, message: 'Could not load PDF.' });
    }
  };

  const togglePage = (idx: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const performSplit = async () => {
    if (!file || selectedIndices.size === 0) return;
    setState({ status: 'processing', progress: 20, message: 'Processing pages...' });
    setShowShareModal(false);

    try {
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(bytes);
      const indices = Array.from(selectedIndices).sort((a, b) => a - b);
      
      if (createZip) {
        // "SAVE SEPARATE" Mode: Individual files in a ZIP
        const zip = new JSZip();
        for (let i = 0; i < indices.length; i++) {
          const idx = indices[i];
          setState({ 
            status: 'processing', 
            progress: Math.round(((i + 1) / indices.length) * 100), 
            message: `Extracting Page ${idx + 1}...` 
          });
          
          const newPdf = await PDFLib.PDFDocument.create();
          const [copiedPage] = await newPdf.copyPages(pdfDoc, [idx]);
          newPdf.addPage(copiedPage);
          const pdfBytes = await newPdf.save();
          zip.file(`Page_${idx + 1}.pdf`, pdfBytes);
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        setState({ 
          status: 'success', 
          progress: 100, 
          resultUrl: URL.createObjectURL(zipBlob), 
          resultFileName: `${file.name.replace('.pdf', '')}_pages.zip` 
        });
      } else {
        // Combined Extract Mode: One PDF with all selected pages
        const newPdf = await PDFLib.PDFDocument.create();
        const copiedPages = await newPdf.copyPages(pdfDoc, indices);
        copiedPages.forEach((p: any) => newPdf.addPage(p));
        const finalBytes = await newPdf.save();
        const blob = new Blob([finalBytes], { type: 'application/pdf' });
        setState({ 
          status: 'success', 
          progress: 100, 
          resultUrl: URL.createObjectURL(blob), 
          resultFileName: `extracted_${file.name}` 
        });
      }
    } catch (error) {
      console.error(error);
      setState({ status: 'error', progress: 0, message: 'Extraction failed.' });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-h-screen">
      {/* Header UI */}
      {!file ? (
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-[2rem] flex items-center justify-center text-3xl mx-auto mb-8 shadow-xl shadow-rose-500/5">
             <i className="fas fa-cut"></i>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">Split & Separate</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-12 max-w-sm mx-auto uppercase tracking-[0.2em] text-[10px]">Divide your PDF into single pages or custom chunks.</p>
          <Dropzone onFilesSelected={handleFile} icon="fa-cut" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in duration-300">
          <div className="p-4 pt-10 flex flex-col bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-30">
            <div className="flex justify-between items-center mb-4 px-2">
              <button onClick={() => setFile(null)} className="text-slate-400 text-xl"><i className="fas fa-arrow-left"></i></button>
              <div className="flex-1 px-4 text-center">
                 <h2 className="text-slate-900 dark:text-white font-black text-sm uppercase truncate max-w-[200px] mx-auto">{file.name}</h2>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedIndices.size} Pages Selected</p>
              </div>
              <button onClick={() => setSelectedIndices(new Set(Array.from({length: thumbnails.length}, (_, i) => i)))} className="text-teal-500 font-black text-[10px] uppercase tracking-widest">Select All</button>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 overflow-y-auto p-6 no-scrollbar">
             {thumbnails.map((thumb, i) => (
               <div key={i} onClick={() => togglePage(i)} className={`relative aspect-[3/4] rounded-[2rem] overflow-hidden border-4 transition-all duration-300 cursor-pointer ${selectedIndices.has(i) ? 'border-rose-500 scale-95 shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl opacity-60'}`}>
                  <img src={thumb} className="w-full h-full object-cover" />
                  <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 rounded-lg">#{i+1}</div>
                  <div className={`absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${selectedIndices.has(i) ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white/10 border-white/20 text-transparent'}`}>
                    <i className="fas fa-check text-xs"></i>
                  </div>
               </div>
             ))}
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 pb-14 border-t border-slate-100 dark:border-slate-800 flex gap-4 shadow-2xl z-30">
            <button onClick={() => setFile(null)} className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-[2rem] flex items-center justify-center text-2xl active:scale-90 transition-transform"><i className="fas fa-plus"></i></button>
            <button onClick={() => setShowShareModal(true)} disabled={selectedIndices.size === 0} className="flex-1 bg-rose-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-rose-500/20 active:scale-95 transition-all disabled:opacity-30">
              EXTRACT PAGES
            </button>
          </div>
        </div>
      )}

      {/* Share Modal Integration */}
      {showShareModal && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-lg animate-in fade-in flex items-end">
          <div className="w-full bg-white dark:bg-slate-900 rounded-t-[3rem] p-8 pb-16 animate-in slide-in-from-bottom duration-500 max-w-2xl mx-auto shadow-2xl flex flex-col gap-8">
            <div className="flex items-center gap-5 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center text-2xl">
                <i className="fas fa-file-export"></i>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white truncate">Split Options</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedIndices.size} Pages | Separate Extraction</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Format</span>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {['PDF', 'JPG'].map(fmt => (
                    <button key={fmt} onClick={() => setExportFormat(fmt as any)} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${exportFormat === fmt ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-md' : 'text-slate-400'}`}>
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <i className="fas fa-file-zipper text-slate-400 text-sm"></i>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Save Separate (ZIP File)</span>
                  </div>
                  <button onClick={() => setCreateZip(!createZip)} className={`w-12 h-6 rounded-full transition-colors relative ${createZip ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${createZip ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <i className="fas fa-lock text-slate-400 text-sm"></i>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Protect with Password</span>
                  </div>
                  <button onClick={() => setEnablePassword(!enablePassword)} className={`w-12 h-6 rounded-full transition-colors relative ${enablePassword ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${enablePassword ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>

                {enablePassword && (
                  <input type="password" placeholder="Enter password..." value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-2 border-rose-500/20 text-sm font-bold text-slate-900 dark:text-white outline-none" />
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-2">
              <button onClick={() => setShowShareModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest active:scale-95 transition-all">CANCEL</button>
              <button onClick={performSplit} className="flex-1 bg-rose-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">PROCESS & SAVE</button>
            </div>
          </div>
        </div>
      )}

      {/* Processing State Rendering */}
      {(state.status === 'processing' || state.status === 'loading') && (
        <div className="fixed inset-0 z-[30000] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center text-white">
           <div className="relative w-28 h-28 mb-12">
              <div className="absolute inset-0 border-[10px] border-white/5 rounded-full"></div>
              <div className="absolute inset-0 border-[10px] border-rose-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-rose-500 text-xl font-black">{state.progress}%</div>
           </div>
           <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">Working...</h2>
           <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.6em]">{state.message || 'Processing Pages'}</p>
        </div>
      )}

      {/* Success View */}
      {state.status === 'success' && (
        <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center p-12 text-center animate-in zoom-in duration-500">
           <div className="w-28 h-28 bg-rose-500 text-white text-5xl rounded-[3rem] flex items-center justify-center mb-12 shadow-2xl border-4 border-white/10">
             <i className="fas fa-check-double"></i>
           </div>
           <h2 className="text-5xl font-black text-white mb-6 uppercase tracking-tighter">EXTRACTED!</h2>
           <p className="text-slate-500 mb-14 font-black text-xs uppercase tracking-widest opacity-80">Output Ready for download</p>
           <div className="flex flex-col gap-5 w-full max-w-sm">
              <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white py-7 rounded-[2.5rem] font-black text-2xl shadow-2xl active:scale-95 transition-transform flex items-center justify-center gap-5 uppercase">
                <i className="fas fa-file-download"></i> DOWNLOAD
              </a>
              <button onClick={() => { setFile(null); setState({status:'idle', progress: 0}); }} className="text-slate-500 font-black text-[11px] uppercase tracking-[0.4em] py-6 hover:text-rose-500 transition-colors">START NEW TASK</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Split;
