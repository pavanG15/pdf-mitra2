
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import { ProcessingState } from '../types';

declare const PDFLib: any;

const Merge: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });
  const [showShareModal, setShowShareModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'PDF' | 'JPG'>('PDF');
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState('');

  const handleFiles = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startMerge = async () => {
    if (files.length < 2) return;
    setState({ status: 'processing', progress: 10, message: 'Loading PDF documents...' });
    setShowShareModal(false);

    try {
      const mergedPdf = await PDFLib.PDFDocument.create();
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setState(prev => ({ 
          ...prev, 
          progress: Math.round(((i + 1) / files.length) * 100),
          message: `Merging ${file.name}...` 
        }));

        const bytes = await file.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page: any) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setState({ 
        status: 'success', 
        progress: 100, 
        resultUrl: url, 
        resultFileName: 'merged_document.pdf' 
      });
    } catch (error) {
      console.error(error);
      setState({ status: 'error', progress: 0, message: 'Merge failed.' });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-h-screen">
      {!files.length ? (
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-teal-500/10 text-teal-600 rounded-[2rem] flex items-center justify-center text-3xl mx-auto mb-8 shadow-xl shadow-teal-500/5">
             <i className="fas fa-layer-group"></i>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">Merge PDF</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-12 max-w-sm mx-auto uppercase tracking-[0.2em] text-[10px]">Combine multiple files into one professional document.</p>
          <Dropzone onFilesSelected={handleFiles} multiple title="Add PDF Files" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300">
          <div className="p-4 pt-10 flex flex-col bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-30">
            <div className="flex justify-between items-center mb-4 px-2">
              <button onClick={() => setFiles([])} className="text-slate-400 text-xl"><i className="fas fa-arrow-left"></i></button>
              <div className="flex-1 px-4 text-center">
                 <h2 className="text-slate-900 dark:text-white font-black text-sm uppercase tracking-widest">Merge Manager</h2>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{files.length} Documents Loaded</p>
              </div>
              <button onClick={() => setFiles([])} className="text-rose-500 font-black text-[10px] uppercase tracking-widest">Clear All</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
             {files.map((file, i) => (
               <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl flex items-center justify-between group">
                  <div className="flex items-center gap-5">
                     <div className="w-14 h-14 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-2xl flex items-center justify-center text-xl">
                        <i className="fas fa-file-pdf"></i>
                     </div>
                     <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white truncate max-w-[150px]">{file.name}</h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                     </div>
                  </div>
                  <button onClick={() => removeFile(i)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors">
                    <i className="fas fa-trash-alt"></i>
                  </button>
               </div>
             ))}
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 pb-14 border-t border-slate-100 dark:border-slate-800 flex gap-4 shadow-2xl z-30">
            <button onClick={() => {}} className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-[2rem] flex items-center justify-center text-2xl active:scale-90 transition-transform"><i className="fas fa-plus"></i></button>
            <button onClick={() => setShowShareModal(true)} disabled={files.length < 2} className="flex-1 bg-teal-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-teal-500/20 active:scale-95 transition-all disabled:opacity-30">
              MERGE DOCUMENTS
            </button>
          </div>
        </div>
      )}

      {/* Share Options Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-lg animate-in fade-in flex items-end">
          <div className="w-full bg-white dark:bg-slate-900 rounded-t-[3rem] p-8 pb-16 animate-in slide-in-from-bottom duration-500 max-w-2xl mx-auto shadow-2xl flex flex-col gap-8">
            <div className="flex items-center gap-5 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="w-16 h-16 bg-teal-500/10 text-teal-600 rounded-2xl flex items-center justify-center text-2xl">
                <i className="fas fa-share-nodes"></i>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white truncate">Merge & Share</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{files.length} Files | Optimized Combined PDF</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Output Format</span>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {['PDF', 'JPG'].map(fmt => (
                    <button key={fmt} onClick={() => setExportFormat(fmt as any)} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${exportFormat === fmt ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-md' : 'text-slate-400'}`}>
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <i className="fas fa-lock text-slate-400 text-sm"></i>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Enable Password Protection</span>
                  </div>
                  <button onClick={() => setEnablePassword(!enablePassword)} className={`w-12 h-6 rounded-full transition-colors relative ${enablePassword ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${enablePassword ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>

                {enablePassword && (
                  <input type="password" placeholder="Enter secure password..." value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-2 border-teal-500/20 text-sm font-bold text-slate-900 dark:text-white outline-none" />
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-2">
              <button onClick={() => setShowShareModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest active:scale-95 transition-all">CANCEL</button>
              <button onClick={startMerge} className="flex-1 bg-teal-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all uppercase">GENERATE PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* Processing State */}
      {(state.status === 'processing' || state.status === 'loading') && (
        <div className="fixed inset-0 z-[30000] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center text-white">
           <div className="relative w-28 h-28 mb-12">
              <div className="absolute inset-0 border-[10px] border-white/5 rounded-full"></div>
              <div className="absolute inset-0 border-[10px] border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-teal-500 text-xl font-black">{state.progress}%</div>
           </div>
           <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">Merging...</h2>
           <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.6em]">{state.message || 'Combining Streams'}</p>
        </div>
      )}

      {/* Success View */}
      {state.status === 'success' && (
        <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center p-12 text-center animate-in zoom-in duration-500">
           <div className="w-28 h-28 bg-teal-500 text-white text-5xl rounded-[3rem] flex items-center justify-center mb-12 shadow-2xl border-4 border-white/10">
             <i className="fas fa-check-double"></i>
           </div>
           <h2 className="text-5xl font-black text-white mb-6 uppercase tracking-tighter">MERGED!</h2>
           <p className="text-slate-500 mb-14 font-black text-xs uppercase tracking-widest opacity-80">Output Ready for download</p>
           <div className="flex flex-col gap-5 w-full max-w-sm">
              <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white py-7 rounded-[2.5rem] font-black text-2xl shadow-2xl active:scale-95 transition-transform flex items-center justify-center gap-5 uppercase">
                <i className="fas fa-file-download"></i> DOWNLOAD
              </a>
              <button onClick={() => { setFiles([]); setState({status:'idle', progress: 0}); }} className="text-slate-500 font-black text-[11px] uppercase tracking-[0.4em] py-6 hover:text-teal-500 transition-colors">START NEW TASK</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Merge;
