import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Webhook, Key, Link as LinkIcon, RefreshCw, CheckCircle2, AlertCircle, 
  Globe, Code2, RotateCcw, HelpCircle, ChevronDown, BookOpen, X, Copy, Plus, 
  Trash2, Save, History, Clock, ArrowDownToLine, ArrowUpRight, RadioTower, 
  Search, SlidersHorizontal, Settings, Download, Check, ShieldAlert, FileCode, CheckSquare,
  BarChart4, ArrowRightLeft, Maximize2, ShieldCheck, CheckSquare as CheckboxIcon, Zap,
  Eye, EyeOff, Lock, Unlock, Edit3
} from 'lucide-react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { generateWebhookSignature } from '../utils/crypto';
import { WebhookEventTemplate, webhookTemplates } from '../data/webhooks';
import { JsonTreeView } from './JsonTreeView';

interface WebhookSimulatorProps {
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface WebhookPreset {
  id: string;
  name: string;
  payload: string;
  headers: {key: string, value: string}[];
  event: string;
}

export const WebhookSimulator: React.FC<WebhookSimulatorProps> = ({ onToast }) => {
  // Sender States
  const [targetUrl, setTargetUrl] = useState(() => localStorage.getItem("orbit_webhook_url") || '');
  const [secret, setSecret] = useState(() => localStorage.getItem("orbit_webhook_secret") || '');
  const [selectedEvent, setSelectedEvent] = useState<string>(() => localStorage.getItem("orbit_webhook_event") || webhookTemplates[0].type);
  const [payload, setPayload] = useState<string>(() => {
    const saved = localStorage.getItem("orbit_webhook_payload");
    if (saved) return saved;
    const template = webhookTemplates.find(t => t.type === (localStorage.getItem("orbit_webhook_event") || webhookTemplates[0].type));
    return template ? JSON.stringify(template.payload, null, 2) : '';
  });
  const [customHeaders, setCustomHeaders] = useState<{key: string, value: string}[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("orbit_webhook_headers") || "[]");
    } catch { return []; }
  });
  const [showHeaders, setShowHeaders] = useState(false);
  const [autoInject, setAutoInject] = useState(() => {
    return localStorage.getItem("orbit_webhook_autoinject") !== "false";
  });
  const [isSending, setIsSending] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [fireCount, setFireCount] = useState<number>(1);
  const [history, setHistory] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem("orbit_webhook_history") || "[]"); } catch { return []; }
  });
  const [presets, setPresets] = useState<WebhookPreset[]>(() => {
    try { return JSON.parse(localStorage.getItem("orbit_webhook_presets") || "[]"); } catch { return []; }
  });
  
  const [showHistory, setShowHistory] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [presetName, setPresetName] = useState('');
  
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [mode, setMode] = useState<"sender" | "listener">("listener"); // Default to Listener

  // Listener States
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [activeEndpointId, setActiveEndpointId] = useState<string>("default");
  const [listenedEvents, setListenedEvents] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [showAllEndpointsWebhooks, setShowAllEndpointsWebhooks] = useState(true);

  // Inspector & Layout Settings
  const [activeTab, setActiveTab] = useState<"request" | "response">("request");
  const [bodyViewerMode, setBodyViewerMode] = useState<"formatted" | "raw">("formatted");
  const [autoSelectLatest, setAutoSelectLatest] = useState(true);
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);
  const [copiedHeaderKey, setCopiedHeaderKey] = useState<string | null>(null);
  const [isHeadersExpanded, setIsHeadersExpanded] = useState(false);

  // Compare Mode
  const [compareMode, setCompareMode] = useState(false);
  const [comparedEventIds, setComparedEventIds] = useState<string[]>([]);

  // Logs list vs Analytics Dashboard
  const [activeLogView, setActiveLogView] = useState<"logs" | "analytics">("logs");

  // Fullscreen json modal
  const [isFullscreenJson, setIsFullscreenJson] = useState(false);

  // Forwarding Webhook
  const [isForwardingModalOpen, setIsForwardingModalOpen] = useState(false);
  const [forwardTargetUrl, setForwardTargetUrl] = useState("");
  const [isForwarding, setIsForwarding] = useState(false);

  // Endpoint configuration states
  const [isConfiguringEndpoint, setIsConfiguringEndpoint] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCustomPath, setEditCustomPath] = useState("");
  const [editSecretKey, setEditSecretKey] = useState("");
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<number>(200);
  const [editDelay, setEditDelay] = useState<number>(0);
  const [editHeaders, setEditHeaders] = useState<{ key: string; value: string }[]>([]);
  const [editBody, setEditBody] = useState("");
  const [editBodyError, setEditBodyError] = useState<string | null>(null);
  
  // Custom Base Host / Locking States
  const [customBaseUrl, setCustomBaseUrl] = useState(() => localStorage.getItem("orbit_webhook_custom_base") || "");
  const [isBaseUrlLocked, setIsBaseUrlLocked] = useState(() => localStorage.getItem("orbit_webhook_lock_base") === "true");
  const [showHostConfigModal, setShowHostConfigModal] = useState(false);

  useEffect(() => { localStorage.setItem("orbit_webhook_custom_base", customBaseUrl); }, [customBaseUrl]);
  useEffect(() => { localStorage.setItem("orbit_webhook_lock_base", String(isBaseUrlLocked)); }, [isBaseUrlLocked]);
  
  // Advanced Features Edit States
  const [editChaosEnabled, setEditChaosEnabled] = useState(false);
  const [editChaosJitterMin, setEditChaosJitterMin] = useState(0);
  const [editChaosJitterMax, setEditChaosJitterMax] = useState(0);
  const [editChaosFailureRate, setEditChaosFailureRate] = useState(0);
  const [editChaosRateLimit, setEditChaosRateLimit] = useState(0);
  const [editRelayTargets, setEditRelayTargets] = useState<string[]>([]);
  const [editJsonSchema, setEditJsonSchema] = useState("");
  const [editJsonSchemaError, setEditJsonSchemaError] = useState<string | null>(null);
  
  const [isSavingEndpoint, setIsSavingEndpoint] = useState(false);

  // Public Tunneling States
  const [tunnelUrl, setTunnelUrl] = useState("");
  const [isTunnelActive, setIsTunnelActive] = useState(false);
  const [isConnectingTunnel, setIsConnectingTunnel] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const [isPathDropdownOpen, setIsPathDropdownOpen] = useState(false);
  const pathDropdownRef = useRef<HTMLDivElement>(null);

  // Sync state helpers
  const fetchEndpoints = async () => {
    try {
      const res = await fetch("/api/webhooks/endpoints");
      if (res.ok) {
        const data = await res.json();
        setEndpoints(data);
        const active = data.find((e: any) => e.id === activeEndpointId) || data[0];
        if (active) {
          setEditName(active.name);
          setEditCustomPath(active.customPath || active.id || "");
          setEditSecretKey(active.secretKey || "");
          setEditStatus(active.responseStatus);
          setEditDelay(active.responseDelay);
          setEditHeaders(active.responseHeaders || []);
          setEditBody(active.responseBody);
          setEditBodyError(null);
          
          setEditChaosEnabled(!!active.chaosEnabled);
          setEditChaosJitterMin(active.chaosJitterMin || 0);
          setEditChaosJitterMax(active.chaosJitterMax || 0);
          setEditChaosFailureRate(active.chaosFailureRate || 0);
          setEditChaosRateLimit(active.chaosRateLimit || 0);
          setEditRelayTargets(active.relayTargets || []);
          setEditJsonSchema(active.jsonSchema || "");
          setEditJsonSchemaError(null);
        }
      }
    } catch (e) {
      console.error("Failed to fetch endpoints", e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/webhooks/history");
      if (res.ok) {
        const data = await res.json();
        setListenedEvents(data);
        if (data.length > 0 && !selectedEventId) {
          setSelectedEventId(data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  };

  const fetchTunnelStatus = async () => {
    try {
      const res = await fetch("/api/webhooks/tunnel");
      if (res.ok) {
        const data = await res.json();
        setIsTunnelActive(data.active);
        setTunnelUrl(data.url);
      }
    } catch (e) {}
  };

  // Switch modes or initialize
  useEffect(() => {
    if (mode === "listener") {
      fetchEndpoints();
      fetchHistory();
      fetchTunnelStatus();
    }
  }, [mode]);

  // Sync edits when active endpoint changes
  useEffect(() => {
    const active = endpoints.find((e: any) => e.id === activeEndpointId);
    if (active) {
      setEditName(active.name);
      setEditCustomPath(active.customPath || active.id || "");
      setEditSecretKey(active.secretKey || "");
      setEditStatus(active.responseStatus);
      setEditDelay(active.responseDelay);
      setEditHeaders(active.responseHeaders || []);
      setEditBody(active.responseBody);
      setEditBodyError(null);
      
      setEditChaosEnabled(!!active.chaosEnabled);
      setEditChaosJitterMin(active.chaosJitterMin || 0);
      setEditChaosJitterMax(active.chaosJitterMax || 0);
      setEditChaosFailureRate(active.chaosFailureRate || 0);
      setEditChaosRateLimit(active.chaosRateLimit || 0);
      setEditRelayTargets(active.relayTargets || []);
      setEditJsonSchema(active.jsonSchema || "");
      setEditJsonSchemaError(null);
    }
  }, [activeEndpointId, endpoints]);

  // Real-time Event Streaming
  useEffect(() => {
    let eventSource: EventSource | null = null;
    
    if (mode === "listener" && isListening) {
      eventSource = new EventSource('/api/webhooks/stream');
      
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          setListenedEvents(prev => {
            const updated = [parsed, ...prev];
            if (autoSelectLatest) {
              setSelectedEventId(parsed.id);
            }
            return updated;
          });
        } catch(e) {}
      };
      
      eventSource.onerror = (e) => {
        console.error("SSE Error", e);
      };
    }
    
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [mode, isListening, autoSelectLatest]);

  // LocalStorage Persist (Sender settings)
  useEffect(() => { localStorage.setItem("orbit_webhook_url", targetUrl); }, [targetUrl]);
  useEffect(() => { localStorage.setItem("orbit_webhook_secret", secret); }, [secret]);
  useEffect(() => { localStorage.setItem("orbit_webhook_event", selectedEvent); }, [selectedEvent]);
  useEffect(() => { localStorage.setItem("orbit_webhook_payload", payload); }, [payload]);
  useEffect(() => { localStorage.setItem("orbit_webhook_headers", JSON.stringify(customHeaders)); }, [customHeaders]);
  useEffect(() => { localStorage.setItem("orbit_webhook_autoinject", String(autoInject)); }, [autoInject]);
  useEffect(() => { localStorage.setItem("orbit_webhook_history", JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem("orbit_webhook_presets", JSON.stringify(presets)); }, [presets]);

  // JSON validity checks
  useEffect(() => {
    try {
      JSON.parse(payload);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(e.message);
    }
  }, [payload]);

  // Click outside path dropdown hook
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pathDropdownRef.current && !pathDropdownRef.current.contains(event.target as Node)) {
        setIsPathDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Exposed Hook URL generator
  const getExposedUrl = (idOrEndpoint?: any) => {
    let targetEndpoint = typeof idOrEndpoint === 'object' ? idOrEndpoint : endpoints.find(e => e.id === idOrEndpoint || (e.customPath && e.customPath === idOrEndpoint));
    if (!targetEndpoint) {
      targetEndpoint = endpoints.find(e => e.id === activeEndpointId) || endpoints[0];
    }

    const pathSlug = targetEndpoint?.customPath || targetEndpoint?.id || "default";
    const pathSuffix = pathSlug === "default" ? "" : `/${pathSlug}`;
    const fullPath = `/api/webhooks/catch${pathSuffix}`;

    if (customBaseUrl && customBaseUrl.trim()) {
      const cleanBase = customBaseUrl.trim().replace(/\/+$/, "");
      return `${cleanBase}${fullPath}`;
    }

    if (isTunnelActive && tunnelUrl) {
      const cleanTunnel = tunnelUrl.trim().replace(/\/+$/, "");
      return `${cleanTunnel}${fullPath}`;
    }

    const origin = window.location.origin;
    return `${origin}${fullPath}`;
  };

  const generateRandomEndpointKey = () => {
    const randKey = "whsec_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setEditSecretKey(randKey);
    handleQuickUpdateEndpointField('secretKey', randKey);
    onToast("Generated & saved new Endpoint Key!", "info");
  };

  const handleQuickUpdateEndpointField = async (field: 'customPath' | 'secretKey' | 'name', value: string) => {
    const active = endpoints.find(e => e.id === activeEndpointId);
    if (!active) return;
    try {
      const res = await fetch(`/api/webhooks/endpoints/${activeEndpointId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...active,
          [field]: value
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setEndpoints(prev => prev.map(e => e.id === activeEndpointId ? updated : e));
      }
    } catch (e) {}
  };

  // Endpoint API Actions
  const handleCreateEndpoint = async () => {
    try {
      const count = endpoints.length + 1;
      const res = await fetch("/api/webhooks/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Custom Endpoint ${count}`,
          customPath: `endpoint-${count}`,
          secretKey: "",
          responseStatus: 200,
          responseDelay: 0,
          responseBody: JSON.stringify({ success: true, message: "Webhook simulator response" }, null, 2),
          responseHeaders: [{ key: "Content-Type", value: "application/json" }],
          chaosEnabled: false,
          chaosJitterMin: 0,
          chaosJitterMax: 0,
          chaosFailureRate: 0,
          chaosRateLimit: 0,
          relayTargets: [],
          jsonSchema: ""
        })
      });
      if (res.ok) {
        const newEp = await res.json();
        setEndpoints(prev => [...prev, newEp]);
        setActiveEndpointId(newEp.id);
        setIsConfiguringEndpoint(true);
        onToast(`Endpoint "${newEp.name}" created`, 'success');
      }
    } catch (e) {
      onToast('Failed to create endpoint', 'error');
    }
  };

  const handleSaveEndpoint = async () => {
    if (editBodyError) {
      onToast('Cannot save invalid JSON response payload', 'error');
      return;
    }
    if (editJsonSchemaError) {
      onToast('Cannot save invalid JSON validation schema', 'error');
      return;
    }
    setIsSavingEndpoint(true);
    try {
      const res = await fetch(`/api/webhooks/endpoints/${activeEndpointId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          customPath: editCustomPath,
          secretKey: editSecretKey,
          responseStatus: editStatus,
          responseDelay: editDelay,
          responseHeaders: editHeaders,
          responseBody: editBody,
          chaosEnabled: editChaosEnabled,
          chaosJitterMin: editChaosJitterMin,
          chaosJitterMax: editChaosJitterMax,
          chaosFailureRate: editChaosFailureRate,
          chaosRateLimit: editChaosRateLimit,
          relayTargets: editRelayTargets.filter(t => t.trim() !== ""),
          jsonSchema: editJsonSchema
        })
      });
      if (res.ok) {
        const updatedEp = await res.json();
        setEndpoints(prev => prev.map(e => e.id === activeEndpointId ? updatedEp : e));
        setIsConfiguringEndpoint(false);
        onToast(`Endpoint settings saved`, 'success');
      } else {
        const err = await res.json();
        onToast(`Error: ${err.error || 'Failed to save settings'}`, 'error');
      }
    } catch (e) {
      onToast('Failed to save endpoint settings', 'error');
    } finally {
      setIsSavingEndpoint(false);
    }
  };

  const handleDeleteEndpoint = async (idToDelete: string) => {
    if (idToDelete === "default") {
      onToast('Cannot delete default endpoint', 'error');
      return;
    }
    if (!window.confirm("Delete this endpoint? Triggering webhooks to this URL path will fallback to default settings.")) {
      return;
    }
    try {
      const res = await fetch(`/api/webhooks/endpoints/${idToDelete}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setEndpoints(prev => prev.filter(e => e.id !== idToDelete));
        setActiveEndpointId("default");
        onToast('Endpoint deleted successfully', 'info');
      }
    } catch (e) {
      onToast('Failed to delete endpoint', 'error');
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Clear all captured webhook history from the dashboard?")) {
      return;
    }
    try {
      const res = await fetch("/api/webhooks/history", {
        method: "DELETE"
      });
      if (res.ok) {
        setListenedEvents([]);
        setSelectedEventId(null);
        setComparedEventIds([]);
        onToast('Webhook logs cleared', 'info');
      }
    } catch (e) {
      onToast('Failed to clear logs', 'error');
    }
  };

  // Replay Webhook Event
  const handleReplayWebhook = async (evt: any) => {
    onToast(`Replaying event ${evt.id}...`, 'info');
    try {
      const headers = { ...evt.headers };
      delete headers['host'];
      delete headers['content-length'];
      delete headers['connection'];
      delete headers['accept-encoding'];

      const res = await fetch("/api/proxy", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: evt.url,
          method: evt.method,
          headers,
          body: typeof evt.body === 'object' ? JSON.stringify(evt.body) : String(evt.body)
        })
      });

      const jsonRes = await res.json();
      if (res.ok) {
        onToast(`Webhook replayed successfully! Status returned: ${jsonRes.status}`, 'success');
      } else {
        onToast(`Replay returned error: ${jsonRes.error || res.statusText}`, 'error');
      }
    } catch (err: any) {
      onToast(`Failed to replay webhook: ${err.message}`, 'error');
    }
  };

  // Forward Webhook
  const handleForwardWebhook = async () => {
    if (!forwardTargetUrl.trim() || !selectedEventDetails) return;
    
    setIsForwarding(true);
    onToast(`Forwarding payload...`, 'info');
    try {
      const headers = { ...selectedEventDetails.headers };
      delete headers['host'];
      delete headers['content-length'];
      delete headers['connection'];
      delete headers['accept-encoding'];

      const res = await fetch("/api/proxy", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: forwardTargetUrl.trim(),
          method: selectedEventDetails.method,
          headers,
          body: typeof selectedEventDetails.body === 'object' ? JSON.stringify(selectedEventDetails.body) : String(selectedEventDetails.body)
        })
      });

      const jsonRes = await res.json();
      if (res.ok) {
        onToast(`Webhook forwarded successfully! Status: ${jsonRes.status}`, 'success');
        setIsForwardingModalOpen(false);
        setForwardTargetUrl("");
      } else {
        onToast(`Forward failed with status ${jsonRes.status}: ${jsonRes.error || 'Unknown error'}`, 'error');
      }
    } catch (err: any) {
      onToast(`Forward failed: ${err.message}`, 'error');
    } finally {
      setIsForwarding(false);
    }
  };

  // Public Tunnel Toggle Handler
  const handleToggleTunnel = async () => {
    setIsConnectingTunnel(true);
    try {
      if (isTunnelActive) {
        const res = await fetch("/api/webhooks/tunnel", { method: "DELETE" });
        if (res.ok) {
          setIsTunnelActive(false);
          setTunnelUrl("");
          onToast("Public HTTPS tunnel closed", "info");
        }
      } else {
        onToast("Establishing public tunnel connection...", "info");
        const res = await fetch("/api/webhooks/tunnel", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          setIsTunnelActive(true);
          setTunnelUrl(data.url);
          onToast("Public HTTPS tunnel established!", "success");
        } else {
          const err = await res.json();
          onToast(err.error || "Failed to start tunnel", "error");
        }
      }
    } catch (e) {
      onToast("Error connecting to tunnel service", "error");
    } finally {
      setIsConnectingTunnel(false);
    }
  };

  // OptimaOrbit Platform Integration Handlers
  const handleRegisterPlatformWebhook = async () => {
    if (!isTunnelActive || !tunnelUrl) {
      onToast("Please click 'Expose Publicly' first to generate a public HTTPS tunnel URL!", "error");
      return;
    }
    const key = localStorage.getItem("orbit_api_key") || "orb_live_pGwopgmud2O8KPLgk0My1yOgxYZRpBLb0U51Se";
    const targetTunnelUrl = `${tunnelUrl}${activeEndpointId === 'default' ? '/api/webhooks/catch/default' : `/api/webhooks/catch/${activeEndpointId}`}`;
    
    onToast("Registering webhook listener on OptimaOrbit...", "info");
    try {
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://api.dev-orbit.com/api/v1/ext/webhooks",
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            url: targetTunnelUrl,
            description: "Orbit API Tester Listener",
            event_types: ["task.created", "task.updated", "task.status_changed", "ticket.created", "order.created", "comment.created"]
          })
        })
      });
      const resData = await res.json();
      if (res.ok && resData.status < 300) {
        onToast("Successfully registered endpoint on OptimaOrbit platform!", "success");
        const endpointObj = resData.data?.endpoint || resData.data;
        if (endpointObj?.id) {
          localStorage.setItem("orbit_platform_webhook_id", endpointObj.id);
        }
      } else {
        const msg = resData.data?.error?.message || resData.data?.message || resData.error || "Failed to register";
        onToast(`Platform Registration: ${msg}`, "error");
      }
    } catch (err: any) {
      onToast(`Error registering on platform: ${err.message}`, "error");
    }
  };

  const handleTriggerPlatformTestWebhook = async () => {
    const key = localStorage.getItem("orbit_api_key") || "orb_live_pGwopgmud2O8KPLgk0My1yOgxYZRpBLb0U51Se";
    const webhookId = localStorage.getItem("orbit_platform_webhook_id") || "34e148d4-8f2e-479e-891c-585fa8ba98b1";
    onToast("Triggering test webhook from OptimaOrbit platform...", "info");
    try {
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `https://api.dev-orbit.com/api/v1/ext/webhooks/${webhookId}/test`,
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json"
          }
        })
      });
      const resData = await res.json();
      if (res.ok && resData.status < 300) {
        onToast("OptimaOrbit test webhook queued & dispatched to your listener!", "success");
      } else {
        const msg = resData.data?.error?.message || resData.error || "Failed to trigger test";
        onToast(`Trigger test: ${msg}`, "error");
      }
    } catch (err: any) {
      onToast(`Trigger error: ${err.message}`, "error");
    }
  };

  // Session Package Export/Import
  const handleExportSession = () => {
    try {
      const sessionData = {
        endpoints,
        webhookHistory: listenedEvents
      };
      const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `webhook_simulator_session_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onToast("Session exported successfully!", "success");
    } catch (e) {
      onToast("Failed to export session data", "error");
    }
  };

  const handleImportSession = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.endpoints || !parsed.webhookHistory) {
          onToast("Invalid session file package", "error");
          return;
        }
        
        const res = await fetch("/api/webhooks/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed)
        });
        
        if (res.ok) {
          const data = await res.json();
          setEndpoints(parsed.endpoints);
          setListenedEvents(parsed.webhookHistory);
          if (parsed.webhookHistory.length > 0) {
            setSelectedEventId(parsed.webhookHistory[0].id);
          }
          onToast(`Session imported successfully! Loaded ${data.endpointsCount} endpoints and ${data.historyCount} events.`, "success");
        } else {
          onToast("Failed to import session endpoints to backend server", "error");
        }
      } catch (err: any) {
        onToast(`Failed to parse file: ${err.message}`, "error");
      }
    };
    reader.readAsText(file);
  };

  // Outbound Webhook dispatcher (Sender mode)
  const handleSend = async () => {
    if (!targetUrl) {
      onToast('Please enter a target webhook URL', 'error');
      return;
    }
    if (jsonError) {
      onToast('Cannot send invalid JSON payload', 'error');
      return;
    }
    
    setIsSending(true);
    setLastResponse(null);
    
    const runSingleDispatch = async () => {
      try {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const eventId = `evt_${Math.random().toString(36).substring(2, 15)}`;
        
        let finalPayload = payload;
        
        // Parse custom template fake variables (e.g. {{uuid}}, {{name}})
        finalPayload = finalPayload.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (match, tag) => {
          switch (tag.toLowerCase()) {
            case 'uuid':
              return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
              });
            case 'name':
              const names = ['Alice Smith', 'Bob Jones', 'Charlie Brown', 'Diana Prince', 'Evan Wright'];
              return names[Math.floor(Math.random() * names.length)];
            case 'email':
              const domains = ['example.com', 'test.com', 'orbit.io', 'mail.com'];
              const user = Math.random().toString(36).substring(2, 9);
              return `${user}@${domains[Math.floor(Math.random() * domains.length)]}`;
            case 'amount':
              return (Math.random() * 999 + 1).toFixed(2);
            case 'timestamp':
              return new Date().toISOString();
            case 'number':
              return Math.floor(Math.random() * 1000000).toString();
            default:
              return match;
          }
        });

        if (autoInject) {
          try {
            const parsed = JSON.parse(finalPayload);
            const now = new Date().toISOString();
            
            if (parsed.id) parsed.id = eventId;
            if (parsed.created_at) parsed.created_at = now;
            if (parsed.created) parsed.created = now;
            
            if (parsed.data && typeof parsed.data === 'object') {
               const d = parsed.data;
               const genUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                 const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                 return v.toString(16);
               });
               
               if (d.id) d.id = genUUID();
               if (d.created_at) d.created_at = now;
               if (d.updated_at) d.updated_at = now;
               if (d.completed_at && d.completed_at !== null) d.completed_at = now;
               
               if (d.project_id) d.project_id = genUUID();
               if (d.created_by) d.created_by = genUUID();
               if (d.assigned_to && d.assigned_to !== null) d.assigned_to = genUUID();
               
               if (d.task_identifier) {
                 d.task_identifier = `T-${Math.floor(Math.random() * 9000) + 1000}`;
               }
               if (d.title && typeof d.title === 'string' && d.title.includes('Simulated')) {
                 d.title = `Simulated Webhook Event ${Math.floor(Math.random() * 1000)}`;
               }
            }
            finalPayload = JSON.stringify(parsed, null, 2);
          } catch(e) {}
        }

        let signature = '';
        if (secret) {
          signature = await generateWebhookSignature(secret, timestamp, finalPayload);
        }
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Orbit-Event-Id': eventId,
          'Orbit-Event-Type': selectedEvent
        };
        
        customHeaders.forEach(h => {
          if (h.key && h.value) headers[h.key] = h.value;
        });
        
        if (signature) {
          headers['Orbit-Signature'] = `t=${timestamp},v1=${signature}`;
        }

        const startTime = performance.now();
        const res = await fetch("/api/proxy", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: targetUrl,
            method: 'POST',
            headers,
            body: finalPayload
          })
        });
        const endTime = performance.now();
        const jsonRes = await res.json();

        if (!res.ok) {
          throw new Error(jsonRes.message || jsonRes.error || "Proxy failed");
        }

        return {
          status: jsonRes.status,
          statusText: jsonRes.statusText,
          duration: Math.round(endTime - startTime),
          data: jsonRes.data,
          headers: jsonRes.headers,
          error: jsonRes.status >= 400,
          timestamp: new Date().toISOString(),
          requestPayload: finalPayload,
          requestHeaders: headers
        };
      } catch (err: any) {
        return {
          status: 0,
          statusText: 'Network Error',
          duration: 0,
          data: err.message,
          error: true,
          timestamp: new Date().toISOString(),
          requestPayload: payload,
          requestHeaders: {}
        };
      }
    };

    const dispatches = Array.from({ length: Math.min(fireCount, 20) }, () => runSingleDispatch());
    const results = await Promise.all(dispatches);
    
    const primaryResult = results[results.length - 1];
    setLastResponse(primaryResult);
    
    if (primaryResult.error) {
      onToast(`Webhook error: ${primaryResult.statusText}`, 'error');
    } else {
      onToast(`Dispatched ${fireCount} webhook(s) successfully`, 'success');
    }

    setHistory(prev => {
      const newHistory = [...results.reverse(), ...prev].slice(0, 50);
      return newHistory;
    });
    
    setIsSending(false);
  };

  // Helper to trigger loopback test mock webhook to local listener
  const handleTriggerTestWebhook = async () => {
    try {
      const target = isTunnelActive ? `${tunnelUrl}${activeEndpointId === 'default' ? '' : `/${activeEndpointId}`}` : getExposedUrl(activeEndpointId);
      const randomEvent = webhookTemplates[Math.floor(Math.random() * webhookTemplates.length)];
      
      const res = await fetch(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Orbit-Event-Type': randomEvent.type,
          'Orbit-Event-Id': `evt_mock_${Math.random().toString(36).substring(2, 9)}`,
          'User-Agent': 'WebhookSimulator/1.0-TestGenerator',
          'Authorization': 'Bearer sim_token_test_123xyz'
        },
        body: JSON.stringify(randomEvent.payload, null, 2)
      });
      if (res.ok) {
        onToast(`Mock webhook sent & captured successfully!`, 'success');
      } else {
        onToast(`Mock sent, but endpoint returned status ${res.status}`, 'info');
      }
    } catch (e) {
      onToast('Failed to trigger mock webhook', 'error');
    }
  };

  // Presets
  const savePreset = () => {
    if (!presetName.trim()) return;
    const newPreset: WebhookPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      payload,
      headers: customHeaders,
      event: selectedEvent
    };
    setPresets([newPreset, ...presets]);
    setPresetName('');
    setShowPresets(false);
    onToast(`Preset "${newPreset.name}" saved!`, 'success');
  };

  const loadPreset = (preset: WebhookPreset) => {
    setPayload(preset.payload);
    setCustomHeaders(preset.headers);
    setSelectedEvent(preset.event);
    setShowPresets(false);
    onToast(`Loaded preset "${preset.name}"`, 'success');
  };

  const deletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPresets(presets.filter(p => p.id !== id));
  };

  // Downloader utilities
  const handleDownloadPayload = (filename: string, content: string) => {
    try {
      const formatted = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
      const blob = new Blob([formatted], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      onToast('Payload downloaded', 'success');
    } catch (e) {
      onToast('Failed to download payload', 'error');
    }
  };

  const handleCopyText = (text: string, msg = 'Copied to clipboard') => {
    navigator.clipboard.writeText(text);
    onToast(msg, 'success');
  };

  // Response Editor validation/formatting
  const handleEditBodyChange = (val: string) => {
    setEditBody(val);
    if (!val.trim()) {
      setEditBodyError(null);
      return;
    }
    try {
      JSON.parse(val);
      setEditBodyError(null);
    } catch (err: any) {
      setEditBodyError(err.message);
    }
  };

  const handleFormatEditBody = () => {
    try {
      const parsed = JSON.parse(editBody);
      setEditBody(JSON.stringify(parsed, null, 2));
      setEditBodyError(null);
      onToast('Formatted JSON response body successfully', 'success');
    } catch (err: any) {
      onToast(`JSON format error: ${err.message}`, 'error');
    }
  };

  // Signature analyzer
  const analyzeAuthHeaders = (headers: Record<string, any>) => {
    const results: { type: string; title: string; value: string; details?: Record<string, string> }[] = [];
    
    const auth = headers['authorization'] || headers['Authorization'];
    if (auth) {
      if (auth.startsWith('Bearer ')) {
        results.push({
          type: 'bearer',
          title: 'Bearer Token Auth',
          value: 'Validated format',
          details: { Token: auth.substring(7) }
        });
      } else if (auth.startsWith('Basic ')) {
        try {
          const credentials = atob(auth.substring(6));
          const [username, password] = credentials.split(':');
          results.push({
            type: 'basic',
            title: 'Basic Auth Header',
            value: 'Decoded credentials',
            details: { Username: username, Password: '*'.repeat(password.length) }
          });
        } catch {
          results.push({
            type: 'basic',
            title: 'Basic Authentication',
            value: 'Invalid Base64 format',
            details: { Raw: auth }
          });
        }
      } else {
        results.push({
          type: 'other',
          title: 'Custom Authorization',
          value: auth
        });
      }
    }
    
    const sigHeaders = [
      { key: 'orbit-signature', label: 'Orbit Signature' },
      { key: 'stripe-signature', label: 'Stripe Signature' },
      { key: 'x-hub-signature-256', label: 'GitHub HMAC-SHA256' },
      { key: 'x-signature', label: 'Custom Signature' },
      { key: 'x-slack-signature', label: 'Slack Signature' }
    ];
    
    sigHeaders.forEach(sig => {
      const headerVal = headers[sig.key] || headers[sig.key.toLowerCase()] || headers[sig.key.toUpperCase()];
      if (headerVal) {
        const details: Record<string, string> = {};
        if (sig.key === 'orbit-signature' || sig.key === 'stripe-signature') {
          const parts = headerVal.split(',');
          parts.forEach((p: string) => {
            const [k, v] = p.split('=');
            if (k && v) {
              if (k === 't') {
                details['Timestamp (t)'] = `${v} (${new Date(parseInt(v) * 1000).toLocaleString()})`;
              } else if (k === 'v1') {
                details['HMAC Hash (v1)'] = v;
              } else {
                details[k] = v;
              }
            }
          });
        } else {
          details['Raw signature hash'] = headerVal;
        }
        
        results.push({
          type: 'signature',
          title: sig.label,
          value: sig.key,
          details
        });
      }
    });
    
    return results;
  };

  // Textarea keydown formats
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const value = target.value;

    if (e.key === 'Tab') {
      e.preventDefault();
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      setPayload(newValue);
      setTimeout(() => { target.selectionStart = target.selectionEnd = start + 2; }, 0);
      return;
    }

    const pairs: Record<string, string> = {
      '{': '}',
      '[': ']',
      '(': ')',
      '"': '"',
      "'": "'"
    };

    if (pairs[e.key]) {
      e.preventDefault();
      const closing = pairs[e.key];
      const newValue = value.substring(0, start) + e.key + closing + value.substring(end);
      setPayload(newValue);
      setTimeout(() => { target.selectionStart = target.selectionEnd = start + 1; }, 0);
      return;
    }

    if (e.key === 'Backspace' && start === end && start > 0) {
      const prevChar = value[start - 1];
      const nextChar = value[start];
      if (pairs[prevChar] === nextChar) {
        e.preventDefault();
        const newValue = value.substring(0, start - 1) + value.substring(end + 1);
        setPayload(newValue);
        setTimeout(() => { target.selectionStart = target.selectionEnd = start - 1; }, 0);
        return;
      }
    }

    if (e.key === 'Enter') {
       e.preventDefault();
       const beforeCursor = value.substring(0, start);
       const afterCursor = value.substring(end);
       const lines = beforeCursor.split('\n');
       const lastLine = lines[lines.length - 1];
       const match = lastLine.match(/^\s*/);
       let indent = match ? match[0] : '';
       
       if (lastLine.trim().endsWith('{') || lastLine.trim().endsWith('[')) {
         indent += '  ';
       }
       
       let insertString = '\n' + indent;
       let newCursorPos = start + insertString.length;
       
       if ((beforeCursor.endsWith('{') && afterCursor.startsWith('}')) ||
           (beforeCursor.endsWith('[') && afterCursor.startsWith(']'))) {
           
           const endIndent = match ? match[0] : '';
           insertString += '\n' + endIndent;
           const newValue = beforeCursor + insertString + afterCursor;
           setPayload(newValue);
           setTimeout(() => { target.selectionStart = target.selectionEnd = newCursorPos; }, 0);
           return;
       }
       
       const newValue = beforeCursor + insertString + afterCursor;
       setPayload(newValue);
       setTimeout(() => { target.selectionStart = target.selectionEnd = newCursorPos; }, 0);
       return;
    }
  };

  // Speed time indicator renderer
  const renderResponseTimeIndicator = (ms: number, showLabel = true) => {
    if (ms <= 100) {
      return (
        <span className="text-green-500 font-extrabold flex items-center gap-0.5" title="Fast Response Time">
          ⚡ {showLabel && "Fast"} ({ms}ms)
        </span>
      );
    } else if (ms >= 500) {
      return (
        <span className="text-amber-500 font-extrabold flex items-center gap-0.5" title="Slow Latency">
          🐢 {showLabel && "Slow"} ({ms}ms)
        </span>
      );
    } else {
      return (
        <span className="text-[var(--text-secondary)] font-extrabold flex items-center gap-0.5">
          {showLabel && "Normal"} ({ms}ms)
        </span>
      );
    }
  };

  // Filtered Events computed list
  const filteredEvents = listenedEvents.filter(evt => {
    if (!showAllEndpointsWebhooks && evt.endpointId !== activeEndpointId) {
      return false;
    }
    
    if (statusFilter !== "all") {
      const isSuccess = evt.responseStatus < 400;
      if (statusFilter === "success" && !isSuccess) return false;
      if (statusFilter === "failed" && isSuccess) return false;
      if (statusFilter === "2xx" && (evt.responseStatus < 200 || evt.responseStatus >= 300)) return false;
      if (statusFilter === "4xx" && (evt.responseStatus < 400 || evt.responseStatus >= 500)) return false;
      if (statusFilter === "5xx" && (evt.responseStatus < 500 || evt.responseStatus >= 600)) return false;
    }
    
    if (methodFilter !== "all" && evt.method !== methodFilter) {
      return false;
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const pathMatch = evt.path.toLowerCase().includes(query);
      const idMatch = evt.id.toLowerCase().includes(query);
      const methodMatch = evt.method.toLowerCase().includes(query);
      
      let bodyMatch = false;
      if (evt.body) {
        bodyMatch = typeof evt.body === 'object' 
          ? JSON.stringify(evt.body).toLowerCase().includes(query)
          : String(evt.body).toLowerCase().includes(query);
      }
      
      let headerMatch = false;
      if (evt.headers) {
        headerMatch = JSON.stringify(evt.headers).toLowerCase().includes(query);
      }
      
      return pathMatch || idMatch || methodMatch || bodyMatch || headerMatch;
    }
    
    return true;
  });

  // Analytics Dashboard Computations
  const totalCapturedCount = listenedEvents.length;
  const successCount = listenedEvents.filter(e => e.responseStatus < 400).length;
  const successRate = totalCapturedCount > 0 ? Math.round((successCount / totalCapturedCount) * 100) : 0;
  const averageLatency = totalCapturedCount > 0 ? Math.round(listenedEvents.reduce((acc, e) => acc + e.responseTime, 0) / totalCapturedCount) : 0;
  const maxLatency = totalCapturedCount > 0 ? Math.max(...listenedEvents.map(e => e.responseTime)) : 0;

  const methodBreakdown = listenedEvents.reduce((acc: Record<string, number>, e) => {
    acc[e.method] = (acc[e.method] || 0) + 1;
    return acc;
  }, {});

  const statusBreakdown = listenedEvents.reduce((acc: Record<string, number>, e) => {
    const range = e.responseStatus >= 200 && e.responseStatus < 300 ? '2xx' : (e.responseStatus >= 400 && e.responseStatus < 500 ? '4xx' : (e.responseStatus >= 500 ? '5xx' : 'Other'));
    acc[range] = (acc[range] || 0) + 1;
    return acc;
  }, {});

  const selectedEventDetails = listenedEvents.find(e => e.id === selectedEventId);
  const activeEndpoint = endpoints.find(e => e.id === activeEndpointId) || endpoints[0];

  // For Compare Diff Mode
  const comparedEvents = comparedEventIds
    .map(id => listenedEvents.find(e => e.id === id))
    .filter(Boolean);

  // Keyboard Shortcuts Hook (placed after variables to prevent block-scoped hoisting errors)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !isInputFocused)) {
        e.preventDefault();
        searchRef.current?.focus();
        onToast('Search input focused (shortcut)', 'info');
      }

      if (mode === 'listener' && filteredEvents.length > 0 && !isInputFocused && !compareMode) {
        const currentIndex = filteredEvents.findIndex(evt => evt.id === selectedEventId);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % filteredEvents.length;
          setSelectedEventId(filteredEvents[nextIndex].id);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIndex = (currentIndex - 1 + filteredEvents.length) % filteredEvents.length;
          setSelectedEventId(filteredEvents[prevIndex].id);
        }
      }

      if (e.ctrlKey && e.key === 'c' && window.getSelection()?.toString() === '' && selectedEventDetails && !isInputFocused) {
        e.preventDefault();
        const payloadText = typeof selectedEventDetails.body === 'object' 
          ? JSON.stringify(selectedEventDetails.body, null, 2) 
          : String(selectedEventDetails.body);
        navigator.clipboard.writeText(payloadText);
        onToast('Payload body copied to clipboard (shortcut)', 'success');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, filteredEvents, selectedEventId, selectedEventDetails, compareMode]);

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 animation-fade-in" style={{ background: 'var(--bg-primary)' }}>
      
      {/* Premium Navigation Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-500 ring-1 ring-indigo-500/30 shadow-glow">
            <Webhook size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Webhook Simulator</h2>
            <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Expose dynamic local endpoints, catch notifications, and inspect payloads.</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl items-center md:mr-auto md:ml-10 w-fit" style={{ border: '1px solid var(--border-primary)' }}>
          <button
            onClick={() => setMode('listener')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${mode === 'listener' ? 'bg-white dark:bg-[#1a1a1a] shadow-sm' : 'opacity-65 hover:opacity-100'}`}
            style={{ color: mode === 'listener' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            <ArrowDownToLine size={14} /> Webhook Listener
          </button>
          <button
            onClick={() => setMode('sender')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${mode === 'sender' ? 'bg-white dark:bg-[#1a1a1a] shadow-sm' : 'opacity-65 hover:opacity-100'}`}
            style={{ color: mode === 'sender' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            <ArrowUpRight size={14} /> Test Dispatcher
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {mode === 'listener' && (
            <>
              <button
                onClick={handleExportSession}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm hover:shadow-md hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                style={{ borderColor: 'var(--border-secondary)' }}
                title="Export endpoints & caught logs to JSON"
              >
                <Download size={14} className="text-indigo-400" /> Export Session
              </button>
              <label
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm hover:shadow-md hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer bg-[var(--bg-secondary)] text-[var(--text-primary)] select-none"
                style={{ borderColor: 'var(--border-secondary)' }}
                title="Upload JSON session package"
              >
                <ArrowDownToLine size={14} className="text-purple-400" /> Import Session
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSession}
                  className="hidden"
                />
              </label>
            </>
          )}
          {mode === 'sender' && (
            <>
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border shadow-sm hover:shadow-md hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer bg-[var(--bg-secondary)]"
                style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
              >
                <History size={16} style={{ color: 'var(--accent)' }} />
                History
              </button>
              <button
                onClick={() => setShowPresets(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border shadow-sm hover:shadow-md hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer bg-[var(--bg-secondary)]"
                style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
              >
                <BookOpen size={16} style={{ color: 'var(--accent)' }} />
                Presets
              </button>
            </>
          )}
          <button
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border shadow-sm hover:shadow-md hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer bg-[var(--bg-secondary)]"
            style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
          >
            <HelpCircle size={16} style={{ color: 'var(--accent)' }} />
            Guide
          </button>
        </div>
      </div>

      {/* --- LISTENER MODE INTERFACE --- */}
      {mode === 'listener' && (
        <div className="flex flex-col flex-1 gap-6 min-h-0 animation-fade-in">
          
          {/* Active Endpoint Settings & Webhook Control Bar */}
          <div className="flex flex-col gap-3 p-4 rounded-2xl border bg-gradient-to-r from-[var(--bg-secondary)] to-[var(--bg-primary)] shadow-sm" style={{ borderColor: 'var(--border-secondary)' }}>
            
            {/* Row 1: Visible Webhook URL Display Input Bar & Actions */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span className="text-xs font-black shrink-0 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <RadioTower size={14} className="text-indigo-400" />
                  Webhook URL:
                </span>
                <div className="flex-1 relative flex items-center min-w-0">
                  <input
                    type="text"
                    readOnly
                    value={getExposedUrl(activeEndpointId)}
                    className="w-full pl-3 pr-28 py-2 rounded-xl text-xs font-mono font-bold border outline-none shadow-inner bg-[var(--bg-primary)] text-[var(--accent)]"
                    style={{ borderColor: 'var(--border-secondary)' }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <div className="absolute right-1.5 flex items-center gap-1">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded ${customBaseUrl ? 'bg-purple-500/20 text-purple-400' : (isTunnelActive ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400')}`}>
                      {customBaseUrl ? 'STATIC HOST' : (isTunnelActive ? 'PUBLIC TUNNEL' : 'LOCAL (3000)')}
                    </span>
                    <button
                      onClick={() => {
                        const copyStr = getExposedUrl(activeEndpointId);
                        handleCopyText(copyStr, 'Webhook URL copied to clipboard!');
                        setCopiedUrlId(activeEndpointId);
                        setTimeout(() => setCopiedUrlId(null), 2000);
                      }}
                      className="px-2.5 py-1 text-[10px] font-black rounded-lg text-white shadow transition-all hover:brightness-110 flex items-center gap-1 cursor-pointer"
                      style={{ background: 'var(--accent)' }}
                      title="Copy visible Webhook URL"
                    >
                      {copiedUrlId === activeEndpointId ? <Check size={11} /> : <Copy size={11} />}
                      {copiedUrlId === activeEndpointId ? 'Copied' : 'Copy URL'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowHostConfigModal(!showHostConfigModal)}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${customBaseUrl || isBaseUrlLocked ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 font-black' : 'bg-[var(--bg-primary)] hover:bg-black/5 text-[var(--text-secondary)]'}`}
                  style={{ borderColor: customBaseUrl || isBaseUrlLocked ? '' : 'var(--border-secondary)' }}
                  title="Lock custom static host domain to prevent URL from changing"
                >
                  {isBaseUrlLocked ? <Lock size={13} /> : <Unlock size={13} />}
                  {customBaseUrl ? 'Host Locked' : 'Lock Host Domain'}
                </button>

                <button
                  onClick={handleToggleTunnel}
                  disabled={isConnectingTunnel}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${isTunnelActive ? 'bg-green-500/10 border-green-500/20 text-green-500 font-black' : 'bg-[var(--bg-primary)] hover:bg-black/5 text-[var(--text-secondary)]'}`}
                  style={{ borderColor: isTunnelActive ? '' : 'var(--border-secondary)' }}
                  title="Expose local endpoint to a public HTTPS tunnel"
                >
                  {isConnectingTunnel ? <RefreshCw size={13} className="animate-spin" /> : <RadioTower size={13} className={isTunnelActive ? "animate-pulse" : ""} />}
                  {isTunnelActive ? 'Exposed Publicly' : 'Expose Publicly'}
                </button>

                <button
                  onClick={() => window.open(getExposedUrl(activeEndpointId), '_blank')}
                  className="px-3 py-2 text-xs font-bold rounded-xl border transition-all hover:bg-black/5 flex items-center gap-1.5 shrink-0 cursor-pointer bg-[var(--bg-primary)] text-[var(--text-secondary)]"
                  style={{ borderColor: 'var(--border-secondary)' }}
                  title="Open webhook URL in new browser tab"
                >
                  <ArrowUpRight size={13} /> Preview
                </button>

                <button
                  onClick={handleRegisterPlatformWebhook}
                  className="px-3 py-2 text-xs font-bold rounded-xl border transition-all hover:bg-black/5 flex items-center gap-1.5 shrink-0 cursor-pointer bg-[var(--bg-primary)] text-[var(--text-primary)]"
                  style={{ borderColor: 'var(--border-secondary)' }}
                  title="Register or update this webhook URL on OptimaOrbit platform"
                >
                  <Globe size={13} className="text-emerald-400" /> Platform Register
                </button>
                
                <button
                  onClick={handleTriggerPlatformTestWebhook}
                  className="px-3 py-2 text-xs font-bold rounded-xl border transition-all hover:brightness-110 flex items-center gap-1.5 shrink-0 cursor-pointer text-white shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}
                  title="Trigger test webhook from OptimaOrbit platform"
                >
                  <Zap size={13} className="text-amber-300 fill-amber-300" /> Platform Test
                </button>
              </div>
            </div>

            {/* Custom Host Config Drawer Dropdown */}
            {showHostConfigModal && (
              <div className="p-3.5 rounded-xl border bg-[var(--bg-primary)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 animation-slide-down" style={{ borderColor: 'var(--border-secondary)' }}>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1">
                    <Lock size={12} /> Custom Static Host / Base Domain
                  </label>
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    Specify a fixed base URL (e.g. <code>https://my-domain.ngrok-free.app</code> or <code>http://localhost:3000</code>) so your Webhook Copy URL never changes dynamically.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="https://my-custom-domain.com"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono border outline-none w-64 bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                    style={{ borderColor: 'var(--border-secondary)' }}
                  />
                  {customBaseUrl && (
                    <button
                      onClick={() => {
                        setCustomBaseUrl("");
                        onToast("Reset base host to auto", "info");
                      }}
                      className="px-2 py-1 text-[10px] font-bold text-red-400 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => setShowHostConfigModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[var(--accent)] cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* Row 2: API Endpoint Path Input & Manual Endpoint Key Input */}
            <div className="flex flex-wrap items-center justify-between pt-3 border-t gap-3" style={{ borderColor: 'var(--border-primary)' }}>
              
              {/* Path Selector & Direct API Endpoint Path Input */}
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-bold shrink-0 text-[var(--text-secondary)]">Endpoint Path:</span>
                
                <div className="relative" ref={pathDropdownRef}>
                  <button
                    onClick={() => setIsPathDropdownOpen(!isPathDropdownOpen)}
                    className="pl-3 pr-7 py-1.5 rounded-lg text-xs font-black border outline-none cursor-pointer flex items-center gap-2 shadow-sm bg-[var(--bg-primary)] text-[var(--text-primary)]"
                    style={{ borderColor: 'var(--border-secondary)' }}
                  >
                    <span>{activeEndpoint?.name || "Select Path"}</span>
                    <ChevronDown size={12} className={`transition-transform duration-200 text-[var(--text-tertiary)] ${isPathDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  
                  {isPathDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-64 rounded-xl border shadow-xl z-30 overflow-hidden bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-secondary)' }}>
                      <div className="max-h-64 overflow-y-auto scrollbar-thin py-1 flex flex-col">
                        {endpoints.map(e => (
                          <button
                            key={e.id}
                            onClick={() => {
                              setActiveEndpointId(e.id);
                              setIsPathDropdownOpen(false);
                            }}
                            className="text-left px-3.5 py-2.5 transition-colors border-b last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5 flex flex-col gap-1 cursor-pointer w-full"
                            style={{ 
                              borderColor: 'var(--border-primary)',
                              background: e.id === activeEndpointId ? 'var(--accent-bg)' : 'transparent'
                            }}
                          >
                            <div className="flex items-center justify-between font-bold text-xs">
                              <span style={{ color: e.id === activeEndpointId ? 'var(--accent)' : 'var(--text-primary)' }}>{e.name}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-black/20 text-[var(--text-secondary)]">{e.responseStatus}</span>
                            </div>
                            <span className="text-[10px] font-mono opacity-65 truncate text-[var(--text-secondary)]">
                              /catch{e.customPath ? `/${e.customPath}` : (e.id === 'default' ? '' : `/${e.id}`)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Path Input */}
                <div className="flex items-center gap-1 bg-[var(--bg-primary)] px-2 py-1 rounded-lg border flex-1 min-w-[200px]" style={{ borderColor: 'var(--border-secondary)' }}>
                  <span className="text-[10px] font-mono opacity-60 text-[var(--text-tertiary)] shrink-0">/catch/</span>
                  <input
                    type="text"
                    placeholder="custom-path-slug"
                    value={editCustomPath}
                    onChange={(e) => {
                      setEditCustomPath(e.target.value);
                      handleQuickUpdateEndpointField('customPath', e.target.value);
                    }}
                    className="w-full bg-transparent font-mono text-xs font-bold outline-none text-[var(--text-primary)]"
                    title="Manually type or change API Endpoint Path slug"
                  />
                </div>

                <button
                  onClick={() => setIsConfiguringEndpoint(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shadow-sm bg-[var(--bg-primary)] hover:bg-black/5 cursor-pointer text-[var(--text-secondary)]"
                  style={{ borderColor: 'var(--border-secondary)' }}
                  title="Configure response status, delay, chaos settings"
                >
                  <Settings size={13} style={{ color: 'var(--accent)' }} /> Settings
                </button>

                <button
                  onClick={handleCreateEndpoint}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-dashed hover:bg-black/5 transition-colors cursor-pointer text-[var(--text-secondary)]"
                  style={{ borderColor: 'var(--border-secondary)' }}
                >
                  <Plus size={13} /> Add Path
                </button>
              </div>

              {/* Manual Endpoint Key / Signing Secret Input */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1">
                  <Key size={13} className="text-amber-400" /> Endpoint Key:
                </span>
                <div className="flex items-center gap-1 bg-[var(--bg-primary)] px-2 py-1 rounded-lg border" style={{ borderColor: 'var(--border-secondary)' }}>
                  <input
                    type={showSecretKey ? "text" : "password"}
                    placeholder="Manual Signing Secret (whsec_...)"
                    value={editSecretKey}
                    onChange={(e) => {
                      setEditSecretKey(e.target.value);
                      handleQuickUpdateEndpointField('secretKey', e.target.value);
                    }}
                    className="w-44 bg-transparent font-mono text-xs font-bold outline-none text-[var(--text-primary)]"
                    title="Enter Webhook Signing Secret Key for HMAC signature validation"
                  />
                  <button
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="p-1 hover:bg-black/10 rounded text-[var(--text-tertiary)] cursor-pointer"
                    title={showSecretKey ? "Hide secret" : "Show secret"}
                  >
                    {showSecretKey ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  {editSecretKey && (
                    <button
                      onClick={() => {
                        handleCopyText(editSecretKey, "Endpoint Key copied!");
                        setCopiedKeyId(activeEndpointId);
                        setTimeout(() => setCopiedKeyId(null), 1500);
                      }}
                      className="p-1 hover:bg-black/10 rounded text-[var(--text-tertiary)] cursor-pointer"
                      title="Copy Endpoint Key"
                    >
                      {copiedKeyId === activeEndpointId ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    </button>
                  )}
                  <button
                    onClick={generateRandomEndpointKey}
                    className="p-1 hover:bg-black/10 rounded text-amber-400 cursor-pointer"
                    title="Generate random secret key"
                  >
                    <Zap size={12} />
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* MAIN DUAL PANE DASHBOARD */}
          <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-6">
            
            {/* LEFT COLUMN: LIVE LOGGER / ANALYTICS */}
            <div className="flex flex-col lg:w-[38%] border rounded-2xl overflow-hidden shadow-sm flex-shrink-0" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-secondary)' }}>
              
              {/* Header with connection pulses, dashboard toggles, and controls */}
              <div className="p-4 border-b flex items-center justify-between gap-4 bg-[var(--bg-primary)]" style={{ borderColor: 'var(--border-secondary)' }}>
                <div className="flex bg-black/5 dark:bg-white/5 p-0.5 rounded-lg border text-[10px] font-bold" style={{ borderColor: 'var(--border-primary)' }}>
                  <button
                    onClick={() => setActiveLogView('logs')}
                    className={`px-3 py-1 rounded cursor-pointer transition-all ${activeLogView === 'logs' ? 'bg-white dark:bg-zinc-800 text-[var(--accent)] shadow-sm' : 'opacity-65'}`}
                  >
                    Events
                  </button>
                  <button
                    onClick={() => setActiveLogView('analytics')}
                    className={`px-3 py-1 rounded cursor-pointer transition-all ${activeLogView === 'analytics' ? 'bg-white dark:bg-zinc-800 text-[var(--accent)] shadow-sm' : 'opacity-65'}`}
                  >
                    Stats
                  </button>
                </div>
                
                <div className="flex items-center gap-1.5">
                  {/* Compare mode trigger */}
                  {activeLogView === 'logs' && listenedEvents.length >= 2 && (
                    <button
                      onClick={() => {
                        setCompareMode(!compareMode);
                        setComparedEventIds([]);
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${compareMode ? 'bg-[var(--accent-bg)] border-[var(--accent)] text-[var(--accent)]' : 'bg-[var(--bg-primary)] hover:bg-black/5 border-[var(--border-secondary)]'}`}
                    >
                      <ArrowRightLeft size={11} /> Compare
                    </button>
                  )}
                  
                  <button
                    onClick={handleTriggerTestWebhook}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded border hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer bg-[var(--bg-primary)]"
                    style={{ borderColor: 'var(--border-secondary)', color: 'var(--text-secondary)' }}
                  >
                    <Play size={11} style={{ color: 'var(--success)' }} /> Mock
                  </button>
                  <button
                    onClick={handleClearHistory}
                    className="p-1 rounded border hover:bg-red-500/10 text-red-500 hover:border-red-500/20 transition-colors cursor-pointer bg-[var(--bg-primary)]"
                    style={{ borderColor: 'var(--border-secondary)' }}
                    title="Clear history logs"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Logger View */}
              {activeLogView === 'logs' ? (
                <>
                  {/* Filtering Controls */}
                  <div className="p-3 border-b flex flex-col gap-2 bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--border-secondary)' }}>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
                      <input
                        ref={searchRef}
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search logs... (Ctrl+K or /)"
                        className="w-full pl-9 pr-4 py-1.5 rounded-lg text-xs border outline-none shadow-sm bg-[var(--bg-primary)]"
                        style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-1 flex-1">
                        <select
                          value={methodFilter}
                          onChange={e => setMethodFilter(e.target.value)}
                          className="px-2 py-1 rounded border outline-none text-[10px] font-bold flex-1 cursor-pointer bg-[var(--bg-primary)]"
                          style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
                        >
                          <option value="all">ALL METHODS</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="GET">GET</option>
                          <option value="DELETE">DELETE</option>
                        </select>

                        <select
                          value={statusFilter}
                          onChange={e => setStatusFilter(e.target.value)}
                          className="px-2 py-1 rounded border outline-none text-[10px] font-bold flex-1 cursor-pointer bg-[var(--bg-primary)]"
                          style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
                        >
                          <option value="all">ALL STATUSES</option>
                          <option value="success">Success</option>
                          <option value="failed">Failed</option>
                          <option value="2xx">2xx</option>
                          <option value="4xx">4xx</option>
                          <option value="5xx">5xx</option>
                        </select>
                      </div>
                      
                      <label className="flex items-center gap-1.5 cursor-pointer shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={showAllEndpointsWebhooks}
                          onChange={e => setShowAllEndpointsWebhooks(e.target.checked)}
                          className="w-3.5 h-3.5 accent-indigo-500 rounded"
                        />
                        <span className="text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}>Show All Paths</span>
                      </label>
                    </div>
                  </div>

                  {/* Event scroll list */}
                  <div className="flex-1 overflow-y-auto scrollbar-thin">
                    {filteredEvents.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-65">
                        <RadioTower size={44} className="mb-3 opacity-40 text-indigo-400" />
                        <h5 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Awaiting Webhooks</h5>
                        <p className="text-[11px] mt-1 max-w-[220px]" style={{ color: 'var(--text-secondary)' }}>
                          Trigger actions in your external application, or click below to send a mock event.
                        </p>
                        <button
                          onClick={handleTriggerTestWebhook}
                          className="mt-4 px-4 py-2 text-xs font-bold rounded-lg border text-white hover:scale-105 transition-transform cursor-pointer shadow"
                          style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #4338ca 100%)', borderColor: 'var(--border-secondary)' }}
                        >
                          Send Mock Webhook
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {filteredEvents.map(evt => {
                          const isSelected = evt.id === selectedEventId;
                          const isSuccess = evt.responseStatus < 400;
                          
                          let displayName = evt.path.replace(/^\/api\/webhooks\/catch\/?/, "");
                          if (evt.headers['orbit-event-type'] || evt.headers['Orbit-Event-Type']) {
                            displayName = evt.headers['orbit-event-type'] || evt.headers['Orbit-Event-Type'];
                          } else if (evt.body && evt.body.type) {
                            displayName = evt.body.type;
                          } else if (evt.body && evt.body.event) {
                            displayName = evt.body.event;
                          } else if (!displayName || displayName === "/") {
                            displayName = "webhook.event";
                          }
                          
                          return (
                            <div
                              key={evt.id}
                              onClick={() => {
                                if (compareMode) {
                                  if (comparedEventIds.includes(evt.id)) {
                                    setComparedEventIds(comparedEventIds.filter(id => id !== evt.id));
                                  } else {
                                    if (comparedEventIds.length >= 2) {
                                      setComparedEventIds([comparedEventIds[0], evt.id]);
                                    } else {
                                      setComparedEventIds([...comparedEventIds, evt.id]);
                                    }
                                  }
                                } else {
                                  setSelectedEventId(evt.id);
                                }
                              }}
                              className={`p-4 border-b cursor-pointer transition-colors relative flex items-start gap-2.5 ${isSelected && !compareMode ? 'bg-white/5 dark:bg-white/10 shadow-sm' : 'hover:bg-white/3 dark:hover:bg-white/5'}`}
                              style={{ borderColor: 'var(--border-secondary)' }}
                            >
                              {!compareMode && isSelected && (
                                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: 'var(--accent)' }} />
                              )}
                              
                              {compareMode && (
                                <input
                                  type="checkbox"
                                  checked={comparedEventIds.includes(evt.id)}
                                  readOnly
                                  className="w-4 h-4 rounded text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-opacity-25 border-gray-300 mt-0.5 shrink-0 accent-indigo-500 cursor-pointer"
                                />
                              )}

                              <div className="flex-1 min-w-0 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase shrink-0 ${
                                      evt.method === 'POST' ? 'bg-blue-500/10 text-blue-500' :
                                      evt.method === 'PUT' ? 'bg-purple-500/10 text-purple-500' :
                                      evt.method === 'DELETE' ? 'bg-red-500/10 text-red-500' :
                                      'bg-green-500/10 text-green-500'
                                    }`}>
                                      {evt.method}
                                    </span>
                                    <span className="text-xs font-bold truncate text-[var(--text-primary)]" title={displayName}>
                                      {displayName}
                                    </span>
                                  </div>
                                  
                                  <span className="text-[10px] font-semibold opacity-65 shrink-0">
                                    {new Date(evt.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px]">
                                  <div className="flex items-center gap-2">
                                    <span className={`flex items-center gap-1 font-bold ${isSuccess ? 'text-green-500' : 'text-red-500'}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`} />
                                      {evt.responseStatus}
                                    </span>
                                    {evt.validationError && (
                                      <span className="text-yellow-500 font-extrabold flex items-center gap-0.5" title="Validation Warning">
                                        ⚠️ Invalid
                                      </span>
                                    )}
                                    <span className="opacity-50">|</span>
                                    {renderResponseTimeIndicator(evt.responseTime, false)}
                                  </div>
                                  
                                  {evt.endpointId !== 'default' && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase truncate max-w-[80px]" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                                      {evt.endpointId}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Footer selection count and select toggle */}
                  <div className="p-3 bg-black/10 border-t flex items-center justify-between gap-4 text-[10px] font-bold" style={{ borderColor: 'var(--border-secondary)', color: 'var(--text-secondary)' }}>
                    <span>Total: {filteredEvents.length} log(s)</span>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoSelectLatest}
                        onChange={e => setAutoSelectLatest(e.target.checked)}
                        className="w-3.5 h-3.5 accent-indigo-500 rounded"
                      />
                      <span>Select Latest Event</span>
                    </label>
                  </div>
                </>
              ) : (
                /* STATISTICS DASHBOARD VIEW */
                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 scrollbar-thin animation-fade-in bg-[var(--bg-primary)]">
                  <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                    <BarChart4 size={14} className="text-indigo-400" /> Event Analytics Dashboard
                  </h4>
                  
                  {totalCapturedCount === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 opacity-60 text-center">
                      <Clock size={32} className="mb-2 opacity-50 text-indigo-400" />
                      <p className="text-xs font-bold">No stats to show yet.</p>
                      <p className="text-[10px] mt-1">Dispatched webhooks will record metadata automatically.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 border rounded-xl bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-primary)' }}>
                          <span className="block text-[9px] font-black uppercase tracking-wider opacity-60">Total Caught</span>
                          <span className="text-lg font-black block mt-1" style={{ color: 'var(--text-primary)' }}>{totalCapturedCount}</span>
                        </div>
                        <div className="p-3 border rounded-xl bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-primary)' }}>
                          <span className="block text-[9px] font-black uppercase tracking-wider opacity-60">Success Rate</span>
                          <span className={`text-lg font-black block mt-1 ${successRate >= 80 ? 'text-green-500' : (successRate >= 50 ? 'text-amber-500' : 'text-red-500')}`}>{successRate}%</span>
                        </div>
                        <div className="p-3 border rounded-xl bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-primary)' }}>
                          <span className="block text-[9px] font-black uppercase tracking-wider opacity-60">Avg Response</span>
                          <span className="text-lg font-black block mt-1" style={{ color: 'var(--text-primary)' }}>{averageLatency}ms</span>
                        </div>
                        <div className="p-3 border rounded-xl bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-primary)' }}>
                          <span className="block text-[9px] font-black uppercase tracking-wider opacity-60">Max Latency</span>
                          <span className="text-lg font-black block mt-1" style={{ color: 'var(--text-primary)' }}>{maxLatency}ms</span>
                        </div>
                      </div>

                      <div className="p-4 border rounded-xl bg-[var(--bg-secondary)] flex flex-col gap-2.5" style={{ borderColor: 'var(--border-primary)' }}>
                        <span className="font-bold text-[10px] uppercase opacity-75">HTTP Methods breakdown</span>
                        <div className="flex flex-col gap-2">
                          {['POST', 'PUT', 'GET', 'DELETE'].map(method => {
                            const count = methodBreakdown[method] || 0;
                            const pct = totalCapturedCount > 0 ? Math.round((count / totalCapturedCount) * 100) : 0;
                            if (count === 0) return null;
                            return (
                              <div key={method} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[10px] font-bold">
                                  <span className="font-mono">{method}</span>
                                  <span>{count} ({pct}%)</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-black/25 dark:bg-white/10 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      method === 'POST' ? 'bg-blue-500' :
                                      method === 'PUT' ? 'bg-purple-500' :
                                      method === 'DELETE' ? 'bg-red-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-4 border rounded-xl bg-[var(--bg-secondary)] flex flex-col gap-2.5" style={{ borderColor: 'var(--border-primary)' }}>
                        <span className="font-bold text-[10px] uppercase opacity-75">Statuses distribution</span>
                        <div className="flex flex-col gap-2">
                          {['2xx', '4xx', '5xx', 'Other'].map(range => {
                            const count = statusBreakdown[range] || 0;
                            const pct = totalCapturedCount > 0 ? Math.round((count / totalCapturedCount) * 100) : 0;
                            if (count === 0) return null;
                            return (
                              <div key={range} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[10px] font-bold">
                                  <span className="font-mono">{range} range</span>
                                  <span>{count} ({pct}%)</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-black/25 dark:bg-white/10 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      range === '2xx' ? 'bg-green-500' :
                                      range === '4xx' ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: INSPECTOR DETAIL OR COMPANION DIFF */}
            <div className="flex-1 flex flex-col border rounded-2xl overflow-hidden shadow-sm bg-[var(--bg-primary)]" style={{ borderColor: 'var(--border-secondary)' }}>
              
              {/* COMPARE DIFF MODE INSPECTOR */}
              {compareMode ? (
                comparedEventIds.length === 2 && comparedEvents[0] && comparedEvents[1] ? (
                  <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-primary)] p-5 gap-5 overflow-y-auto animation-slide-up">
                    <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-secondary)' }}>
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft size={16} className="text-indigo-400" />
                        <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Comparing Webhook Payloads</h3>
                      </div>
                      <button
                        onClick={() => {
                          setComparedEventIds([]);
                          setCompareMode(false);
                        }}
                        className="text-xs text-red-500 hover:underline cursor-pointer font-bold"
                      >
                        Exit Compare Mode
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-[11px]">
                      <div className="p-3 border rounded-xl bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-primary)' }}>
                        <span className="font-mono font-bold block text-[var(--text-tertiary)]">EVENT A ({comparedEvents[0].method})</span>
                        <span className="font-bold block mt-1 truncate" style={{ color: 'var(--text-primary)' }}>{comparedEvents[0].path}</span>
                        <span className="text-[10px] font-mono opacity-65 block mt-1">ID: {comparedEvents[0].id}</span>
                        <span className="text-[9px] block mt-1 opacity-50">{new Date(comparedEvents[0].timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="p-3 border rounded-xl bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-primary)' }}>
                        <span className="font-mono font-bold block text-[var(--text-tertiary)]">EVENT B ({comparedEvents[1].method})</span>
                        <span className="font-bold block mt-1 truncate" style={{ color: 'var(--text-primary)' }}>{comparedEvents[1].path}</span>
                        <span className="text-[10px] font-mono opacity-65 block mt-1">ID: {comparedEvents[1].id}</span>
                        <span className="text-[9px] block mt-1 opacity-50">{new Date(comparedEvents[1].timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 border rounded-xl overflow-hidden shadow-inner text-xs min-h-[350px]">
                      <ReactDiffViewer
                        oldValue={typeof comparedEvents[0].body === 'object' ? JSON.stringify(comparedEvents[0].body, null, 2) : String(comparedEvents[0].body)}
                        newValue={typeof comparedEvents[1].body === 'object' ? JSON.stringify(comparedEvents[1].body, null, 2) : String(comparedEvents[1].body)}
                        splitView={true}
                        useDarkTheme={true}
                        leftTitle="Event A Payload"
                        rightTitle="Event B Payload"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-65">
                    <ArrowRightLeft size={36} className="mb-4 text-indigo-400 animate-pulse" />
                    <h4 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Select 2 logs to Diff</h4>
                    <p className="text-xs max-w-[280px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      Check the boxes next to exactly two events in the left logs panel to see a side-by-side JSON difference.
                    </p>
                    <button
                      onClick={() => setCompareMode(false)}
                      className="mt-4 px-4 py-1.5 rounded-lg border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-secondary)' }}
                    >
                      Exit Compare Mode
                    </button>
                  </div>
                )
              ) : (
                /* DEFAULT INSPECTOR PANEL */
                !selectedEventDetails ? (
                  /* Interactive Onboarding empty state */
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center overflow-y-auto scrollbar-thin select-none">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto h-full my-auto py-8">
                      <div className="relative w-20 h-20 mb-6 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-500 shadow-glow animate-pulse">
                        <RadioTower size={32} />
                      </div>
                      <h3 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Webhook Simulator Listener</h3>
                      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        Follow these steps to receive and inspect webhook logs live.
                      </p>
                      
                      <div className="mt-6 flex flex-col gap-3 w-full text-left">
                        <div className="p-3.5 rounded-xl border flex gap-3.5 items-start bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-secondary)' }}>
                          <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>Copy Webhook URL</h4>
                            <p className="text-[10px] mt-0.5 leading-normal" style={{ color: 'var(--text-tertiary)' }}>Use the Copy URL button above and configure it in your source application.</p>
                          </div>
                        </div>
                        
                        <div className="p-3.5 rounded-xl border flex gap-3.5 items-start bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-secondary)' }}>
                          <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</div>
                          <div className="flex-1">
                            <h4 className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>Trigger a Webhook</h4>
                            <p className="text-[10px] mt-0.5 leading-normal mb-2.5" style={{ color: 'var(--text-tertiary)' }}>Perform an action in your app, or generate a fake request right now:</p>
                            <button
                              onClick={handleTriggerTestWebhook}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-lg text-white shadow hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                              style={{ background: 'var(--accent)' }}
                            >
                              <Play size={10} /> Send Mock Webhook
                            </button>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl border flex gap-3.5 items-start bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-secondary)' }}>
                          <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</div>
                          <div className="flex-1">
                            <h4 className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>Inspect Captured Details</h4>
                            <p className="text-[10px] mt-0.5 leading-normal" style={{ color: 'var(--text-tertiary)' }}>Click any item in the left logs panel to inspect HTTP headers, payloads, signatures, and mock responses.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 animation-slide-up">
                    
                    {/* Delivery summary overview */}
                    <div className="p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderColor: 'var(--border-secondary)', background: 'var(--bg-secondary)' }}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border flex items-center justify-center ${selectedEventDetails.responseStatus < 400 ? 'bg-green-500/10 border-green-500/20 text-green-500 animate-pulse' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                          {selectedEventDetails.responseStatus < 400 ? <CheckSquare size={20} /> : <ShieldAlert size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
                              {selectedEventDetails.method} {selectedEventDetails.path}
                            </span>
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${selectedEventDetails.responseStatus < 400 ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                              {selectedEventDetails.responseStatus < 400 ? 'SUCCESS' : 'FAILED'}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono mt-1 opacity-70" style={{ color: 'var(--text-secondary)' }}>
                            ID: {selectedEventDetails.id} • Received: {new Date(selectedEventDetails.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 shrink-0 bg-black/10 dark:bg-white/5 p-3 rounded-xl border self-start md:self-auto" style={{ borderColor: 'var(--border-primary)' }}>
                        <div className="text-center px-1">
                          <span className="block text-[9px] font-black uppercase tracking-wider opacity-60" style={{ color: 'var(--text-tertiary)' }}>Returned Code</span>
                          <span className={`text-sm font-black ${selectedEventDetails.responseStatus < 400 ? 'text-green-500' : 'text-red-500'}`}>
                            {selectedEventDetails.responseStatus}
                          </span>
                        </div>
                        <div className="w-[1px] h-6 bg-white/10" />
                        <div className="text-center px-1">
                          <span className="block text-[9px] font-black uppercase tracking-wider opacity-60 mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Speed</span>
                          <span className="text-xs font-mono">
                            {renderResponseTimeIndicator(selectedEventDetails.responseTime, true)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tab Selector Request vs Response */}
                    <div className="flex border-b" style={{ borderColor: 'var(--border-secondary)', background: 'var(--bg-primary)' }}>
                      <button
                        onClick={() => setActiveTab('request')}
                        className={`flex-1 py-3 text-xs font-black border-b-2 transition-all cursor-pointer ${activeTab === 'request' ? 'border-[var(--accent)] text-[var(--accent)] bg-white/5 shadow-inner' : 'border-transparent opacity-65 hover:opacity-100'}`}
                      >
                        REQUEST DETAILS
                      </button>
                      <button
                        onClick={() => setActiveTab('response')}
                        className={`flex-1 py-3 text-xs font-black border-b-2 transition-all cursor-pointer ${activeTab === 'response' ? 'border-[var(--accent)] text-[var(--accent)] bg-white/5 shadow-inner' : 'border-transparent opacity-65 hover:opacity-100'}`}
                      >
                        SIMULATOR RESPONSE
                      </button>
                    </div>

                    {/* Scrollable detail container */}
                    <div className="flex-1 overflow-y-auto p-5 scrollbar-thin flex flex-col gap-5 bg-[var(--bg-primary)]">
                      
                      {/* REQUEST TAB */}
                      {activeTab === 'request' && (
                        <div className="flex flex-col gap-5 animation-fade-in">
                          
                          {/* HMAC Signature Validation Banner */}
                          {selectedEventDetails.signatureStatus && selectedEventDetails.signatureStatus !== 'none' && (
                            <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-bold shadow-sm ${selectedEventDetails.signatureStatus === 'valid' ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                              <ShieldCheck size={18} className="shrink-0" />
                              <div>
                                <h5 className="font-extrabold text-xs">
                                  {selectedEventDetails.signatureStatus === 'valid' 
                                    ? 'HMAC Signature Verified ✅' 
                                    : 'HMAC Signature Mismatch ❌'}
                                </h5>
                                <p className="text-[10.5px] font-normal opacity-90 mt-0.5">
                                  {selectedEventDetails.signatureStatus === 'valid'
                                    ? 'Incoming payload signature matches the configured Endpoint Key secret.'
                                    : 'Incoming payload signature does not match the configured Endpoint Key secret.'}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Schema Validation Warnings */}
                          {selectedEventDetails.validationError && (
                            <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400 flex gap-3 items-start relative overflow-hidden animate-fade-in shadow-sm">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500" />
                              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                              <div>
                                <h5 className="font-bold text-xs">Schema Validation Warning</h5>
                                <p className="text-[10.5px] mt-1 leading-relaxed opacity-95">
                                  {selectedEventDetails.validationError}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Relay forwarding log result status */}
                          {selectedEventDetails.relayLogs && selectedEventDetails.relayLogs.length > 0 && (
                            <div className="flex flex-col gap-2">
                              <h5 className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Forwarding Relay Outcomes</h5>
                              <div className="flex flex-col gap-1.5 border rounded-xl p-3 bg-black/10 dark:bg-white/5" style={{ borderColor: 'var(--border-primary)' }}>
                                {selectedEventDetails.relayLogs.map((log: any, idx: number) => {
                                  const isRelaySuccess = log.status >= 200 && log.status < 300;
                                  return (
                                    <div key={idx} className="flex items-center justify-between text-[11px] font-mono gap-4">
                                      <span className="truncate flex-1 text-[var(--text-secondary)]" title={log.url}>{log.url}</span>
                                      <span className={`font-bold shrink-0 ${isRelaySuccess ? 'text-green-500' : 'text-red-500'}`}>
                                        {log.status > 0 ? `Status: ${log.status}` : `Error: ${log.error || 'Network Failed'}`}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Request actions (Replay, Forward) */}
                          <div className="flex items-center gap-2 p-2.5 rounded-xl border bg-black/10 dark:bg-white/5" style={{ borderColor: 'var(--border-primary)' }}>
                            <span className="text-[10px] font-black uppercase tracking-wider mr-auto ml-1.5 opacity-60">Actions:</span>
                            <button
                              onClick={() => handleReplayWebhook(selectedEventDetails)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black bg-[var(--bg-primary)] hover:bg-black/5 border border-[var(--border-secondary)] transition-all cursor-pointer"
                              title="Re-run this webhook request payload"
                            >
                              <RotateCcw size={11} className="text-indigo-400" /> Replay Webhook
                            </button>
                            <button
                              onClick={() => setIsForwardingModalOpen(true)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black bg-[var(--bg-primary)] hover:bg-black/5 border border-[var(--border-secondary)] transition-all cursor-pointer"
                              title="Forward payload to another target URL"
                            >
                              <ArrowRightLeft size={11} className="text-purple-400" /> Forward Webhook
                            </button>
                          </div>

                          {/* URL Row */}
                          <div className="flex flex-col gap-1.5">
                            <h5 className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Target Delivery URL</h5>
                            <div className="p-3 rounded-xl border font-mono text-xs break-all bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}>
                              {selectedEventDetails.url}
                            </div>
                          </div>

                          {/* Query Params (Table) */}
                          {selectedEventDetails.query && Object.keys(selectedEventDetails.query).length > 0 && (
                            <div className="flex flex-col gap-2">
                              <h5 className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Query Parameters</h5>
                              <div className="border rounded-xl overflow-hidden shadow-inner" style={{ borderColor: 'var(--border-primary)' }}>
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b font-bold" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-secondary)' }}>
                                      <th className="p-2.5">Parameter</th>
                                      <th className="p-2.5">Value</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.entries(selectedEventDetails.query).map(([key, val]) => (
                                      <tr key={key} className="border-b last:border-b-0 hover:bg-black/5" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-primary)' }}>
                                        <td className="p-2.5 font-bold font-mono text-[var(--accent)]">{key}</td>
                                        <td className="p-2.5 font-mono break-all">{String(val)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Authentication Details */}
                          {analyzeAuthHeaders(selectedEventDetails.headers).length > 0 && (
                            <div className="flex flex-col gap-2">
                              <h5 className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Authentication & Signatures</h5>
                              <div className="flex flex-col gap-3">
                                {analyzeAuthHeaders(selectedEventDetails.headers).map((auth, idx) => (
                                  <div key={idx} className="p-4 rounded-xl border flex flex-col gap-2 relative overflow-hidden bg-gradient-to-r from-indigo-500/5 to-transparent" style={{ borderColor: 'var(--border-primary)' }}>
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                                    <div className="flex items-center gap-2">
                                      <Key size={14} className="text-indigo-400" />
                                      <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{auth.title}</span>
                                      <span className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded bg-black/20 text-indigo-400">{auth.value}</span>
                                    </div>
                                    
                                    {auth.details && (
                                      <div className="grid grid-cols-1 gap-1.5 mt-2 bg-black/10 dark:bg-white/5 p-3 rounded-lg border font-mono text-[10px] leading-relaxed" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}>
                                        {Object.entries(auth.details).map(([k, v]) => (
                                          <div key={k} className="flex flex-col sm:flex-row sm:items-baseline gap-1 break-all">
                                            <span className="font-bold text-indigo-400 shrink-0">{k}:</span>
                                            <span>{v}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Collapsible Headers Section */}
                          <div className="flex flex-col gap-2 border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-primary)' }}>
                            <button
                              onClick={() => setIsHeadersExpanded(!isHeadersExpanded)}
                              className="flex items-center justify-between p-3.5 text-left font-bold text-xs bg-[var(--bg-secondary)] cursor-pointer"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              <span className="flex items-center gap-2 select-none">
                                <Globe size={14} className="text-indigo-400" />
                                HTTP Request Headers ({Object.keys(selectedEventDetails.headers).length})
                              </span>
                              <ChevronDown size={14} className={`transition-transform duration-300 ${isHeadersExpanded ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {isHeadersExpanded && (
                              <div className="p-4 border-t flex flex-col gap-2 max-h-60 overflow-y-auto bg-[var(--bg-primary)] animation-slide-down" style={{ borderColor: 'var(--border-primary)' }}>
                                <div className="flex justify-end mb-1">
                                  <button
                                    onClick={() => {
                                      const text = Object.entries(selectedEventDetails.headers).map(([k, v]) => `${k}: ${v}`).join('\n');
                                      handleCopyText(text, 'Headers copied to clipboard');
                                    }}
                                    className="text-[10px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <Copy size={11} /> Copy Headers Block
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
                                  {Object.entries(selectedEventDetails.headers).map(([key, val]) => (
                                    <div 
                                      key={key} 
                                      className="p-2.5 rounded-lg border flex items-center justify-between gap-4 bg-[var(--bg-secondary)]"
                                      style={{ borderColor: 'var(--border-primary)' }}
                                    >
                                      <div className="truncate flex-1">
                                        <span className="font-bold block text-[9px] uppercase text-[var(--text-tertiary)]">{key}</span>
                                        <span className="opacity-95 text-[var(--text-secondary)] break-all" title={String(val)}>{String(val)}</span>
                                      </div>
                                      <button
                                        onClick={() => {
                                          handleCopyText(String(val), `Copied value for ${key}`);
                                          setCopiedHeaderKey(key);
                                          setTimeout(() => setCopiedHeaderKey(null), 1500);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 bg-black/20 rounded transition-opacity cursor-pointer"
                                      >
                                        {copiedHeaderKey === key ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Body / Payload Block */}
                          <div className="flex flex-col gap-2 min-h-[300px]">
                            <div className="flex items-center justify-between">
                              <h5 className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                                Payload Body
                              </h5>
                              
                              <div className="flex items-center gap-3">
                                <div className="flex bg-black/10 dark:bg-white/5 rounded-lg p-0.5 border" style={{ borderColor: 'var(--border-primary)' }}>
                                  <button
                                    onClick={() => setBodyViewerMode('formatted')}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded cursor-pointer ${bodyViewerMode === 'formatted' ? 'bg-white dark:bg-zinc-800 text-[var(--accent)] shadow-sm' : 'opacity-65'}`}
                                  >
                                    JSON tree
                                  </button>
                                  <button
                                    onClick={() => setBodyViewerMode('raw')}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded cursor-pointer ${bodyViewerMode === 'raw' ? 'bg-white dark:bg-zinc-800 text-[var(--accent)] shadow-sm' : 'opacity-65'}`}
                                  >
                                    Raw string
                                  </button>
                                </div>

                                <button
                                  onClick={() => setIsFullscreenJson(true)}
                                  className="text-[10px] font-bold text-[var(--text-secondary)] hover:text-white flex items-center gap-1 cursor-pointer bg-black/10 dark:bg-white/5 border px-2 py-1 rounded-lg"
                                  title="Open Payload in Fullscreen"
                                >
                                  <Maximize2 size={11} /> Fullscreen
                                </button>

                                <button
                                  onClick={() => handleCopyText(
                                    typeof selectedEventDetails.body === 'object' ? JSON.stringify(selectedEventDetails.body, null, 2) : String(selectedEventDetails.body),
                                    'Payload body copied!'
                                  )}
                                  className="text-[10px] font-bold text-[var(--text-secondary)] hover:text-white flex items-center gap-1 cursor-pointer"
                                >
                                  <Copy size={11} /> Copy
                                </button>
                                
                                <button
                                  onClick={() => handleDownloadPayload(
                                    `webhook_payload_${selectedEventDetails.id}.json`, 
                                    selectedEventDetails.body
                                  )}
                                  className="text-[10px] font-bold text-[var(--text-secondary)] hover:text-white flex items-center gap-1 cursor-pointer"
                                >
                                  <Download size={11} /> Download
                                </button>
                              </div>
                            </div>

                            <div className="border rounded-xl overflow-hidden shadow-inner flex-1 flex flex-col" style={{ borderColor: '#2d2d2d' }}>
                              {bodyViewerMode === 'formatted' && typeof selectedEventDetails.body === 'object' ? (
                                <div className="p-4 overflow-auto max-h-[450px] flex-1 bg-[#121212] select-text">
                                  <JsonTreeView data={selectedEventDetails.body} />
                                </div>
                              ) : (
                                <pre className="p-4 font-mono text-[11px] leading-relaxed overflow-auto max-h-[450px] bg-[#141414] flex-1 select-text" style={{ color: '#d4d4d4' }}>
                                  {typeof selectedEventDetails.body === 'object' 
                                    ? JSON.stringify(selectedEventDetails.body, null, 2) 
                                    : String(selectedEventDetails.body)
                                  }
                                </pre>
                              )}
                            </div>
                          </div>

                        </div>
                      )}

                      {/* RESPONSE TAB */}
                      {activeTab === 'response' && (
                        <div className="flex flex-col gap-5 animation-fade-in">
                          
                          {/* Headers */}
                          <div className="flex flex-col gap-2">
                            <h5 className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Simulator Response Headers</h5>
                            <div className="p-4 rounded-xl border text-xs font-mono overflow-x-auto shadow-inner bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}>
                              {selectedEventDetails.responseHeaders && Object.keys(selectedEventDetails.responseHeaders).length > 0 ? (
                                <div className="flex flex-col gap-1.5">
                                  {Object.entries(selectedEventDetails.responseHeaders).map(([k, v]) => (
                                    <div key={k} className="whitespace-nowrap">
                                      <span className="font-bold text-indigo-400">{k}:</span> 
                                      <span className="ml-2 opacity-95">{String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="opacity-50 italic">No custom response headers returned</span>
                              )}
                            </div>
                          </div>

                          {/* Body */}
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <h5 className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Response Payload returned</h5>
                              <button
                                onClick={() => handleCopyText(selectedEventDetails.responseBody, 'Response payload copied!')}
                                className="text-[10px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Copy size={11} /> Copy Body
                              </button>
                            </div>
                            <div className="border rounded-xl overflow-hidden font-mono text-[11px] shadow-inner" style={{ borderColor: '#2d2d2d' }}>
                              <pre className="p-4 overflow-auto max-h-[300px] bg-[#141414]" style={{ color: '#d4d4d4' }}>
                                {selectedEventDetails.responseBody || "(Empty response)"}
                              </pre>
                            </div>
                          </div>

                        </div>
                      )}

                    </div>
                  </div>
                )
              )}
            </div>

          </div>
        </div>
      )}

      {/* --- SENDER MODE INTERFACE --- */}
      {mode === 'sender' && (
        <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0 animation-fade-in">
        
        {/* Left Column: Settings & Payload */}
        <div className="flex flex-col gap-5 xl:w-[55%] overflow-y-auto pr-2 scrollbar-thin">
          
          {/* Connection Block */}
          <div className="flex flex-col gap-4 p-5 rounded-2xl border bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-primary)] shadow-sm" style={{ borderColor: 'var(--border-secondary)' }}>
            <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
              <Globe size={13} /> Target Connection Settings
            </h3>
            
            <div className="flex flex-col gap-3">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-500" style={{ color: 'var(--text-tertiary)' }}>
                  <LinkIcon size={14} />
                </div>
                <input 
                  type="text" 
                  value={targetUrl}
                  onChange={e => setTargetUrl(e.target.value)}
                  placeholder="Enter receiver URL (e.g. http://localhost:3000/api/webhooks/catch/default)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-mono border transition-all shadow-sm outline-none bg-[var(--bg-primary)]"
                  style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
                />
              </div>
              
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-500" style={{ color: 'var(--text-tertiary)' }}>
                  <Key size={14} />
                </div>
                <input 
                  type="password" 
                  value={secret}
                  onChange={e => setSecret(e.target.value)}
                  placeholder="Webhook Signing Secret (optional)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-mono border transition-all shadow-sm outline-none bg-[var(--bg-primary)]"
                  style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
                />
              </div>
              
              <div className="mt-2 flex flex-col gap-2">
                <button 
                  onClick={() => setShowHeaders(!showHeaders)}
                  className="flex items-center gap-1.5 text-[11px] font-bold transition-colors w-fit"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <ChevronDown size={14} className={`transition-transform duration-300 ${showHeaders ? 'rotate-180' : ''}`} />
                  {customHeaders.length > 0 ? `Custom Headers (${customHeaders.length})` : 'Add Custom Headers'}
                </button>
                
                {showHeaders && (
                  <div className="flex flex-col gap-2 mt-1 animation-slide-up">
                    {customHeaders.map((h, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input 
                          type="text"
                          placeholder="Header"
                          value={h.key}
                          onChange={e => {
                            const newH = [...customHeaders];
                            newH[i].key = e.target.value;
                            setCustomHeaders(newH);
                          }}
                          className="flex-1 px-3 py-1.5 rounded-lg text-xs font-mono border shadow-sm outline-none transition-colors focus:bg-transparent"
                          style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
                        />
                        <input 
                          type="text"
                          placeholder="Value"
                          value={h.value}
                          onChange={e => {
                            const newH = [...customHeaders];
                            newH[i].value = e.target.value;
                            setCustomHeaders(newH);
                          }}
                          className="flex-1 px-3 py-1.5 rounded-lg text-xs font-mono border shadow-sm outline-none transition-colors focus:bg-transparent"
                          style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
                        />
                        <button 
                          onClick={() => setCustomHeaders(customHeaders.filter((_, idx) => idx !== i))}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => setCustomHeaders([...customHeaders, { key: '', value: '' }])}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-dashed transition-colors hover:bg-black/5 dark:hover:bg-white/5 w-full mt-1 cursor-pointer"
                      style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-secondary)' }}
                    >
                      <Plus size={12} /> Add Header
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payload Editor Block */}
          <div className="flex-1 flex flex-col gap-3 p-5 rounded-2xl border bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-primary)] shadow-sm min-h-[350px]" style={{ borderColor: 'var(--border-secondary)' }}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
                  <Code2 size={13} /> Event Payload Editor
                </h3>
                <label className="flex items-center gap-1.5 cursor-pointer group select-none">
                  <input 
                    type="checkbox" 
                    checked={autoInject}
                    onChange={(e) => setAutoInject(e.target.checked)}
                    className="accent-indigo-500 w-3.5 h-3.5 rounded"
                  />
                  <span className="text-[10px] font-bold transition-colors group-hover:text-indigo-500" style={{ color: 'var(--text-tertiary)' }}>
                    Auto-inject mock IDs & Dates
                  </span>
                </label>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(payload);
                      setPayload(JSON.stringify(parsed, null, 2));
                      onToast('JSON formatted successfully', 'success');
                    } catch (e) {
                      onToast('Invalid JSON syntax', 'error');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Format JSON payload"
                >
                  <Code2 size={12} /> Format
                </button>
                <button 
                  onClick={() => handleCopyText(payload, 'Payload copied')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Copy payload to clipboard"
                >
                  <Copy size={12} /> Copy
                </button>
                <button 
                  onClick={() => {
                    const t = webhookTemplates.find(x => x.type === selectedEvent);
                    if (t) {
                      setPayload(JSON.stringify(t.payload, null, 2));
                      onToast('Reset to template default', 'info');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Reset to template default"
                >
                  <RotateCcw size={12} /> Reset
                </button>
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold border outline-none transition-all shadow-sm focus:ring-2 ring-indigo-500/20 cursor-pointer"
                    style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
                  >
                    {selectedEvent}
                    <ChevronDown size={12} style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                  
                  {isDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-xl z-20 overflow-hidden" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-secondary)' }}>
                      <div className="max-h-60 overflow-y-auto scrollbar-thin flex flex-col py-1">
                        {webhookTemplates.map(t => (
                          <button
                            key={t.type}
                            onClick={() => {
                              setSelectedEvent(t.type);
                              setPayload(JSON.stringify(t.payload, null, 2));
                              setIsDropdownOpen(false);
                            }}
                            className="text-left px-4 py-2 text-[11px] font-bold transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                            style={{ 
                              color: t.type === selectedEvent ? 'var(--accent)' : 'var(--text-secondary)',
                              background: t.type === selectedEvent ? 'var(--accent-bg)' : 'transparent'
                            }}
                          >
                            {t.type}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={`flex-1 relative rounded-xl overflow-hidden border shadow-inner group transition-colors ${jsonError ? 'border-red-500' : ''}`} style={{ borderColor: jsonError ? '' : '#2d2d2d' }}>
              <div className="absolute top-0 left-0 right-0 h-8 bg-[#1e1e1e] flex items-center justify-between px-3 border-b border-[#2d2d2d] select-none z-10">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
                  </div>
                  <span className="text-[10px] font-mono text-[#858585]">{selectedEvent}.json</span>
                </div>
                {jsonError && (
                  <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                    <AlertCircle size={12} /> Invalid JSON
                  </span>
                )}
              </div>
              <textarea
                value={payload}
                onChange={e => setPayload(e.target.value)}
                onKeyDown={handleEditorKeyDown}
                className="absolute inset-0 pt-10 px-4 pb-4 w-full h-full font-mono text-[12px] leading-relaxed resize-none focus:outline-none transition-colors scrollbar-thin bg-[#141414]"
                style={{ color: '#d4d4d4', tabSize: 2 }}
                spellCheck={false}
              />
            </div>
            
            {/* Fake Data Guide */}
            <div className="p-3 border rounded-xl bg-indigo-500/5 text-[10px] leading-relaxed flex gap-2 items-start" style={{ borderColor: 'var(--border-secondary)', color: 'var(--text-secondary)' }}>
              <HelpCircle size={14} className="text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-indigo-400 block">Fake Data Template Mode Active</span>
                Insert fields like <code>{"{{uuid}}"}</code>, <code>{"{{name}}"}</code>, <code>{"{{email}}"}</code>, <code>{"{{amount}}"}</code>, or <code>{"{{timestamp}}"}</code> to dispatch randomized variables automatically.
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 h-12">
            <div className="relative group w-20 shrink-0">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                Multi-Fire Count
              </div>
              <input 
                type="number" 
                min="1" 
                max="20"
                value={fireCount}
                onChange={e => setFireCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="w-full h-full text-center rounded-xl bg-black/5 dark:bg-white/5 border outline-none font-black text-sm shadow-sm transition-all focus:bg-transparent"
                style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
              />
            </div>
            
            <button
              onClick={handleSend}
              disabled={isSending || !!jsonError}
              className="flex-1 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.98] shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none cursor-pointer"
              style={{ 
                background: isSending ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, var(--accent) 0%, #4338ca 100%)', 
                color: isSending ? 'var(--text-secondary)' : '#ffffff' 
              }}
            >
              {isSending ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
              {isSending ? 'DISPATCHING...' : (fireCount > 1 ? `FIRE ${fireCount} WEBHOOKS` : 'FIRE WEBHOOK')}
            </button>
          </div>
        </div>

        {/* Right Column: Response */}
        <div className="flex flex-col xl:w-[45%] rounded-2xl border overflow-hidden shadow-sm bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-primary)] relative" style={{ borderColor: 'var(--border-secondary)' }}>
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-secondary)' }}>
            <h3 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Delivery Result</h3>
            {lastResponse && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)]" style={{ color: 'var(--text-secondary)' }}>
                  {new Date().toLocaleTimeString()}
                </span>
                <button
                  onClick={() => setLastResponse(null)}
                  className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-tertiary)] transition-colors cursor-pointer"
                  title="Clear Result"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
          
          {!lastResponse ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-indigo-500/20 animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-2 rounded-full border-2 border-dashed border-purple-500/20 animate-[spin_15s_linear_infinite_reverse]" />
                <div className="absolute inset-0 flex items-center justify-center text-indigo-500/40">
                  <Webhook size={32} />
                </div>
              </div>
              <h4 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Awaiting Outbound</h4>
              <p className="text-xs max-w-[250px]" style={{ color: 'var(--text-tertiary)' }}>Enter target URL and trigger webhook to see API response here.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0 animation-slide-up p-5 gap-5 overflow-y-auto scrollbar-thin">
              
              {/* Status Banner */}
              <div className="flex items-center justify-between p-4 rounded-xl border relative overflow-hidden" 
                style={{ 
                  background: lastResponse.error ? 'rgba(239, 68, 68, 0.05)' : (lastResponse.status >= 200 && lastResponse.status < 300 ? 'rgba(34, 197, 94, 0.05)' : 'rgba(234, 179, 8, 0.05)'),
                  borderColor: lastResponse.error ? 'rgba(239, 68, 68, 0.2)' : (lastResponse.status >= 200 && lastResponse.status < 300 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)'),
                }}>
                <div className="absolute left-0 top-0 bottom-0 w-1" 
                  style={{ background: lastResponse.error ? 'var(--error)' : (lastResponse.status >= 200 && lastResponse.status < 300 ? 'var(--success)' : 'var(--warning)') }} 
                />
                <div className="flex items-center gap-3 ml-2">
                  <div className="p-2 rounded-full" 
                    style={{ background: lastResponse.error ? 'rgba(239, 68, 68, 0.1)' : (lastResponse.status >= 200 && lastResponse.status < 300 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)'), color: lastResponse.error ? 'var(--error)' : (lastResponse.status >= 200 && lastResponse.status < 300 ? 'var(--success)' : 'var(--warning)') }}>
                    {lastResponse.error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                  </div>
                  <div>
                    <h4 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                      {lastResponse.status} {lastResponse.statusText}
                    </h4>
                    <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {lastResponse.duration}ms latency
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Response Headers */}
              <div className="flex flex-col gap-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider pl-1" style={{ color: 'var(--text-tertiary)' }}>Response Headers</h4>
                <div className="p-3.5 rounded-xl border text-xs font-mono overflow-x-auto shadow-inner bg-[var(--bg-primary)]" style={{ borderColor: 'var(--border-secondary)', color: 'var(--text-secondary)' }}>
                  {lastResponse.headers && Object.keys(lastResponse.headers).length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {Object.entries(lastResponse.headers).map(([k, v]) => (
                        <div key={k} className="whitespace-nowrap">
                          <span className="font-bold" style={{ color: 'var(--accent)' }}>{k}:</span> 
                          <span className="ml-2 opacity-90">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="opacity-50 italic">No headers received</span>
                  )}
                </div>
              </div>
              
              {/* Response Body */}
              <div className="flex-1 flex flex-col gap-2 min-h-[200px]">
                <div className="flex items-center justify-between pl-1">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Response Body</h4>
                  <button 
                    onClick={() => handleCopyText(
                      typeof lastResponse.data === 'object' ? JSON.stringify(lastResponse.data, null, 2) : String(lastResponse.data),
                      'Response copied!'
                    )}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                    style={{ color: 'var(--text-secondary)' }}
                    title="Copy response to clipboard"
                  >
                    <Copy size={10} /> Copy
                  </button>
                </div>
                <div className="flex-1 relative rounded-xl overflow-hidden border shadow-inner" style={{ borderColor: '#2d2d2d' }}>
                  <div className="absolute top-0 left-0 right-0 h-8 bg-[#1e1e1e] flex items-center px-4 border-b border-[#2d2d2d] select-none z-10">
                    <span className="text-[10px] font-mono text-[#858585]">response.json</span>
                  </div>
                  <pre className="absolute inset-0 pt-10 px-4 pb-4 overflow-auto text-[11px] font-mono leading-relaxed scrollbar-thin bg-[#141414]" style={{ color: '#d4d4d4' }}>
                    {typeof lastResponse.data === 'object' ? JSON.stringify(lastResponse.data, null, 2) : String(lastResponse.data)}
                  </pre>
                </div>
              </div>
              
            </div>
          )}
        </div>
      </div>
      )}

      {/* --- ENDPOINT SETTINGS SIDEBAR DRAWER (Wider layout with split paths sidebar & right configs) --- */}
      {isConfiguringEndpoint && activeEndpoint && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsConfiguringEndpoint(false)} />
          <div className="relative w-full max-w-3xl h-full flex flex-col shadow-2xl animation-slide-left border-l bg-[var(--bg-primary)]" style={{ borderColor: 'var(--border-secondary)' }}>
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-secondary)' }}>
              <h2 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Settings size={18} style={{ color: 'var(--accent)' }} />
                Manage Webhook Endpoints & Paths
              </h2>
              <button onClick={() => setIsConfiguringEndpoint(false)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer" style={{ color: 'var(--text-tertiary)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Split Panel Body */}
            <div className="flex-1 flex min-h-0">
              
              {/* Drawer left sidebar: List of endpoints & paths */}
              <div className="w-[260px] border-r flex flex-col bg-[var(--bg-secondary)] flex-shrink-0" style={{ borderColor: 'var(--border-secondary)' }}>
                <div className="p-3.5 border-b flex justify-between items-center bg-[var(--bg-primary)]" style={{ borderColor: 'var(--border-secondary)' }}>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-tertiary)]">Endpoints / Paths</span>
                  <button
                    onClick={handleCreateEndpoint}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded border border-dashed hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-[var(--text-secondary)] bg-[var(--bg-primary)]"
                    style={{ borderColor: 'var(--border-secondary)' }}
                  >
                    <Plus size={10} /> Add Path
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto scrollbar-thin py-3 flex flex-col gap-1 px-2.5">
                  {endpoints.map(e => {
                    const isActive = e.id === activeEndpointId;
                    return (
                      <div
                        key={e.id}
                        onClick={() => setActiveEndpointId(e.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-colors relative flex items-center justify-between group ${isActive ? 'bg-[var(--accent-bg)] border-[var(--accent)] text-[var(--accent)]' : 'hover:bg-black/5 dark:hover:bg-white/5 border-transparent'}`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-bold truncate" style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                            {e.name}
                          </span>
                          <span className="block text-[10px] font-mono opacity-65 truncate" style={{ color: 'var(--text-secondary)' }}>
                            {e.id === 'default' ? '/catch' : `/catch/${e.id}`}
                          </span>
                        </div>
                        
                        {e.id !== 'default' && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteEndpoint(e.id);
                            }}
                            className="p-1 rounded text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1.5 cursor-pointer"
                            title="Delete path"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Drawer right form: Selected path config */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin flex flex-col gap-5 bg-[var(--bg-primary)]">
                
                <p className="text-[11px] leading-relaxed opacity-85" style={{ color: 'var(--text-secondary)' }}>
                  Customize the HTTP response returned by the simulator for URL path <code>/api/webhooks/catch/{activeEndpointId}</code>.
                </p>

                {/* Endpoint Name & Custom Path Slug */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider block" style={{ color: 'var(--text-tertiary)' }}>Endpoint Display Name</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs border outline-none font-bold shadow-sm bg-[var(--bg-secondary)]"
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider block" style={{ color: 'var(--text-tertiary)' }}>API Endpoint Path / Slug</label>
                    <div className="flex items-center gap-1 bg-[var(--bg-secondary)] px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border-secondary)' }}>
                      <span className="text-[10px] font-mono opacity-60 text-[var(--text-tertiary)]">/catch/</span>
                      <input 
                        type="text" 
                        value={editCustomPath}
                        onChange={e => setEditCustomPath(e.target.value)}
                        placeholder="custom-path"
                        className="w-full bg-transparent font-mono text-xs font-bold outline-none text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                </div>

                {/* Endpoint Secret Key / Signing Key */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider flex items-center justify-between" style={{ color: 'var(--text-tertiary)' }}>
                    <span>Endpoint Key / Signing Secret</span>
                    <button
                      onClick={generateRandomEndpointKey}
                      className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Zap size={11} /> Generate Random Key
                    </button>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border-secondary)' }}>
                      <Key size={14} className="text-amber-400 shrink-0" />
                      <input 
                        type={showSecretKey ? "text" : "password"} 
                        value={editSecretKey}
                        onChange={e => setEditSecretKey(e.target.value)}
                        placeholder="whsec_123456789..."
                        className="w-full bg-transparent font-mono text-xs font-bold outline-none text-[var(--text-primary)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecretKey(!showSecretKey)}
                        className="p-1 text-[var(--text-tertiary)] hover:text-white cursor-pointer"
                      >
                        {showSecretKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {editSecretKey && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(editSecretKey, "Endpoint Key copied!")}
                        className="px-3 py-2 rounded-xl border text-xs font-bold bg-[var(--bg-secondary)] hover:bg-black/5 cursor-pointer text-[var(--text-primary)]"
                        style={{ borderColor: 'var(--border-secondary)' }}
                      >
                        <Copy size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* HTTP Status */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider block" style={{ color: 'var(--text-tertiary)' }}>HTTP Status Code</label>
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl text-xs border outline-none font-bold shadow-sm cursor-pointer bg-[var(--bg-secondary)]"
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
                    >
                      <option value="200">200 OK</option>
                      <option value="201">201 Created</option>
                      <option value="202">202 Accepted</option>
                      <option value="204">204 No Content</option>
                      <option value="400">400 Bad Request</option>
                      <option value="401">401 Unauthorized</option>
                      <option value="403">403 Forbidden</option>
                      <option value="404">404 Not Found</option>
                      <option value="500">500 Internal Error</option>
                      <option value="503">503 Unavailable</option>
                    </select>
                  </div>

                  {/* Simulated Delay */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider block" style={{ color: 'var(--text-tertiary)' }}>Latency Delay (ms)</label>
                    <input 
                      type="number" 
                      min="0"
                      max="10000"
                      value={editDelay}
                      onChange={e => setEditDelay(Math.max(0, Math.min(10000, parseInt(e.target.value) || 0)))}
                      className="w-full px-3 py-2 rounded-xl text-xs border outline-none font-mono text-center shadow-sm bg-[var(--bg-secondary)]"
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
                    />
                  </div>
                </div>

                {/* --- CHAOS & RELIABILITY CONFIGS --- */}
                <div className="p-4 border rounded-xl flex flex-col gap-4 bg-[var(--bg-secondary)] animate-fade-in" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">Chaos & Reliability Testing</h4>
                      <p className="text-[10px] opacity-75 text-[var(--text-secondary)] mt-0.5">Inject random delays, simulate 503 drops, and apply rate limiting.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editChaosEnabled}
                        onChange={e => setEditChaosEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                    </label>
                  </div>

                  {editChaosEnabled && (
                    <div className="flex flex-col gap-4 border-t pt-3 border-zinc-200 dark:border-zinc-800 animation-slide-down">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider block" style={{ color: 'var(--text-tertiary)' }}>Jitter Min Delay (ms)</label>
                          <input
                            type="number"
                            min="0"
                            max="10000"
                            value={editChaosJitterMin}
                            onChange={e => setEditChaosJitterMin(Math.max(0, Math.min(10000, parseInt(e.target.value) || 0)))}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono text-center border bg-[var(--bg-primary)]"
                            style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider block" style={{ color: 'var(--text-tertiary)' }}>Jitter Max Delay (ms)</label>
                          <input
                            type="number"
                            min="0"
                            max="10000"
                            value={editChaosJitterMax}
                            onChange={e => setEditChaosJitterMax(Math.max(0, Math.min(10000, parseInt(e.target.value) || 0)))}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono text-center border bg-[var(--bg-primary)]"
                            style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider block" style={{ color: 'var(--text-tertiary)' }}>Failure Rate (0-100%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editChaosFailureRate}
                            onChange={e => setEditChaosFailureRate(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono text-center border bg-[var(--bg-primary)]"
                            style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider block" style={{ color: 'var(--text-tertiary)' }}>Rate Limit (req/min)</label>
                          <input
                            type="number"
                            min="0"
                            value={editChaosRateLimit}
                            onChange={e => setEditChaosRateLimit(Math.max(0, parseInt(e.target.value) || 0))}
                            placeholder="0 for unlimited"
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono text-center border bg-[var(--bg-primary)]"
                            style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* --- WEBHOOK RELAYS CONFIGS --- */}
                <div className="flex flex-col gap-2 border p-4 rounded-xl bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-primary)' }}>
                  <label className="text-[10px] font-black uppercase tracking-wider flex justify-between items-center" style={{ color: 'var(--text-tertiary)' }}>
                    <span>Webhook Relays (Forwarders)</span>
                    <button
                      onClick={() => setEditRelayTargets([...editRelayTargets, ""])}
                      className="text-[10px] font-black text-[var(--accent)] hover:underline flex items-center gap-0.5 cursor-pointer bg-[var(--bg-primary)] px-2 py-0.5 rounded border"
                      style={{ borderColor: 'var(--border-secondary)' }}
                    >
                      <Plus size={10} /> Add Target
                    </button>
                  </label>
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1 mt-2">
                    {editRelayTargets.length === 0 ? (
                      <p className="text-[10px] italic py-2 text-center text-[var(--text-muted)] border border-dashed rounded-lg bg-[var(--bg-primary)]" style={{ borderColor: 'var(--border-primary)' }}>No forwarding relay targets active.</p>
                    ) : (
                      editRelayTargets.map((target, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="https://forward-to-api.com/endpoint"
                            value={target}
                            onChange={e => {
                              const updated = [...editRelayTargets];
                              updated[idx] = e.target.value;
                              setEditRelayTargets(updated);
                            }}
                            className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-mono border outline-none shadow-sm bg-[var(--bg-primary)]"
                            style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
                          />
                          <button
                            onClick={() => setEditRelayTargets(editRelayTargets.filter((_, i) => i !== idx))}
                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* --- JSON SCHEMA VALIDATION CONFIGS --- */}
                <div className="flex flex-col gap-2 border p-4 rounded-xl bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider block" style={{ color: 'var(--text-tertiary)' }}>JSON Payload Schema Validation</label>
                    <button
                      onClick={() => {
                        const sampleSchema = {
                          type: "object",
                          required: ["event", "data"],
                          properties: {
                            event: { type: "string" },
                            data: {
                              type: "object",
                              required: ["id"],
                              properties: {
                                id: { type: "string" }
                              }
                            }
                          }
                        };
                        setEditJsonSchema(JSON.stringify(sampleSchema, null, 2));
                        setEditJsonSchemaError(null);
                      }}
                      className="text-[10px] font-bold text-[var(--accent)] hover:underline cursor-pointer bg-[var(--bg-primary)] px-2 py-0.5 rounded border"
                      style={{ borderColor: 'var(--border-secondary)' }}
                    >
                      Load Sample Schema
                    </button>
                  </div>
                  <textarea
                    value={editJsonSchema}
                    onChange={e => {
                      const val = e.target.value;
                      setEditJsonSchema(val);
                      if (!val.trim()) {
                        setEditJsonSchemaError(null);
                        return;
                      }
                      try {
                        JSON.parse(val);
                        setEditJsonSchemaError(null);
                      } catch (err: any) {
                        setEditJsonSchemaError(err.message);
                      }
                    }}
                    placeholder='{"type": "object", "required": ["event"]}'
                    className="w-full min-h-[100px] p-3.5 mt-2 rounded-xl border font-mono text-xs outline-none resize-none shadow-inner bg-[var(--bg-primary)]"
                    style={{ color: 'var(--text-primary)', borderColor: editJsonSchemaError ? 'var(--error)' : 'var(--border-secondary)' }}
                    spellCheck={false}
                  />
                  {editJsonSchemaError && (
                    <span className="text-[10px] font-bold text-red-400 flex items-center gap-1.5 mt-0.5 animation-fade-in">
                      <AlertCircle size={12} /> Invalid Schema JSON: {editJsonSchemaError}
                    </span>
                  )}
                </div>

                {/* Response Headers */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-wider flex justify-between items-center" style={{ color: 'var(--text-tertiary)' }}>
                    Response Headers
                    <button
                      onClick={() => setEditHeaders([...editHeaders, { key: "", value: "" }])}
                      className="text-[10px] font-black text-[var(--accent)] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus size={10} /> Add Header
                    </button>
                  </label>
                  <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {editHeaders.length === 0 ? (
                      <p className="text-[10px] italic py-2 text-center text-[var(--text-muted)] border border-dashed rounded-lg" style={{ borderColor: 'var(--border-primary)' }}>No custom response headers configured.</p>
                    ) : (
                      editHeaders.map((h, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Header key"
                            value={h.key}
                            onChange={e => {
                              const newH = [...editHeaders];
                              newH[idx].key = e.target.value;
                              setEditHeaders(newH);
                            }}
                            className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-mono border outline-none shadow-sm bg-[var(--bg-secondary)]"
                            style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
                          />
                          <input
                            type="text"
                            placeholder="Value"
                            value={h.value}
                            onChange={e => {
                              const newH = [...editHeaders];
                              newH[idx].value = e.target.value;
                              setEditHeaders(newH);
                            }}
                            className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-mono border outline-none shadow-sm bg-[var(--bg-secondary)]"
                            style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
                          />
                          <button
                            onClick={() => setEditHeaders(editHeaders.filter((_, i) => i !== idx))}
                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Response Body payload */}
                <div className="flex-col flex gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider block" style={{ color: 'var(--text-tertiary)' }}>Response Payload (JSON or Text)</label>
                    <button
                      onClick={handleFormatEditBody}
                      className="text-[10px] font-bold text-[var(--accent)] hover:underline flex items-center gap-0.5 cursor-pointer bg-black/10 px-2 py-0.5 rounded"
                    >
                      Format JSON
                    </button>
                  </div>
                  <textarea
                    value={editBody}
                    onChange={e => handleEditBodyChange(e.target.value)}
                    placeholder='{"success": true}'
                    className="w-full min-h-[140px] p-3.5 rounded-xl border font-mono text-xs outline-none resize-none shadow-inner bg-[var(--bg-secondary)]"
                    style={{ color: 'var(--text-primary)', borderColor: editBodyError ? 'var(--error)' : 'var(--border-secondary)' }}
                    spellCheck={false}
                  />
                  {editBodyError && (
                    <span className="text-[10px] font-bold text-red-400 flex items-center gap-1.5 mt-0.5 animation-fade-in">
                      <AlertCircle size={12} /> Invalid JSON: {editBodyError}
                    </span>
                  )}
                </div>

              </div>

            </div>

            {/* Save / Cancel Drawer Actions */}
            <div className="p-5 border-t flex items-center justify-between bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-secondary)' }}>
              <div>
                {activeEndpointId !== "default" && (
                  <button
                    onClick={() => handleDeleteEndpoint(activeEndpointId)}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 transition-colors cursor-pointer"
                  >
                    Delete Path
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsConfiguringEndpoint(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer bg-[var(--bg-primary)]"
                  style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEndpoint}
                  disabled={isSavingEndpoint || !!editBodyError || !!editJsonSchemaError}
                  className="px-6 py-2 text-xs font-black rounded-xl text-white transition-all shadow hover:brightness-110 disabled:opacity-50 cursor-pointer"
                  style={{ background: 'var(--success)' }}
                >
                  {isSavingEndpoint ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
      
      {/* --- PRESETS OVERLAY (Sender mode) --- */}
      {showPresets && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowPresets(false)} />
          <div className="relative w-80 lg:w-96 h-full flex flex-col shadow-2xl animation-slide-left border-l bg-[var(--bg-primary)]" style={{ borderColor: 'var(--border-secondary)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-secondary)' }}>
              <h2 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <BookOpen size={18} style={{ color: 'var(--accent)' }} />
                Custom Presets
              </h2>
              <button onClick={() => setShowPresets(false)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer" style={{ color: 'var(--text-tertiary)' }}>
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 border-b flex flex-col gap-3 bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-secondary)' }}>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Preset Name..." 
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-bold border shadow-sm outline-none transition-colors bg-[var(--bg-primary)]"
                  style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
                />
                <button 
                  onClick={savePreset}
                  disabled={!presetName.trim()}
                  className="p-2 rounded-xl text-white disabled:opacity-50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  style={{ background: 'var(--accent)' }}
                >
                  <Save size={16} />
                </button>
              </div>
              <p className="text-[10px] italic" style={{ color: 'var(--text-tertiary)' }}>Saves current headers, event type, and payload</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin flex flex-col gap-2">
              {presets.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-50">
                  <BookOpen size={32} className="mb-4" />
                  <p className="text-xs">No presets saved yet.</p>
                </div>
              ) : (
                presets.map((preset) => (
                  <div key={preset.id} className="p-4 rounded-xl border flex flex-col gap-2 group transition-all hover:border-indigo-500/50 cursor-pointer bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-secondary)' }} onClick={() => loadPreset(preset)}>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{preset.name}</h4>
                      <button onClick={(e) => deletePreset(preset.id, e)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-black/5 dark:bg-white/5" style={{ color: 'var(--text-secondary)' }}>{preset.event}</span>
                      {preset.headers.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5" style={{ color: 'var(--text-secondary)' }}>{preset.headers.length} headers</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- OUTBOUND HISTORY OVERLAY --- */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowHistory(false)} />
          <div className="relative w-80 lg:w-96 h-full flex flex-col shadow-2xl animation-slide-left border-l bg-[var(--bg-primary)]" style={{ borderColor: 'var(--border-secondary)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-secondary)' }}>
              <h2 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <History size={18} style={{ color: 'var(--accent)' }} />
                Recent Outbound Dispatches
              </h2>
              <button onClick={() => setShowHistory(false)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer" style={{ color: 'var(--text-tertiary)' }}>
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin flex flex-col gap-2">
              {history.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-50">
                  <Clock size={32} className="mb-4" />
                  <p className="text-xs">No recent deliveries.</p>
                </div>
              ) : (
                history.map((item, idx) => (
                  <div key={idx} onClick={() => { setLastResponse(item); setShowHistory(false); }} className="p-4 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all hover:scale-[1.02] bg-[var(--bg-secondary)]" style={{ borderColor: item.error ? 'rgba(239, 68, 68, 0.2)' : (item.status >= 200 && item.status < 300 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)') }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${item.error ? 'bg-red-500' : (item.status >= 200 && item.status < 300 ? 'bg-green-500' : 'bg-yellow-500')}`} />
                        <span className="font-black text-xs" style={{ color: 'var(--text-primary)' }}>{item.status} {item.statusText}</span>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: 'var(--text-tertiary)' }}>
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono truncate opacity-60" style={{ color: 'var(--text-secondary)' }}>
                      {item.requestHeaders['Orbit-Event-Type'] || 'unknown'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- FORWARD WEBHOOK MODAL DIALOG --- */}
      {isForwardingModalOpen && selectedEventDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsForwardingModalOpen(false)} />
          <div className="relative w-full max-w-md p-6 rounded-2xl border shadow-2xl bg-[var(--bg-primary)] animation-fade-in" style={{ borderColor: 'var(--border-secondary)' }}>
            <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: 'var(--border-secondary)' }}>
              <div className="flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-purple-400" />
                <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Forward Webhook Request</h3>
              </div>
              <button onClick={() => setIsForwardingModalOpen(false)} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-[var(--text-tertiary)] cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <p className="text-xs leading-normal mb-4" style={{ color: 'var(--text-secondary)' }}>
              This will forward the selected webhook payload body and headers to a new destination URL using the simulator proxy.
            </p>

            <div className="flex flex-col gap-1.5 mb-5">
              <label className="text-[10px] font-black uppercase tracking-wider block" style={{ color: 'var(--text-tertiary)' }}>Destination Target URL</label>
              <input
                type="text"
                value={forwardTargetUrl}
                onChange={e => setForwardTargetUrl(e.target.value)}
                placeholder="https://your-api.com/webhooks/catch"
                className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-[var(--bg-secondary)]"
                style={{ color: 'var(--text-primary)', borderColor: 'var(--border-secondary)' }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsForwardingModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer bg-[var(--bg-primary)]"
                style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleForwardWebhook}
                disabled={isForwarding || !forwardTargetUrl.trim()}
                className="px-5 py-2 text-xs font-black rounded-xl text-white transition-all shadow hover:brightness-110 disabled:opacity-50 cursor-pointer"
                style={{ background: 'var(--accent)' }}
              >
                {isForwarding ? 'Forwarding...' : 'Forward Webhook'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FULLSCREEN JSON OVERLAY VIEW --- */}
      {isFullscreenJson && selectedEventDetails && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#121212] text-[#d4d4d4] p-6 animation-fade-in select-text">
          <div className="flex items-center justify-between pb-4 border-b border-[#2d2d2d] mb-4">
            <div className="flex items-center gap-3">
              <FileCode size={20} className="text-indigo-400" />
              <h3 className="text-sm font-bold font-mono">Payload Body Fullscreen - {selectedEventDetails.id}.json</h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleCopyText(
                  typeof selectedEventDetails.body === 'object' ? JSON.stringify(selectedEventDetails.body, null, 2) : String(selectedEventDetails.body),
                  'Payload copied to clipboard'
                )}
                className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 font-bold text-xs flex items-center gap-1.5 text-white cursor-pointer transition-colors"
              >
                <Copy size={13} /> Copy Payload
              </button>
              <button
                onClick={() => handleDownloadPayload(
                  `payload_${selectedEventDetails.id}.json`,
                  selectedEventDetails.body
                )}
                className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 font-bold text-xs flex items-center gap-1.5 text-white cursor-pointer transition-colors"
              >
                <Download size={13} /> Download JSON
              </button>
              <button
                onClick={() => setIsFullscreenJson(false)}
                className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-500 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto border border-[#2d2d2d] rounded-xl p-6 font-mono text-sm leading-relaxed bg-[#141414]">
            {typeof selectedEventDetails.body === 'object' ? (
              <JsonTreeView data={selectedEventDetails.body} />
            ) : (
              <pre>{String(selectedEventDetails.body)}</pre>
            )}
          </div>
        </div>
      )}

      {/* --- SIMULATOR USER GUIDE SIDEBAR --- */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsHelpOpen(false)}
          />
          
          <div className="relative w-80 lg:w-96 h-full flex flex-col shadow-2xl animation-slide-left border-l bg-[var(--bg-primary)]" style={{ borderColor: 'var(--border-secondary)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-secondary)' }}>
              <h2 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <BookOpen size={18} style={{ color: 'var(--accent)' }} />
                Simulator User Guide
              </h2>
              <button 
                onClick={() => setIsHelpOpen(false)}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin flex flex-col gap-6 pb-12">
              
              <div className="flex flex-col gap-1.5 p-4 rounded-xl border bg-gradient-to-b from-indigo-500/10 to-transparent" style={{ borderColor: 'var(--border-secondary)' }}>
                <h3 className="font-bold text-xs flex items-center gap-2 text-indigo-400">
                  <HelpCircle size={16} /> Webhook Simulation Mode
                </h3>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  This tool supports dual operations: acts as a <strong>live HTTP catcher</strong> for third-party notifications, and a <strong>client request dispatcher</strong> for triggering mock webhooks to other services.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <h3 className="font-bold text-xs flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <RadioTower size={16} style={{ color: 'var(--accent)' }} /> Webhook Listening Mode
                </h3>
                <p className="text-[11px] leading-relaxed pl-6" style={{ color: 'var(--text-secondary)' }}>
                  In Listener mode, copy the URL provided and configure it in your external application. The simulator catches every POST, PUT, or DELETE request instantly. Click any captured event in the left log to inspect headers, JSON payloads, auth details, and responses.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <h3 className="font-bold text-xs flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Settings size={16} style={{ color: 'var(--accent)' }} /> Custom Simulator Responses
                </h3>
                <p className="text-[11px] leading-relaxed pl-6" style={{ color: 'var(--text-secondary)' }}>
                  Expand the <strong>Configure Response</strong> drawer in the Listener header. You can create multiple listener paths and configure each to return custom status codes (e.g. 400 Bad Request, 500 Server error), artificial response delay latency, custom headers, and bodies.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <h3 className="font-bold text-xs flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Key size={16} style={{ color: 'var(--accent)' }} /> Auth & Signature Analyzer
                </h3>
                <p className="text-[11px] leading-relaxed pl-6" style={{ color: 'var(--text-secondary)' }}>
                  Incoming webhooks often include signature tokens or headers to verify validity. The inspector automatically detects and decodes common authentication formats, parsing bearer keys, credentials, and signature/timestamp combinations.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <h3 className="font-bold text-xs flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Play size={16} style={{ color: 'var(--accent)' }} /> Outbound Test Dispatcher
                </h3>
                <p className="text-[11px] leading-relaxed pl-6" style={{ color: 'var(--text-secondary)' }}>
                  Switch to the "Test Dispatcher" tab to manually draft and post mock webhooks. You can select pre-made templates like <code>ticket.created</code> or <code>comment.created</code>, auto-inject unique IDs and timestamps, verify signatures, and inspect the response code returned by your target API.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
