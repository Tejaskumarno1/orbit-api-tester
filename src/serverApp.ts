import express from "express";
import crypto from "crypto";

export default function createApp() {
  const app = express();

  // CORS middleware for all endpoints
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Verification hook to extract and preserve raw body for all content types
  app.use(express.json({
    verify: (req: any, res, buf) => {
      if (buf && Buffer.isBuffer(buf)) {
        req.rawBody = buf.toString("utf8");
      }
    }
  }));
  app.use(express.urlencoded({
    extended: true,
    verify: (req: any, res, buf) => {
      if (buf && Buffer.isBuffer(buf)) {
        req.rawBody = buf.toString("utf8");
      }
    }
  }));
  app.use(express.text({
    type: "*/*",
    verify: (req: any, res, buf) => {
      if (buf && Buffer.isBuffer(buf)) {
        req.rawBody = buf.toString("utf8");
      }
    }
  }));

  // In-memory data store for Webhook Simulator
  interface WebhookEndpoint {
    id: string;
    name: string;
    customPath?: string;
    secretKey?: string;
    responseStatus: number;
    responseDelay: number;
    responseBody: string;
    responseHeaders: { key: string; value: string }[];
    chaosEnabled?: boolean;
    chaosJitterMin?: number;
    chaosJitterMax?: number;
    chaosFailureRate?: number;
    chaosRateLimit?: number;
    relayTargets?: string[];
    jsonSchema?: string;
  }

  interface WebhookEvent {
    id: string;
    endpointId: string;
    timestamp: string;
    method: string;
    url: string;
    path: string;
    headers: Record<string, any>;
    query: Record<string, any>;
    body: any;
    rawBody: string;
    responseStatus: number;
    responseHeaders: Record<string, string>;
    responseBody: string;
    responseTime: number;
    deliveryStatus: 'Success' | 'Failed';
    validationError?: string | null;
    relayLogs?: { url: string; status: number; error?: string }[];
    signatureStatus?: 'valid' | 'invalid' | 'none';
  }

  let tunnelProcess: any = null;
  let tunnelUrl = "";

  const rateLimiterLogs: Record<string, number[]> = {};

  function validateJsonSchema(data: any, schemaStr: string): string | null {
    if (!schemaStr || !schemaStr.trim()) return null;
    let schema: any;
    try {
      schema = JSON.parse(schemaStr);
    } catch (err: any) {
      return `Invalid JSON Schema format: ${err.message}`;
    }

    function check(val: any, s: any, path: string = ""): string | null {
      if (!s || typeof s !== 'object') return null;
      
      if (s.type) {
        const type = s.type;
        if (type === 'string' && typeof val !== 'string') return `Path '${path}' should be string, got ${typeof val}`;
        if (type === 'number' && typeof val !== 'number') return `Path '${path}' should be number, got ${typeof val}`;
        if (type === 'boolean' && typeof val !== 'boolean') return `Path '${path}' should be boolean, got ${typeof val}`;
        if (type === 'object' && (typeof val !== 'object' || val === null || Array.isArray(val))) return `Path '${path}' should be object, got ${typeof val}`;
        if (type === 'array' && !Array.isArray(val)) return `Path '${path}' should be array, got ${typeof val}`;
      }

      if (s.required && Array.isArray(s.required) && typeof val === 'object' && val !== null) {
        for (const reqKey of s.required) {
          if (!(reqKey in val)) {
            return `Missing required property '${path ? path + '.' + reqKey : reqKey}'`;
          }
        }
      }

      if (s.properties && typeof val === 'object' && val !== null && !Array.isArray(val)) {
        for (const key of Object.keys(s.properties)) {
          if (key in val) {
            const err = check(val[key], s.properties[key], path ? `${path}.${key}` : key);
            if (err) return err;
          }
        }
      }

      return null;
    }

    return check(data, schema);
  }

  let endpoints: WebhookEndpoint[] = [
    {
      id: "default",
      name: "Default Endpoint",
      customPath: "default",
      secretKey: "",
      responseStatus: 200,
      responseDelay: 0,
      responseBody: JSON.stringify({ success: true, message: "Webhook received" }, null, 2),
      responseHeaders: [{ key: "Content-Type", value: "application/json" }],
      chaosEnabled: false,
      chaosJitterMin: 0,
      chaosJitterMax: 0,
      chaosFailureRate: 0,
      chaosRateLimit: 0,
      relayTargets: [],
      jsonSchema: ""
    }
  ];

  let webhookHistory: WebhookEvent[] = [];
  const sseClients = new Set<express.Response>();

  app.get(["/api/webhooks/tunnel", "/webhooks/tunnel"], (req, res) => {
    res.json({ active: !!tunnelProcess, url: tunnelUrl });
  });

  app.post(["/api/webhooks/tunnel", "/webhooks/tunnel"], async (req, res) => {
    try {
      if (tunnelProcess) {
        return res.json({ active: true, url: tunnelUrl });
      }

      let localtunnel: any;
      try {
        localtunnel = (await import("localtunnel")).default;
      } catch (e) {
        return res.status(400).json({ error: "Public tunnel service is unavailable on serverless. Host mode is active." });
      }

      const tunnel = await localtunnel({ port: 3000 });
      tunnelProcess = tunnel;
      tunnelUrl = tunnel.url;

      tunnel.on("close", () => {
        tunnelProcess = null;
        tunnelUrl = "";
      });

      res.json({ active: true, url: tunnelUrl });
    } catch (err: any) {
      console.error("[Tunnel Creation Error]:", err.message);
      res.status(500).json({ error: "Failed to establish public tunnel. Host mode active." });
    }
  });

  app.delete(["/api/webhooks/tunnel", "/webhooks/tunnel"], (req, res) => {
    if (tunnelProcess) {
      try {
        tunnelProcess.close();
      } catch (e) {}
      tunnelProcess = null;
      tunnelUrl = "";
    }
    res.json({ active: false, url: "" });
  });

  app.get(["/api/webhooks/endpoints", "/webhooks/endpoints"], (req, res) => {
    res.json(endpoints);
  });

  app.post(["/api/webhooks/endpoints", "/webhooks/endpoints"], (req, res) => {
    const { id, name, customPath, secretKey, responseStatus, responseDelay, responseBody, responseHeaders, chaosEnabled, chaosJitterMin, chaosJitterMax, chaosFailureRate, chaosRateLimit, relayTargets, jsonSchema } = req.body || {};
    
    let endpoint = endpoints.find(e => e.id === id);
    if (!endpoint) {
      endpoint = {
        id: id || `ep_${Date.now()}`,
        name: name || "New Endpoint",
        customPath: customPath || "",
        secretKey: secretKey || "",
        responseStatus: responseStatus ?? 200,
        responseDelay: responseDelay ?? 0,
        responseBody: responseBody ?? JSON.stringify({ success: true }),
        responseHeaders: responseHeaders || [{ key: "Content-Type", value: "application/json" }],
        chaosEnabled: !!chaosEnabled,
        chaosJitterMin: chaosJitterMin || 0,
        chaosJitterMax: chaosJitterMax || 0,
        chaosFailureRate: chaosFailureRate || 0,
        chaosRateLimit: chaosRateLimit || 0,
        relayTargets: relayTargets || [],
        jsonSchema: jsonSchema || ""
      };
      endpoints.push(endpoint);
    } else {
      if (name !== undefined) endpoint.name = name;
      if (customPath !== undefined) endpoint.customPath = customPath;
      if (secretKey !== undefined) endpoint.secretKey = secretKey;
      if (responseStatus !== undefined) endpoint.responseStatus = responseStatus;
      if (responseDelay !== undefined) endpoint.responseDelay = responseDelay;
      if (responseBody !== undefined) endpoint.responseBody = responseBody;
      if (responseHeaders !== undefined) endpoint.responseHeaders = responseHeaders;
      if (chaosEnabled !== undefined) endpoint.chaosEnabled = chaosEnabled;
      if (chaosJitterMin !== undefined) endpoint.chaosJitterMin = chaosJitterMin;
      if (chaosJitterMax !== undefined) endpoint.chaosJitterMax = chaosJitterMax;
      if (chaosFailureRate !== undefined) endpoint.chaosFailureRate = chaosFailureRate;
      if (chaosRateLimit !== undefined) endpoint.chaosRateLimit = chaosRateLimit;
      if (relayTargets !== undefined) endpoint.relayTargets = relayTargets;
      if (jsonSchema !== undefined) endpoint.jsonSchema = jsonSchema;
    }

    res.json(endpoint);
  });

  app.delete(["/api/webhooks/endpoints/:id", "/webhooks/endpoints/:id"], (req, res) => {
    const { id } = req.params;
    if (id === "default") {
      return res.status(400).json({ error: "Cannot delete default endpoint" });
    }
    endpoints = endpoints.filter(e => e.id !== id);
    res.json({ success: true });
  });

  app.get(["/api/webhooks/history", "/webhooks/history"], (req, res) => {
    res.json(webhookHistory);
  });

  app.post(["/api/webhooks/clear", "/webhooks/clear"], (req, res) => {
    webhookHistory = [];
    res.json({ success: true, message: "Webhook history cleared" });
  });

  app.get(["/api/webhooks/stream", "/webhooks/stream"], (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    sseClients.add(res);

    req.on("close", () => {
      sseClients.delete(res);
    });
  });

  function broadcastEvent(event: WebhookEvent) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    sseClients.forEach(client => {
      try {
        client.write(data);
      } catch (e) {
        sseClients.delete(client);
      }
    });
  }

  // Catch-all handler for Webhook Receiver
  async function handleWebhookCatch(req: express.Request, res: express.Response) {
    const startTime = Date.now();
    const rawPath = req.params[0] || "";
    const cleanPath = rawPath.replace(/^\/+/, "").replace(/\/+$/, "");

    let endpoint: WebhookEndpoint | undefined;
    if (cleanPath) {
      endpoint = endpoints.find(e => e.customPath === cleanPath || e.id === cleanPath);
    }
    if (!endpoint) {
      endpoint = endpoints.find(e => e.id === "default") || endpoints[0];
    }

    let effectiveStatus = endpoint?.responseStatus || 200;
    let effectiveDelay = endpoint?.responseDelay || 0;
    let effectiveBody = endpoint?.responseBody || JSON.stringify({ success: true });
    let effectiveHeaders = endpoint?.responseHeaders || [{ key: "Content-Type", value: "application/json" }];

    if (endpoint?.chaosEnabled) {
      if (endpoint.chaosRateLimit && endpoint.chaosRateLimit > 0) {
        const now = Date.now();
        const logs = rateLimiterLogs[endpoint.id] || [];
        const recentLogs = logs.filter(t => now - t < 60000);
        recentLogs.push(now);
        rateLimiterLogs[endpoint.id] = recentLogs;

        if (recentLogs.length > endpoint.chaosRateLimit) {
          effectiveStatus = 429;
          effectiveBody = JSON.stringify({ error: "Too Many Requests", message: "Rate limit exceeded (Chaos Simulator)" }, null, 2);
        }
      }

      if (effectiveStatus !== 429 && endpoint.chaosFailureRate && endpoint.chaosFailureRate > 0) {
        const roll = Math.random() * 100;
        if (roll < endpoint.chaosFailureRate) {
          const failCodes = [500, 502, 503, 504, 400, 401, 403];
          effectiveStatus = failCodes[Math.floor(Math.random() * failCodes.length)];
          effectiveBody = JSON.stringify({ error: "Simulated Chaos Failure", status: effectiveStatus }, null, 2);
        }
      }

      if (endpoint.chaosJitterMax && endpoint.chaosJitterMax > 0) {
        const minJ = endpoint.chaosJitterMin || 0;
        const jitter = Math.floor(Math.random() * (endpoint.chaosJitterMax - minJ + 1)) + minJ;
        effectiveDelay += jitter;
      }
    }

    if (effectiveDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, Math.min(10000, effectiveDelay)));
    }

    const reqRawBody = (req as any).rawBody || (typeof req.body === 'object' ? JSON.stringify(req.body) : String(req.body || ''));
    let reqParsedBody = req.body;

    if (typeof req.body === 'string') {
      try {
        reqParsedBody = JSON.parse(req.body);
      } catch (e) {
        reqParsedBody = req.body;
      }
    }

    const validationError = endpoint?.jsonSchema ? validateJsonSchema(reqParsedBody, endpoint.jsonSchema) : null;

    let signatureStatus: 'valid' | 'invalid' | 'none' = 'none';
    if (endpoint?.secretKey && endpoint.secretKey.trim()) {
      const secKey = endpoint.secretKey.trim();
      const orbitSigHeader = req.headers['orbit-signature'] || req.headers['x-orbit-signature'];
      const stripeSigHeader = req.headers['stripe-signature'];
      const githubSigHeader = req.headers['x-hub-signature-256'];

      if (orbitSigHeader) {
        const sigStr = String(orbitSigHeader);
        const match = sigStr.match(/t=(\d+),v1=([a-f0-9]+)/i);
        if (match) {
          const t = match[1];
          const v1 = match[2];
          const expectedSig = crypto.createHmac('sha256', secKey).update(`${t}.${reqRawBody}`).digest('hex');
          signatureStatus = (v1 === expectedSig) ? 'valid' : 'invalid';
        } else {
          const expectedSig = crypto.createHmac('sha256', secKey).update(reqRawBody).digest('hex');
          signatureStatus = (sigStr === expectedSig) ? 'valid' : 'invalid';
        }
      } else if (githubSigHeader) {
        const sigHex = String(githubSigHeader).replace(/^sha256=/, '');
        const expectedSig = crypto.createHmac('sha256', secKey).update(reqRawBody).digest('hex');
        signatureStatus = (sigHex === expectedSig) ? 'valid' : 'invalid';
      } else if (stripeSigHeader) {
        const sigStr = String(stripeSigHeader);
        const match = sigStr.match(/t=(\d+),v1=([a-f0-9]+)/i);
        if (match) {
          const t = match[1];
          const v1 = match[2];
          const expectedSig = crypto.createHmac('sha256', secKey).update(`${t}.${reqRawBody}`).digest('hex');
          signatureStatus = (v1 === expectedSig) ? 'valid' : 'invalid';
        }
      }
    }

    const relayLogs: { url: string; status: number; error?: string }[] = [];
    if (endpoint?.relayTargets && endpoint.relayTargets.length > 0) {
      for (const targetUrl of endpoint.relayTargets) {
        if (!targetUrl || !targetUrl.trim()) continue;
        try {
          const cleanHeaders = { ...req.headers };
          delete cleanHeaders['host'];
          delete cleanHeaders['content-length'];
          delete cleanHeaders['connection'];

          const rRes = await fetch(targetUrl.trim(), {
            method: req.method,
            headers: cleanHeaders as any,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? reqRawBody : undefined
          });
          relayLogs.push({ url: targetUrl, status: rRes.status });
        } catch (err: any) {
          relayLogs.push({ url: targetUrl, status: 0, error: err.message });
        }
      }
    }

    const responseHeadersObj: Record<string, string> = {};
    effectiveHeaders.forEach(h => {
      if (h.key && h.value) {
        res.setHeader(h.key, h.value);
        responseHeadersObj[h.key] = h.value;
      }
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    const eventRecord: WebhookEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      endpointId: endpoint?.id || "default",
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      path: req.path,
      headers: req.headers,
      query: req.query,
      body: reqParsedBody,
      rawBody: reqRawBody,
      responseStatus: effectiveStatus,
      responseHeaders: responseHeadersObj,
      responseBody: effectiveBody,
      responseTime,
      deliveryStatus: effectiveStatus < 400 ? 'Success' : 'Failed',
      validationError,
      relayLogs: relayLogs.length > 0 ? relayLogs : undefined,
      signatureStatus
    };

    webhookHistory.unshift(eventRecord);
    if (webhookHistory.length > 200) {
      webhookHistory = webhookHistory.slice(0, 200);
    }

    broadcastEvent(eventRecord);

    res.status(effectiveStatus).send(effectiveBody);
  }

  app.all(["/api/webhooks/catch", "/webhooks/catch"], handleWebhookCatch);
  app.all(["/api/webhooks/catch/*", "/webhooks/catch/*"], handleWebhookCatch);

  // CORS Proxy for external API requests
  const handleProxyRequest = async (req: express.Request, res: express.Response) => {
    try {
      let reqPayload = req.body;
      if (typeof reqPayload === 'string') {
        try {
          reqPayload = JSON.parse(reqPayload);
        } catch (e) {
          reqPayload = {};
        }
      }
      reqPayload = reqPayload || {};

      const { url, method, headers, body } = reqPayload;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "Missing or invalid 'url' parameter" });
      }

      const clientUserAgent = (req.headers["user-agent"] as string) || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
      
      const outgoingHeaders: Record<string, string> = {
        "User-Agent": clientUserAgent,
        "Accept": "application/json, text/plain, */*",
      };

      if (headers && typeof headers === 'object') {
        Object.entries(headers).forEach(([k, v]) => {
          if (!k || typeof k !== 'string') return;
          const lowerK = k.toLowerCase();
          if (['host', 'content-length', 'connection', 'accept-encoding'].includes(lowerK)) return;
          if (v !== undefined && v !== null) {
            outgoingHeaders[k] = String(v);
          }
        });
      }

      const fetchOptions: RequestInit = {
        method: (method || "GET").toUpperCase(),
        headers: outgoingHeaders,
      };

      if (body && (fetchOptions.method === "POST" || fetchOptions.method === "PUT" || fetchOptions.method === "PATCH" || fetchOptions.method === "DELETE")) {
        fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      const responseText = await response.text();

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      res.status(200).json({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: responseData,
      });
    } catch (error: any) {
      console.error(`[Proxy Error]`, error);
      res.status(500).json({
        error: "Proxy Error",
        message: error.message || String(error),
      });
    }
  };

  app.post(["/api/proxy", "/proxy"], handleProxyRequest);

  return app;
}
