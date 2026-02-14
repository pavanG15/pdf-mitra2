
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import { ProcessingState } from '../types';

const WordToPDF: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });

  const convert = async () => {
    if (!file) return;
    const mammoth = (window as any).mammoth;
    const jspdf = (window as any).jspdf;
    
    if (!mammoth || !jspdf) {
      setState({ status: 'error', progress: 0, message: 'Conversion libraries not loaded.' });
      return;
    }

    setState({ status: 'processing', progress: 30, message: 'Reading DOCX...' });

    try {
      const buffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
      const html = result.value;

      setState({ status: 'processing', progress: 60, message: 'Generating PDF...' });
      
      const { jsPDF } = jspdf;
      const doc = new jsPDF('p', 'pt', 'a4');
      
      // Using .html() requires dompurify and html2canvas which are now in index.html
      await doc.html(html, {
        callback: function (docInstance: any) {
          const blob = docInstance.output('blob');
          const url = URL.createObjectURL(blob);
          setState({ 
            status: 'success', 
            progress: 100, 
            resultUrl: url, 
            resultFileName: file.name.replace(/\.[^/.]+$/, "") + ".pdf" 
          });
        },
        margin: [40, 40, 40, 40],
        autoPaging: 'text',
        x: 0,
        y: 0,
        width: 520, // A4 width minus margins
        windowWidth: 675
      });
    } catch (err) {
      console.error('Conversion Error:', err);
      setState({ status: 'error', progress: 0, message: 'Conversion failed. Make sure it is a valid .docx file.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Word to PDF</h1>
        <p className="text-slate-600 dark:text-slate-400 font-medium">Convert your DOCX files to professional PDF format.</p>
      </div>

      {state.status === 'idle' && !file && (
        <Dropzone onFilesSelected={(f) => setFile(f[0])} accept=".docx" title="Drop Word Document" description="DOCX supported" />
      )}

      {file && state.status !== 'success' && (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 text-center shadow-xl">
           <div className="w-20 h-20 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 text-3xl rounded-3xl flex items-center justify-center mx-auto mb-6">
             <i className="fas fa-file-word"></i>
           </div>
           <h3 className="text-xl font-bold dark:text-white mb-8 truncate">{file.name}</h3>
           <button onClick={convert} disabled={state.status === 'processing'} className="w-full bg-teal-600 text-white py-4 rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl">
             {state.status === 'processing' ? (
               <span className="flex items-center justify-center gap-2">
                 <i className="fas fa-spinner fa-spin"></i> {state.message}
               </span>
             ) : 'Convert to PDF'}
           </button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-teal-500 shadow-2xl">
           <div className="text-6xl text-teal-500 mb-6 animate-bounce"><i className="fas fa-check-circle"></i></div>
           <h2 className="text-3xl font-black mb-10 dark:text-white">Word Document Converted!</h2>
           <div className="flex flex-col gap-4 max-w-xs mx-auto">
            <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-xl active:scale-95">
              Download PDF
            </a>
            <button onClick={() => { setFile(null); setState({status: 'idle', progress: 0})}} className="text-slate-400 font-bold uppercase text-xs">Convert Another</button>
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

export default WordToPDF;
