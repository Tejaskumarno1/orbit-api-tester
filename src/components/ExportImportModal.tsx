import React, { useRef, useState } from "react";
import { Download, Upload, X, AlertTriangle } from "lucide-react";

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: (data: string) => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({ isOpen, onClose, onExport, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        if (result) {
          onImport(result);
          onClose();
        }
      } catch (err: any) {
        setError("Invalid backup file format.");
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animation-fade-in">
      <div 
        className={`w-[500px] max-w-[95vw] rounded-xl flex flex-col shadow-2xl overflow-hidden transition-all ${isDragging ? 'scale-105 shadow-[0_0_50px_rgba(99,102,241,0.5)] border-2 border-indigo-500' : ''}`} 
        style={{ background: 'var(--bg-primary)', border: isDragging ? '2px solid var(--accent)' : '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
          <h2 className="text-lg font-bold">Workspace Data</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Backup your entire workspace (including history, tabs, environments, and favorites) to a local file, or restore a previous backup.
          </p>
          
          <div className="flex flex-col gap-4">
            <button 
              onClick={onExport}
              className="flex items-center justify-center gap-2 p-4 rounded-xl font-bold transition-all border w-full hover:brightness-110"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
            >
              <Download size={18} />
              Export Workspace Backup (.json)
            </button>

            <div className="flex items-center gap-4">
              <div className="h-px flex-1" style={{ background: 'var(--border-primary)' }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>OR</span>
              <div className="h-px flex-1" style={{ background: 'var(--border-primary)' }} />
            </div>

            <button 
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center justify-center gap-2 p-4 rounded-xl font-bold transition-all border w-full ${isDragging ? 'animate-pulse' : 'hover:brightness-110'}`}
              style={{ background: isDragging ? 'var(--accent-hover)' : 'var(--accent)', color: 'white', borderColor: 'var(--accent)' }}
            >
              <Upload size={18} />
              {isDragging ? 'Drop Backup File Here...' : 'Restore from Backup'}
            </button>
            <input 
              type="file"
              ref={fileInputRef}
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-lg" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          <div className="p-4 rounded-lg text-xs" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning)' }}>
            <span className="font-bold uppercase tracking-wider block mb-1 text-[10px]">Warning</span>
            Restoring a backup will overwrite your current environments, history, and favorites. Make sure you export your current state first if you want to keep it!
          </div>
        </div>
      </div>
    </div>
  );
};
