
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import { ProcessingState } from '../types';

const Rotate: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });
  const [angle, setAngle] = useState(90);

  const startRotation = async () => {
    if (!file) return;
    const PDFLib = (window as any).PDFLib;
    if (!PDFLib) {
      setState({ status: 'error', progress: 0, message: 'PDF Library not loaded.' });
      return;
    }

    setState({ status: 'processing', progress: 50, message: 'Rotating pages...' });

    try {
      const { degrees } = PDFLib;
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(bytes);
      const pages = pdfDoc.getPages();
      
      pages.forEach((page: any) => {
        const rotation = page.getRotation().angle;
        page.setRotation(degrees(rotation + angle));
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setState({ 
        status: 'success', 
        progress: 100, 
        resultUrl: url, 
        resultFileName: `rotated_${file.name}` 
      });
    } catch (error) {
      console.error('Rotation Error:', error);
      setState({ status: 'error', progress: 0, message: 'Failed to rotate PDF.' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Rotate PDF</h1>
        <p className="text-slate-600 dark:text-slate-400 font-medium">Rotate every page in your document instantly.</p>
      </div>

      {state.status === 'idle' && !file && (
        <Dropzone onFilesSelected={(files) => setFile(files[0])} title="Select PDF to Rotate" />
      )}

      {file && state.status !== 'success' && (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl text-center">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-3xl rounded-3xl flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-redo"></i>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-8 truncate">{file.name}</h3>
          
          <div className="flex justify-center gap-4 mb-10">
            {[90, 180, 270].map(deg => (
              <button 
                key={deg}
                onClick={() => setAngle(deg)}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${angle === deg ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >
                {deg}°
              </button>
            ))}
          </div>

          <button 
            onClick={startRotation}
            disabled={state.status === 'processing'}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
          >
            {state.status === 'processing' ? 'Processing...' : 'Rotate Pages'}
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] border-2 border-indigo-500 text-center shadow-2xl">
          <div className="w-20 h-20 bg-indigo-500 text-white text-3xl rounded-full flex items-center justify-center mx-auto mb-8">
            <i className="fas fa-check"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-10">Rotation Complete!</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">
              Download PDF
            </a>
            <button onClick={() => { setFile(null); setState({ status: 'idle', progress: 0 }); }} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-10 py-4 rounded-2xl font-black text-lg">
              Start Over
            </button>
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className="mt-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 font-bold text-center">
          {state.message}
        </div>
      )}
    </div>
  );
};

export default Rotate;
