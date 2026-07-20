import React, { useState, useEffect } from "react";
import { 
  Copy, 
  Check, 
  Clock, 
  Database, 
  Wifi, 
  ShieldAlert,
  Download,
  Maximize2,
  Minimize2,
  GitPullRequest,
  ChevronDown
} from "lucide-react";
import { JsonTreeView } from "./JsonTreeView";
import { TableView } from "./TableView";
import { ChartView } from "./ChartView";
import { DiffView } from "./DiffView";
import { HistoryItem } from "../types";
import { useTheme } from "../ThemeContext";

interface ResponsePanelProps {
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    duration: number;
    size: string;
    data: any;
  } | null;
  isLoading: boolean;
  error?: string;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  history?: HistoryItem[];
  testResults?: { assertionId: string; passed: boolean; actualValue?: any; error?: string }[];
  onToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ResponsePanel: React.FC<ResponsePanelProps> = ({ response, isLoading, error, isMaximized, onToggleMaximize, history = [], testResults, onToast }) => {
  const [activeTab, setActiveTab] = useState<"body" | "raw" | "headers" | "table" | "chart" | "diff" | "tests">("body");
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [diffBaseId, setDiffBaseId] = useState<string>("");
  const [isDiffMenuOpen, setIsDiffMenuOpen] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    const handleClickAway = () => setIsDiffMenuOpen(false);
    if (isDiffMenuOpen) window.addEventListener('click', handleClickAway);
    return () => window.removeEventListener('click', handleClickAway);
  }, [isDiffMenuOpen]);

  // Set default diff base to the most recent successful history item with a response
  useEffect(() => {
    if (activeTab === "diff" && !diffBaseId) {
      const validHistory = history.filter(h => h.response && h.response.data);
      if (validHistory.length > 0) {
        setDiffBaseId(validHistory[0].id);
      }
    }
  }, [activeTab, history, diffBaseId]);

  const getStatusStyle = (status: number) => {
    if (status >= 200 && status < 300) return { background: 'var(--success-bg)', color: 'var(--success)', dotColor: 'var(--success)' };
    if (status >= 300 && status < 400) return { background: 'var(--info-bg)', color: 'var(--info)', dotColor: 'var(--info)' };
    if (status >= 400 && status < 500) return { background: 'var(--warning-bg)', color: 'var(--warning)', dotColor: 'var(--warning)' };
    return { background: 'var(--error-bg)', color: 'var(--error)', dotColor: 'var(--error)' };
  };

  const copyResponseToClipboard = () => {
    if (!response) return;
    const text = typeof response.data === "object" ? JSON.stringify(response.data, null, 2) : String(response.data);
    navigator.clipboard.writeText(text);
    setCopiedResponse(true);
    if (onToast) onToast("Response copied to clipboard", "success");
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  const downloadResponseFile = () => {
    if (!response) return;
    const text = typeof response.data === "object" ? JSON.stringify(response.data, null, 2) : String(response.data);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `response_${response.status}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (onToast) onToast(`Saved response_${response.status}.json`, "success");
  };

  const tabStyle = (isActive: boolean) => ({
    color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
    background: isActive ? 'var(--accent-bg)' : 'transparent',
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 rounded-xl h-full shadow-inner" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--bg-tertiary)', borderTopColor: 'var(--accent)' }} />
          <Wifi size={18} className="absolute animate-pulse" style={{ color: 'var(--accent)' }} />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Sending Request...</p>
          <p className="text-xs max-w-[250px] mt-2 font-mono" style={{ color: 'var(--text-tertiary)' }}>
            Awaiting response from the server.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 rounded-xl h-full shadow-inner select-text" style={{ background: 'var(--bg-card)', border: '1px solid var(--error)' }}>
        <div className="p-4 rounded-full" style={{ background: 'var(--error-bg)' }}>
          <ShieldAlert size={32} style={{ color: 'var(--error)' }} />
        </div>
        <div className="text-center max-w-md w-full">
          <p className="text-base font-bold mb-3" style={{ color: 'var(--error)' }}>Request Failed</p>
          <div className="rounded-lg p-4 text-left overflow-auto whitespace-pre-wrap max-h-48 text-xs font-mono shadow-sm" 
            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>
            {error}
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--text-tertiary)' }}>
            Check your network connection, URL spelling, and authorization credentials.
          </p>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 rounded-xl h-full text-center shadow-inner select-none relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-secondary)' }}>
        <div className="absolute inset-0 opacity-5 animate-pan-bg" style={{ backgroundImage: 'radial-gradient(var(--text-tertiary) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="p-5 rounded-full z-10 transition-transform duration-700 hover:scale-110 cursor-default" style={{ background: 'var(--bg-tertiary)', boxShadow: 'var(--shadow-md)' }}>
          <Database size={36} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <div className="z-10">
          <p className="text-sm font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>Awaiting Execution</p>
          <p className="text-xs max-w-[280px] mt-2 leading-relaxed font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Configure your request and hit <strong style={{ color: 'var(--accent)' }}>Send</strong> to execute.
          </p>
        </div>
      </div>
    );
  }

  const statusStyle = getStatusStyle(response.status);

  return (
    <div className="flex flex-col rounded-xl h-full overflow-hidden select-none shadow-sm animation-fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
      {/* Response Header - Clean and Prominent */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4" style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-primary)' }}>
        
        {/* Left: Status Badge */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Status</span>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md shadow-sm font-mono text-sm font-bold" style={{ background: statusStyle.background, color: statusStyle.color, border: `1px solid ${statusStyle.color}40` }}>
            <span className="h-2 w-2 rounded-full animate-pulse-dot" style={{ background: statusStyle.dotColor }} />
            {response.status} <span className="opacity-80 font-medium ml-1">{response.statusText}</span>
          </div>
        </div>

        {/* Right: Metrics & Maximize */}
        <div className="flex items-center gap-6 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-center gap-2" title="Response Time">
            <Clock size={16} style={{ color: 'var(--text-tertiary)' }} />
            <span className="font-medium">{response.duration} <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>ms</span></span>
          </div>
          <div className="flex items-center gap-2" title="Response Size">
            <Database size={16} style={{ color: 'var(--text-tertiary)' }} />
            <span className="font-medium">{response.size}</span>
          </div>
          
          {onToggleMaximize && (
            <button onClick={onToggleMaximize} className="p-1.5 ml-2 rounded-lg transition-colors cursor-pointer"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-secondary)' }} title={isMaximized ? "Restore" : "Maximize"}>
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Actions Toolbar */}
      <div className="flex items-center justify-between px-2 pt-2" style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
        <div className="flex gap-1">
          <button onClick={() => setActiveTab("body")} className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer`} style={tabStyle(activeTab === "body")}>JSON (Tree)</button>
          <button onClick={() => setActiveTab("raw")} className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer`} style={tabStyle(activeTab === "raw")}>Raw</button>
          <button onClick={() => setActiveTab("headers")} className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer`} style={tabStyle(activeTab === "headers")}>Headers ({Object.keys(response.headers).length})</button>
          <button onClick={() => setActiveTab("table")} className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer`} style={tabStyle(activeTab === "table")}>Table</button>
          <button onClick={() => setActiveTab("chart")} className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer`} style={tabStyle(activeTab === "chart")}>Chart</button>
          <button onClick={() => setActiveTab("diff")} className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer`} style={tabStyle(activeTab === "diff")}>Diff</button>
          <button onClick={() => setActiveTab("tests")} className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1`} style={tabStyle(activeTab === "tests")}>
            Tests
            {testResults && testResults.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1" style={{ background: testResults.every(t => t.passed) ? 'var(--success-bg)' : 'var(--error-bg)', color: testResults.every(t => t.passed) ? 'var(--success)' : 'var(--error)' }}>
                {testResults.filter(t => t.passed).length}/{testResults.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 pb-2 pr-2">
          {activeTab === "diff" && (
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsDiffMenuOpen(!isDiffMenuOpen); }}
                className="flex items-center justify-between gap-2 text-[10px] font-medium px-2 py-1 rounded outline-none w-[160px] cursor-pointer transition-colors hover:brightness-110"
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-secondary)' }}
              >
                <span className="truncate">
                  {diffBaseId 
                    ? (() => {
                        const h = history.find(item => item.id === diffBaseId);
                        return h ? `${h.method} ${new URL(h.url).pathname}` : "Select history base...";
                      })()
                    : "Select history base..."}
                </span>
                <ChevronDown size={12} className={`transition-transform duration-200 flex-shrink-0 ${isDiffMenuOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-tertiary)' }} />
              </button>
              
              {isDiffMenuOpen && (
                <div 
                  className="absolute right-0 top-[calc(100%+4px)] w-[240px] rounded-lg z-50 overflow-y-auto max-h-64 py-1 shadow-xl border animation-fade-in scrollbar-thin"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
                >
                  <div className="px-2 py-1.5 text-[9px] uppercase tracking-wider font-bold opacity-50" style={{ color: 'var(--text-tertiary)' }}>History Items</div>
                  {history.filter(h => h.response && h.response.data).length === 0 && (
                    <div className="px-3 py-2 text-[10px] italic" style={{ color: 'var(--text-tertiary)' }}>No valid history found</div>
                  )}
                  {history.filter(h => h.response && h.response.data).map(h => {
                    let path = "";
                    try { path = new URL(h.url).pathname; } catch (e) { path = h.url; }
                    return (
                      <button
                        key={h.id} 
                        onClick={() => { setDiffBaseId(h.id); setIsDiffMenuOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-[10px] font-mono hover:bg-black/10 dark:hover:bg-white/5 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                        style={{ background: diffBaseId === h.id ? 'var(--bg-tertiary)' : 'transparent', color: 'var(--text-primary)' }}
                      >
                        <span className="truncate flex-1">{h.method} {path}</span>
                        <span className="opacity-50 text-[9px] flex-shrink-0">{h.timestamp}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          
          <button onClick={downloadResponseFile}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors"
            style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-secondary)' }} title="Download JSON Response" id="btn-download-response">
            <Download size={14} />
            <span className="hidden sm:inline">Save</span>
          </button>
          <button onClick={copyResponseToClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors"
            style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-secondary)' }} title="Copy Response to Clipboard" id="btn-copy-response">
            {copiedResponse ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
            <span className="hidden sm:inline">{copiedResponse ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        {activeTab === "diff" ? (
          <div className="h-full">
            {diffBaseId ? (
              <DiffView 
                oldData={history.find(h => h.id === diffBaseId)?.response?.data} 
                newData={response.data} 
                isDarkTheme={theme === 'dark'} 
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-xs opacity-50 gap-2 p-8 text-center">
                <GitPullRequest size={24} />
                <p>No valid history item selected for comparison.</p>
                <p>Make sure you have previous successful requests in your history to compare against.</p>
              </div>
            )}
          </div>
        ) : activeTab === "chart" ? (
          <ChartView data={response.data} />
        ) : activeTab === "table" ? (
          <div className="h-full p-4"><TableView data={response.data} /></div>
        ) : activeTab === "body" ? (
          <div className="h-full p-2 flex flex-col gap-2 overflow-auto scrollbar-thin">
            {response.status >= 400 && response.data?.error && (
              <div className="p-4 rounded-lg flex flex-col gap-2 shadow-sm mx-2 mt-2 select-text" style={{ background: 'var(--error-bg)', border: '1px solid var(--error)' }}>
                <div className="flex items-center gap-2">
                   <ShieldAlert size={16} style={{ color: 'var(--error)' }} />
                   <h3 className="font-bold text-sm capitalize" style={{ color: 'var(--error)' }}>
                     {(response.data.error.type || 'API Error').replace(/_/g, ' ')} 
                     {response.data.error.code && <span className="opacity-70 ml-2 font-mono text-[10px]">[{response.data.error.code}]</span>}
                   </h3>
                </div>
                {response.data.error.message && (
                  <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-primary)' }}>
                    {response.data.error.message}
                  </p>
                )}

                {response.data.error.param && (
                  <div className="text-[11px] font-mono mt-1" style={{ color: 'var(--warning)' }}>
                    <span className="opacity-60">Parameter: </span>
                    <span className="font-bold">{response.data.error.param}</span>
                  </div>
                )}
                
                {Array.isArray(response.data.error.errors) && response.data.error.errors.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1.5 list-none">
                    {response.data.error.errors.map((errItem: any, i: number) => (
                      <li key={i} className="text-[11px] font-mono flex items-start gap-2" style={{ color: 'var(--text-primary)' }}>
                        <span style={{ color: 'var(--error)' }}>›</span>
                        <span>
                          {errItem.field ? <span className="font-bold" style={{ color: 'var(--error)' }}>{errItem.field}: </span> : null}
                          {errItem.message || JSON.stringify(errItem)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                
                <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: '1px dashed var(--error)' }}>
                  {response.data.error.doc_url ? (
                    <a href={response.data.error.doc_url} target="_blank" rel="noreferrer" className="text-[11px] font-bold tracking-wide" style={{ color: 'var(--error)' }}>
                      View Documentation &rarr;
                    </a>
                  ) : <div />}
                  {response.data.error.request_id && (
                    <p className="text-[10px] font-mono" style={{ color: 'var(--error)', opacity: 0.8 }}>req_id: {response.data.error.request_id}</p>
                  )}
                </div>
              </div>
            )}
            <div className="flex-1 p-2 select-text">
              <JsonTreeView data={response.data} />
            </div>
          </div>
        ) : activeTab === "raw" ? (
          <div className="h-full p-4 overflow-auto scrollbar-thin select-text">
            <pre className="text-xs font-mono whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
              {typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : String(response.data)}
            </pre>
          </div>
        ) : activeTab === "tests" ? (
          <div className="h-full p-4 overflow-auto scrollbar-thin select-text">
            {!testResults || testResults.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-xs opacity-50 gap-2 text-center">
                 <Check size={24} />
                 <p>No tests were run for this request.</p>
               </div>
            ) : (
               <div className="flex flex-col gap-2">
                 {testResults.map((test, i) => (
                   <div key={i} className="flex flex-col gap-2 p-3 rounded-lg border" style={{ background: test.passed ? 'var(--success-bg)' : 'var(--error-bg)', borderColor: test.passed ? 'var(--success)' : 'var(--error)' }}>
                      <div className="flex items-center gap-2 font-bold text-xs" style={{ color: test.passed ? 'var(--success)' : 'var(--error)' }}>
                        {test.passed ? <Check size={14} /> : <ShieldAlert size={14} />}
                        <span>Assertion {i + 1} {test.passed ? "Passed" : "Failed"}</span>
                      </div>
                      <div className="text-[11px] font-mono opacity-80" style={{ color: 'var(--text-primary)' }}>
                        <p>Actual value evaluated to: <span className="font-bold">{String(test.actualValue)}</span></p>
                        {test.error && <p className="text-red-500 mt-1">{test.error}</p>}
                      </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
        ) : (
          <div className="h-full p-4 overflow-auto scrollbar-thin">
            <div className="flex flex-col rounded-lg overflow-hidden border shadow-sm" style={{ borderColor: 'var(--border-secondary)' }}>
              {Object.entries(response.headers).map(([k, v], index) => (
                <div key={k} className={`flex p-3 text-xs transition-colors ${index % 2 === 0 ? 'bg-black/5' : 'bg-transparent'}`} style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                  <div className="w-1/3 font-mono font-medium break-all pr-4" style={{ color: 'var(--text-primary)' }} title={k}>{k}</div>
                  <div className="w-2/3 font-mono break-all" style={{ color: 'var(--text-secondary)' }} title={v}>{v}</div>
                </div>
              ))}
              {Object.keys(response.headers).length === 0 && (
                <div className="p-4 text-center text-xs italic" style={{ color: 'var(--text-tertiary)' }}>No headers returned.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
