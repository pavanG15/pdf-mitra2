
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import PDFPreview from '../components/MyPDFPreview';
import { ProcessingState } from '../types';

declare const PDFLib: any;

const CropPDF: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });
  const [margin, setMargin] = useState(20);

  const applyCrop = async () => {
    if (!file) return;
    setState({ status: 'processing', progress: 50, message: 'Cropping margins...' });

    try {
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(bytes);
      const pages = pdfDoc.getPages();

      pages.forEach((page: any) => {
        const { width, height } = page.getSize();
        const safeMargin = Math.min(margin, width / 2 - 5, height / 2 - 5);
        page.setCropBox(safeMargin, safeMargin, width - safeMargin * 2, height - safeMargin * 2);
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setState({ status: 'success', progress: 100, resultUrl: url, resultFileName: `cropped_${file.name}` });
    } catch (err) {
      console.error(err);
      setState({ status: 'error', progress: 0, message: 'Cropping failed.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-[900] text-slate-900 dark:text-white mb-4 uppercase tracking-tight">Crop PDF</h1>
        <p className="text-slate-600 dark:text-slate-400 font-medium">Trim white margins with precision guide.</p>
      </div>

      {!file && <Dropzone onFilesSelected={(f) => setFile(f[0])} icon="fa-crop-alt" />}

      {file && state.status !== 'success' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
             <div className="flex justify-between items-center mb-4 px-2">
                <span className="text-[10px] font-black uppercase text-teal-600 tracking-widest">Visual Guide</span>
                <button onClick={() => setFile(null)} className="text-slate-400 text-[10px] font-black uppercase">Change File</button>
             </div>
             <div className="relative">
                <PDFPreview file={file} className="aspect-[3/4]" />
                <div 
                  className="absolute inset-0 border-teal-500/50 bg-slate-900/10 pointer-events-none transition-all duration-300"
                  style={{ borderWidth: `${margin / 3}px`, borderStyle: 'solid' }}
                ></div>
             </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-center">
             <div className="mb-10">
                <div className="flex justify-between items-center mb-4 px-2">
                  <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Trim Amount</label>
                  <span className="font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">{margin}pt</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="120" 
                  value={margin} 
                  onChange={e => setMargin(parseInt(e.target.value))}
                  className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
             </div>
             
             <button onClick={applyCrop} className="w-full bg-teal-600 text-white py-5 rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl shadow-teal-500/20">
               {state.status === 'processing' ? <i className="fas fa-spinner fa-spin mr-2"></i> : 'Apply Crop'}
             </button>
          </div>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] border-2 border-teal-500 text-center shadow-2xl animate-in zoom-in duration-300">
           <div className="text-5xl mb-6 text-teal-500 animate-bounce"><i className="fas fa-crop"></i></div>
           <h2 className="text-3xl font-black mb-8 dark:text-white uppercase tracking-tighter">PDF Cropped!</h2>
           <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all">
              Download PDF
            </a>
            <button onClick={() => { setFile(null); setState({status:'idle', progress: 0}) }} className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-12 py-5 rounded-2xl font-black text-sm uppercase">Start New</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default CropPDF;
