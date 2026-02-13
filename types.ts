
export enum ToolCategory {
  CONVERT = 'convert',
  ORGANIZE = 'organize',
  SECURITY = 'security',
  OPTIMIZE = 'optimize',
  EDIT = 'edit'
}

export interface PDFTool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string;
  path: string;
  color: string;
  isNew?: boolean;
  isPopular?: boolean;
}

export interface ProcessingState {
  status: 'idle' | 'loading' | 'processing' | 'success' | 'error';
  progress: number;
  message?: string;
  resultUrl?: string;
  resultFileName?: string;
}
