import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  Clock, 
  Activity,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutTemplate,
  LayoutGrid,
  Columns,
  X,
  ChevronDown
} from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { RequestBuilder } from "./components/RequestBuilder";
import { ResponsePanel } from "./components/ResponsePanel";
import { WebhookSimulator } from "./components/WebhookSimulator";
import { EnvironmentManager } from "./components/EnvironmentManager";
import { CurlImportModal } from "./components/CurlImportModal";
import { ExportImportModal } from "./components/ExportImportModal";
import { DEFAULT_BASE_URL } from "./data/endpoints";
import { HttpMethod, HeaderItem, QueryParamItem, HistoryItem, SavedRequest, WorkspaceTab, Environment } from "./types";
import { useTheme } from "./ThemeContext";

export default function App() {
  const { theme, toggleTheme } = useTheme();

  // Workspace UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [appView, setAppView] = useState<'api' | 'webhooks'>('api');
  const [layoutMode, setLayoutMode] = useState<'vertical' | 'horizontal'>(() => {
    return (localStorage.getItem("orbit_layout_mode") as 'vertical' | 'horizontal') || 'vertical';
  });
  const [requestPaneHeight, setRequestPaneHeight] = useState<number>(50);
  const [splitPaneRatio, setSplitPaneRatio] = useState<number>(50);

  useEffect(() => {
    localStorage.setItem("orbit_layout_mode", layoutMode);
  }, [layoutMode]);

  const handleSplitDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startRatio = splitPaneRatio;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const containerWidth = window.innerWidth - (isSidebarOpen ? 280 : 0); 
      const delta = moveEvent.clientX - startX;
      const newRatio = Math.max(15, Math.min(85, startRatio + (delta / containerWidth) * 100));
      setSplitPaneRatio(newRatio);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
    
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startRatio = requestPaneHeight;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (layoutMode === 'vertical') {
        const containerHeight = window.innerHeight - 150; 
        const delta = moveEvent.clientY - startY;
        const newHeightPercent = Math.max(10, Math.min(90, startRatio + (delta / containerHeight) * 100));
        setRequestPaneHeight(newHeightPercent);
      } else {
        const containerWidth = window.innerWidth - (isSidebarOpen ? 280 : 0) - 32;
        const delta = moveEvent.clientX - startX;
        const newWidthPercent = Math.max(10, Math.min(90, startRatio + (delta / containerWidth) * 100));
        setRequestPaneHeight(newWidthPercent);
      }
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
    
    document.body.style.cursor = layoutMode === 'vertical' ? 'row-resize' : 'col-resize';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Toast System
  const [toasts, setToasts] = useState<{id: string, message: string, type: 'success' | 'error' | 'info'}[]>([]);
  
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Built-in environment configurations
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("orbit_api_key") || "";
  });
  
  const [baseUrl, setBaseUrl] = useState<string>(() => {
    return localStorage.getItem("orbit_base_url") || DEFAULT_BASE_URL;
  });

  const [globalProjectId, setGlobalProjectId] = useState<string>(() => {
    return localStorage.getItem("orbit_project_id") || "";
  });

  const [environments, setEnvironments] = useState<Environment[]>(() => {
    try { 
      const parsed = JSON.parse(localStorage.getItem("orbit_environments") || "[]"); 
      return Array.isArray(parsed) ? parsed : [];
    }
    catch { return []; }
  });
  
  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string | null>(() => {
    return localStorage.getItem("orbit_active_environment");
  });
  
  const [isEnvManagerOpen, setIsEnvManagerOpen] = useState(false);
  const [isEnvMenuOpen, setIsEnvMenuOpen] = useState(false);
  const [isCurlModalOpen, setIsCurlModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleExportData = () => {
    const data = {
      version: 1,
      environments,
      history,
      favorites,
      userCollections,
      tabs,
      activeTabId,
      splitViewTabId,
      baseUrl,
      apiKey,
      globalProjectId,
      layoutMode
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orbit-workspace-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Workspace exported successfully", "success");
  };

  const handleImportData = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.environments) setEnvironments(parsed.environments);
      if (parsed.history) { setHistory(parsed.history); saveHistoryToDisk(parsed.history); }
      if (parsed.userCollections) setUserCollections(parsed.userCollections);
      if (parsed.favorites) setFavorites(parsed.favorites);
      if (parsed.tabs) setTabs(parsed.tabs);
      if (parsed.activeTabId) setActiveTabId(parsed.activeTabId);
      if (parsed.splitViewTabId) setSplitViewTabId(parsed.splitViewTabId);
      if (parsed.baseUrl) { setBaseUrl(parsed.baseUrl); localStorage.setItem("orbit_base_url", parsed.baseUrl); }
      if (parsed.apiKey) { setApiKey(parsed.apiKey); localStorage.setItem("orbit_api_key", parsed.apiKey); }
      if (parsed.globalProjectId) { setGlobalProjectId(parsed.globalProjectId); localStorage.setItem("orbit_project_id", parsed.globalProjectId); }
      if (parsed.layoutMode) setLayoutMode(parsed.layoutMode);
      addToast("Workspace restored successfully", "success");
    } catch (e) {
      addToast("Failed to parse workspace backup", "error");
    }
  };

  useEffect(() => {
    localStorage.setItem("orbit_environments", JSON.stringify(environments));
  }, [environments]);

  const [userCollections, setUserCollections] = useState<SavedRequest[]>(() => {
    try { 
      const parsed = JSON.parse(localStorage.getItem("orbit_user_collections") || "[]"); 
      return Array.isArray(parsed) ? parsed : [];
    }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("orbit_user_collections", JSON.stringify(userCollections));
  }, [userCollections]);

  useEffect(() => {
    if (activeEnvironmentId) localStorage.setItem("orbit_active_environment", activeEnvironmentId);
    else localStorage.removeItem("orbit_active_environment");
  }, [activeEnvironmentId]);

  const resolveVariables = (text: string) => {
    if (typeof text !== 'string') return text || "";
    let resolvedText = text;
    resolvedText = resolvedText.replace(/{{api_key}}/g, apiKey || "");
    
    if (activeEnvironmentId) {
      const activeEnv = environments.find(e => e.id === activeEnvironmentId);
      if (activeEnv) {
        activeEnv.variables.forEach(v => {
          if (v.enabled && v.key) {
            const regex = new RegExp(`{{${v.key}}}`, 'g');
            resolvedText = resolvedText.replace(regex, v.value);
          }
        });
      }
    }
    return resolvedText;
  };

  // Active Request States
  const [tabs, setTabs] = useState<WorkspaceTab[]>([{
    id: "default-1",
    name: "New Request",
    description: "",
    method: "GET",
    url: "",
    headers: [],
    queryParams: [],
    body: "",
    isLoading: false,
    response: null,
  }]);
  const [activeTabId, setActiveTabId] = useState<string>("default-1");
  const [splitViewTabId, setSplitViewTabId] = useState<string | null>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const updateActiveTab = (updates: Partial<WorkspaceTab>) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t));
  };

  const updateTab = (id: string, updates: Partial<WorkspaceTab>) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleTabSelect = (id: string) => {
    if (splitViewTabId === id) {
      setSplitViewTabId(activeTabId);
    }
    setActiveTabId(id);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    addToast("Tab closed", "info");
    
    const isClosingSplit = splitViewTabId === id;
    if (isClosingSplit) {
      setSplitViewTabId(null);
    }
    
    if (tabs.length === 1) {
      setTabs([{
        id: Math.random().toString(),
        name: "New Request",
        description: "",
        method: "GET",
        url: "",
        headers: [],
        queryParams: [],
        body: "",
        isLoading: false,
        response: null,
      }]);
      setSplitViewTabId(null);
      return;
    }
    
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    
    if (activeTabId === id) {
      if (splitViewTabId && !isClosingSplit) {
        setActiveTabId(splitViewTabId);
        setSplitViewTabId(null);
      } else {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      }
    }
  };

  const [tabContextMenu, setTabContextMenu] = useState<{ id: string, x: number, y: number } | null>(null);

  useEffect(() => {
    const handleClickAway = () => setTabContextMenu(null);
    window.addEventListener('click', handleClickAway);
    return () => window.removeEventListener('click', handleClickAway);
  }, []);

  const handleTabContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setTabContextMenu({ id, x: e.clientX, y: e.clientY });
  };

  const closeOtherTabs = (id: string) => {
    const keep = tabs.find(t => t.id === id);
    if (keep) {
      setTabs([keep]);
      setActiveTabId(keep.id);
      setSplitViewTabId(null);
      addToast("Other tabs closed", "info");
    }
  };

  const closeAllTabs = () => {
    const newId = Math.random().toString();
    setTabs([{
      id: newId,
      name: "New Request",
      description: "",
      method: "GET",
      url: "",
      headers: [],
      queryParams: [],
      body: "",
      isLoading: false,
      response: null,
    }]);
    setActiveTabId(newId);
    setSplitViewTabId(null);
    addToast("All tabs closed", "info");
  };

  const tabsContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeTabElement = tabsContainerRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
      if (activeTabElement) {
        activeTabElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [activeTabId, tabs.length]);

  const createTab = () => {
    const newId = Math.random().toString();
    setTabs(prev => [...prev, {
      id: newId,
      name: "New Request",
      description: "",
      method: "GET",
      url: "",
      headers: [],
      queryParams: [],
      body: "",
      isLoading: false,
      response: null,
    }]);
    setActiveTabId(newId);
    addToast("New tab created", "info");
  };

  const importCurlTab = (tabData: Partial<WorkspaceTab>) => {
    const newId = Math.random().toString();
    setTabs(prev => [...prev, {
      id: newId,
      name: tabData.name || "Imported cURL",
      description: "",
      method: tabData.method || "GET",
      url: tabData.url || "",
      headers: tabData.headers || [],
      queryParams: tabData.queryParams || [],
      body: tabData.body || "",
      isLoading: false,
      response: null,
    }]);
    setActiveTabId(newId);
    addToast("cURL command imported successfully!", "success");
  };

  const handleSaveRequest = (tabId: string, name: string, category: string) => {
    const tabToSave = tabs.find(t => t.id === tabId);
    if (!tabToSave) return;
    
    const newReq: SavedRequest = {
      id: Math.random().toString(),
      name,
      category,
      method: tabToSave.method,
      url: tabToSave.url,
      headers: tabToSave.headers,
      queryParams: tabToSave.queryParams,
      body: tabToSave.body,
    };
    
    setUserCollections([...userCollections, newReq]);
    updateTab(tabId, { name, category, requestId: newReq.id });
    addToast("Request saved to collection", "success");
  };

  // Status metrics & history logs
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load initial history
  useEffect(() => {
    const savedHistory = localStorage.getItem("orbit_test_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Error loading request history from disk", e);
      }
    }
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem("orbit_api_key", apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem("orbit_project_id", globalProjectId);
  }, [globalProjectId]);

  useEffect(() => {
    localStorage.setItem("orbit_base_url", baseUrl);
  }, [baseUrl]);

  const saveHistoryToDisk = (updatedHistory: HistoryItem[]) => {
    try {
      localStorage.setItem("orbit_test_history", JSON.stringify(updatedHistory));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.message?.includes('quota') || e.message?.includes('Storage')) {
        // If it STILL fails despite our mitigations, just don't save the new state to disk, but DON'T wipe the old history
        addToast("Cannot save latest history item: browser storage is completely full.", "error");
      } else {
        console.error(e);
      }
    }
  };

  const openOrUpdateTab = (newTab: Partial<WorkspaceTab>) => {
    if (activeTab.url === "" && activeTab.method === "GET") {
      updateActiveTab(newTab);
    } else {
      const newId = Math.random().toString();
      setTabs(prev => [...prev, {
        id: newId,
        name: "New Request",
        description: "",
        method: "GET",
        url: "",
        headers: [],
        queryParams: [],
        body: "",
        isLoading: false,
        response: null,
        ...newTab
      }]);
      setActiveTabId(newId);
    }
  };

  // Pre-populate active request editor
  const loadRequestIntoForm = (req: Partial<SavedRequest>) => {
    openOrUpdateTab({
      name: req.name || "Custom Request",
      description: req.description || "",
      method: req.method || "GET",
      url: req.url || "",
      headers: req.headers || [],
      queryParams: req.queryParams || [],
      body: req.body || "",
      bodySchema: req.bodySchema,
      category: req.category,
      requestId: req.id,
      historyId: undefined,
      isLoading: false,
      response: null,
      error: undefined
    });
  };

  // Restore request + response from history log
  const handleSelectHistoryItem = (item: HistoryItem) => {
    const headerList = Object.entries(item.headers).map(([key, value]) => ({
      id: Math.random().toString(),
      key,
      value,
      enabled: true,
    }));

    let paramList: QueryParamItem[] = [];
    try {
      const urlObj = new URL(item.url);
      urlObj.searchParams.forEach((value, key) => {
        paramList.push({
          id: Math.random().toString(),
          key,
          value,
          enabled: true,
        });
      });
    } catch {}

    openOrUpdateTab({
      name: `Historical Request`,
      description: `Sent: ${item.timestamp}`,
      method: item.method,
      url: item.url,
      headers: headerList,
      queryParams: paramList,
      body: item.body || "",
      requestId: undefined,
      historyId: item.id,
      isLoading: false,
      response: item.response,
      error: item.error
    });
  };

  const [favorites, setFavorites] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem("orbit_api_favorites") || "[]");
  });

  useEffect(() => {
    localStorage.setItem("orbit_api_favorites", JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const handleClearHistory = (mode: "all" | "failed" | "old") => {
    if (mode === "all") {
      setHistory([]);
      localStorage.removeItem("orbit_test_history");
      addToast("History cleared", "success");
    } else if (mode === "failed") {
      const filtered = history.filter(h => h.response && h.response.status >= 200 && h.response.status < 400);
      setHistory(filtered);
      saveHistoryToDisk(filtered);
      addToast("Failed requests cleared", "success");
    } else if (mode === "old") {
      const filtered = history.slice(0, 10);
      setHistory(filtered);
      saveHistoryToDisk(filtered);
      addToast("Old requests cleared", "success");
    }
  };

  const [rateLimit, setRateLimit] = useState<{ remaining: string, limit: string } | null>(null);

  // Execute full-stack proxy request pipeline
  const handleSendRequest = async (tabIdToSend: string = activeTabId) => {
    const targetTab = tabs.find(t => t.id === tabIdToSend);
    if (!targetTab) return;

    if (!targetTab.url) {
      addToast("Please enter a valid URL", "error");
      return;
    }
    
    updateTab(tabIdToSend, { isLoading: true, response: null, error: undefined });

    const startTime = performance.now();

    const preparedHeaders: Record<string, string> = {};
    targetTab.headers.forEach((h) => {
      if (h.enabled && h.key) {
        preparedHeaders[h.key] = resolveVariables(h.value);
      }
    });

    let preparedUrl = resolveVariables(targetTab.url);
    const preparedBody = targetTab.body ? resolveVariables(targetTab.body) : undefined;
    
    if (globalProjectId) {
      if (preparedUrl.includes('?')) {
        if (!preparedUrl.includes('project_id=')) {
          preparedUrl += `&project_id=${globalProjectId}`;
        }
      } else {
        preparedUrl += `?project_id=${globalProjectId}`;
      }
    }

    try {
      const proxyResponse = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: preparedUrl,
          method: targetTab.method,
          headers: preparedHeaders,
          body: ["POST", "PUT", "PATCH", "DELETE"].includes(targetTab.method) && preparedBody ? preparedBody : undefined,
        }),
      });

      const resJson = await proxyResponse.json();

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      if (!resJson || resJson.error === "Proxy Error") {
        throw new Error(resJson?.message || JSON.stringify(resJson, null, 2) || "Failed forwarding request payload.");
      }

      // Track Rate Limits
      const headersMap = resJson.headers || {};
      const rlRemaining = headersMap['x-ratelimit-remaining'] || headersMap['ratelimit-remaining'];
      const rlLimit = headersMap['x-ratelimit-limit'] || headersMap['ratelimit-limit'];
      if (rlRemaining && rlLimit) {
        setRateLimit({ remaining: rlRemaining, limit: rlLimit });
      }

      const responseSize = JSON.stringify(resJson.data || "").length;
      const formattedSize = responseSize > 1024 
        ? `${(responseSize / 1024).toFixed(2)} KB` 
        : `${responseSize} B`;

      const finalResponse = {
        status: resJson.status,
        statusText: resJson.statusText || (resJson.status === 200 ? "OK" : "Status"),
        headers: headersMap,
        duration: duration,
        size: formattedSize,
        data: resJson.data,
      };

      // Evaluate Assertions
      let testResults: any[] = [];
      if (targetTab.assertions && targetTab.assertions.length > 0) {
        testResults = targetTab.assertions.map(assertion => {
          let actualValue: any;
          let passed = false;
          let error = undefined;

          try {
            // Get actual value
            if (assertion.type === 'status_code') {
              actualValue = finalResponse.status;
            } else if (assertion.type === 'response_time') {
              actualValue = finalResponse.duration;
            } else if (assertion.type === 'json_body') {
              if (assertion.targetPath && finalResponse.data) {
                actualValue = assertion.targetPath.split('.').reduce((o: any, i: string) => o?.[i], finalResponse.data);
              } else {
                actualValue = finalResponse.data;
              }
            }

            // Compare
            const expectedStr = String(assertion.expectedValue);
            const actualStr = String(actualValue);

            switch (assertion.operator) {
              case 'equals':
                passed = actualStr === expectedStr;
                break;
              case 'not_equals':
                passed = actualStr !== expectedStr;
                break;
              case 'less_than':
                passed = Number(actualValue) < Number(expectedStr);
                break;
              case 'greater_than':
                passed = Number(actualValue) > Number(expectedStr);
                break;
              case 'contains':
                if (typeof actualValue === 'object') {
                  passed = JSON.stringify(actualValue).includes(expectedStr);
                } else {
                  passed = actualStr.includes(expectedStr);
                }
                break;
              case 'has_property':
                passed = actualValue !== undefined && actualValue !== null;
                break;
            }
          } catch (e: any) {
            error = e.message;
          }

          return {
            assertionId: assertion.id,
            passed,
            actualValue,
            error
          };
        });
      }

      updateTab(tabIdToSend, { response: finalResponse, isLoading: false, error: undefined, testResults });

      // Strip out huge payloads before saving to history so we don't blow up the 5MB browser quota
      const historyResponse = { ...finalResponse };
      if (responseSize > 1000000) { // If payload > 1MB
        historyResponse.data = { __ui_note: "Response payload was over 1MB and too large to save in local history. Please re-send the request to view the full data." };
      }

      const logEntry: HistoryItem = {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        method: targetTab.method,
        url: preparedUrl,
        headers: preparedHeaders,
        body: ["POST", "PUT", "PATCH", "DELETE"].includes(targetTab.method) ? preparedBody : undefined,
        response: historyResponse,
      };

      // Enforce FIFO history limit to prevent local storage bloat
      const MAX_HISTORY = 25;
      const updatedHistory = [logEntry, ...history].slice(0, MAX_HISTORY);
      setHistory(updatedHistory);
      saveHistoryToDisk(updatedHistory);
      
      addToast(`Request successful (${finalResponse.status})`, "success");

    } catch (err: any) {
      console.error("HTTP Client Pipeline Failure:", err);
      const errMsg = err.message || "Network Error: Verify connection properties or route configurations.";
      updateTab(tabIdToSend, { error: errMsg, isLoading: false, response: null });

      const failedEntry: HistoryItem = {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        method: targetTab.method,
        url: preparedUrl,
        headers: preparedHeaders,
        body: ["POST", "PUT", "PATCH", "DELETE"].includes(targetTab.method) ? preparedBody : undefined,
        response: null,
        error: errMsg,
      };

      // Enforce FIFO history limit to prevent local storage bloat
      const MAX_HISTORY = 25;
      const updatedHistory = [failedEntry, ...history].slice(0, MAX_HISTORY);
      setHistory(updatedHistory);
      saveHistoryToDisk(updatedHistory);
      addToast("Request failed", "error");
    } finally {
      updateActiveTab({ isLoading: false });
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter to send request
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSendRequest();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab.url, activeTab.method, activeTab.headers, activeTab.body, apiKey, history]);

  // Dashboard Stats calculation
  const totalSent = history.length;
  const successfulRuns = history.filter((h) => h.response && h.response.status >= 200 && h.response.status < 300).length;
  const successRate = totalSent > 0 ? Math.round((successfulRuns / totalSent) * 100) : 0;
  const runsWithLatency = history.filter(h => h.response && h.response.duration !== undefined);
  const avgLatency = runsWithLatency.length > 0 
    ? Math.round(runsWithLatency.reduce((sum, curr) => sum + (curr.response!.duration), 0) / runsWithLatency.length) 
    : 0;

  const [maximizedPanel, setMaximizedPanel] = useState<"request" | "response" | null>(null);

  const renderTabWorkspace = (tabId: string) => {
    const tabToRender = tabs.find(t => t.id === tabId);
    if (!tabToRender) return null;

    return (
      <div className={`flex-1 flex ${layoutMode === 'vertical' ? 'flex-col' : 'flex-row'} h-full overflow-hidden p-4 gap-2 scrollbar-thin`}>
        {/* Request editor */}
        {maximizedPanel !== "response" && (
          <div className="overflow-hidden min-h-0 min-w-0" style={{ 
              [layoutMode === 'vertical' ? 'height' : 'width']: maximizedPanel === "request" ? '100%' : `${requestPaneHeight}%` 
          }}>
            <RequestBuilder
              method={tabToRender.method}
              onChangeMethod={(m) => updateTab(tabId, { method: m })}
              url={tabToRender.url}
              onChangeUrl={(u) => updateTab(tabId, { url: u })}
              headers={tabToRender.headers}
              onChangeHeaders={(h) => updateTab(tabId, { headers: h })}
              queryParams={tabToRender.queryParams}
              onChangeQueryParams={(q) => updateTab(tabId, { queryParams: q })}
              body={tabToRender.body}
              onChangeBody={(b) => updateTab(tabId, { body: b })}
              bodySchema={tabToRender.bodySchema}
              assertions={tabToRender.assertions || []}
              onChangeAssertions={(a) => updateTab(tabId, { assertions: a })}
              onSendRequest={() => handleSendRequest(tabId)}
              onSaveRequest={(name, category) => handleSaveRequest(tabId, name, category)}
              resolveVariables={resolveVariables}
              isLoading={tabToRender.isLoading}
              description={tabToRender.description}
              category={tabToRender.category}
              name={tabToRender.name}
              apiKey={apiKey}
              isMaximized={maximizedPanel === "request"}
              onToggleMaximize={() => setMaximizedPanel(p => p === "request" ? null : "request")}
              onToast={addToast}
            />
          </div>
        )}

        {/* Dragger */}
        {!maximizedPanel && (
          <div 
            className={`${layoutMode === 'vertical' ? 'h-4 w-full cursor-row-resize flex-row py-1 my-0.5' : 'w-4 h-full cursor-col-resize flex-col px-1 mx-0.5'} flex items-center justify-center rounded-md group transition-all duration-300 relative z-10`}
            onMouseDown={handleDragStart}
            title="Drag to resize panels"
          >
            {/* Smooth growing background line */}
            <div className={`absolute ${layoutMode === 'vertical' ? 'left-0 right-0 h-[2px] scale-x-95 group-hover:scale-x-100' : 'top-0 bottom-0 w-[2px] scale-y-95 group-hover:scale-y-100'} rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out`} style={{ background: 'var(--accent-bg)' }} />
            
            {/* Grip */}
            <div className={`flex ${layoutMode === 'vertical' ? 'flex-row px-3 py-1 gap-1' : 'flex-col py-3 px-1 gap-1'} z-10 rounded-full border transition-all duration-300 ease-out shadow-sm group-hover:shadow-md group-hover:scale-110 group-active:scale-95 group-active:shadow-inner`}
                 style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-secondary)' }}>
              <div className="w-1 h-1 rounded-full opacity-30 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'var(--accent)' }} />
              <div className="w-1 h-1 rounded-full opacity-30 group-hover:opacity-100 transition-opacity duration-300 delay-75" style={{ background: 'var(--accent)' }} />
              <div className="w-1 h-1 rounded-full opacity-30 group-hover:opacity-100 transition-opacity duration-300 delay-150" style={{ background: 'var(--accent)' }} />
            </div>
          </div>
        )}

        {/* Response console */}
        {maximizedPanel !== "request" && (
          <div className="overflow-hidden min-h-0 min-w-0 flex-1">
            <ResponsePanel
              response={tabToRender.response}
              isLoading={tabToRender.isLoading}
              error={tabToRender.error}
              testResults={tabToRender.testResults}
              isMaximized={maximizedPanel === "response"}
              onToggleMaximize={() => setMaximizedPanel(p => p === "response" ? null : "response")}
              history={history}
              onToast={addToast}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans relative" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="flex flex-col lg:flex-row w-full h-full">
        
        {/* Left column: sidebar */}
        <div className={`transition-all duration-300 ease-in-out flex-shrink-0 ${isSidebarOpen ? 'w-64 lg:w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
          <Sidebar
            onSelectRequest={loadRequestIntoForm}
            history={history}
            userCollections={userCollections}
            onClearHistory={handleClearHistory}
            apiKey={apiKey}
            onChangeApiKey={setApiKey}
            baseUrl={baseUrl}
            onChangeBaseUrl={setBaseUrl}
            projectId={globalProjectId}
            onChangeProjectId={setGlobalProjectId}
            activeRequestId={activeTab?.requestId}
            activeHistoryId={activeTab.historyId}
            onSelectHistoryItem={handleSelectHistoryItem}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            appView={appView}
            onChangeAppView={setAppView}
          />
        </div>

        {/* Right column: main workspace */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative animation-fade-in" style={{ background: 'var(--bg-secondary)' }}>
          {/* Main Toggle Content */}
          {appView === 'webhooks' ? (
            <WebhookSimulator onToast={addToast} />
          ) : (
            <>
              {/* Dashboard Header Panel */}
              <header className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 select-none relative" style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-primary)' }}>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                    className="p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                    style={{ color: 'var(--text-secondary)' }}
                    title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              >
                {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
              </button>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }} id="header-request-name">
                    {activeTab.name}
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)' }}>
                    LIVE
                  </span>
                </div>
                <p className="text-xs truncate max-w-lg mt-1" style={{ color: 'var(--text-tertiary)' }} id="header-request-desc">
                  {activeTab.description || "Select an endpoint from the sidebar or create a custom request."}
                </p>
              </div>
            </div>

            {/* Live Session Metrics + Theme Toggle */}
            <div className="flex items-center gap-3">
              {rateLimit && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }} title="API Rate Limit Remaining">
                  <Activity size={13} style={{ color: Number(rateLimit.remaining) < 50 ? 'var(--error)' : 'var(--info)' }} />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wider leading-none" style={{ color: 'var(--text-tertiary)' }}>Rate Limit</span>
                    <span className="text-xs font-bold font-mono leading-tight" style={{ color: Number(rateLimit.remaining) < 50 ? 'var(--error)' : 'var(--text-primary)' }}>
                      {rateLimit.remaining} <span className="opacity-50 text-[10px]">/ {rateLimit.limit}</span>
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }}>
                <Activity size={13} style={{ color: 'var(--accent)' }} />
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-wider leading-none" style={{ color: 'var(--text-tertiary)' }}>Sent</span>
                  <span className="text-xs font-bold font-mono leading-tight" style={{ color: 'var(--text-primary)' }}>{totalSent}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }}>
                <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-wider leading-none" style={{ color: 'var(--text-tertiary)' }}>Success</span>
                  <span className="text-xs font-bold font-mono leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {totalSent > 0 ? `${successRate}%` : "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }}>
                <Clock size={13} style={{ color: 'var(--warning)' }} />
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-wider leading-none" style={{ color: 'var(--text-tertiary)' }}>Latency</span>
                  <span className="text-xs font-bold font-mono leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {avgLatency > 0 ? `${avgLatency}ms` : "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Environment Selector */}
                <div className="relative">
                  <button
                    onClick={() => setIsEnvMenuOpen(!isEnvMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer hover:bg-black/10 dark:hover:bg-white/10"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', color: 'var(--text-secondary)' }}
                  >
                    <span className="text-xs font-bold truncate max-w-[100px]">
                      {activeEnvironmentId ? environments.find(e => e.id === activeEnvironmentId)?.name : "No Environment"}
                    </span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isEnvMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isEnvMenuOpen && (
                    <div 
                      className="absolute right-0 top-[calc(100%+8px)] w-48 rounded-lg shadow-xl py-2 z-50 animation-fade-in border flex flex-col"
                      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
                    >
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Select Environment</div>
                      <button 
                        onClick={() => { setActiveEnvironmentId(null); setIsEnvMenuOpen(false); }}
                        className="text-left px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between"
                        style={{ color: activeEnvironmentId === null ? 'var(--accent)' : 'var(--text-primary)' }}
                      >
                        No Environment
                        {activeEnvironmentId === null && <CheckCircle2 size={12} />}
                      </button>
                      {environments.map(env => (
                        <button 
                          key={env.id}
                          onClick={() => { setActiveEnvironmentId(env.id); setIsEnvMenuOpen(false); }}
                          className="text-left px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between truncate"
                          style={{ color: activeEnvironmentId === env.id ? 'var(--accent)' : 'var(--text-primary)' }}
                        >
                          {env.name}
                          {activeEnvironmentId === env.id && <CheckCircle2 size={12} />}
                        </button>
                      ))}
                      <div className="h-px w-full my-1" style={{ background: 'var(--border-primary)' }} />
                      <button 
                        onClick={() => { setIsEnvManagerOpen(true); setIsEnvMenuOpen(false); }}
                        className="text-left px-3 py-2 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        Manage Environments...
                      </button>
                    </div>
                  )}
                </div>

                {/* Layout & Theme Toggles */}
                <button
                  onClick={() => setLayoutMode(prev => prev === 'vertical' ? 'horizontal' : 'vertical')}
                  className="p-2.5 rounded-lg transition-all cursor-pointer hover:bg-black/10 dark:hover:bg-white/10"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', color: 'var(--text-secondary)' }}
                  title={`Switch to ${layoutMode === 'vertical' ? 'Side-by-Side' : 'Top-Bottom'} layout`}
                >
                  {layoutMode === 'vertical' ? <LayoutGrid size={15} /> : <LayoutTemplate size={15} />}
                </button>
                <button
                  onClick={toggleTheme}
                  className="p-2.5 rounded-lg transition-all cursor-pointer hover:bg-black/10 dark:hover:bg-white/10"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', color: 'var(--text-secondary)' }}
                  title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                  id="btn-theme-toggle"
                >
                  {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                </button>
              </div>
            </div>
          </header>

          {/* Workspace Tabs */}
          <div className="relative pt-3 px-4 pb-2" style={{ background: 'var(--bg-primary)' }}>
            {/* Scroll mask for tabs */}
            <div className="absolute left-4 top-0 bottom-0 w-8 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, var(--bg-primary), transparent)' }} />
            <div className="absolute right-4 top-0 bottom-0 w-8 z-10 pointer-events-none" style={{ background: 'linear-gradient(to left, var(--bg-primary), transparent)' }} />
            
            <div ref={tabsContainerRef} className="flex flex-nowrap overflow-x-auto hide-scrollbar gap-2 select-none" style={{ scrollBehavior: 'smooth' }}>
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                const isSplitActive = tab.id === splitViewTabId;
                const isAnyActive = isActive || isSplitActive;
                return (
                  <div
                    key={tab.id}
                    data-tab-id={tab.id}
                    onClick={() => handleTabSelect(tab.id)}
                    onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
                    className={`group relative flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer flex-shrink-0 border ${isSplitActive && !isActive ? 'opacity-90' : ''}`}
                    style={{
                      background: isAnyActive ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                      color: isActive ? 'var(--accent)' : (isSplitActive ? 'var(--text-primary)' : 'var(--text-tertiary)'),
                      borderColor: isActive ? 'var(--accent)' : (isSplitActive ? 'var(--text-primary)' : 'var(--border-secondary)'),
                      boxShadow: isActive ? 'var(--shadow-glow)' : 'var(--shadow-sm)'
                    }}
                  >
                    <span className={`text-[9px] font-mono px-1 py-0.5 rounded-full font-bold w-10 text-center flex-shrink-0 ${tab.method === "GET" ? "method-get" : tab.method === "POST" ? "method-post" : tab.method === "PUT" ? "method-put" : tab.method === "DELETE" ? "method-delete" : "method-patch"}`}>
                      {tab.method}
                    </span>
                    <span className="max-w-[120px] truncate">{tab.name}</span>
                    
                    {!isActive && !isSplitActive && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSplitViewTabId(tab.id); }} 
                        className="p-0.5 ml-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" 
                        style={{ color: 'var(--text-tertiary)' }}
                        title="Split Right"
                      >
                        <Columns size={12} />
                      </button>
                    )}

                    <button onClick={(e) => closeTab(tab.id, e)} className="p-0.5 ml-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-tertiary)' }} title="Close Tab">
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
              <button onClick={createTab} className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer border flex-shrink-0 hover:brightness-110" style={{ background: 'transparent', color: 'var(--text-tertiary)', borderColor: 'var(--border-secondary)' }}>
                + New
              </button>
              <button onClick={() => setIsCurlModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors cursor-pointer border flex-shrink-0 hover:bg-black/5 dark:hover:bg-white/5" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderColor: 'var(--border-secondary)' }}>
                Import cURL
              </button>
              <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors cursor-pointer border flex-shrink-0 hover:bg-black/5 dark:hover:bg-white/5" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderColor: 'var(--border-secondary)' }}>
                Data
              </button>
            </div>
          </div>

          {/* Context Menu for Tabs */}
          {tabContextMenu && (
            <div 
              className="fixed z-50 rounded-lg shadow-xl py-1 flex flex-col min-w-[150px] animation-fade-in text-xs font-medium border"
              style={{ 
                top: tabContextMenu.y, 
                left: tabContextMenu.x, 
                background: 'var(--bg-secondary)', 
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)'
              }}
            >
              <button 
                onClick={() => { closeTab(tabContextMenu.id, { stopPropagation: () => {} } as any); setTabContextMenu(null); }}
                className="text-left px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Close Tab
              </button>
              <button 
                onClick={() => { setSplitViewTabId(tabContextMenu.id); setTabContextMenu(null); }}
                className="text-left px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Split Right
              </button>
              <button 
                onClick={() => { closeOtherTabs(tabContextMenu.id); setTabContextMenu(null); }}
                className="text-left px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Close Other Tabs
              </button>
              <button 
                onClick={() => { closeAllTabs(); setTabContextMenu(null); }}
                className="text-left px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ color: 'var(--error)' }}
              >
                Close All Tabs
              </button>
            </div>
          )}

          {/* Core Sandbox Splitscreen Area */}
          <div className="flex-1 flex w-full h-full overflow-hidden" style={{ borderTop: '1px solid var(--border-primary)' }}>
            {/* Primary Tab Workspace */}
            <div className="flex flex-col h-full overflow-hidden min-w-0" style={{ width: splitViewTabId && tabs.some(t => t.id === splitViewTabId) ? `${splitPaneRatio}%` : '100%' }}>
               {renderTabWorkspace(activeTabId)}
            </div>
            
            {/* Secondary Tab Workspace (if split view) */}
            {splitViewTabId && tabs.some(t => t.id === splitViewTabId) && (
              <>
                <div 
                  className="w-1 cursor-col-resize hover:w-2 transition-all flex flex-col justify-center items-center group relative z-20" 
                  style={{ background: 'var(--border-primary)' }} 
                  onMouseDown={handleSplitDragStart} 
                  title="Drag to resize split view"
                >
                  <div className="w-1 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'var(--accent)' }} />
                </div>
                <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative">
                   <button
                     onClick={() => setSplitViewTabId(null)}
                     className="absolute top-2 right-4 z-10 p-1.5 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                     style={{ color: 'var(--text-primary)' }}
                     title="Close Split View"
                   >
                     <X size={14} />
                   </button>
                   {renderTabWorkspace(splitViewTabId)}
                </div>
              </>
            )}
          </div>
          </>
          )}
        </main>
      </div>

      {/* Toast Notifications Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animation-fade-in text-sm font-semibold pointer-events-auto"
            style={{ 
              background: t.type === 'error' ? 'var(--error)' : t.type === 'success' ? 'var(--success)' : 'var(--bg-tertiary)',
              color: t.type === 'error' || t.type === 'success' ? '#fff' : 'var(--text-primary)',
              border: t.type === 'info' ? '1px solid var(--border-secondary)' : 'none'
            }}
          >
            {t.type === 'success' ? <CheckCircle2 size={16} /> : t.type === 'error' ? <Activity size={16} /> : <Clock size={16} />}
            {t.message}
          </div>
        ))}
      </div>

      <EnvironmentManager 
        isOpen={isEnvManagerOpen}
        onClose={() => setIsEnvManagerOpen(false)}
        environments={environments}
        onChangeEnvironments={setEnvironments}
        activeEnvironmentId={activeEnvironmentId}
        onChangeActiveEnvironment={setActiveEnvironmentId}
      />

      <CurlImportModal
        isOpen={isCurlModalOpen}
        onClose={() => setIsCurlModalOpen(false)}
        onImport={importCurlTab}
      />

      <ExportImportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExportData}
        onImport={handleImportData}
      />
    </div>
  );
}
