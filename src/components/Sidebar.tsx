import React, { useState, useEffect } from "react";
import { 
  Database, 
  History, 
  Settings, 
  Trash2, 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Lock, 
  Globe, 
  Terminal,
  Search,
  Loader2,
  Star,
  CheckCircle2,
  XCircle,
  Copy,
  Briefcase,
  Webhook
} from "lucide-react";
import { SavedRequest, HistoryItem, HttpMethod } from "../types";

interface SidebarProps {
  onSelectRequest: (req: Partial<SavedRequest>) => void;
  history: HistoryItem[];
  userCollections: SavedRequest[];
  onClearHistory: (mode: "all" | "failed" | "old") => void;
  apiKey: string;
  onChangeApiKey: (key: string) => void;
  baseUrl: string;
  onChangeBaseUrl: (url: string) => void;
  projectId: string;
  onChangeProjectId: (id: string) => void;
  activeRequestId?: string;
  activeHistoryId?: string;
  onSelectHistoryItem: (item: HistoryItem) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  appView: 'api' | 'webhooks';
  onChangeAppView: (view: 'api' | 'webhooks') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onSelectRequest,
  history,
  userCollections,
  onClearHistory,
  apiKey,
  onChangeApiKey,
  baseUrl,
  onChangeBaseUrl,
  projectId,
  onChangeProjectId,
  activeRequestId,
  activeHistoryId,
  onSelectHistoryItem,
  favorites,
  onToggleFavorite,
  appView,
  onChangeAppView
}) => {
  const [activeTab, setActiveTab] = useState<"endpoints" | "history" | "webhooks">("endpoints");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    "⭐ Favorites": true
  });
  const [showConfig, setShowConfig] = useState(false);
  const [dynamicCollections, setDynamicCollections] = useState<SavedRequest[]>([]);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [identity, setIdentity] = useState<any>(null);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [orgProjects, setOrgProjects] = useState<any[] | null>(null);

  const handleVerifyKey = async () => {
    if (!apiKey) return;
    setIsValidatingKey(true);
    try {
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `${baseUrl}/ext/whoami`,
          method: "GET",
          headers: { "Authorization": `Bearer ${apiKey}` }
        })
      });
      
      const proxyData = await res.json();
      
      if (proxyData.status >= 200 && proxyData.status < 300 && proxyData.data) {
        setIdentity(proxyData.data);
        
        // Fetch projects if valid key
        if (!proxyData.data.project_id) {
          try {
            const projRes = await fetch("/api/proxy", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: `${baseUrl}/ext/projects`,
                method: "GET",
                headers: { "Authorization": `Bearer ${apiKey}` }
              })
            });
            const projData = await projRes.json();
            if (projData.status >= 200 && projData.status < 300 && projData.data?.data) {
              setOrgProjects(projData.data.data);
            } else {
              setOrgProjects([]);
            }
          } catch (e) {
            setOrgProjects([]);
          }
        } else {
          setOrgProjects(null);
        }

      } else {
        setIdentity({ error: "Invalid API Key or unauthorized." });
        setOrgProjects(null);
      }
    } catch (e) {
      setIdentity({ error: "Network Error." });
      setOrgProjects(null);
    }
    setIsValidatingKey(false);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      if (apiKey) {
        handleVerifyKey();
      } else {
        setIdentity(null);
        setOrgProjects(null);
      }
    }, 800);
    return () => clearTimeout(handler);
  }, [apiKey, baseUrl]);

  useEffect(() => {
    const fetchOpenApi = async () => {
      try {
        setIsLoadingSpecs(true);
        const res = await fetch("https://api.dev-orbit.com/api/v1/ext/openapi.json");
        const spec = await res.json();
        
        const generated: SavedRequest[] = [];
        
        if (spec.paths) {
          for (const [path, methods] of Object.entries(spec.paths)) {
            for (const [method, opRaw] of Object.entries(methods as any)) {
              const op = opRaw as any;
              if (["get", "post", "put", "patch", "delete"].includes(method.toLowerCase())) {
                const category = (op.tags && op.tags.length > 0) ? op.tags[0] : "Other APIs";
                
                // Extract body schema if available
                let bodySchema = undefined;
                if (op.requestBody?.content?.["application/json"]?.schema) {
                  // Resolve basic references loosely if they exist, or just pass the schema down
                  bodySchema = op.requestBody.content["application/json"].schema;
                  
                  // Simple heuristic to extract schema from components if it's a $ref
                  if (bodySchema.$ref && spec.components && spec.components.schemas) {
                    const refName = bodySchema.$ref.split('/').pop();
                    if (refName && spec.components.schemas[refName]) {
                      bodySchema = spec.components.schemas[refName];
                    }
                  }
                }

                generated.push({
                  id: `auto-${method}-${path}`,
                  name: op.summary || `${method.toUpperCase()} ${path}`,
                  category: category,
                  method: method.toUpperCase() as HttpMethod,
                  url: `https://api.dev-orbit.com/api/v1${path}`,
                  headers: [
                    { id: "h1", key: "Accept", value: "application/json", enabled: true },
                    { id: "h2", key: "Authorization", value: "Bearer {{api_key}}", enabled: true },
                    ...(method.toLowerCase() === "post" || method.toLowerCase() === "put" || method.toLowerCase() === "patch" ? [{ id: "h3", key: "Content-Type", value: "application/json", enabled: true }] : [])
                  ],
                  queryParams: [],
                  body: method.toLowerCase() === "post" || method.toLowerCase() === "put" || method.toLowerCase() === "patch" ? "{}" : "",
                  description: op.description || op.summary || "Auto-generated from OpenAPI spec.",
                  bodySchema
                });
              }
            }
          }
        }
        setDynamicCollections(generated);
        if (generated.length > 0 && !activeRequestId) {
          onSelectRequest(generated[0]);
        }

        // Auto-expand first 3 categories
        const cats: Record<string, boolean> = { "⭐ Favorites": true };
        const uniqueCats = [...new Set(generated.map(g => g.category))];
        uniqueCats.forEach((cat, i) => { cats[cat] = i < 3; });
        setExpandedCategories(cats);
      } catch (err) {
        console.error("Failed to load dynamic OpenAPI spec", err);
      } finally {
        setIsLoadingSpecs(false);
      }
    };
    
    fetchOpenApi();
  }, []);

  // Group collections by category
  const allCollections = [...userCollections, ...dynamicCollections];
  const categories = allCollections.reduce<Record<string, SavedRequest[]>>((acc, req) => {
    if (!acc[req.category]) {
      acc[req.category] = [];
    }
    acc[req.category].push(req);
    return acc;
  }, {});

  // Add Favorites pseudo-category
  const favoriteItems = dynamicCollections.filter(req => favorites.includes(req.id));
  if (favoriteItems.length > 0) {
    categories["⭐ Favorites"] = favoriteItems;
  }

  // Sort so Favorites is always first
  const sortedCategories = Object.entries(categories).sort(([a], [b]) => {
    if (a === "⭐ Favorites") return -1;
    if (b === "⭐ Favorites") return 1;
    return a.localeCompare(b);
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const getMethodClass = (method: HttpMethod) => {
    switch (method) {
      case "GET": return "method-get";
      case "POST": return "method-post";
      case "PUT": return "method-put";
      case "DELETE": return "method-delete";
      case "PATCH": return "method-patch";
      default: return "";
    }
  };

  const getStatusBadgeStyle = (status?: number) => {
    if (!status) return { background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' };
    if (status >= 200 && status < 300) return { background: 'var(--success-bg)', color: 'var(--success)' };
    if (status >= 300 && status < 400) return { background: 'var(--info-bg)', color: 'var(--info)' };
    if (status >= 400 && status < 500) return { background: 'var(--warning-bg)', color: 'var(--warning)' };
    return { background: 'var(--error-bg)', color: 'var(--error)' };
  };

  // Filter endpoints
  const filteredCategories: Record<string, SavedRequest[]> = {};

  for (const [cat, items] of sortedCategories) {
    let filtered = items;
    
    // 1. Filter by Search Query
    if (searchFilter) {
      filtered = filtered.filter((item: SavedRequest) =>
        item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.url.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.method.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }

    if (filtered.length > 0) {
      filteredCategories[cat] = filtered;
    }
  }

  return (
    <aside className="w-full lg:w-80 flex flex-col h-full overflow-hidden flex-shrink-0 select-none" style={{ background: 'var(--bg-primary)', borderRight: '1px solid var(--border-primary)' }}>
      {/* Title block */}
      <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-primary)' }}>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: 'var(--accent)', boxShadow: 'var(--shadow-glow)' }}>
            Ω
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Orbit API Tester
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Developer Console
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onChangeAppView(appView === 'webhooks' ? 'api' : 'webhooks')}
            className="p-2 rounded-lg transition-all cursor-pointer"
            style={{
              background: appView === 'webhooks' ? 'var(--accent-bg)' : 'transparent',
              color: appView === 'webhooks' ? 'var(--accent)' : 'var(--text-tertiary)',
              border: '1px solid transparent'
            }}
            title="Webhook Simulator"
          >
            <Webhook size={16} />
          </button>
          
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 rounded-lg transition-all cursor-pointer"
            style={{
              background: showConfig ? 'var(--accent-bg)' : 'transparent',
              color: showConfig ? 'var(--accent)' : 'var(--text-tertiary)',
              border: '1px solid transparent'
            }}
            title="Configure API Environment Keys"
            id="btn-toggle-config"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Environment Settings / Config Tray */}
      {showConfig && (
        <div className="p-4 flex flex-col gap-3 animation-fade-in" style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Globe size={12} style={{ color: 'var(--text-tertiary)' }} />
              API Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => onChangeBaseUrl(e.target.value)}
              placeholder="https://api.dev-orbit.com/v1"
              className="w-full text-xs rounded-lg px-3 py-2 outline-none font-mono transition-colors focus-ring"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
              id="sidebar-base-url-input"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Lock size={12} style={{ color: 'var(--accent)' }} />
              API Key
            </label>
            <div className="relative flex items-center">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  onChangeApiKey(e.target.value);
                  setIdentity(null);
                  setOrgProjects(null);
                }}
                placeholder="orb_live_..."
                className="w-full text-xs rounded-lg px-3 py-2 outline-none font-mono transition-colors focus-ring pr-8"
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                id="sidebar-api-key-input"
              />
              {isValidatingKey && (
                <div className="absolute right-3">
                  <Loader2 size={14} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
                </div>
              )}
            </div>
            
            {identity && (
              <div className="mt-2 p-3 rounded-lg text-xs font-mono" style={{ background: identity.error ? 'var(--error-bg)' : 'var(--success-bg)', border: `1px solid ${identity.error ? 'var(--error)' : 'var(--success)'}` }}>
                {identity.error ? (
                  <div className="flex items-center gap-2" style={{ color: 'var(--error)' }}>
                    <XCircle size={14} />
                    <span>{identity.error}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5" style={{ color: 'var(--text-primary)' }}>
                    <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--success)' }}>
                      <CheckCircle2 size={14} />
                      <span className="font-semibold">Key Verified</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Type:</span>
                      <span>{identity.project_id ? 'Project-Level' : 'Org-Wide'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Environment:</span>
                      <span className="uppercase">{identity.environment}</span>
                    </div>
                    {identity.project_id && (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-secondary)' }}>Project ID:</span>
                        <span className="truncate max-w-[120px]" title={identity.project_id}>{identity.project_id}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Organization:</span>
                      <span className="truncate max-w-[120px]" title={identity.organization_id}>{identity.organization_id}</span>
                    </div>

                    {orgProjects && orgProjects.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-dashed" style={{ borderColor: 'var(--border-secondary)' }}>
                        <span className="text-[10px] uppercase font-bold mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>Available Projects</span>
                        <div className="flex flex-col gap-1 max-h-32 overflow-y-auto scrollbar-thin pr-1">
                          {orgProjects.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-1.5 rounded group hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer" style={{ background: 'var(--bg-primary)' }} onClick={() => onChangeProjectId(p.id)}>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold truncate text-[11px]" title={p.name}>{p.name}</span>
                                <span className="text-[10px] text-gray-500 font-mono truncate select-all">{p.id}</span>
                              </div>
                              <button 
                                className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity" 
                                style={{ color: 'var(--accent)', background: 'var(--accent-bg)' }}
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(p.id); onChangeProjectId(p.id); }}
                                title="Copy and Use Project ID"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5 mt-3" style={{ color: 'var(--text-secondary)' }}>
              <Briefcase size={12} style={{ color: 'var(--accent)' }} />
              Active Project ID
            </label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => onChangeProjectId(e.target.value)}
              placeholder="e.g. 68b9546c-..."
              className="w-full text-xs rounded-lg px-3 py-2 outline-none font-mono transition-colors focus-ring"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
              title="Automatically appends ?project_id= to your requests"
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: '1px solid var(--border-primary)' }}>
        <button
          onClick={() => {
            setActiveTab("endpoints");
            if (appView !== 'api') onChangeAppView("api");
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all cursor-pointer"
          style={{
            color: activeTab === "endpoints" ? 'var(--accent)' : 'var(--text-tertiary)',
            borderBottom: activeTab === "endpoints" ? '2px solid var(--accent)' : '2px solid transparent',
            background: activeTab === "endpoints" ? 'var(--accent-bg)' : 'transparent'
          }}
          id="tab-endpoints"
        >
          <Database size={13} />
          API Collections
          {isLoadingSpecs && <Loader2 size={12} className="animate-spin" />}
        </button>
        <button
          onClick={() => {
            setActiveTab("history");
            if (appView !== 'api') onChangeAppView("api");
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all cursor-pointer"
          style={{
            color: activeTab === "history" ? 'var(--accent)' : 'var(--text-tertiary)',
            borderBottom: activeTab === "history" ? '2px solid var(--accent)' : '2px solid transparent',
            background: activeTab === "history" ? 'var(--accent-bg)' : 'transparent'
          }}
          id="tab-history"
        >
          <History size={13} />
          History
          {history.length > 0 && (
            <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* Content scroll area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
        {activeTab === "endpoints" ? (
          <div className="flex flex-col gap-2">
            {/* Search bar */}
            <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 mb-1" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }}>
              <Search size={13} style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="bg-transparent text-xs border-none outline-none w-full font-mono"
                style={{ color: 'var(--text-primary)' }}
                id="sidebar-search-input"
              />
            </div>

            {/* Quick Custom Request */}
            <button
              onClick={() => {
                onSelectRequest({
                  id: "custom",
                  name: "Custom API Request",
                  method: "GET",
                  url: `${baseUrl}/`,
                  headers: [
                    { id: "h1", key: "Accept", value: "application/json", enabled: true },
                    { id: "h2", key: "Authorization", value: `Bearer ${apiKey}`, enabled: true },
                  ],
                  queryParams: [],
                  body: "",
                  description: "Define a fully customized test request to any server endpoint.",
                });
                if (appView !== 'api') onChangeAppView('api');
              }}
              className="flex items-center justify-center gap-1.5 w-full rounded-lg py-2.5 text-xs font-medium transition-all cursor-pointer"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px dashed var(--border-primary)' }}
              id="btn-custom-request"
            >
              <Plus size={13} />
              Custom Request
            </button>

            {/* Loading skeleton */}
            {isLoadingSpecs && (
              <div className="flex flex-col gap-2 mt-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="shimmer-bg rounded-lg h-8" />
                ))}
              </div>
            )}

            {/* Render grouped endpoints */}
            {Object.entries(filteredCategories).map(([category, items]) => {
              const isExpanded = expandedCategories[category];
              return (
                <div key={category} className="mb-1">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex items-center justify-between w-full text-left py-1.5 px-1 text-xs font-bold cursor-pointer transition-colors rounded-md"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Database size={13} style={{ color: 'var(--accent)' }} />
                      <span>{category}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                        {items.length}
                      </span>
                    </div>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>

                  {isExpanded && (
                    <div className="flex flex-col mt-1 pl-2 gap-0.5 animation-slide-down" style={{ borderLeft: '2px solid var(--border-secondary)' }}>
                      {items.map((item) => {
                        const isActive = activeRequestId === item.id;
                        return (
                          <div
                            key={item.id}
                            className="group flex items-center justify-between text-left rounded-lg p-1 pr-2 text-xs transition-all"
                            style={{
                              background: isActive ? 'var(--accent-bg)' : 'transparent',
                              border: isActive ? '1px solid var(--border-active)' : '1px solid transparent',
                            }}
                          >
                            <button
                              onClick={() => {
                                onSelectRequest(item);
                                if (appView !== 'api') onChangeAppView('api');
                              }}
                              className="flex items-center gap-2 overflow-hidden flex-1 cursor-pointer p-1"
                              style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}
                            >
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold w-12 text-center flex-shrink-0 ${getMethodClass(item.method)}`}>
                                {item.method}
                              </span>
                              <span className="truncate font-medium" style={{ fontSize: '11px' }}>
                                {item.name}
                              </span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              style={{ color: favorites.includes(item.id) ? 'var(--warning)' : 'var(--text-tertiary)' }}
                              title={favorites.includes(item.id) ? "Remove from Favorites" : "Add to Favorites"}
                            >
                              <Star size={13} fill={favorites.includes(item.id) ? "currentColor" : "none"} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {history.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 mb-1" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }}>
                  <Search size={13} style={{ color: 'var(--text-tertiary)' }} />
                  <input
                    type="text"
                    placeholder="Search history..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="bg-transparent text-xs border-none outline-none w-full font-mono"
                    style={{ color: 'var(--text-primary)' }}
                    id="sidebar-history-search-input"
                  />
                </div>
                
                <div className="flex justify-between items-center px-1 mb-1">
                  <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-tertiary)' }}>
                    Requests Log ({history.length})
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => onClearHistory("failed")} className="p-1 rounded cursor-pointer transition-colors text-[9px] font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }} title="Clear successful requests, keep failed">Failed</button>
                    <button onClick={() => onClearHistory("old")} className="p-1 rounded cursor-pointer transition-colors text-[9px] font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }} title="Keep last 10, clear rest">Recent</button>
                    <button onClick={() => onClearHistory("all")} className="p-1 rounded cursor-pointer transition-colors text-[9px] font-bold" style={{ background: 'var(--error-bg)', color: 'var(--error)' }} title="Clear all history">All</button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  {history
                    .filter(item => !searchFilter || item.url.toLowerCase().includes(searchFilter.toLowerCase()) || item.method.toLowerCase().includes(searchFilter.toLowerCase()))
                    .map((item) => {
                    const isActive = activeHistoryId === item.id;
                    const pathOnly = item.url.replace(baseUrl, "");

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectHistoryItem(item);
                          if (appView !== 'api') onChangeAppView('api');
                        }}
                        className="group text-left p-2.5 rounded-lg flex flex-col gap-1.5 transition-all cursor-pointer"
                        style={{
                          background: isActive ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                          border: isActive ? '1px solid var(--border-active)' : '1px solid var(--border-secondary)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${getMethodClass(item.method)}`}>
                            {item.method}
                          </span>
                          {item.response ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold" style={getStatusBadgeStyle(item.response.status)}>
                              {item.response.status}
                            </span>
                          ) : item.error ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>
                              ERR
                            </span>
                          ) : null}
                        </div>

                        <div className="text-xs font-mono font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {pathOnly || item.url}
                        </div>

                        <div className="flex justify-between items-center text-[9px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                          <span>{item.timestamp}</span>
                          {item.response && (
                            <span>{item.response.duration}ms · {item.response.size}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center flex-grow" style={{ color: 'var(--text-tertiary)' }}>
                <Terminal size={24} className="animate-pulse" style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>No requests sent yet</p>
                  <p className="text-[10px] max-w-[200px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    Select any endpoint from the list and hit "Send Request" to trigger a run.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
