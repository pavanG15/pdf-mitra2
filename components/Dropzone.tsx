
import React, { useRef, useState } from 'react';

interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  title?: string;
  description?: string;
  icon?: string;
}

const Dropzone: React.FC<DropzoneProps> = ({ 
  onFilesSelected, 
  accept = "application/pdf", 
  multiple = false,
  title = "Choose File",
  description = "Local processing only",
  icon = "fa-file-upload"
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files) as File[];
      const filtered = accept.includes('*') 
        ? files 
        : files.filter(f => accept.split(',').some(a => f.type.includes(a.trim().replace('*', ''))));
      onFilesSelected(filtered);
    }
  };

  return (
    <div 
      className="max-w-md mx-auto"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={inputRef} 
        onChange={handleFileChange} 
        accept={accept} 
        multiple={multiple} 
        className="hidden" 
      />
      <div 
        onClick={() => inputRef.current?.click()}
        className={`
          cursor-pointer border-2 border-dashed rounded-[32px] p-8 text-center transition-all duration-300
          ${isDragging 
            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/10 scale-95' 
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-teal-400 hover:shadow-xl hover:shadow-teal-500/5'}
        `}
      >
        <div className={`
          w-20 h-20 rounded-[24px] flex items-center justify-center text-3xl mx-auto mb-6 transition-all shadow-sm
          ${isDragging ? 'bg-teal-500 text-white shadow-xl' : 'bg-slate-50 dark:bg-slate-800 text-teal-600 dark:text-teal-400'}
        `}>
          <i className={`fas ${icon}`}></i>
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1 uppercase tracking-tight">{title}</h3>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-6">{description}</p>
        
        <button className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg active:scale-90 transition-all">
          Upload Files
        </button>
      </div>
    </div>
  );
};

export default Dropzone;
