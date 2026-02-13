
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
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
        // Adjust CropBox - shrinking the viewable area by the margin on all sides
        page.setCropBox(margin, margin, width - margin * 2, height - margin * 2);
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setState({ status: 'success', progress: 100, resultUrl: url, resultFileName: `cropped_${file.name}` });
    } catch (err) {
      setState({ status: 'error', progress: 0, message: 'Cropping failed.' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Crop PDF</h1>
        <p className="text-slate-600 font-medium">Trim white margins or focus on specific content areas.</p>
      </div>

      {!file && <Dropzone onFilesSelected={(f) => setFile(f[0])} icon="fa-crop-alt" />}

      {file && state.status !== 'success' && (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl">
           <div className="mb-10">
              <div className="flex justify-between items-center mb-4 px-2">
                <label className="text-xs font-black text-teal-600 uppercase tracking-widest">Margin to Trim (Points)</label>
                <span className="font-black text-slate-900">{margin}pt</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={margin} 
                onChange={e => setMargin(parseInt(e.target.value))}
                className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
           </div>
           <button onClick={applyCrop} className="w-full bg-teal-600 text-white py-4 rounded-2xl font-black text-lg">
             Apply Crop
           </button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white p-12 rounded-[2.5rem] border-2 border-teal-500 text-center shadow-2xl">
           <div className="text-5xl mb-6 text-teal-500"><i className="fas fa-crop"></i></div>
           <h2 className="text-3xl font-black mb-8">PDF Cropped!</h2>
           <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black text-lg">
             Download Cropped PDF
           </a>
        </div>
      )}
    </div>
  );
};

export default CropPDF;
