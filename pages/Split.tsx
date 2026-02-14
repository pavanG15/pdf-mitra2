
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import { ProcessingState } from '../types';

declare const PDFLib: any;

const Split: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });
  const [resultUrls, setResultUrls] = useState<{name: string, url: string}[]>([]);

  const startSplit = async () => {
    if (!file) return;
    setState({ status: 'processing', progress: 10, message: 'Reading document...' });

    try {
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(bytes);
      const pageCount = pdfDoc.getPageCount();
      const newUrls = [];

      for (let i = 0; i < pageCount; i++) {
        setState({ status: 'processing', progress: Math.round(((i+1)/pageCount)*100), message: `Extracting page ${i+1}...` });
        const newPdf = await PDFLib.PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(copiedPage);
        const newBytes = await newPdf.save();
        const blob = new Blob([newBytes], { type: 'application/pdf' });
        newUrls.push({ 
          name: `page_${i + 1}.pdf`, 
          url: URL.createObjectURL(blob) 
        });
      }

      setResultUrls(newUrls);
      setState({ status: 'success', progress: 100 });
    } catch (error) {
      setState({ status: 'error', progress: 0, message: 'Failed to split PDF.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Split PDF</h1>
        <p className="text-slate-600 font-medium">Extract pages from your document into separate files.</p>
      </div>

      {!file && <Dropzone onFilesSelected={(files) => setFile(files[0])} />}

      {file && state.status !== 'success' && (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 text-center shadow-xl">
          <div className="text-3xl text-rose-500 mb-6"><i className="fas fa-cut"></i></div>
          <h3 className="text-xl font-bold mb-8">{file.name}</h3>
          <button 
            onClick={startSplit} 
            disabled={state.status === 'processing'}
            className="w-full bg-rose-500 text-white py-4 rounded-2xl font-black text-lg"
          >
            {state.status === 'processing' ? state.message : 'Split Pages Now'}
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
           <h3 className="text-2xl font-bold mb-6 text-center">Extraction Ready</h3>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto p-4">
              {resultUrls.map((res, i) => (
                <a key={i} href={res.url} download={res.name} className="flex flex-col items-center p-4 bg-slate-50 rounded-xl hover:bg-teal-50 border border-transparent hover:border-teal-200 transition-all">
                  <i className="fas fa-file-pdf text-teal-600 text-2xl mb-2"></i>
                  <span className="text-xs font-bold text-slate-600">{res.name}</span>
                </a>
              ))}
           </div>
           <button onClick={() => location.reload()} className="w-full mt-8 py-3 bg-slate-100 rounded-xl font-bold">Start New Task</button>
        </div>
      )}
    </div>
  );
};

export default Split;
