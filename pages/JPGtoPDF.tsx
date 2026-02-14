
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import PDFPreview from '../components/MyPDFPreview';
import { ProcessingState } from '../types';

declare const jspdf: any;

const JPGtoPDF: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });

  const generate = async () => {
    if (files.length === 0) return;
    setState({ status: 'processing', progress: 10, message: 'Processing images...' });

    try {
      const { jsPDF } = jspdf;
      const doc = new jsPDF();
      
      for (let i = 0; i < files.length; i++) {
        setState({ status: 'processing', progress: Math.round(((i+1)/files.length)*100), message: `Adding image ${i+1}...` });
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(files[i]);
        });

        if (i > 0) doc.addPage();
        doc.addImage(dataUrl, 'JPEG', 10, 10, 190, 0); // 190 width, auto height
      }

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setState({ status: 'success', progress: 100, resultUrl: url, resultFileName: 'images_to_pdf.pdf' });
    } catch (err) {
      setState({ status: 'error', progress: 0, message: 'Failed to create PDF.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">JPG to PDF</h1>
        <p className="text-slate-600 font-medium">Create a PDF document from your images.</p>
      </div>

      {state.status === 'idle' && files.length === 0 && (
        <Dropzone onFilesSelected={setFiles} multiple accept="image/*" title="Drop Images Here" />
      )}

      {files.length > 0 && state.status !== 'success' && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
           <div className="grid grid-cols-4 gap-4 mb-10">
              {files.map((f, i) => (
                <div key={i} className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                   <i className="fas fa-image text-2xl"></i>
                </div>
              ))}
           </div>
           <button onClick={generate} className="w-full bg-teal-600 text-white py-4 rounded-2xl font-black text-lg">
             Convert to PDF
           </button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-teal-500 shadow-2xl">
           <div className="text-6xl text-teal-500 mb-6"><i className="fas fa-check-circle"></i></div>
           <h2 className="text-3xl font-black mb-10">PDF Created Successfully!</h2>
           <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-xl">
             Download Document
           </a>
        </div>
      )}
    </div>
  );
};

export default JPGtoPDF;
