
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import { ProcessingState } from '../types';

declare const PDFLib: any;

const DeletePages: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [pageCount, setPageCount] = useState(0);

  const handleFile = async (files: File[]) => {
    const f = files[0];
    setFile(f);
    const bytes = await f.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(bytes);
    setPageCount(pdfDoc.getPageCount());
  };

  const togglePage = (idx: number) => {
    const next = new Set(selectedIndices);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedIndices(next);
  };

  const deleteSelected = async () => {
    if (!file) return;
    setState({ status: 'processing', progress: 50, message: 'Rebuilding document...' });

    try {
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(bytes);
      const newPdf = await PDFLib.PDFDocument.create();
      
      const indicesToKeep = Array.from({ length: pageCount }, (_, i) => i)
        .filter(i => !selectedIndices.has(i));

      if (indicesToKeep.length === 0) throw new Error("You cannot delete all pages.");

      const copiedPages = await newPdf.copyPages(pdfDoc, indicesToKeep);
      copiedPages.forEach((page: any) => newPdf.addPage(page));

      const newBytes = await newPdf.save();
      const blob = new Blob([newBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setState({ status: 'success', progress: 100, resultUrl: url, resultFileName: `cleaned_${file.name}` });
    } catch (err: any) {
      setState({ status: 'error', progress: 0, message: err.message || 'Deletion failed.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Delete Pages</h1>
        <p className="text-slate-600 font-medium">Select pages you want to remove from your PDF document.</p>
      </div>

      {!file && <Dropzone onFilesSelected={handleFile} icon="fa-trash-alt" />}

      {file && state.status !== 'success' && (
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl">
           <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-10 max-h-[400px] overflow-y-auto p-2">
              {Array.from({ length: pageCount }, (_, i) => (
                <button 
                  key={i} 
                  onClick={() => togglePage(i)}
                  className={`relative aspect-[3/4] rounded-xl flex flex-col items-center justify-center p-2 border-2 transition-all ${
                    selectedIndices.has(i) 
                    ? 'bg-rose-50 border-rose-500 ring-4 ring-rose-500/10 scale-95 opacity-60' 
                    : 'bg-slate-50 border-slate-200 hover:border-teal-400'
                  }`}
                >
                   <span className={`text-2xl font-black ${selectedIndices.has(i) ? 'text-rose-500' : 'text-slate-300'}`}>#{i + 1}</span>
                   {selectedIndices.has(i) && <i className="fas fa-trash-alt absolute top-2 right-2 text-rose-500 text-xs"></i>}
                </button>
              ))}
           </div>
           <button 
             onClick={deleteSelected} 
             disabled={selectedIndices.size === 0 || selectedIndices.size === pageCount}
             className="w-full bg-rose-500 text-white py-4 rounded-2xl font-black text-lg disabled:opacity-30 transition-all"
           >
             Delete {selectedIndices.size} Selected Pages
           </button>
        </div>
      )}

      {state.status === 'success' && (
         <div className="bg-white p-12 rounded-[2.5rem] border-2 border-rose-500 text-center shadow-2xl">
          <div className="text-5xl mb-6 text-rose-500"><i className="fas fa-trash-restore"></i></div>
          <h2 className="text-3xl font-black mb-8">Pages Removed!</h2>
          <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black text-lg">
            Download PDF
          </a>
       </div>
      )}
    </div>
  );
};

export default DeletePages;
