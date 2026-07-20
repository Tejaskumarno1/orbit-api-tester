// Standalone Vercel Serverless Function for /api/proxy
// This does NOT import the full Express app to avoid localtunnel/crypto crashes

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    let reqPayload = req.body;
    if (typeof reqPayload === "string") {
      try {
        reqPayload = JSON.parse(reqPayload);
      } catch {
        reqPayload = {};
      }
    }
    reqPayload = reqPayload || {};

    const { url, method, headers, body } = reqPayload;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'url' parameter" });
    }

    // Build outgoing headers with browser-like fingerprint
    const clientUA =
      (req.headers["user-agent"] as string) ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    const outgoingHeaders: Record<string, string> = {
      "User-Agent": clientUA,
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
    };

    // Merge user-supplied headers, filtering dangerous ones
    if (headers && typeof headers === "object") {
      for (const [k, v] of Object.entries(headers)) {
        if (!k || typeof k !== "string") continue;
        const lower = k.toLowerCase();
        if (["host", "content-length", "connection", "accept-encoding"].includes(lower)) continue;
        if (v !== undefined && v !== null) {
          outgoingHeaders[k] = String(v);
        }
      }
    }

    const fetchOpts: RequestInit = {
      method: (method || "GET").toUpperCase(),
      headers: outgoingHeaders,
    };

    if (
      body &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(fetchOpts.method as string)
    ) {
      fetchOpts.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOpts);
    const responseText = await response.text();

    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return res.status(200).json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data: responseData,
    });
  } catch (error: any) {
    console.error("[Proxy Error]", error);
    return res.status(500).json({
      error: "Proxy Error",
      message: error.message || String(error),
    });
  }
}
