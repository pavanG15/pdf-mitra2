
import React, { useState } from 'react';
import { ProcessingState } from '../types';

declare const jspdf: any;

const IDCardMerge: React.FC = () => {
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (side === 'front') setFrontImage(event.target?.result as string);
        else setBackImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const mergeToPDF = async () => {
    if (!frontImage || !backImage) return;
    setState({ status: 'processing', progress: 50, message: 'Creating PDF...' });

    try {
      const { jsPDF } = jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const cardWidth = pageWidth - (margin * 2);
      // Average ID card aspect ratio is 1.58:1 (85.6mm x 54mm)
      const cardHeight = cardWidth / 1.58;

      // Add Front
      doc.addImage(frontImage, 'JPEG', margin, margin, cardWidth, cardHeight);
      
      // Add Back below Front with small gap
      doc.addImage(backImage, 'JPEG', margin, margin + cardHeight + 10, cardWidth, cardHeight);

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      
      setState({ 
        status: 'success', 
        progress: 100, 
        resultUrl: url, 
        resultFileName: 'ID_Card_Merge.pdf' 
      });
    } catch (err) {
      console.error(err);
      setState({ status: 'error', progress: 0, message: 'Failed to create PDF. Ensure images are valid.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">ID Card Front/Back Merge</h1>
        <p className="text-slate-600 font-medium">Merge both sides of your ID card into a single page PDF locally.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Front Side */}
        <div className="flex flex-col">
          <label className="text-xs font-black text-teal-600 uppercase tracking-widest mb-3 px-2">Front Side</label>
          <div 
            className={`relative aspect-[1.58/1] border-4 border-dashed rounded-[2.5rem] flex items-center justify-center overflow-hidden transition-all ${
              frontImage ? 'border-teal-500 bg-white' : 'border-slate-200 bg-slate-50 hover:border-teal-400'
            }`}
          >
            {frontImage ? (
              <>
                <img src={frontImage} className="w-full h-full object-contain" />
                <button 
                  onClick={() => setFrontImage(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg"
                >
                  <i className="fas fa-times"></i>
                </button>
              </>
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-4 text-slate-400 hover:text-teal-600">
                <i className="fas fa-camera text-4xl"></i>
                <span className="font-bold text-sm uppercase tracking-widest">Add Front</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'front')} />
              </label>
            )}
          </div>
        </div>

        {/* Back Side */}
        <div className="flex flex-col">
          <label className="text-xs font-black text-teal-600 uppercase tracking-widest mb-3 px-2">Back Side</label>
          <div 
            className={`relative aspect-[1.58/1] border-4 border-dashed rounded-[2.5rem] flex items-center justify-center overflow-hidden transition-all ${
              backImage ? 'border-teal-500 bg-white' : 'border-slate-200 bg-slate-50 hover:border-teal-400'
            }`}
          >
            {backImage ? (
              <>
                <img src={backImage} className="w-full h-full object-contain" />
                <button 
                  onClick={() => setBackImage(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg"
                >
                  <i className="fas fa-times"></i>
                </button>
              </>
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-4 text-slate-400 hover:text-teal-600">
                <i className="fas fa-camera text-4xl"></i>
                <span className="font-bold text-sm uppercase tracking-widest">Add Back</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'back')} />
              </label>
            )}
          </div>
        </div>
      </div>

      {state.status !== 'success' && (
        <button 
          onClick={mergeToPDF}
          disabled={!frontImage || !backImage || state.status === 'processing'}
          className={`w-full py-5 rounded-[2rem] font-black text-xl shadow-2xl transition-all ${
            frontImage && backImage 
            ? 'bg-teal-600 text-white hover:scale-[1.02] active:scale-95 shadow-teal-500/20' 
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {state.status === 'processing' ? <i className="fas fa-spinner fa-spin mr-2"></i> : null}
          Save & Merge to PDF
        </button>
      )}

      {state.status === 'success' && (
        <div className="bg-white p-12 rounded-[3rem] border-2 border-teal-500 text-center shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-teal-500 text-white text-3xl rounded-full flex items-center justify-center mx-auto mb-8">
            <i className="fas fa-check"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-10">ID Card Merged!</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-orange-500/20 transition-all hover:scale-105">
              <i className="fas fa-download mr-2"></i> Download PDF
            </a>
            <button 
              onClick={() => { setFrontImage(null); setBackImage(null); setState({ status: 'idle', progress: 0 }); }} 
              className="bg-slate-100 text-slate-700 px-10 py-4 rounded-2xl font-black text-lg hover:bg-slate-200"
            >
              Start New
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IDCardMerge;
