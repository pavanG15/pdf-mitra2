
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import PDFPreview from '../components/PDFPreview';
import { ProcessingState } from '../types';

const Watermark: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [wmType, setWmType] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('CONFIDENTIAL');
  const [logo, setLogo] = useState<File | null>(null);
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(45);
  const [scale, setScale] = useState(1.0);
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });

  const apply = async () => {
    if (!file) return;
    const PDFLib = (window as any).PDFLib;
    if (!PDFLib) return;

    setState({ status: 'processing', progress: 50, message: 'Applying Watermark...' });

    try {
      const { rgb, degrees, StandardFonts } = PDFLib;
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(bytes);
      const pages = pdfDoc.getPages();

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
        if (wmType === 'text') {
          page.drawText(text, {
            x: width / 2 - (text.length * 15 * scale),
            y: height / 2,
            size: 60 * scale,
            font: helveticaFont,
            color: rgb(0.5, 0.5, 0.5),
            rotate: degrees(rotation),
            opacity: opacity,
          });
        } else if (embeddedImage) {
          const imgDims = embeddedImage.scale(0.5 * scale);
          page.drawImage(embeddedImage, {
            x: width / 2 - imgDims.width / 2,
            y: height / 2 - imgDims.height / 2,
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
        resultFileName: `watermarked_${file.name}` 
      });
    } catch (err) {
      console.error(err);
      setState({ status: 'error', message: 'Failed to apply watermark.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Professional Watermark</h1>
        <p className="text-slate-600 dark:text-slate-400 font-medium">Secure your documents with custom text or logos.</p>
      </div>

      {!file && <Dropzone onFilesSelected={(f) => setFile(f[0])} />}

      {file && state.status !== 'success' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Preview Section */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
             <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-600">Document Preview</span>
                <button onClick={() => setFile(null)} className="text-slate-400 text-xs"><i className="fas fa-trash mr-1"></i> Change File</button>
             </div>
             <PDFPreview file={file} className="aspect-[3/4]" />
             <div className="mt-4 text-[10px] text-slate-400 font-bold uppercase text-center truncate">{file.name}</div>
          </div>

          {/* Controls Section */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
             <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                <button onClick={() => setWmType('text')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${wmType === 'text' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-500'}`}>Text</button>
                <button onClick={() => setWmType('image')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${wmType === 'image' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-500'}`}>Logo / Image</button>
             </div>

             {wmType === 'text' ? (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Watermark Text</label>
                  <input type="text" value={text} onChange={e => setText(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:border-teal-500 font-bold dark:text-white" />
                </div>
             ) : (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Upload Logo</label>
                  <input type="file" accept="image/png, image/jpeg" onChange={e => setLogo(e.target.files?.[0] || null)} className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
                </div>
             )}

             <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black uppercase text-slate-400">Opacity: {Math.round(opacity * 100)}%</span>
                   <input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={e => setOpacity(parseFloat(e.target.value))} className="w-2/3 h-2 accent-teal-500" />
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black uppercase text-slate-400">Rotation: {rotation}°</span>
                   <input type="range" min="-180" max="180" value={rotation} onChange={e => setRotation(parseInt(e.target.value))} className="w-2/3 h-2 accent-teal-500" />
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black uppercase text-slate-400">Scale: {scale.toFixed(1)}x</span>
                   <input type="range" min="0.1" max="3" step="0.1" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="w-2/3 h-2 accent-teal-500" />
                </div>
             </div>

             <button onClick={apply} className="w-full bg-teal-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-teal-500/20 active:scale-95 transition-all">
               {state.status === 'processing' ? <i className="fas fa-spinner fa-spin mr-2"></i> : 'Apply to All Pages'}
             </button>
          </div>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] border-4 border-teal-500 text-center shadow-2xl">
           <div className="text-6xl text-teal-500 mb-8"><i className="fas fa-check-double"></i></div>
           <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-10">Branding Applied!</h2>
           <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all">Download PDF</a>
              <button onClick={() => { setFile(null); setState({status:'idle', progress: 0}) }} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-12 py-5 rounded-2xl font-black text-xl">Start New</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Watermark;
