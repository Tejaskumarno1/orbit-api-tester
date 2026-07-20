import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Search, Plus, Minus } from "lucide-react";

interface JsonNodeProps {
  name: string | number;
  value: any;
  depth: number;
  searchTerm: string;
  isInitiallyExpanded?: boolean;
  globalExpandState: "expand" | "collapse" | null;
}

const JsonNode: React.FC<JsonNodeProps> = ({
  name,
  value,
  depth,
  searchTerm,
  isInitiallyExpanded,
  globalExpandState,
}) => {
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded !== undefined ? isInitiallyExpanded : depth < 2);

  useEffect(() => {
    if (globalExpandState === "expand") setIsExpanded(true);
    else if (globalExpandState === "collapse") setIsExpanded(false);
  }, [globalExpandState]);

  const isObject = value !== null && typeof value === "object";
  const isArray = Array.isArray(value);
  const toggleExpand = () => setIsExpanded(!isExpanded);

  const highlightText = (text: string, search: string) => {
    if (!search) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${search})`, "gi"));
    return (
      <span>
        {parts.map((part, index) =>
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={index} style={{ background: 'var(--warning-bg)', color: 'var(--warning)', borderRadius: '2px', padding: '0 2px' }}>{part}</mark>
          ) : (part)
        )}
      </span>
    );
  };

  const getRenderedValue = (val: any) => {
    if (val === null) return <span className="font-semibold font-mono" style={{ color: 'var(--error)' }}>null</span>;
    if (typeof val === "boolean") return <span className="font-semibold font-mono" style={{ color: 'var(--warning)' }}>{val ? "true" : "false"}</span>;
    if (typeof val === "number") return <span className="font-mono" style={{ color: 'var(--warning)' }}>{val}</span>;
    if (typeof val === "string") return <span className="font-mono break-all" style={{ color: 'var(--success)' }}>"{highlightText(val, searchTerm)}"</span>;
    return <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{String(val)}</span>;
  };

  const matchesSearch = () => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    if (String(name).toLowerCase().includes(searchLower)) return true;
    if (!isObject && String(value).toLowerCase().includes(searchLower)) return true;
    return false;
  };

  if (isObject) {
    const keys = Object.keys(value);
    const isEmpty = keys.length === 0;
    const bracketOpen = isArray ? "[" : "{";
    const bracketClose = isArray ? "]" : "}";

    useEffect(() => {
      if (searchTerm) setIsExpanded(true);
    }, [searchTerm]);

    return (
      <div className="pl-4 select-text" style={{ borderLeft: '1px solid var(--border-secondary)' }}>
        <div className="flex items-center gap-1 group py-0.5">
          {!isEmpty && (
            <button onClick={toggleExpand} className="p-0.5 rounded transition-colors cursor-pointer" style={{ color: 'var(--text-tertiary)' }}>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          {isEmpty && <span className="w-5" />}
          <span className="font-medium font-mono text-sm" style={{ color: 'var(--info)' }}>
            {name !== "" ? (
              <>
                {highlightText(String(name), searchTerm)}
                <span style={{ color: 'var(--text-tertiary)' }} className="mr-1">:</span>
              </>
            ) : null}
          </span>
          <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {bracketOpen}
            {!isExpanded && !isEmpty && (
              <span className="px-1 font-sans cursor-pointer" style={{ color: 'var(--text-muted)' }} onClick={toggleExpand}>
                ... {keys.length} {keys.length === 1 ? "item" : "items"} ...
              </span>
            )}
            {bracketClose}
          </span>
        </div>
        {isExpanded && !isEmpty && (
          <div className="flex flex-col gap-0.5 pl-2">
            {keys.map((key) => (
              <JsonNode key={key} name={isArray ? Number(key) : key} value={value[key]}
                depth={depth + 1} searchTerm={searchTerm} globalExpandState={globalExpandState} isInitiallyExpanded={depth + 1 < 2} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (searchTerm && !matchesSearch()) return null;

  return (
    <div className="group pl-9 py-0.5 flex items-baseline gap-1 rounded select-text hover:bg-black/5 dark:hover:bg-white/5 transition-colors relative pr-12">
      <span className="font-mono text-sm" style={{ color: 'var(--info)' }}>
        {highlightText(String(name), searchTerm)}
        <span style={{ color: 'var(--text-muted)' }} className="mr-1">:</span>
      </span>
      <span className="text-sm break-all">{getRenderedValue(value)}</span>
      
      <button 
        onClick={(e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(String(value));
        }}
        className="opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-opacity text-white"
        style={{ background: 'var(--accent)' }}
        title="Copy value"
      >
        Copy
      </button>
    </div>
  );
};

interface JsonTreeViewProps {
  data: any;
}

export const JsonTreeView: React.FC<JsonTreeViewProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [globalExpandState, setGlobalExpandState] = useState<"expand" | "collapse" | null>(null);

  useEffect(() => {
    if (globalExpandState !== null) {
      const timer = setTimeout(() => setGlobalExpandState(null), 100);
      return () => clearTimeout(timer);
    }
  }, [globalExpandState]);

  if (data === undefined || data === null) {
    return <div className="italic font-mono text-sm p-4" style={{ color: 'var(--text-tertiary)' }}>No data payload returned.</div>;
  }

  let parsedData = data;
  if (typeof data === "string") {
    try { parsedData = JSON.parse(data); } catch {
      return (
        <pre className="whitespace-pre-wrap font-mono text-sm p-4 rounded select-text overflow-auto"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>
          {data}
        </pre>
      );
    }
  }

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }}>
      {/* Utility bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3" style={{ borderBottom: '1px solid var(--border-secondary)', background: 'var(--bg-primary)' }}>
        <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 max-w-xs w-full" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }}>
          <Search size={13} style={{ color: 'var(--text-tertiary)' }} />
          <input type="text" placeholder="Search keys or values..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs border-none outline-none w-full font-mono" style={{ color: 'var(--text-primary)' }} id="json-search-input" />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="text-[10px] rounded px-1.5 cursor-pointer" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <button onClick={() => setGlobalExpandState("expand")}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-secondary)' }} id="btn-expand-all">
            <Plus size={12} /> Expand
          </button>
          <button onClick={() => setGlobalExpandState("collapse")}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-secondary)' }} id="btn-collapse-all">
            <Minus size={12} /> Collapse
          </button>
        </div>
      </div>
      {/* Tree */}
      <div className="p-4 overflow-auto flex-1 max-h-[500px] md:max-h-none scrollbar-thin">
        <JsonNode name="" value={parsedData} depth={0} searchTerm={searchTerm} isInitiallyExpanded={true} globalExpandState={globalExpandState} />
      </div>
    </div>
  );
};
