
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import PDFPreview from '../components/MyPDFPreview';
import { ProcessingState } from '../types';

declare const pdfjsLib: any;
declare const jspdf: any;

const Protect: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });

  const protect = async () => {
    if (!file || !password) return;
    
    setState({ status: 'processing', progress: 10, message: 'Applying encryption...' });

    try {
      const { jsPDF } = jspdf;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      
      // We recreate the PDF with encryption. 
      const doc = new jsPDF({
        encryption: {
          userPassword: password,
          ownerPassword: password,
          userPermissions: ['print', 'modify', 'copy', 'annotating']
        }
      });

      for (let i = 1; i <= numPages; i++) {
        setState({ 
          status: 'processing', 
          progress: Math.round((i / numPages) * 100), 
          message: `Securing page ${i}...` 
        });

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        const imgData = canvas.toDataURL('image/jpeg', 0.9);

        if (i > 1) doc.addPage([viewport.width, viewport.height]);
        else {
          doc.deletePage(1);
          doc.addPage([viewport.width, viewport.height]);
        }
        
        doc.addImage(imgData, 'JPEG', 0, 0, viewport.width, viewport.height);
      }

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setState({ status: 'success', progress: 100, resultUrl: url, resultFileName: `locked_${file.name}` });
    } catch (error) {
      console.error('Protection Error:', error);
      setState({ status: 'error', progress: 0, message: 'Encryption failed. Check file validity.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-[900] text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">Protect PDF</h1>
        <p className="text-slate-600 dark:text-slate-400 font-medium tracking-tight">Add secure password protection locally.</p>
      </div>

      {state.status === 'idle' && !file && <Dropzone onFilesSelected={(f) => setFile(f[0])} icon="fa-lock" />}

      {file && state.status !== 'success' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
             <PDFPreview file={file} className="aspect-[3/4]" />
             <div className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{file.name}</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-center">
             <div className="mb-8">
                <label className="block text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] mb-4">Access Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-6 py-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-teal-500 outline-none text-slate-900 dark:text-white font-bold"
                  placeholder="Password required to open..."
                />
             </div>
             
             <button 
                onClick={protect} 
                disabled={!password || state.status === 'processing'}
                className="w-full bg-slate-900 dark:bg-teal-600 text-white py-5 rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl disabled:opacity-50"
             >
               {state.status === 'processing' ? <i className="fas fa-spinner fa-spin mr-2"></i> : 'Apply Lock'}
             </button>
             <button onClick={() => setFile(null)} className="mt-4 text-[10px] font-black text-slate-400 uppercase">Cancel</button>
          </div>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] border-4 border-teal-500 text-center shadow-2xl">
           <div className="w-20 h-20 bg-teal-500 text-white text-3xl rounded-full flex items-center justify-center mx-auto mb-8">
             <i className="fas fa-lock"></i>
           </div>
           <h2 className="text-3xl font-black mb-10 dark:text-white uppercase tracking-tighter">Document Secured!</h2>
           <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all">
              Download Locked PDF
            </a>
            <button onClick={() => { setFile(null); setPassword(''); setState({status: 'idle', progress: 0})}} className="bg-slate-100 dark:bg-slate-800 text-slate-400 px-8 py-5 rounded-2xl font-black text-sm uppercase">
              Start New
            </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Protect;
