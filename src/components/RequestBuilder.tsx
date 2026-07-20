// RequestBuilder component handles the main API request configuration UI
import React, { useState, useEffect } from "react";
import { 
  Play, 
  Trash2, 
  Plus, 
  Copy, 
  Check, 
  FileJson,
  Sparkles,
  Send,
  Maximize2,
  Minimize2,
  ChevronDown,
  BookOpen,
  ExternalLink,
  Save,
  Download,
  Upload,
  ClipboardCopy,
  ClipboardPaste,
  Activity,
  Clock,
  Hash,
  CheckSquare,
  Equal,
  FileSearch,
  CheckCircle2
} from "lucide-react";
import { HttpMethod, HeaderItem, QueryParamItem, Assertion, AssertionType, AssertionOperator } from "../types";

interface RequestBuilderProps {
  method: HttpMethod;
  onChangeMethod: (m: HttpMethod) => void;
  url: string;
  onChangeUrl: (u: string) => void;
  headers: HeaderItem[];
  onChangeHeaders: (h: HeaderItem[]) => void;
  queryParams: QueryParamItem[];
  onChangeQueryParams: (q: QueryParamItem[]) => void;
  body: string;
  onChangeBody: (b: string) => void;
  onSendRequest: () => void;
  onSaveRequest?: (name: string, category: string) => void;
  isLoading: boolean;
  description?: string;
  category?: string;
  name?: string;
  apiKey: string;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  bodySchema?: any;
  assertions?: Assertion[];
  onChangeAssertions?: (a: Assertion[]) => void;
  resolveVariables?: (text: string) => string;
  onToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const renderDescription = (text: string) => {
  if (!text) return null;
  const parts = text.split(/`([^`]+)`/);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <code 
          key={i} 
          className="px-1 py-0.5 rounded font-mono text-[10px] mx-0.5 whitespace-nowrap" 
          style={{ background: 'var(--bg-primary)', color: 'var(--accent)', border: '1px solid var(--border-secondary)' }}
        >
          {part}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

const CustomAssertionSelect = ({ value, options, onChange, color, width }: { value: string, options: {label: string, value: string, icon?: React.ReactNode}[], onChange: (val: string) => void, color?: string, width?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    const handleClickAway = () => setIsOpen(false);
    if (isOpen) window.addEventListener('click', handleClickAway);
    return () => window.removeEventListener('click', handleClickAway);
  }, [isOpen]);

  return (
    <div className={`relative ${width || 'w-40'}`}>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border hover:brightness-110 cursor-pointer"
        style={{ background: 'var(--bg-secondary)', color: color || 'var(--text-primary)', borderColor: 'var(--border-secondary)', boxShadow: 'var(--shadow-sm)' }}
      >
        <span className="flex items-center gap-1.5 truncate">
          {selectedOption.icon}
          {selectedOption.label}
        </span>
        <ChevronDown size={14} className={`transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} opacity={0.5} />
      </button>
      
      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 min-w-full rounded-xl border shadow-xl z-50 py-1 overflow-hidden animation-fade-in" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-secondary)' }}>
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={(e) => { e.stopPropagation(); onChange(opt.value); setIsOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
              style={{ color: value === opt.value ? 'var(--accent)' : 'var(--text-primary)' }}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const RequestBuilder: React.FC<RequestBuilderProps> = ({
  method,
  onChangeMethod,
  url,
  onChangeUrl,
  headers,
  onChangeHeaders,
  queryParams,
  onChangeQueryParams,
  body,
  onChangeBody,
  onSendRequest,
  isLoading,
  description,
  category,
  name,
  apiKey,
  isMaximized,
  onToggleMaximize,
  bodySchema,
  assertions = [],
  onChangeAssertions,
  resolveVariables,
  onSaveRequest,
  onToast
}) => {
  const [activeTab, setActiveTab] = useState<"headers" | "params" | "body" | "auth" | "tests" | "snippet">("headers");
  const [authType, setAuthType] = useState<"none" | "bearer" | "basic" | "oauth2">("none");
  const [isGraphql, setIsGraphql] = useState(false);
  const [isSchemaMode, setIsSchemaMode] = useState(false);
  const [snippetLanguage, setSnippetLanguage] = useState<"js" | "python" | "curl" | "node">("curl");
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isMethodMenuOpen, setIsMethodMenuOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState(name || "");
  const [saveCategory, setSaveCategory] = useState(category || "");

  useEffect(() => {
    const handleClickAway = () => setIsMethodMenuOpen(false);
    if (isMethodMenuOpen) window.addEventListener('click', handleClickAway);
    return () => window.removeEventListener('click', handleClickAway);
  }, [isMethodMenuOpen]);

  // Validate JSON body syntax
  useEffect(() => {
    if (!body || body.trim() === "") {
      setJsonError(null);
      return;
    }
    try {
      JSON.parse(body);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(e.message || "Invalid JSON syntax");
    }
  }, [body]);

  const formatJsonBody = () => {
    if (!body || body.trim() === "") return;
    try {
      const parsed = JSON.parse(body);
      onChangeBody(JSON.stringify(parsed, null, 2));
      setJsonError(null);
      if (onToast) onToast("JSON formatted successfully", "success");
    } catch { 
      if (onToast) onToast("Invalid JSON cannot be formatted", "error");
    }
  };

  const updateUrlFromParams = (params: QueryParamItem[]) => {
    try {
      const urlObj = new URL(url);
      const searchParams = new URLSearchParams();
      params.forEach((p) => {
        if (p.enabled && p.key) searchParams.append(p.key, p.value);
      });
      urlObj.search = searchParams.toString() ? `?${searchParams.toString()}` : "";
      onChangeUrl(urlObj.toString());
    } catch { }
  };

  const syncParamsFromUrl = (newUrl: string) => {
    try {
      const urlObj = new URL(newUrl);
      const parsedParams: QueryParamItem[] = [];
      urlObj.searchParams.forEach((value, key) => {
        parsedParams.push({ id: Math.random().toString(), key, value, enabled: true });
      });
      if (parsedParams.length > 0) onChangeQueryParams(parsedParams);
    } catch { }
  };

  const addHeader = () => {
    onChangeHeaders([...headers, { id: Math.random().toString(), key: "", value: "", enabled: true }]);
  };

  const removeHeader = (id: string) => onChangeHeaders(headers.filter((h) => h.id !== id));

  const updateHeader = (id: string, field: "key" | "value" | "enabled", val: any) => {
    onChangeHeaders(headers.map((h) => h.id === id ? { ...h, [field]: val } : h));
  };

  const setAuthHeader = (type: string, val: string) => {
    const existing = headers.find(h => h.key.toLowerCase() === 'authorization');
    if (existing) {
      updateHeader(existing.id, 'value', val);
      updateHeader(existing.id, 'enabled', true);
    } else {
      onChangeHeaders([...headers, { id: Math.random().toString(), key: "Authorization", value: val, enabled: true }]);
    }
  };

  const addParam = () => {
    const updated = [...queryParams, { id: Math.random().toString(), key: "", value: "", enabled: true }];
    onChangeQueryParams(updated);
    updateUrlFromParams(updated);
  };

  const removeParam = (id: string) => {
    const updated = queryParams.filter((q) => q.id !== id);
    onChangeQueryParams(updated);
    updateUrlFromParams(updated);
  };

  const updateParam = (id: string, field: "key" | "value" | "enabled", val: any) => {
    const updated = queryParams.map((q) => q.id === id ? { ...q, [field]: val } : q);
    onChangeQueryParams(updated);
    updateUrlFromParams(updated);
  };

  const getSubstitutedUrl = () => {
    return resolveVariables ? resolveVariables(url) : url.replace("{{api_key}}", apiKey);
  };

  const getSubstitutedHeaders = () => {
    const list: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.enabled && h.key) {
        list[h.key] = resolveVariables ? resolveVariables(h.value) : h.value.replace("{{api_key}}", apiKey);
      }
    });
    return list;
  };

  const getSubstitutedBody = () => {
    if (!body) return "";
    return resolveVariables ? resolveVariables(body) : body.replace("{{api_key}}", apiKey);
  };

  const generateSnippet = () => {
    const substitutedUrl = getSubstitutedUrl();
    const activeHeaders = getSubstitutedHeaders();
    const resolvedBody = getSubstitutedBody();
    const hasBody = ["POST", "PUT", "PATCH", "DELETE"].includes(method) && resolvedBody;

    switch (snippetLanguage) {
      case "js":
        return `fetch("${substitutedUrl}", {
  method: "${method}",
  headers: ${JSON.stringify(activeHeaders, null, 2)}${hasBody ? `,\n  body: JSON.stringify(${resolvedBody.replace(/\n/g, "\n  ")})` : ""}
})
  .then(r => r.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));`;

      case "python":
        return `import requests

url = "${substitutedUrl}"
headers = ${JSON.stringify(activeHeaders, null, 4)}

${hasBody
  ? `payload = ${resolvedBody}\nresponse = requests.${method.toLowerCase()}(url, headers=headers, json=payload)`
  : `response = requests.${method.toLowerCase()}(url, headers=headers)`}

print(response.status_code)
print(response.json())`;

      case "curl":
        const headerStrings = Object.entries(activeHeaders)
          .map(([k, v]) => `-H "${k}: ${v}"`)
          .join(" \\\n  ");
        return `curl -X ${method} "${substitutedUrl}" \\\n  ${headerStrings}${hasBody ? ` \\\n  -d '${resolvedBody.replace(/'/g, "'\\''")}'` : ""}`;

      case "node":
        return `const axios = require('axios');

axios({
  method: '${method.toLowerCase()}',
  url: '${substitutedUrl}',
  headers: ${JSON.stringify(activeHeaders, null, 2)}${hasBody ? `,\n  data: ${resolvedBody.replace(/\n/g, "\n  ")}` : ""}
})
  .then(res => console.log(res.data))
  .catch(err => console.error(err.response?.data || err.message));`;

      default: return "";
    }
  };

  const copySnippetToClipboard = () => {
    navigator.clipboard.writeText(generateSnippet());
    setCopiedSnippet(true);
    if (onToast) onToast("Snippet copied to clipboard!", "success");
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeUrl(e.target.value);
    syncParamsFromUrl(e.target.value);
  };

  const getMethodClass = (m: HttpMethod) => {
    switch (m) {
      case "GET": return "method-get";
      case "POST": return "method-post";
      case "PUT": return "method-put";
      case "DELETE": return "method-delete";
      case "PATCH": return "method-patch";
      default: return "";
    }
  };

  const tabStyle = (isActive: boolean) => ({
    color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
  });

  const inputStyle = {
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-primary)',
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl p-4 h-full overflow-hidden select-none" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
      {/* Description Banner & Fullscreen */}
      <div className="flex items-start gap-3 w-full">
        {description ? (
          <div className="flex-1 rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-text animation-fade-in relative overflow-hidden" 
               style={{ background: 'var(--accent-bg)', border: '1px solid var(--border-secondary)' }}>
            
            {/* Left side: Icon and Description */}
            <div className="flex items-start sm:items-center gap-3 relative z-10 flex-1 min-w-0">
              <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: 'var(--bg-primary)' }}>
                <BookOpen size={14} style={{ color: 'var(--accent)' }} />
              </div>
              <div className="leading-relaxed truncate-multiline" style={{ color: 'var(--text-secondary)' }}>
                {renderDescription(description)}
              </div>
            </div>

            {/* Right side: Action Button */}
            {(name || category) && (
              <a 
                href={`https://developers.optimaorbit.com/search?q=${encodeURIComponent(name || category || "")}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 transition-all hover:scale-105 active:scale-95 group relative z-10"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}
                title={`View documentation for ${name || category}`}
              >
                <span>Docs</span>
                <ExternalLink size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--accent)' }} />
              </a>
            )}
          </div>
        ) : <div className="flex-1"></div>}
        
        {onToggleMaximize && (
          <button onClick={onToggleMaximize} className="p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-secondary)' }} title={isMaximized ? "Restore" : "Maximize"}>
            {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        )}
      </div>

      {/* Main Request Control Bar */}
      <div className="flex gap-2">
        <div className="flex flex-1 rounded-xl transition-colors relative" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-primary)' }}>
          <div className="relative border-r flex-shrink-0" style={{ borderColor: 'var(--border-primary)' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setIsMethodMenuOpen(!isMethodMenuOpen); }}
              className={`h-full flex items-center justify-between gap-1.5 text-xs outline-none font-bold font-mono px-3 cursor-pointer rounded-l-xl transition-colors ${getMethodClass(method)}`}
              style={{ background: 'var(--bg-tertiary)', minWidth: '85px' }}
              title="Select HTTP Method"
            >
              <span>{method}</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${isMethodMenuOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-tertiary)' }} />
            </button>
            {isMethodMenuOpen && (
              <div 
                className="absolute left-0 top-[calc(100%+4px)] w-28 rounded-lg z-50 overflow-hidden py-1 border shadow-xl animation-fade-in"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
              >
                {["GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => (
                  <button
                    key={m}
                    onClick={() => { onChangeMethod(m as HttpMethod); setIsMethodMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-mono font-bold cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${getMethodClass(m as HttpMethod)}`}
                    style={{ background: method === m ? 'var(--bg-tertiary)' : 'transparent' }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            type="text"
            value={url}
            onChange={handleUrlInputChange}
            placeholder="https://api.dev-orbit.com/api/v1/..."
            className="flex-1 bg-transparent text-xs px-3.5 py-3 outline-none font-mono"
            style={{ color: 'var(--text-primary)' }}
            id="request-url-input"
          />
        </div>

        {onSaveRequest && (
          <button
            onClick={() => {
              setSaveName(name || "");
              setSaveCategory(category || "");
              setIsSaveModalOpen(true);
            }}
            title="Save to Collection"
            className="flex items-center gap-1.5 px-4 rounded-xl font-bold text-xs transition-all select-none cursor-pointer border hover:scale-105"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              borderColor: 'var(--border-secondary)',
            }}
          >
            <Save size={14} />
            <span className="hidden sm:inline">Save</span>
          </button>
        )}

        <button
          onClick={onSendRequest}
          disabled={isLoading || !url}
          title="Cmd/Ctrl + Enter to send"
          className="flex items-center gap-2 px-6 rounded-xl font-bold text-xs text-white transition-all select-none cursor-pointer"
          style={{
            background: isLoading || !url ? 'var(--bg-tertiary)' : 'var(--accent)',
            color: isLoading || !url ? 'var(--text-tertiary)' : '#fff',
            boxShadow: isLoading || !url ? 'none' : 'var(--shadow-glow)',
            opacity: isLoading || !url ? 0.6 : 1,
          }}
          id="btn-send-request"
        >
          {isLoading ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send size={13} />
          )}
          <span>Send</span>
          {!isLoading && <span className="text-[9px] opacity-50 font-medium ml-1 hidden sm:inline">⌘↵</span>}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto hide-scrollbar" style={{ borderBottom: '1px solid var(--border-primary)' }}>
        {(["auth", "headers", "params", "body", "tests", "snippet"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="py-2 px-4 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
            style={tabStyle(activeTab === tab)}
            id={`tab-req-${tab}`}
          >
            {tab === "auth" ? "Auth" :
             tab === "headers" ? `Headers (${headers.filter(h => h.key).length})` :
             tab === "params" ? `Params (${queryParams.filter(q => q.key).length})` :
             tab === "body" ? (
               <>Body {jsonError && <span className="ml-1 text-[9px] px-1 py-0.5 rounded-full" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>err</span>}</>
             ) : tab === "tests" ? `Tests (${assertions.length})` : "Snippets"}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden mt-2">
        
        {/* Auth Panel */}
        {activeTab === "auth" && (
          <div className="flex flex-col gap-3 animation-fade-in overflow-y-auto scrollbar-thin h-full pb-2">
            <div className="flex gap-2">
              {(["none", "bearer", "basic", "oauth2"] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setAuthType(type)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer capitalize"
                  style={{
                    background: authType === type ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: authType === type ? '#fff' : 'var(--text-tertiary)'
                  }}
                >
                  {type === "none" ? "No Auth" : type}
                </button>
              ))}
            </div>
            
            {authType === "bearer" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Token</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Bearer Token" className="flex-1 text-xs rounded-lg px-2.5 py-2 outline-none font-mono focus-ring" style={inputStyle} onChange={(e) => setAuthHeader("Bearer", `Bearer ${e.target.value}`)} />
                </div>
              </div>
            )}

            {authType === "basic" && (
              <div className="flex flex-col gap-2">
                <input type="text" placeholder="Username" className="text-xs rounded-lg px-2.5 py-2 outline-none font-mono focus-ring" style={inputStyle} />
                <input type="password" placeholder="Password" className="text-xs rounded-lg px-2.5 py-2 outline-none font-mono focus-ring" style={inputStyle} onChange={(e) => setAuthHeader("Basic", `Basic ${btoa('user:' + e.target.value)}`)} />
              </div>
            )}

            {authType === "oauth2" && (
              <div className="flex flex-col gap-2 p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }}>
                <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>OAuth 2.0 Flow</div>
                <input type="text" placeholder="Access Token URL" className="text-xs rounded-lg px-2.5 py-2 outline-none font-mono focus-ring" style={inputStyle} />
                <input type="text" placeholder="Client ID" className="text-xs rounded-lg px-2.5 py-2 outline-none font-mono focus-ring" style={inputStyle} />
                <input type="password" placeholder="Client Secret" className="text-xs rounded-lg px-2.5 py-2 outline-none font-mono focus-ring" style={inputStyle} />
                <button className="py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer mt-1" style={{ background: 'var(--accent)' }}>
                  Get New Access Token
                </button>
              </div>
            )}
          </div>
        )}

        {/* Headers Panel */}
        {activeTab === "headers" && (
          <div className="flex flex-col gap-2 animation-fade-in overflow-y-auto scrollbar-thin h-full pb-2">
            <div className="text-[10px] font-mono flex justify-between px-1.5 py-0.5" style={{ color: 'var(--text-tertiary)' }}>
              <span>HEADER KEY</span>
              <span>VALUE</span>
            </div>
            {headers.map((h) => (
              <div key={h.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={h.enabled}
                  onChange={(e) => updateHeader(h.id, "enabled", e.target.checked)}
                  className="w-3.5 h-3.5 cursor-pointer accent-indigo-500"
                />
                <input type="text" value={h.key} onChange={(e) => updateHeader(h.id, "key", e.target.value)} placeholder="Key"
                  className="flex-1 text-xs rounded-lg px-2.5 py-1.5 outline-none font-mono focus-ring" style={inputStyle} />
                <input type="text" value={h.value} onChange={(e) => updateHeader(h.id, "value", e.target.value)} placeholder="Value"
                  className="flex-1 text-xs rounded-lg px-2.5 py-1.5 outline-none font-mono focus-ring" style={inputStyle} />
                <button onClick={() => removeHeader(h.id)} className="p-1.5 rounded-lg cursor-pointer transition-colors" style={{ color: 'var(--text-tertiary)' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button onClick={addHeader} className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs transition-all mt-1 cursor-pointer"
              style={{ border: '1px dashed var(--border-primary)', color: 'var(--text-tertiary)' }} id="btn-add-header">
              <Plus size={13} /> Add Header
            </button>
          </div>
        )}

        {/* Query Params Panel */}
        {activeTab === "params" && (
          <div className="flex flex-col gap-2 animation-fade-in overflow-y-auto scrollbar-thin h-full pb-2">
            <div className="text-[10px] font-mono flex justify-between px-1.5 py-0.5" style={{ color: 'var(--text-tertiary)' }}>
              <span>PARAMETER KEY</span>
              <span>VALUE</span>
            </div>
            {queryParams.map((q) => (
              <div key={q.id} className="flex items-center gap-2">
                <input type="checkbox" checked={q.enabled} onChange={(e) => updateParam(q.id, "enabled", e.target.checked)} className="w-3.5 h-3.5 cursor-pointer accent-indigo-500" />
                <input type="text" value={q.key} onChange={(e) => updateParam(q.id, "key", e.target.value)} placeholder="Key"
                  className="flex-1 text-xs rounded-lg px-2.5 py-1.5 outline-none font-mono focus-ring" style={inputStyle} />
                <input type="text" value={q.value} onChange={(e) => updateParam(q.id, "value", e.target.value)} placeholder="Value"
                  className="flex-1 text-xs rounded-lg px-2.5 py-1.5 outline-none font-mono focus-ring" style={inputStyle} />
                <button onClick={() => removeParam(q.id)} className="p-1.5 rounded-lg cursor-pointer transition-colors" style={{ color: 'var(--text-tertiary)' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button onClick={addParam} className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs transition-all mt-1 cursor-pointer"
              style={{ border: '1px dashed var(--border-primary)', color: 'var(--text-tertiary)' }} id="btn-add-param">
              <Plus size={13} /> Add Parameter
            </button>
          </div>
        )}

        {/* Body Panel */}
        {activeTab === "body" && (
          <div className="flex flex-col gap-2 h-full animation-fade-in min-h-0 pb-2">
            <div className="flex justify-between items-center px-2 py-1 rounded-lg flex-shrink-0" style={{ background: 'var(--bg-tertiary)' }}>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>PAYLOAD</span>
              <div className="flex items-center gap-2">
                {!isSchemaMode && body && (jsonError ? (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>
                    Invalid JSON
                  </span>
                ) : (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                    Valid JSON
                  </span>
                ))}
                
                {bodySchema && (
                  <button
                    onClick={() => { setIsSchemaMode(!isSchemaMode); setIsGraphql(false); }}
                    className="flex items-center gap-1 text-[10px] rounded px-2 py-0.5 cursor-pointer transition-colors font-bold"
                    style={{ background: isSchemaMode ? 'var(--accent)' : 'var(--bg-secondary)', color: isSchemaMode ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
                  >
                    Schema Form
                  </button>
                )}

                <button
                  onClick={() => { setIsGraphql(!isGraphql); setIsSchemaMode(false); }}
                  className="flex items-center gap-1 text-[10px] rounded px-2 py-0.5 cursor-pointer transition-colors font-bold"
                  style={{ background: isGraphql ? 'var(--accent)' : 'var(--bg-secondary)', color: isGraphql ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
                >
                  GraphQL
                </button>
                <button onClick={formatJsonBody} disabled={!body || isGraphql || isSchemaMode}
                  className="flex items-center gap-1 text-[10px] rounded px-2 py-0.5 cursor-pointer transition-colors"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)', opacity: (isGraphql || isSchemaMode) ? 0.5 : 1 }} id="btn-format-json">
                  <FileJson size={11} /> Prettify
                </button>
              </div>
            </div>
            
            {isSchemaMode && bodySchema ? (
              <div className="w-full flex-1 overflow-y-auto rounded-xl p-3 scrollbar-thin" style={{ ...inputStyle }}>
                {bodySchema.properties ? (
                  <div className="flex flex-col gap-3">
                    {Object.entries(bodySchema.properties).map(([key, prop]: [string, any]) => {
                      let parsed: any = {};
                      try { parsed = JSON.parse(body || "{}"); } catch {}
                      return (
                        <div key={key} className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                            {key} {bodySchema.required?.includes(key) && <span style={{ color: 'var(--error)' }}>*</span>}
                          </label>
                          <input
                            type={prop.type === 'number' || prop.type === 'integer' ? 'number' : 'text'}
                            value={parsed[key] || ""}
                            onChange={(e) => {
                              let newParsed: any = {};
                              try { newParsed = JSON.parse(body || "{}"); } catch {}
                              newParsed[key] = prop.type === 'number' || prop.type === 'integer' ? Number(e.target.value) : e.target.value;
                              onChangeBody(JSON.stringify(newParsed, null, 2));
                            }}
                            className="text-xs rounded-lg px-2.5 py-1.5 outline-none font-mono focus-ring"
                            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-secondary)' }}
                            placeholder={prop.description || prop.example || `Enter ${prop.type}`}
                          />
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-xs opacity-50">No properties defined in schema.</div>
                )}
              </div>
            ) : (
              <textarea value={body} onChange={(e) => onChangeBody(e.target.value)}
                placeholder={isGraphql ? 'query {\n  user(id: 1) {\n    name\n  }\n}' : '{\n  "key": "value"\n}'}
                className="w-full flex-1 min-h-0 rounded-xl p-3 text-xs font-mono outline-none focus-ring scrollbar-thin"
                style={{ ...inputStyle, resize: 'none' }} id="request-body-textarea" />
            )}
          </div>
        )}
        {/* Tests / Assertions Panel */}
        {activeTab === "tests" && (
          <div className="flex flex-col gap-2 animation-fade-in h-full pb-2">
            <div className="flex justify-between items-center px-4 py-2 bg-black/5 dark:bg-white/5 rounded-lg border" style={{ borderColor: 'var(--border-secondary)' }}>
              <span className="text-xs font-bold opacity-70">Automated Assertions</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={async () => {
                    const text = JSON.stringify(assertions, null, 2);
                    try {
                      await navigator.clipboard.writeText(text);
                      onToast?.("Tests copied to clipboard", "success");
                    } catch (e) {
                      onToast?.("Failed to copy", "error");
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-[var(--border-secondary)]"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Copy tests JSON to clipboard"
                >
                  <ClipboardCopy size={12} /> <span className="hidden sm:inline">Copy</span>
                </button>
                <button
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      const parsed = JSON.parse(text);
                      if (Array.isArray(parsed)) {
                        const isValid = parsed.every(a => a.id && a.type && a.operator);
                        if (isValid) {
                          onChangeAssertions?.(parsed);
                          onToast?.(`Successfully pasted ${parsed.length} tests`, "success");
                        } else {
                          onToast?.("Invalid test format in clipboard.", "error");
                        }
                      } else {
                        throw new Error("Invalid format");
                      }
                    } catch (err) {
                      onToast?.("Clipboard does not contain valid test JSON", "error");
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-[var(--border-secondary)]"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Paste tests JSON from clipboard"
                >
                  <ClipboardPaste size={12} /> <span className="hidden sm:inline">Paste</span>
                </button>
                <div className="w-[1px] h-4 mx-1" style={{ background: 'var(--border-secondary)' }}></div>
                <button
                  onClick={() => {
                    const text = JSON.stringify(assertions, null, 2);
                    const blob = new Blob([text], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `assertions.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    onToast?.("Tests exported to assertions.json", "success");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-[var(--border-secondary)]"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Export tests to JSON file"
                >
                  <Download size={12} /> <span className="hidden lg:inline">Export</span>
                </button>
                <label
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-[var(--border-secondary)]"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Import tests from JSON"
                >
                  <Upload size={12} /> <span className="hidden sm:inline">Import</span>
                  <input 
                    type="file" 
                    accept=".json" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const parsed = JSON.parse(event.target?.result as string);
                          if (Array.isArray(parsed)) {
                            // Basic validation to ensure it looks like an assertion array
                            const isValid = parsed.every(a => a.id && a.type && a.operator);
                            if (isValid) {
                              onChangeAssertions?.(parsed);
                              onToast?.(`Successfully imported ${parsed.length} tests`, "success");
                            } else {
                              onToast?.("Invalid test format. Missing required fields.", "error");
                            }
                          } else {
                            throw new Error("Invalid format");
                          }
                        } catch (err) {
                          onToast?.("Failed to parse JSON file", "error");
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = ''; // Reset input
                    }} 
                  />
                </label>
                <button
                  onClick={() => onChangeAssertions?.([...assertions, { id: Math.random().toString(), type: 'status_code', operator: 'equals', expectedValue: '200' }])}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer hover:scale-105 ml-1"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  <Plus size={12} /> Add Test
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-thin px-1">
              {assertions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50 py-10">
                  <Check size={32} className="mb-2" />
                  <p className="text-xs font-medium">No assertions defined</p>
                  <p className="text-[10px] mt-1 text-center max-w-[200px]">Add tests to automatically verify the response of this request.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {assertions.map(assertion => (
                    <div key={assertion.id} className="flex flex-wrap items-center gap-2 p-2 rounded-xl border group transition-all" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)', boxShadow: 'var(--shadow-sm)' }}>
                      <CustomAssertionSelect 
                        value={assertion.type}
                        onChange={(val) => onChangeAssertions?.(assertions.map(a => a.id === assertion.id ? { ...a, type: val as AssertionType, targetPath: val !== 'json_body' ? undefined : a.targetPath } : a))}
                        color="var(--accent)"
                        width="w-[150px]"
                        options={[
                          { label: 'Status Code', value: 'status_code', icon: <Activity size={13} /> },
                          { label: 'Response Time', value: 'response_time', icon: <Clock size={13} /> },
                          { label: 'JSON Body', value: 'json_body', icon: <FileJson size={13} /> }
                        ]}
                      />
                      
                      {assertion.type === 'json_body' && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-primary)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
                          <FileSearch size={12} style={{ color: 'var(--text-tertiary)' }} />
                          <input 
                            type="text"
                            placeholder="path (e.g. data.id)"
                            value={assertion.targetPath || ''}
                            onChange={(e) => onChangeAssertions?.(assertions.map(a => a.id === assertion.id ? { ...a, targetPath: e.target.value } : a))}
                            className="text-xs bg-transparent outline-none w-28 font-mono"
                            style={{ color: 'var(--text-primary)' }}
                          />
                        </div>
                      )}
                      
                      <CustomAssertionSelect 
                        value={assertion.operator}
                        onChange={(val) => onChangeAssertions?.(assertions.map(a => a.id === assertion.id ? { ...a, operator: val as AssertionOperator } : a))}
                        color="var(--text-secondary)"
                        width="w-[130px]"
                        options={[
                          { label: 'Equals', value: 'equals', icon: <Equal size={13} /> },
                          { label: 'Not Equals', value: 'not_equals', icon: <Equal size={13} className="opacity-50" /> },
                          { label: 'Contains', value: 'contains', icon: <CheckCircle2 size={13} /> },
                          { label: 'Has Property', value: 'has_property', icon: <CheckSquare size={13} /> },
                          { label: 'Less Than', value: 'less_than', icon: <Hash size={13} /> },
                          { label: 'Greater Than', value: 'greater_than', icon: <Hash size={13} /> }
                        ]}
                      />

                      {assertion.operator !== 'has_property' && (
                        <div className="flex-1 min-w-[100px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-primary)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
                          <input 
                            type="text"
                            placeholder="Expected value"
                            value={assertion.expectedValue}
                            onChange={(e) => onChangeAssertions?.(assertions.map(a => a.id === assertion.id ? { ...a, expectedValue: e.target.value } : a))}
                            className="w-full text-xs bg-transparent outline-none font-mono"
                            style={{ color: 'var(--text-primary)' }}
                          />
                        </div>
                      )}
                      
                      <button 
                        onClick={() => onChangeAssertions?.(assertions.filter(a => a.id !== assertion.id))}
                        className="p-1.5 ml-auto rounded opacity-50 hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-500/10"
                        style={{ color: 'var(--error)' }}
                        title="Remove Assertion"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Code Snippets Panel */}
        {activeTab === "snippet" && (
          <div className="flex flex-col gap-2.5 h-full animation-fade-in min-h-0 pb-2">
            <div className="flex justify-between items-center flex-shrink-0">
              <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }}>
                {(["curl", "js", "node", "python"] as const).map(lang => (
                  <button key={lang} onClick={() => setSnippetLanguage(lang)}
                    className="px-3 py-1 text-[10px] rounded font-bold cursor-pointer transition-all"
                    style={{
                      background: snippetLanguage === lang ? 'var(--accent)' : 'transparent',
                      color: snippetLanguage === lang ? '#fff' : 'var(--text-tertiary)',
                    }}>
                    {lang === "js" ? "Fetch" : lang === "node" ? "Axios" : lang === "python" ? "Python" : "cURL"}
                  </button>
                ))}
              </div>
              <button onClick={copySnippetToClipboard}
                className="flex items-center gap-1 text-[10px] rounded px-2.5 py-1 cursor-pointer transition-all"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-secondary)' }} id="btn-copy-snippet">
                {copiedSnippet ? <Check size={11} style={{ color: 'var(--success)' }} /> : <Copy size={11} />}
                {copiedSnippet ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="w-full flex-1 min-h-0 rounded-xl p-3 text-[11px] font-mono outline-none overflow-auto select-text scrollbar-thin"
              style={{ ...inputStyle, whiteSpace: 'pre-wrap' }}>
              {generateSnippet()}
            </pre>
          </div>
        )}
      </div>
      
      {/* Save Request Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animation-fade-in">
          <div className="w-[400px] max-w-[95vw] rounded-xl flex flex-col shadow-2xl overflow-hidden" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
              <h2 className="text-sm font-bold">Save Request to Collection</h2>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Request Name</label>
                <input 
                  type="text"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="e.g. Create User"
                  className="w-full text-xs p-2.5 rounded-lg outline-none focus-ring"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Folder / Collection</label>
                <input 
                  type="text"
                  value={saveCategory}
                  onChange={e => setSaveCategory(e.target.value)}
                  placeholder="e.g. Users API"
                  className="w-full text-xs p-2.5 rounded-lg outline-none focus-ring"
                  style={inputStyle}
                />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button 
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (saveName.trim() && saveCategory.trim()) {
                      onSaveRequest?.(saveName.trim(), saveCategory.trim());
                      setIsSaveModalOpen(false);
                    } else {
                      onToast?.("Please enter a name and collection", "error");
                    }
                  }}
                  className="px-6 py-2 text-xs font-bold text-white rounded-lg transition-all"
                  style={{ background: 'var(--accent)' }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
