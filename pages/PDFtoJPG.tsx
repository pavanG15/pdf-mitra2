
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import { ProcessingState } from '../types';

declare const pdfjsLib: any;

const PDFtoJPG: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });
  const [images, setImages] = useState<string[]>([]);

  const convert = async () => {
    if (!file) return;
    setState({ status: 'processing', progress: 5, message: 'Initializing converter...' });

    try {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const numPages = pdf.numPages;
      const resultImages = [];

      for (let i = 1; i <= numPages; i++) {
        setState({ status: 'processing', progress: Math.round((i/numPages)*100), message: `Rendering page ${i}...` });
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        resultImages.push(canvas.toDataURL('image/jpeg', 0.8));
      }

      setImages(resultImages);
      setState({ status: 'success', progress: 100 });
    } catch (error) {
      setState({ status: 'error', progress: 0, message: 'Conversion failed.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">PDF to JPG</h1>
        <p className="text-slate-600 font-medium">Render PDF pages as high-quality image files.</p>
      </div>

      {!file && <Dropzone onFilesSelected={(files) => setFile(files[0])} />}

      {file && state.status !== 'success' && (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 text-center">
          <h3 className="text-xl font-bold mb-8 truncate">{file.name}</h3>
          <button onClick={convert} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black text-lg">
            {state.status === 'processing' ? state.message : 'Convert to Images'}
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {images.map((img, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl shadow-lg group">
              <img src={img} className="rounded-lg mb-4" />
              <a href={img} download={`page_${i+1}.jpg`} className="block text-center py-2 bg-slate-900 text-white rounded-lg text-sm font-bold">
                Download JPG
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PDFtoJPG;
