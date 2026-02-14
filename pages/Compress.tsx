
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import { ProcessingState } from '../types';

declare const pdfjsLib: any;
declare const jspdf: any;

const Compress: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });
  const [quality, setQuality] = useState(60); // Default 60% quality

  const handleFile = (files: File[]) => {
    if (files.length > 0) setFile(files[0]);
  };

  const startCompression = async () => {
    if (!file) return;
    setState({ status: 'processing', progress: 5, message: 'Analyzing PDF content...' });

    try {
      const { jsPDF } = jspdf;
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const numPages = pdf.numPages;
      const outputPdf = new jsPDF({ unit: 'pt', compress: true });

      for (let i = 1; i <= numPages; i++) {
        setState({ 
          status: 'processing', 
          progress: Math.round((i / numPages) * 100), 
          message: `Compressing Page ${i} of ${numPages}...` 
        });

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // High enough for quality, low enough for speed
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        const imgData = canvas.toDataURL('image/jpeg', quality / 100);

        if (i > 1) outputPdf.addPage([viewport.width, viewport.height]);
        else outputPdf.setPage(1);
        
        outputPdf.addImage(imgData, 'JPEG', 0, 0, viewport.width, viewport.height);
      }

      const blob = outputPdf.output('blob');
      const url = URL.createObjectURL(blob);
      
      setState({ 
        status: 'success', 
        progress: 100, 
        resultUrl: url, 
        resultFileName: `compressed_${file.name}`,
        message: `Original: ${(file.size / 1024 / 1024).toFixed(2)}MB -> New: ${(blob.size / 1024 / 1024).toFixed(2)}MB`
      });
    } catch (error) {
      console.error(error);
      setState({ status: 'error', progress: 0, message: 'Failed to compress PDF.' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Compress PDF</h1>
        <p className="text-slate-600 font-medium">Reduce your file size while keeping visual integrity.</p>
      </div>

      {state.status === 'idle' && !file && (
        <Dropzone onFilesSelected={handleFile} title="Select PDF to Compress" />
      )}

      {file && state.status !== 'success' && (
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl">
          <div className="flex items-center gap-4 mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center text-xl">
              <i className="fas fa-file-pdf"></i>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="font-bold text-slate-900 truncate">{file.name}</div>
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <button onClick={() => setFile(null)} className="text-slate-400 hover:text-rose-500">
              <i className="fas fa-times-circle text-xl"></i>
            </button>
          </div>

          <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <label className="font-bold text-slate-700">Compression Quality</label>
              <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-lg font-black text-sm">{quality}%</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="90" 
              value={quality} 
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500" 
            />
            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
              <span>Super Small</span>
              <span>Best Quality</span>
            </div>
          </div>

          <button 
            onClick={startCompression}
            disabled={state.status === 'processing'}
            className="w-full bg-sky-500 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-sky-500/20 hover:bg-sky-600 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {state.status === 'processing' ? (
              <span className="flex items-center justify-center gap-3">
                <i className="fas fa-circle-notch fa-spin"></i> {state.message}
              </span>
            ) : 'Compress Now'}
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white p-12 rounded-[2.5rem] border-2 border-sky-500 text-center shadow-2xl shadow-sky-500/10">
          <div className="w-20 h-20 bg-sky-500 text-white text-3xl rounded-full flex items-center justify-center mx-auto mb-8">
            <i className="fas fa-check"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">Perfectly Optimized!</h2>
          <div className="inline-block px-4 py-2 bg-sky-50 text-sky-700 rounded-xl font-bold text-sm mb-10">
            {state.message}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href={state.resultUrl} 
              download={state.resultFileName}
              className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-orange-500/20 transition-all"
            >
              <i className="fas fa-download mr-2"></i> Download File
            </a>
            <button 
              onClick={() => { setFile(null); setState({ status: 'idle', progress: 0 }); }}
              className="bg-slate-100 text-slate-700 px-10 py-4 rounded-2xl font-black text-lg"
            >
              Compress Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Compress;
