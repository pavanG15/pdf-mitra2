
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import PDFPreview from '../components/MyPDFPreview';
import { ProcessingState } from '../types';

const Numbering: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pos, setPos] = useState<'bc' | 'br' | 'bl' | 'tc' | 'tr' | 'tl'>('bc');
  const [color, setColor] = useState('#64748b');
  const [fontSize, setFontSize] = useState(10);
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });

  const addNumbers = async () => {
    if (!file) return;
    const PDFLib = (window as any).PDFLib;
    if (!PDFLib) return;

    setState({ status: 'processing', progress: 50, message: 'Adding numbers...' });

    try {
      const { rgb, StandardFonts } = PDFLib;
      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return rgb(r, g, b);
      };

      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(bytes);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();

      pages.forEach((page: any, i: number) => {
        const { width, height } = page.getSize();
        const text = `${i + 1}`;
        const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize);
        
        let x = width / 2 - textWidth / 2;
        let y = 30;

        if (pos === 'bl') x = 40;
        if (pos === 'br') x = width - textWidth - 40;
        if (pos === 'tc' || pos === 'tl' || pos === 'tr') y = height - 40;
        if (pos === 'tl') x = 40;
        if (pos === 'tr') x = width - textWidth - 40;

        page.drawText(text, {
          x, y,
          size: fontSize,
          font: helveticaFont,
          color: hexToRgb(color),
        });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setState({ 
        status: 'success', 
        progress: 100, 
        resultUrl: URL.createObjectURL(blob), 
        resultFileName: `numbered_${file.name}` 
      });
    } catch (err) {
      console.error(err);
      setState({ status: 'error', message: 'Failed to apply numbers.' });
    }
  };

  const positions = [
    { id: 'tl', label: 'Top Left' }, { id: 'tc', label: 'Top Center' }, { id: 'tr', label: 'Top Right' },
    { id: 'bl', label: 'Bottom Left' }, { id: 'bc', label: 'Bottom Center' }, { id: 'br', label: 'Bottom Right' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-[900] text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">Page Numbers</h1>
        <p className="text-slate-600 dark:text-slate-400 font-medium">Customize position and style of labels.</p>
      </div>

      {!file && <Dropzone onFilesSelected={(f) => setFile(f[0])} icon="fa-list-ol" />}

      {file && state.status !== 'success' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in zoom-in duration-300">
           <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
             <PDFPreview file={file} className="aspect-[3/4]" />
             <button onClick={() => setFile(null)} className="w-full mt-4 text-[10px] font-black text-rose-500 uppercase tracking-widest">Change File</button>
           </div>

           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Select Placement</label>
                <div className="grid grid-cols-3 gap-2">
                   {positions.map(item => (
                     <button 
                       key={item.id} 
                       onClick={() => setPos(item.id as any)}
                       className={`h-16 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${pos === item.id ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-600' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}
                     >
                       <span className="text-[10px] font-black uppercase tracking-widest text-center">{item.label}</span>
                     </button>
                   ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Text Color</label>
                    <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-12 rounded-xl cursor-pointer bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Size: {fontSize}pt</label>
                    <input type="range" min="6" max="24" value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))} className="w-full h-12 accent-teal-500" />
                 </div>
              </div>

              <button onClick={addNumbers} className="w-full bg-teal-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all">
                Add Numbers
              </button>
           </div>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] border-2 border-teal-500 text-center shadow-2xl animate-in zoom-in duration-300">
           <div className="text-6xl text-teal-500 mb-8"><i className="fas fa-check-double"></i></div>
           <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-10 tracking-tighter">Pages Numbered!</h2>
           <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all">Download PDF</a>
              <button onClick={() => { setFile(null); setState({status:'idle', progress: 0}) }} className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-12 py-5 rounded-2xl font-black text-sm uppercase">New Task</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Numbering;
