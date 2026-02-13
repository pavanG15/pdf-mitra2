
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import { ProcessingState } from '../types';

declare const PDFLib: any;

const Watermark: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('CONFIDENTIAL');
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });

  const apply = async () => {
    if (!file || !text) return;
    setState({ status: 'processing', progress: 50, message: 'Applying watermark...' });

    try {
      const { rgb, degrees, StandardFonts } = PDFLib;
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(bytes);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();

      pages.forEach((page: any) => {
        const { width, height } = page.getSize();
        page.drawText(text, {
          x: width / 2 - 150,
          y: height / 2 - 50,
          size: 60,
          font: helveticaFont,
          color: rgb(0.7, 0.7, 0.7),
          rotate: degrees(45),
          opacity: 0.3,
        });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setState({ status: 'success', progress: 100, resultUrl: url, resultFileName: `watermarked_${file.name}` });
    } catch (err) {
      setState({ status: 'error', progress: 0, message: 'Failed to apply watermark.' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Watermark</h1>
        <p className="text-slate-600 font-medium">Add text stamps to your document for security.</p>
      </div>

      {!file && <Dropzone onFilesSelected={(f) => setFile(f[0])} />}

      {file && state.status !== 'success' && (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl">
           <div className="mb-8">
              <label className="block text-sm font-bold text-slate-700 mb-2 text-left">Watermark Text</label>
              <input 
                type="text" 
                value={text} 
                onChange={e => setText(e.target.value)}
                className="w-full px-6 py-4 rounded-xl border border-slate-200 focus:border-orange-500 outline-none"
                placeholder="CONFIDENTIAL, COPY, DRAFT..."
              />
           </div>
           <button onClick={apply} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black text-lg">
             Stamp All Pages
           </button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white p-12 rounded-[2.5rem] border-2 border-orange-500 text-center shadow-2xl">
           <div className="text-5xl mb-6 text-orange-500"><i className="fas fa-stamp"></i></div>
           <h2 className="text-3xl font-black mb-8">Watermark Applied!</h2>
           <a href={state.resultUrl} download={state.resultFileName} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-lg">
             Download PDF
           </a>
        </div>
      )}
    </div>
  );
};

export default Watermark;
