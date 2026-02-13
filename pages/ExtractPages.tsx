
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import { ProcessingState } from '../types';

declare const PDFLib: any;

const ExtractPages: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [range, setRange] = useState('');
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });

  const extract = async () => {
    if (!file || !range) return;
    setState({ status: 'processing', progress: 20, message: 'Parsing range...' });

    try {
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(bytes);
      const newPdf = await PDFLib.PDFDocument.create();
      const totalPages = pdfDoc.getPageCount();

      // Simple range parser: "1, 3, 5-8"
      const indices: number[] = [];
      const parts = range.split(',');
      parts.forEach(p => {
        const trimmed = p.trim();
        if (trimmed.includes('-')) {
          const [start, end] = trimmed.split('-').map(n => parseInt(n) - 1);
          for (let i = start; i <= end; i++) {
            if (i >= 0 && i < totalPages) indices.push(i);
          }
        } else {
          const idx = parseInt(trimmed) - 1;
          if (idx >= 0 && idx < totalPages) indices.push(idx);
        }
      });

      if (indices.length === 0) throw new Error("No valid pages specified");

      setState({ status: 'processing', progress: 50, message: `Extracting ${indices.length} pages...` });
      const copiedPages = await newPdf.copyPages(pdfDoc, indices);
      copiedPages.forEach((page: any) => newPdf.addPage(page));

      const newBytes = await newPdf.save();
      const blob = new Blob([newBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setState({ status: 'success', progress: 100, resultUrl: url, resultFileName: `extracted_${file.name}` });
    } catch (err: any) {
      setState({ status: 'error', progress: 0, message: err.message || 'Extraction failed.' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Extract Pages</h1>
        <p className="text-slate-600 font-medium">Pull specific pages out of your document into a brand new PDF.</p>
      </div>

      {!file && <Dropzone onFilesSelected={(f) => setFile(f[0])} icon="fa-file-export" />}

      {file && state.status !== 'success' && (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl">
           <div className="mb-8">
              <label className="block text-sm font-bold text-slate-700 mb-2">Page Range</label>
              <input 
                type="text" 
                value={range} 
                onChange={e => setRange(e.target.value)}
                className="w-full px-6 py-4 rounded-xl border border-slate-200 focus:border-teal-500 outline-none"
                placeholder="e.g. 1, 3, 5-10"
              />
              <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Separated by commas or hyphens</p>
           </div>
           <button onClick={extract} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg">
             Extract and Download
           </button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white p-12 rounded-[2.5rem] border-2 border-indigo-500 text-center shadow-2xl">
           <div className="text-5xl mb-6 text-indigo-500"><i className="fas fa-file-export"></i></div>
           <h2 className="text-3xl font-black mb-8">Extraction Ready!</h2>
           <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black text-lg">
             Download Extracted PDF
           </a>
        </div>
      )}
    </div>
  );
};

export default ExtractPages;
