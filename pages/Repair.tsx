
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import { ProcessingState } from '../types';

declare const PDFLib: any;

const Repair: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });

  const repair = async () => {
    if (!file) return;
    setState({ status: 'processing', progress: 50, message: 'Re-indexing cross-references...' });

    try {
      const bytes = await file.arrayBuffer();
      // PDF-Lib attempts to fix issues during the loading/saving process automatically
      const pdfDoc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
      const repairedBytes = await pdfDoc.save();
      
      const blob = new Blob([repairedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setState({ status: 'success', progress: 100, resultUrl: url, resultFileName: `repaired_${file.name}` });
    } catch (err) {
      setState({ status: 'error', progress: 0, message: 'This document is too severely corrupted to be repaired in the browser.' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Repair PDF</h1>
        <p className="text-slate-600 font-medium">Attempt to fix corrupted PDF document structures.</p>
      </div>

      {!file && <Dropzone onFilesSelected={(f) => setFile(f[0])} icon="fa-tools" />}

      {file && state.status !== 'success' && (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 text-center shadow-xl">
           <h3 className="text-xl font-bold mb-8">{file.name}</h3>
           <button onClick={repair} className="w-full bg-slate-600 text-white py-4 rounded-2xl font-black text-lg">
             Repair Document
           </button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white p-12 rounded-[2.5rem] border-2 border-slate-600 text-center shadow-2xl">
           <div className="text-5xl mb-6 text-teal-500"><i className="fas fa-hand-holding-heart"></i></div>
           <h2 className="text-3xl font-black mb-8">Repair Attempt Complete!</h2>
           <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black text-lg">
             Download PDF
           </a>
        </div>
      )}
    </div>
  );
};

export default Repair;
