
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import PDFPreview from '../components/PDFPreview';
import { ProcessingState } from '../types';

type Alignment = 'TL' | 'TC' | 'TR' | 'ML' | 'MC' | 'MR' | 'BL' | 'BC' | 'BR';

const Watermark: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [wmType, setWmType] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('CONFIDENTIAL');
  const [logo, setLogo] = useState<File | null>(null);
  const [opacity, setOpacity] = useState(0.4);
  const [rotation, setRotation] = useState(45);
  const [scale, setScale] = useState(1.0);
  const [color, setColor] = useState('#64748b');
  const [alignment, setAlignment] = useState<Alignment>('MC');
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });

  const apply = async () => {
    if (!file) return;
    const PDFLib = (window as any).PDFLib;
    if (!PDFLib) return;

    setState({ status: 'processing', progress: 30, message: 'Processing document...' });

    try {
      const { rgb, degrees, StandardFonts } = PDFLib;
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(bytes);
      const pages = pdfDoc.getPages();

      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return rgb(r, g, b);
      };

      let embeddedImage: any = null;
      if (wmType === 'image' && logo) {
        const logoBytes = await logo.arrayBuffer();
        embeddedImage = logo.type === 'image/png' 
          ? await pdfDoc.embedPng(logoBytes) 
          : await pdfDoc.embedJpg(logoBytes);
      }

      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      pages.forEach((page: any) => {
        const { width, height } = page.getSize();
        
        const calculatePosition = (wmWidth: number, wmHeight: number) => {
          let px = width / 2 - wmWidth / 2;
          let py = height / 2 - wmHeight / 2;

          if (alignment.startsWith('T')) py = height - wmHeight - 50;
          if (alignment.startsWith('B')) py = 50;
          if (alignment.endsWith('L')) px = 50;
          if (alignment.endsWith('R')) px = width - wmWidth - 50;
          
          return { px, py };
        };

        if (wmType === 'text') {
          const fontSize = 50 * scale;
          const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize);
          const { px, py } = calculatePosition(textWidth, fontSize);
          
          page.drawText(text, {
            x: px,
            y: py,
            size: fontSize,
            font: helveticaFont,
            color: hexToRgb(color),
            rotate: degrees(rotation),
            opacity: opacity,
          });
        } else if (embeddedImage) {
          const imgDims = embeddedImage.scale(0.3 * scale);
          const { px, py } = calculatePosition(imgDims.width, imgDims.height);
          
          page.drawImage(embeddedImage, {
            x: px,
            y: py,
            width: imgDims.width,
            height: imgDims.height,
            rotate: degrees(rotation),
            opacity: opacity,
          });
        }
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setState({ 
        status: 'success', 
        progress: 100, 
        resultUrl: URL.createObjectURL(blob), 
        resultFileName: `marked_${file.name}` 
      });
    } catch (err) {
      console.error(err);
      setState({ status: 'error', progress: 0, message: 'Watermark application failed.' });
    }
  };

  const alignOptions: Alignment[] = ['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR'];

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 transition-colors duration-300">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-[900] text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">Watermark Pro</h1>
        <p className="text-slate-600 dark:text-slate-400 font-medium tracking-tight">Secure your documents with professional text stamps or logos.</p>
      </div>

      {!file && <Dropzone onFilesSelected={(f) => setFile(f[0])} icon="fa-stamp" />}

      {file && state.status !== 'success' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start animate-in fade-in zoom-in duration-500">
          
          {/* Preview View */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-8 rounded-[3.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
             <div className="flex justify-between items-center mb-8 px-2">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-600 dark:text-teal-400">PDF Preview</span>
                <button onClick={() => setFile(null)} className="text-slate-400 dark:text-slate-500 hover:text-rose-500 text-[10px] font-black uppercase tracking-widest transition-colors">Change File</button>
             </div>
             <PDFPreview file={file} className="aspect-[3/4] shadow-inner" />
          </div>

          {/* Config Controls */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] border border-slate-200 dark:border-slate-800 shadow-xl space-y-10">
              
              <div className="flex bg-slate-100 dark:bg-slate-800/50 p-2 rounded-2xl">
                <button 
                  onClick={() => setWmType('text')} 
                  className={`flex-1 py-4 rounded-xl text-[11px] font-[900] uppercase tracking-widest transition-all ${wmType === 'text' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-lg' : 'text-slate-500 dark:text-slate-500'}`}
                >
                  Text Stamp
                </button>
                <button 
                  onClick={() => setWmType('image')} 
                  className={`flex-1 py-4 rounded-xl text-[11px] font-[900] uppercase tracking-widest transition-all ${wmType === 'image' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-lg' : 'text-slate-500 dark:text-slate-500'}`}
                >
                  Logo Branding
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  {wmType === 'text' ? (
                    <div>
                      <label className="block text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-[0.3em] mb-4 px-1">Watermark Content</label>
                      <input 
                        type="text" 
                        value={text} 
                        onChange={e => setText(e.target.value)} 
                        className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 outline-none focus:border-teal-500 font-bold text-slate-900 dark:text-white transition-all shadow-inner placeholder-slate-400" 
                        placeholder="ENTER TEXT..."
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-[0.3em] mb-4 px-1">Source Logo</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={e => setLogo(e.target.files?.[0] || null)} 
                        className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 text-[10px] text-slate-500 font-black uppercase tracking-widest cursor-pointer" 
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-[0.3em] mb-4 px-1">Positional Anchor</label>
                    <div className="grid grid-cols-3 gap-3 max-w-[160px]">
                        {alignOptions.map(opt => (
                          <button 
                            key={opt}
                            onClick={() => setAlignment(opt)}
                            className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center transition-all ${alignment === opt ? 'bg-teal-500 border-teal-600 shadow-lg shadow-teal-500/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-teal-400'}`}
                          >
                             <div className={`w-2 h-2 rounded-full ${alignment === opt ? 'bg-white' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {wmType === 'text' && (
                    <div>
                      <label className="block text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-[0.3em] mb-4 px-1">Ink Color</label>
                      <div className="flex items-center gap-5 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700">
                        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-12 h-12 rounded-xl cursor-pointer border-0 bg-transparent ring-2 ring-white dark:ring-slate-900" />
                        <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{color}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-5">
                    <div className="flex justify-between px-1">
                       <span className="text-[10px] font-black uppercase text-teal-600 dark:text-teal-400 tracking-[0.2em]">Opacity</span>
                       <span className="text-[10px] font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">{Math.round(opacity * 100)}%</span>
                    </div>
                    <input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={e => setOpacity(parseFloat(e.target.value))} className="w-full h-2 rounded-lg appearance-none bg-slate-100 dark:bg-slate-800 accent-teal-500" />
                  </div>

                  <div className="space-y-5">
                    <div className="flex justify-between px-1">
                       <span className="text-[10px] font-black uppercase text-teal-600 dark:text-teal-400 tracking-[0.2em]">Scale Factor</span>
                       <span className="text-[10px] font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">{scale.toFixed(1)}x</span>
                    </div>
                    <input type="range" min="0.5" max="3" step="0.1" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="w-full h-2 rounded-lg appearance-none bg-slate-100 dark:bg-slate-800 accent-teal-500" />
                  </div>
                </div>
              </div>

              <button 
                onClick={apply} 
                disabled={state.status === 'processing' || (wmType === 'image' && !logo)}
                className="w-full bg-slate-900 dark:bg-teal-600 text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed mt-4 tracking-tight"
              >
                {state.status === 'processing' ? <i className="fas fa-spinner fa-spin mr-3"></i> : 'Apply Branding to PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white dark:bg-slate-900 p-20 rounded-[4rem] border-4 border-teal-500 text-center shadow-2xl max-w-2xl mx-auto animate-in zoom-in duration-500">
           <div className="w-24 h-24 bg-teal-500 text-white text-4xl rounded-full flex items-center justify-center mx-auto mb-12 shadow-xl shadow-teal-500/30">
             <i className="fas fa-check-double"></i>
           </div>
           <h2 className="text-4xl font-[900] text-slate-900 dark:text-white mb-8 uppercase tracking-tighter">PDF Branded!</h2>
           <p className="text-slate-500 dark:text-slate-400 mb-12 font-medium text-lg leading-relaxed">Your secure watermark has been applied across every page of your document.</p>
           
           <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white px-12 py-6 rounded-[2rem] font-black text-xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                <i className="fas fa-download"></i> Download File
              </a>
              <button onClick={() => { setFile(null); setLogo(null); setState({status:'idle', progress: 0}) }} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-10 py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] active:scale-95 transition-all">
                New Task
              </button>
           </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className="mt-8 p-6 bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-900 rounded-3xl text-rose-600 dark:text-rose-400 font-black text-center text-xs uppercase tracking-[0.2em]">
          <i className="fas fa-exclamation-circle mr-2"></i> {state.message}
        </div>
      )}
    </div>
  );
};

export default Watermark;
