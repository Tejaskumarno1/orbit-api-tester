import express from "express";
import path from "path";
import { spawn } from "child_process";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use a custom verification hook to extract and preserve raw body for all content types
  app.use(express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString("utf8");
    }
  }));
  app.use(express.urlencoded({
    extended: true,
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString("utf8");
    }
  }));
  app.use(express.text({
    type: "*/*",
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString("utf8");
    }
  }));

  // In-memory data store for Webhook Simulator
  interface WebhookEndpoint {
    id: string;
    name: string;
    responseStatus: number;
    responseDelay: number; // in milliseconds
    responseBody: string;
    responseHeaders: { key: string; value: string }[];
    
    // Chaos testing properties
    chaosEnabled?: boolean;
    chaosJitterMin?: number;
    chaosJitterMax?: number;
    chaosFailureRate?: number;
    chaosRateLimit?: number;
    
    // Relay targets list
    relayTargets?: string[];
    
    // JSON validation schema
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
    responseTime: number; // latency in ms
    deliveryStatus: 'Success' | 'Failed';
    validationError?: string | null;
    relayLogs?: { url: string; status: number; error?: string }[];
  }

  // Localtunnel Process Manager
  let tunnelProcess: any = null;
  let tunnelUrl = "";

  // Chaos Rate Limiter Tracking: endpointId -> timestamp list
  const rateLimiterLogs: Record<string, number[]> = {};

  // Custom JSON Schema validator function
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
      
      // Check type matching
      if (s.type) {
        const type = s.type;
        if (type === 'string' && typeof val !== 'string') return `Path '${path}' should be string, got ${typeof val}`;
        if (type === 'number' && typeof val !== 'number') return `Path '${path}' should be number, got ${typeof val}`;
        if (type === 'boolean' && typeof val !== 'boolean') return `Path '${path}' should be boolean, got ${typeof val}`;
        if (type === 'object' && (typeof val !== 'object' || val === null || Array.isArray(val))) return `Path '${path}' should be object`;
        if (type === 'array' && !Array.isArray(val)) return `Path '${path}' should be array`;
      }

      // Check required fields for objects
      if (s.required && Array.isArray(s.required)) {
        if (!val || typeof val !== 'object') return `Path '${path}' is not an object but required fields are specified`;
        for (const req of s.required) {
          if (!(req in val)) {
            return `Path '${path ? `${path}.` : ""}${req}' is required`;
          }
        }
      }

      // Check properties
      if (s.properties && typeof s.properties === 'object' && val && typeof val === 'object') {
        for (const key of Object.keys(s.properties)) {
          if (key in val) {
            const err = check(val[key], s.properties[key], path ? `${path}.${key}` : key);
            if (err) return err;
          }
        }
      }

      // Check array items
      if (s.items && typeof s.items === 'object' && Array.isArray(val)) {
        for (let i = 0; i < val.length; i++) {
          const err = check(val[i], s.items, `${path}[${i}]`);
          if (err) return err;
        }
      }

      return null;
    }

    try {
      return check(data, schema);
    } catch (err: any) {
      return `Validation exception: ${err.message}`;
    }
  }

  let endpoints: WebhookEndpoint[] = [
    {
      id: "default",
      name: "Default Endpoint",
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

  // REST API for localtunnel manager
  app.get("/api/webhooks/tunnel", (req, res) => {
    res.json({ active: !!tunnelProcess, url: tunnelUrl });
  });

  app.post("/api/webhooks/tunnel", (req, res) => {
    if (tunnelProcess) {
      return res.json({ success: true, url: tunnelUrl });
    }
    
    console.log("[Tunnel] Starting localhost.run SSH tunnel on port 3000...");
    tunnelProcess = spawn("ssh", [
      "-o", "StrictHostKeyChecking=no",
      "-o", "ServerAliveInterval=30",
      "-R", "80:localhost:3000",
      "nokey@localhost.run"
    ]);
    
    let isFinished = false;
    const handleOutput = (data: any) => {
      const str = data.toString();
      const match = str.match(/https:\/\/[a-zA-Z0-9-]+\.lhr\.life/);
      if (match) {
        tunnelUrl = match[0].trim();
        console.log(`[Tunnel] Public tunnel URL established: ${tunnelUrl}`);
        if (!isFinished) {
          isFinished = true;
          res.json({ success: true, url: tunnelUrl });
        }
      }
    };

    tunnelProcess.stdout.on("data", handleOutput);
    tunnelProcess.stderr.on("data", (data: any) => {
      handleOutput(data);
      console.error(`[Tunnel Log] ${data.toString()}`);
    });
    
    tunnelProcess.on("close", (code: number) => {
      console.log(`[Tunnel] Process exited with code ${code}`);
      tunnelProcess = null;
      tunnelUrl = "";
    });
    
    setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        res.status(500).json({ error: "Failed to establish tunnel connection within timeout." });
      }
    }, 15000);
  });

  app.delete("/api/webhooks/tunnel", (req, res) => {
    if (tunnelProcess) {
      tunnelProcess.kill();
      tunnelProcess = null;
      tunnelUrl = "";
      console.log("[Tunnel] Public tunnel terminated.");
    }
    res.json({ success: true });
  });

  // REST API for session package imports
  app.post("/api/webhooks/import", (req, res) => {
    const { endpoints: importedEndpoints, webhookHistory: importedHistory } = req.body;
    if (Array.isArray(importedEndpoints)) {
      endpoints = importedEndpoints;
    }
    if (Array.isArray(importedHistory)) {
      webhookHistory = importedHistory;
    }
    res.json({ success: true, endpointsCount: endpoints.length, historyCount: webhookHistory.length });
  });

  // REST API for managing Webhook Endpoints
  app.get("/api/webhooks/endpoints", (req, res) => {
    res.json(endpoints);
  });

  app.post("/api/webhooks/endpoints", (req, res) => {
    const { 
      name, responseStatus, responseDelay, responseBody, responseHeaders,
      chaosEnabled, chaosJitterMin, chaosJitterMax, chaosFailureRate, chaosRateLimit,
      relayTargets, jsonSchema
    } = req.body;
    const newEndpoint: WebhookEndpoint = {
      id: "wh_" + Math.random().toString(36).substring(2, 11),
      name: name || "New Endpoint",
      responseStatus: responseStatus !== undefined ? Number(responseStatus) : 200,
      responseDelay: responseDelay !== undefined ? Number(responseDelay) : 0,
      responseBody: responseBody !== undefined ? String(responseBody) : JSON.stringify({ success: true }, null, 2),
      responseHeaders: responseHeaders || [{ key: "Content-Type", value: "application/json" }],
      chaosEnabled: !!chaosEnabled,
      chaosJitterMin: chaosJitterMin !== undefined ? Number(chaosJitterMin) : 0,
      chaosJitterMax: chaosJitterMax !== undefined ? Number(chaosJitterMax) : 0,
      chaosFailureRate: chaosFailureRate !== undefined ? Number(chaosFailureRate) : 0,
      chaosRateLimit: chaosRateLimit !== undefined ? Number(chaosRateLimit) : 0,
      relayTargets: Array.isArray(relayTargets) ? relayTargets : [],
      jsonSchema: jsonSchema !== undefined ? String(jsonSchema) : ""
    };
    endpoints.push(newEndpoint);
    res.status(201).json(newEndpoint);
  });

  app.put("/api/webhooks/endpoints/:id", (req, res) => {
    const { id } = req.params;
    const { 
      name, responseStatus, responseDelay, responseBody, responseHeaders,
      chaosEnabled, chaosJitterMin, chaosJitterMax, chaosFailureRate, chaosRateLimit,
      relayTargets, jsonSchema
    } = req.body;
    const index = endpoints.findIndex(e => e.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Endpoint not found" });
    }
    endpoints[index] = {
      ...endpoints[index],
      name: name !== undefined ? name : endpoints[index].name,
      responseStatus: responseStatus !== undefined ? Number(responseStatus) : endpoints[index].responseStatus,
      responseDelay: responseDelay !== undefined ? Number(responseDelay) : endpoints[index].responseDelay,
      responseBody: responseBody !== undefined ? String(responseBody) : endpoints[index].responseBody,
      responseHeaders: responseHeaders !== undefined ? responseHeaders : endpoints[index].responseHeaders,
      chaosEnabled: chaosEnabled !== undefined ? !!chaosEnabled : endpoints[index].chaosEnabled,
      chaosJitterMin: chaosJitterMin !== undefined ? Number(chaosJitterMin) : endpoints[index].chaosJitterMin,
      chaosJitterMax: chaosJitterMax !== undefined ? Number(chaosJitterMax) : endpoints[index].chaosJitterMax,
      chaosFailureRate: chaosFailureRate !== undefined ? Number(chaosFailureRate) : endpoints[index].chaosFailureRate,
      chaosRateLimit: chaosRateLimit !== undefined ? Number(chaosRateLimit) : endpoints[index].chaosRateLimit,
      relayTargets: relayTargets !== undefined ? (Array.isArray(relayTargets) ? relayTargets : []) : endpoints[index].relayTargets,
      jsonSchema: jsonSchema !== undefined ? String(jsonSchema) : endpoints[index].jsonSchema,
    };
    res.json(endpoints[index]);
  });

  app.delete("/api/webhooks/endpoints/:id", (req, res) => {
    const { id } = req.params;
    if (id === "default") {
      return res.status(400).json({ error: "Cannot delete the default endpoint" });
    }
    const index = endpoints.findIndex(e => e.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Endpoint not found" });
    }
    endpoints.splice(index, 1);
    res.json({ success: true });
  });

  // REST API for Webhook History
  app.get("/api/webhooks/history", (req, res) => {
    res.json(webhookHistory);
  });

  app.delete("/api/webhooks/history", (req, res) => {
    webhookHistory = [];
    res.json({ success: true });
  });

  app.get("/api/webhooks/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    sseClients.add(res);
    req.on("close", () => {
      sseClients.delete(res);
    });
  });

  // Handle all methods dynamically to catch any incoming webhook
  app.all(["/api/webhooks/catch", "/api/webhooks/catch/*"], async (req, res) => {
    const startTime = Date.now();

    // Extract endpointId from path
    let endpointId = "default";
    const pathParts = req.path.split("/").filter(Boolean);
    if (pathParts.length > 3) {
      endpointId = pathParts[3];
    }

    // Find the configuration for this endpoint
    const endpoint = endpoints.find(e => e.id === endpointId) || endpoints.find(e => e.id === "default") || {
      id: "default",
      name: "Default Endpoint",
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
    };

    // Chaos Testing: Rate limit check (limit per minute)
    if (endpoint.chaosEnabled && endpoint.chaosRateLimit && endpoint.chaosRateLimit > 0) {
      const now = Date.now();
      const logs = rateLimiterLogs[endpoint.id] || [];
      const activeLogs = logs.filter(t => now - t < 60000);
      
      if (activeLogs.length >= endpoint.chaosRateLimit) {
        const responseTime = Date.now() - startTime;
        const resBody = JSON.stringify({ error: "Too Many Requests (Chaos Rate Limit Exceeded)" }, null, 2);
        
        const webhookEvent: WebhookEvent = {
          id: "evt_" + Math.random().toString(36).substring(2, 15),
          endpointId: endpoint.id,
          timestamp: new Date().toISOString(),
          method: req.method,
          url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
          path: req.path,
          headers: req.headers,
          query: req.query,
          body: req.body,
          rawBody: (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) || "",
          responseStatus: 429,
          responseHeaders: { "Content-Type": "application/json" },
          responseBody: resBody,
          responseTime: responseTime,
          deliveryStatus: 'Failed',
          validationError: "Rate limit exceeded (Chaos testing)",
          relayLogs: []
        };
        
        webhookHistory.unshift(webhookEvent);
        if (webhookHistory.length > 100) webhookHistory = webhookHistory.slice(0, 100);
        sseClients.forEach(c => c.write(`data: ${JSON.stringify(webhookEvent)}\n\n`));
        
        res.status(429).json({ error: "Too Many Requests (Chaos Rate Limit Exceeded)" });
        return;
      }
      
      activeLogs.push(now);
      rateLimiterLogs[endpoint.id] = activeLogs;
    }

    // Apply delay latency (regular responseDelay OR chaos jitter latency range)
    let jitterDelay = 0;
    if (endpoint.chaosEnabled && endpoint.chaosJitterMax && endpoint.chaosJitterMin && endpoint.chaosJitterMax > endpoint.chaosJitterMin) {
      const min = endpoint.chaosJitterMin;
      const max = endpoint.chaosJitterMax;
      jitterDelay = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    const finalDelay = Math.max(endpoint.responseDelay || 0, jitterDelay);
    if (finalDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }

    const responseTime = Date.now() - startTime;

    // Prepare response status and body (regular status OR chaos random failure simulator)
    let resStatus = endpoint.responseStatus;
    let responseBody = endpoint.responseBody;
    
    if (endpoint.chaosEnabled && endpoint.chaosFailureRate && endpoint.chaosFailureRate > 0) {
      if (Math.random() * 100 < endpoint.chaosFailureRate) {
        resStatus = Math.random() > 0.5 ? 503 : 500;
        responseBody = JSON.stringify({ error: `Chaos Simulated Failure (${resStatus})` }, null, 2);
      }
    }

    // JSON Schema Validation
    let validationError: string | null = null;
    if (endpoint.jsonSchema && endpoint.jsonSchema.trim()) {
      validationError = validateJsonSchema(req.body, endpoint.jsonSchema);
    }

    // Webhook Relays / Forwarding
    const relayLogs: { url: string; status: number; error?: string }[] = [];
    if (endpoint.relayTargets && endpoint.relayTargets.length > 0) {
      const forwardPromises = endpoint.relayTargets.map(async (targetUrl) => {
        try {
          const headersCopy = { ...req.headers };
          delete headersCopy['host'];
          delete headersCopy['content-length'];
          delete headersCopy['connection'];
          delete headersCopy['accept-encoding'];
          
          const fetchOptions: RequestInit = {
            method: req.method,
            headers: headersCopy as any,
          };
          if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
            fetchOptions.body = typeof req.body === 'object' ? JSON.stringify(req.body) : String(req.body);
          }
          
          const response = await fetch(targetUrl, fetchOptions);
          relayLogs.push({
            url: targetUrl,
            status: response.status
          });
        } catch (err: any) {
          relayLogs.push({
            url: targetUrl,
            status: 0,
            error: err.message || String(err)
          });
        }
      });
      await Promise.all(forwardPromises);
    }

    // Prepare response headers
    const resHeaders: Record<string, string> = {};
    endpoint.responseHeaders.forEach(h => {
      if (h.key && h.value) {
        resHeaders[h.key] = h.value;
      }
    });

    Object.entries(resHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Save detailed event to history
    const webhookEvent: WebhookEvent = {
      id: "evt_" + Math.random().toString(36).substring(2, 15),
      endpointId: endpoint.id,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      path: req.path,
      headers: req.headers,
      query: req.query,
      body: req.body,
      rawBody: (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) || "",
      responseStatus: resStatus,
      responseHeaders: resHeaders,
      responseBody: responseBody,
      responseTime: responseTime,
      deliveryStatus: resStatus < 400 ? 'Success' : 'Failed',
      validationError,
      relayLogs
    };

    webhookHistory.unshift(webhookEvent);
    if (webhookHistory.length > 100) {
      webhookHistory = webhookHistory.slice(0, 100);
    }

    // Broadcast to all connected SSE clients
    sseClients.forEach((client) => {
      client.write(`data: ${JSON.stringify(webhookEvent)}\n\n`);
    });

    console.log(`[Webhook Catcher] Received ${req.method} on ${req.path} for endpoint ${endpoint.id} (Status: ${resStatus}, Latency: ${responseTime}ms)`);

    try {
      const jsonParsed = JSON.parse(responseBody);
      res.status(resStatus).json(jsonParsed);
    } catch {
      res.status(resStatus).send(responseBody);
    }
  });

  // API Route: CORS-Safe Proxy
  app.post("/api/proxy", async (req, res) => {
    const { url, method, headers, body } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Missing target 'url' in request body." });
    }

    try {
      console.log(`[Proxy] ${method || "GET"} ${url}`);

      const fetchOptions: RequestInit = {
        method: method || "GET",
        headers: headers || {},
      };

      if (body && (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE")) {
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

      // Extract response headers
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
  });

  // Serve static assets / Vite Dev Server
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in DEVELOPMENT mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server", err);
});
