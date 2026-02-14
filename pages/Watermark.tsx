
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

    setState({ status: 'processing', progress: 30, message: 'Branding PDF...' });

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
      setState({ status: 'error', progress: 0, message: 'Watermark failed. Try a smaller logo.' });
    }
  };

  const alignOptions: Alignment[] = ['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR'];

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 transition-colors duration-300">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-[900] text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">Watermark Pro</h1>
        <p className="text-slate-600 dark:text-slate-400 font-medium tracking-tight">Add secure text stamps or brand logos locally.</p>
      </div>

      {!file && <Dropzone onFilesSelected={(f) => setFile(f[0])} icon="fa-stamp" />}

      {file && state.status !== 'success' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in zoom-in duration-500">
          
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
             <div className="flex justify-between items-center mb-6 px-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">Document View</span>
                <button onClick={() => setFile(null)} className="text-slate-400 hover:text-rose-500 text-[10px] font-black uppercase">Change</button>
             </div>
             <PDFPreview file={file} className="aspect-[3/4] shadow-inner" />
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
              
              <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl">
                <button 
                  onClick={() => setWmType('text')} 
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${wmType === 'text' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Text Stamp
                </button>
                <button 
                  onClick={() => setWmType('image')} 
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${wmType === 'image' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Logo Upload
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {wmType === 'text' ? (
                    <div>
                      <label className="block text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-3">Stamp Content</label>
                      <input 
                        type="text" 
                        value={text} 
                        onChange={e => setText(e.target.value)} 
                        className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 outline-none focus:border-teal-500 font-bold dark:text-white" 
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-3">Branding Logo</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={e => setLogo(e.target.files?.[0] || null)} 
                        className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 text-[10px] dark:text-slate-400" 
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-3">Positioning</label>
                    <div className="grid grid-cols-3 gap-2 max-w-[150px]">
                        {alignOptions.map(opt => (
                          <button 
                            key={opt}
                            onClick={() => setAlignment(opt)}
                            className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${alignment === opt ? 'bg-teal-500 border-teal-600 shadow-lg shadow-teal-500/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}
                          >
                             <div className={`w-1.5 h-1.5 rounded-full ${alignment === opt ? 'bg-white' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {wmType === 'text' && (
                    <div>
                      <label className="block text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-3">Text Color</label>
                      <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border-2 border-slate-100 dark:border-slate-700">
                        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-12 h-12 rounded-xl cursor-pointer border-0 bg-transparent" />
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{color}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex justify-between">
                       <span className="text-[10px] font-black uppercase text-teal-600 dark:text-teal-400 tracking-widest">Opacity: {Math.round(opacity * 100)}%</span>
                    </div>
                    <input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={e => setOpacity(parseFloat(e.target.value))} className="w-full h-2 rounded-lg accent-teal-500" />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between">
                       <span className="text-[10px] font-black uppercase text-teal-600 dark:text-teal-400 tracking-widest">Scale: {scale}x</span>
                    </div>
                    <input type="range" min="0.5" max="3" step="0.1" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="w-full h-2 rounded-lg accent-teal-500" />
                  </div>
                </div>
              </div>

              <button 
                onClick={apply} 
                disabled={state.status === 'processing' || (wmType === 'image' && !logo)}
                className="w-full bg-slate-900 dark:bg-teal-600 text-white py-5 rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all disabled:opacity-30"
              >
                {state.status === 'processing' ? <i className="fas fa-spinner fa-spin mr-3"></i> : 'Apply to Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white dark:bg-slate-900 p-16 rounded-[4rem] border-4 border-teal-500 text-center shadow-2xl max-w-2xl mx-auto">
           <div className="w-20 h-20 bg-teal-500 text-white text-3xl rounded-full flex items-center justify-center mx-auto mb-10">
             <i className="fas fa-check-double"></i>
           </div>
           <h2 className="text-4xl font-[900] text-slate-900 dark:text-white mb-6 uppercase tracking-tighter">PDF Branded!</h2>
           <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white px-12 py-5 rounded-3xl font-black text-xl shadow-xl active:scale-95 transition-all">
                Download PDF
              </a>
              <button onClick={() => { setFile(null); setLogo(null); setState({status:'idle', progress: 0}) }} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-10 py-5 rounded-3xl font-black text-sm uppercase">
                New Task
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Watermark;
