
import React, { useEffect, useRef, useState } from 'react';

declare const pdfjsLib: any;

interface PDFPreviewProps {
  file: File;
  className?: string;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ file, className = "" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const renderPreview = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        setLoading(false);
      } catch (error) {
        console.error("Preview Error:", error);
      }
    };

    renderPreview();
  }, [file]);

  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <i className="fas fa-circle-notch fa-spin text-teal-500"></i>
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-auto block" />
    </div>
  );
};

export default PDFPreview;
