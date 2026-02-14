
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import { ProcessingState } from '../types';

declare const pdfjsLib: any;
declare const docx: any;

const PDFtoWord: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });

  const startConversion = async () => {
    if (!file) return;
    setState({ status: 'processing', progress: 10, message: 'Extracting text from PDF...' });

    try {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const sections = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        setState({ status: 'processing', progress: Math.round((i / pdf.numPages) * 100), message: `Processing page ${i}...` });
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Group items by Y coordinate to form paragraphs
        const items = textContent.items.map((it: any) => ({
          text: it.str,
          y: Math.round(it.transform[5]),
          x: Math.round(it.transform[4])
        }));
        
        items.sort((a: any, b: any) => b.y - a.y || a.x - b.x);
        
        const paragraphs = [];
        let currentLine = "";
        let lastY = items[0]?.y;

        for (const item of items) {
          if (Math.abs(item.y - lastY) > 5) {
            paragraphs.push(new docx.Paragraph({
              children: [new docx.TextRun(currentLine)],
              spacing: { after: 200 }
            }));
            currentLine = item.text;
          } else {
            currentLine += " " + item.text;
          }
          lastY = item.y;
        }
        if (currentLine) {
           paragraphs.push(new docx.Paragraph({
              children: [new docx.TextRun(currentLine)],
              spacing: { after: 200 }
            }));
        }

        sections.push({
          children: paragraphs
        });
      }

      const doc = new docx.Document({ sections });
      const blob = await docx.Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      
      setState({ 
        status: 'success', 
        progress: 100, 
        resultUrl: url, 
        resultFileName: file.name.replace('.pdf', '.docx') 
      });
    } catch (error) {
      console.error(error);
      setState({ status: 'error', progress: 0, message: 'Failed to convert PDF to Word.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">PDF to Word</h1>
        <p className="text-slate-600 font-medium">Convert PDF documents into editable Word files instantly.</p>
      </div>

      {state.status === 'idle' && !file && (
        <Dropzone onFilesSelected={(files) => setFile(files[0])} title="Select PDF to Convert" />
      )}

      {file && state.status !== 'success' && (
        <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 text-center shadow-xl">
           <div className="w-20 h-20 bg-blue-50 text-blue-600 text-3xl rounded-3xl flex items-center justify-center mx-auto mb-6">
             <i className="fas fa-file-word"></i>
           </div>
           <h3 className="text-xl font-bold mb-2">{file.name}</h3>
           <p className="text-slate-500 mb-10 font-medium">Ready to transform this PDF into an editable Word document.</p>
           
           <button 
             onClick={startConversion}
             disabled={state.status === 'processing'}
             className="bg-blue-600 text-white px-12 py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
           >
             {state.status === 'processing' ? (
               <span className="flex items-center gap-3">
                 <i className="fas fa-spinner fa-spin"></i> {state.message}
               </span>
             ) : 'Start Conversion'}
           </button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white p-12 rounded-[2.5rem] border-2 border-blue-500 text-center shadow-2xl">
          <div className="w-20 h-20 bg-blue-500 text-white text-3xl rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <i className="fas fa-check"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4">Conversion Complete!</h2>
          <p className="text-slate-500 font-medium mb-10">Your editable Word document is ready.</p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href={state.resultUrl} 
              download={state.resultFileName}
              className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-orange-500/20"
            >
              <i className="fas fa-download mr-2"></i> Download Doc
            </a>
            <button 
              onClick={() => { setFile(null); setState({ status: 'idle', progress: 0 }); }}
              className="bg-slate-100 text-slate-700 px-10 py-4 rounded-2xl font-black text-lg"
            >
              Try Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFtoWord;
