
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import PDFPreview from '../components/MyPDFPreview';
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

      // Convert hex to RGB
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
        let x = 0, y = 0;

        // Calculate Position based on alignment
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
          const imgDims = embeddedImage.scale(0.4 * scale);
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
      setState({ status: 'error', message: 'Failed to apply watermark. Ensure libraries are loaded.' });
    }
  };

  const alignOptions: Alignment[] = ['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR'];

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 transition-colors duration-300">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-[900] text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">Watermark Pro</h1>
        <p className="text-slate-600 dark:text-slate-400 font-medium tracking-tight">Add secure text stamps or logos to your documents locally.</p>
      </div>

      {!file && <Dropzone onFilesSelected={(f) => setFile(f[0])} icon="fa-stamp" />}

      {file && state.status !== 'success' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in zoom-in duration-300">
          
          {/* Preview Panel */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
             <div className="flex justify-between items-center mb-6 px-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-600">Live Preview</span>
                <button onClick={() => setFile(null)} className="text-slate-400 dark:text-slate-500 hover:text-rose-500 transition-colors text-[10px] font-black uppercase">Change File</button>
             </div>
             <PDFPreview file={file} className="aspect-[3/4] shadow-inner" />
          </div>

          {/* Configuration Panel */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
              
              {/* Type Switcher */}
              <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl">
                <button onClick={() => setWmType('text')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${wmType === 'text' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>Text Stamp</button>
                <button onClick={() => setWmType('image')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${wmType === 'image' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>Upload Logo</button>
              </div>

              {/* Dynamic Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {wmType === 'text' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Stamp Text</label>
                      <input 
                        type="text" 
                        value={text} 
                        onChange={e => setText(e.target.value)} 
                        className="w-full bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:border-teal-500 font-bold dark:text-white transition-colors" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Text Color</label>
                      <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{color}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Logo File (PNG/JPG)</label>
                    <div className="relative group">
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg" 
                        onChange={e => setLogo(e.target.files?.[0] || null)} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      />
                      <div className={`p-6 border-2 border-dashed rounded-2xl text-center transition-all ${logo ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 group-hover:border-teal-400'}`}>
                        <i className={`fas ${logo ? 'fa-check-circle text-teal-500' : 'fa-image text-slate-300'} text-xl mb-2`}></i>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">
                          {logo ? logo.name : 'Select Branding Image'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alignment Grid */}
                <div>
                   <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Alignment</label>
                   <div className="grid grid-cols-3 gap-2 max-w-[150px]">
                      {alignOptions.map(opt => (
                        <button 
                          key={opt}
                          onClick={() => setAlignment(opt)}
                          className={`w-10 h-10 rounded-lg border-2 transition-all flex items-center justify-center ${alignment === opt ? 'bg-teal-500 border-teal-600 shadow-lg scale-110' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
                        >
                           <div className={`w-1.5 h-1.5 rounded-full ${alignment === opt ? 'bg-white' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                        </button>
                      ))}
                   </div>
                </div>
              </div>

              {/* Advanced Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Opacity</span>
                    <span className="text-[10px] font-black text-teal-500">{Math.round(opacity * 100)}%</span>
                  </div>
                  <input type="range" min="0.05" max="1" step="0.05" value={opacity} onChange={e => setOpacity(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Rotation</span>
                    <span className="text-[10px] font-black text-teal-500">{rotation}°</span>
                  </div>
                  <input type="range" min="-180" max="180" value={rotation} onChange={e => setRotation(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Scale</span>
                    <span className="text-[10px] font-black text-teal-500">{scale.toFixed(1)}x</span>
                  </div>
                  <input type="range" min="0.2" max="5" step="0.1" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500" />
                </div>
              </div>

              <button 
                onClick={apply} 
                disabled={state.status === 'processing' || (wmType === 'image' && !logo)}
                className="w-full bg-slate-900 dark:bg-teal-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-teal-500/10 active:scale-95 transition-all disabled:opacity-50"
              >
                {state.status === 'processing' ? <i className="fas fa-spinner fa-spin mr-2"></i> : 'Apply to All Pages'}
              </button>
            </div>
          </div>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] border-4 border-teal-500 text-center shadow-2xl max-w-2xl mx-auto">
           <div className="w-24 h-24 bg-teal-500 text-white text-4xl rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-teal-500/20">
             <i className="fas fa-check-double"></i>
           </div>
           <h2 className="text-4xl font-[900] text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">Branding Applied!</h2>
           <p className="text-slate-500 dark:text-slate-400 mb-10 font-medium tracking-tight">Your watermarked PDF has been generated successfully and is ready for download.</p>
           
           <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                <i className="fas fa-download"></i> Download PDF
              </a>
              <button onClick={() => { setFile(null); setLogo(null); setState({status:'idle', progress: 0}) }} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest">
                Process New
              </button>
           </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className="mt-6 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-600 dark:text-rose-400 font-bold text-center uppercase text-[10px] tracking-widest">
          {state.message}
        </div>
      )}
    </div>
  );
};

export default Watermark;
