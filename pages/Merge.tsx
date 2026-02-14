
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import { ProcessingState } from '../types';

declare const PDFLib: any;

const Merge: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });

  const handleFiles = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startMerge = async () => {
    if (files.length < 2) return;
    setState({ status: 'processing', progress: 10, message: 'Loading PDF documents...' });

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
    <div className="max-w-2xl mx-auto px-4 py-12 transition-colors duration-300">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Merge PDF</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Combine multiple files securely</p>
      </div>

      {state.status === 'idle' && files.length === 0 && (
        <Dropzone onFilesSelected={handleFiles} multiple title="Add PDF Files" />
      )}

      {files.length > 0 && state.status !== 'success' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{files.length} Files</span>
              <button onClick={() => setFiles([])} className="text-[10px] font-black uppercase text-rose-500">Clear</button>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border-b border-slate-50 dark:border-slate-900 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-lg flex items-center justify-center text-[10px] font-bold">
                      PDF
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[150px]">{file.name}</div>
                  </div>
                  <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-rose-500"><i className="fas fa-times"></i></button>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={startMerge}
            disabled={files.length < 2 || state.status === 'processing'}
            className="w-full bg-teal-600 dark:bg-teal-500 text-white py-4 rounded-2xl font-black shadow-xl shadow-teal-600/20 active:scale-95 transition-all disabled:opacity-30"
          >
            {state.status === 'processing' ? <i className="fas fa-spinner fa-spin mr-2"></i> : 'Combine Files'}
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl border-2 border-teal-500 text-center shadow-xl">
          <div className="w-16 h-16 bg-teal-500 text-white text-2xl rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-check"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Done!</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-8">Merged PDF is ready</p>
          
          <div className="flex flex-col gap-3">
            <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white py-4 rounded-xl font-black shadow-lg shadow-orange-500/20">
              Download PDF
            </a>
            <button onClick={() => { setFiles([]); setState({ status: 'idle', progress: 0 }); }} className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Start Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Merge;
