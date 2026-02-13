
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import { ProcessingState } from '../types';

declare const PDFLib: any;

const Numbering: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });

  const addNumbers = async () => {
    if (!file) return;
    setState({ status: 'processing', progress: 50, message: 'Adding page numbers...' });

    try {
      const { rgb, StandardFonts } = PDFLib;
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(bytes);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();

      pages.forEach((page: any, i: number) => {
        const { width } = page.getSize();
        page.drawText(`Page ${i + 1} of ${pages.length}`, {
          x: width / 2 - 30,
          y: 20,
          size: 10,
          font: helveticaFont,
          color: rgb(0.5, 0.5, 0.5),
        });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setState({ status: 'success', progress: 100, resultUrl: url, resultFileName: `numbered_${file.name}` });
    } catch (err) {
      setState({ status: 'error', progress: 0, message: 'Failed to add numbering.' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Page Numbers</h1>
        <p className="text-slate-600 font-medium">Add automatic page numbering to your document footer.</p>
      </div>

      {!file && <Dropzone onFilesSelected={(f) => setFile(f[0])} icon="fa-list-ol" />}

      {file && state.status !== 'success' && (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 text-center shadow-xl">
           <h3 className="text-xl font-bold mb-8">{file.name}</h3>
           <button onClick={addNumbers} className="w-full bg-pink-500 text-white py-4 rounded-2xl font-black text-lg">
             Add Numbering Now
           </button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white p-12 rounded-[2.5rem] border-2 border-pink-500 text-center shadow-2xl">
           <div className="text-5xl mb-6 text-pink-500"><i className="fas fa-check-double"></i></div>
           <h2 className="text-3xl font-black mb-8">Document Numbered!</h2>
           <a href={state.resultUrl} download={state.resultFileName} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-lg">
             Download PDF
           </a>
        </div>
      )}
    </div>
  );
};

export default Numbering;
