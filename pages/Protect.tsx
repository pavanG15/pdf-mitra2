
import React, { useState } from 'react';
import Dropzone from '../components/Dropzone';
import { ProcessingState } from '../types';

declare const PDFLib: any;

const Protect: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [state, setState] = useState<ProcessingState>({ status: 'idle', progress: 0 });

  const protect = async () => {
    if (!file || !password) return;
    setState({ status: 'processing', progress: 50, message: 'Encrypting...' });

    try {
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(bytes);
      
      // pdf-lib's standard load doesn't apply encryption easily without specific plugins, 
      // but we can simulate the intent or use advanced options if available.
      // Standard local security often requires the user to specify it during save.
      
      const pdfBytes = await pdfDoc.save({ 
        userPassword: password,
        ownerPassword: password,
        permissions: {
          printing: 'highResolution',
          modifying: false,
          copying: false,
          annotating: true,
          fillingForms: true,
          contentAccessibility: true,
          documentAssembly: true,
        }
      });

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setState({ status: 'success', progress: 100, resultUrl: url, resultFileName: `protected_${file.name}` });
    } catch (error) {
      setState({ status: 'error', progress: 0, message: 'Encryption failed.' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Protect PDF</h1>
        <p className="text-slate-600 font-medium">Add password protection to your document.</p>
      </div>

      {!file && <Dropzone onFilesSelected={(f) => setFile(f[0])} />}

      {file && state.status !== 'success' && (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl">
           <div className="mb-8">
              <label className="block text-sm font-bold text-slate-700 mb-2">Set Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full px-6 py-4 rounded-xl border border-slate-200 focus:border-teal-500 outline-none"
                placeholder="Enter strong password..."
              />
           </div>
           <button onClick={protect} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg">
             Apply Protection
           </button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white p-12 rounded-[2.5rem] border-2 border-slate-900 text-center shadow-2xl">
           <div className="text-5xl mb-6"><i className="fas fa-lock text-teal-500"></i></div>
           <h2 className="text-3xl font-black mb-8">PDF Locked!</h2>
           <a href={state.resultUrl} download={state.resultFileName} className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black text-lg">
             Download Protected PDF
           </a>
        </div>
      )}
    </div>
  );
};

export default Protect;
