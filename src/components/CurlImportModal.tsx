import React, { useState } from "react";
import { X, Terminal } from "lucide-react";
import { HttpMethod, HeaderItem, WorkspaceTab } from "../types";

interface CurlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (tabData: Partial<WorkspaceTab>) => void;
}

export const CurlImportModal: React.FC<CurlImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [curlInput, setCurlInput] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleImport = () => {
    try {
      const input = curlInput.trim();
      if (!input.toLowerCase().startsWith('curl')) {
        throw new Error("Input must start with 'curl'");
      }

      // Basic regex parsing for cURL
      let method = "GET";
      const methodMatch = input.match(/-X\s+([A-Z]+)/) || input.match(/--request\s+([A-Z]+)/);
      if (methodMatch) method = methodMatch[1].toUpperCase();
      
      const urlMatch = input.match(/['"]?(https?:\/\/[^\s'"]+)['"]?/);
      let url = urlMatch ? urlMatch[1] : "";

      const headers: HeaderItem[] = [];
      const headerRegex = /-H\s+['"]([^'"]+)['"]/g;
      let hMatch;
      while ((hMatch = headerRegex.exec(input)) !== null) {
        const [k, ...v] = hMatch[1].split(':');
        if (k && v.length) {
          headers.push({
            id: Math.random().toString(),
            key: k.trim(),
            value: v.join(':').trim(),
            enabled: true
          });
        }
      }

      const dataMatch = input.match(/-d\s+['"]([\s\S]*?)['"]/);
      let body = dataMatch ? dataMatch[1] : "";
      
      if (!methodMatch && body) {
        method = "POST";
      }

      if (!url) throw new Error("Could not extract a valid URL");

      onImport({
        name: "Imported cURL",
        method: method as HttpMethod,
        url,
        headers,
        body
      });
      
      setCurlInput("");
      setError("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to parse cURL command");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animation-fade-in">
      <div className="w-[600px] max-w-[95vw] rounded-xl flex flex-col shadow-2xl overflow-hidden" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}>
        
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-2">
            <Terminal size={18} style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-bold">Import cURL</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Paste a valid cURL command below to instantly generate a new request.
          </p>
          <textarea
            value={curlInput}
            onChange={(e) => { setCurlInput(e.target.value); setError(""); }}
            placeholder={`curl -X POST https://api.example.com -H 'Content-Type: application/json' -d '{"key":"value"}'`}
            className="w-full h-40 text-xs font-mono p-4 rounded-lg outline-none focus-ring resize-none scrollbar-thin"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-secondary)', color: 'var(--text-primary)' }}
          />
          {error && (
            <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3 mt-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button 
              onClick={handleImport}
              disabled={!curlInput.trim()}
              className="px-6 py-2 text-xs font-bold text-white rounded-lg transition-all"
              style={{ background: curlInput.trim() ? 'var(--accent)' : 'var(--bg-tertiary)', opacity: curlInput.trim() ? 1 : 0.5 }}
            >
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
