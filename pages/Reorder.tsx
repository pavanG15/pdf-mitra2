
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import { ProcessingState } from '../types';

declare const PDFLib: any;

const Reorder: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });
  const [pages, setPages] = useState<number[]>([]);

  const handleFile = async (files: File[]) => {
    const f = files[0];
    setFile(f);
    const bytes = await f.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(bytes);
    const count = pdfDoc.getPageCount();
    setPages(Array.from({ length: count }, (_, i) => i));
  };

  const movePage = (from: number, to: number) => {
    const updated = [...pages];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setPages(updated);
  };

  const saveOrder = async () => {
    if (!file) return;
    setState({ status: 'processing', progress: 50, message: 'Reorganizing pages...' });

    try {
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(bytes);
      const newPdf = await PDFLib.PDFDocument.create();
      
      const copiedPages = await newPdf.copyPages(pdfDoc, pages);
      copiedPages.forEach((page: any) => newPdf.addPage(page));

      const newBytes = await newPdf.save();
      const blob = new Blob([newBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setState({ status: 'success', progress: 100, resultUrl: url, resultFileName: `reordered_${file.name}` });
    } catch (err) {
      setState({ status: 'error', progress: 0, message: 'Reordering failed.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Reorder Pages</h1>
        <p className="text-slate-600 font-medium">Drag or use arrows to rearrange document structure.</p>
      </div>

      {!file && <Dropzone onFilesSelected={handleFile} />}

      {file && state.status !== 'success' && (
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl">
           <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-10 max-h-[400px] overflow-y-auto p-2">
              {pages.map((idx, pos) => (
                <div key={idx} className="relative aspect-[3/4] bg-slate-50 border-2 border-slate-200 rounded-xl flex flex-col items-center justify-center p-2 group hover:border-teal-400">
                   <span className="text-2xl font-black text-slate-300">#{idx + 1}</span>
                   <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => movePage(pos, pos - 1)} disabled={pos === 0} className="w-8 h-8 bg-white rounded-full shadow-md text-slate-600 disabled:opacity-30">
                        <i className="fas fa-chevron-left"></i>
                      </button>
                      <button onClick={() => movePage(pos, pos + 1)} disabled={pos === pages.length - 1} className="w-8 h-8 bg-white rounded-full shadow-md text-slate-600 disabled:opacity-30">
                        <i className="fas fa-chevron-right"></i>
                      </button>
                   </div>
                   <div className="mt-2 text-[10px] font-bold text-slate-500">Position {pos + 1}</div>
                </div>
              ))}
           </div>
           <button onClick={saveOrder} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg">
             Save New Order
           </button>
        </div>
      )}

      {state.status === 'success' && (
         <div className="bg-white p-12 rounded-[2.5rem] border-2 border-slate-900 text-center shadow-2xl">
          <div className="text-5xl mb-6 text-teal-500"><i className="fas fa-sort-amount-down"></i></div>
          <h2 className="text-3xl font-black mb-8">Pages Rearranged!</h2>
          <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black text-lg">
            Download PDF
          </a>
       </div>
      )}
    </div>
  );
};

export default Reorder;
