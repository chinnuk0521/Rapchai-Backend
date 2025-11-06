// api/index.js
// Vercel serverless function entry point
// This file loads the compiled app from dist/app.js

const path = require("path");
const fs = require("fs");

// Try to load dist/app.js
// In Vercel: __dirname is /var/task/api
// Try multiple paths: api/dist/app.js (copied during build), ../dist/app.js (root), etc.
let app;
const possiblePaths = [
  // First try: api/dist/app.js (copied during build)
  path.join(__dirname, "dist/app.js"),
  // Second try: ../dist/app.js (root dist folder)
  path.join(__dirname, "../dist/app.js"),
  // Third try: absolute path
  "/var/task/dist/app.js",
  // Fourth try: process.cwd() relative
  path.join(process.cwd(), "dist/app.js"),
];

console.log("🔍 [API Index] __dirname:", __dirname);
console.log("🔍 [API Index] process.cwd():", process.cwd());
console.log("🔍 [API Index] Trying paths:", possiblePaths);

let foundPath = null;
for (const appPath of possiblePaths) {
  try {
    if (fs.existsSync(appPath)) {
      foundPath = appPath;
      console.log("✅ [API Index] Found app.js at:", appPath);
      app = require(appPath);
      break;
    } else {
      console.log("❌ [API Index] Not found:", appPath);
    }
  } catch (checkError) {
    console.log("⚠️ [API Index] Error checking", appPath, ":", checkError.message);
  }
}

if (!app || !foundPath) {
  const error = new Error(
    `Failed to find app.js. Tried: ${possiblePaths.join(", ")}`
  );
  console.error("❌ [API Index] Failed to load app.js:", error);
  console.error("❌ [API Index] Error message:", error.message);
  throw error;
}

console.log("✅ [API Index] App loaded successfully from:", foundPath);
console.log("✅ [API Index] App exports:", Object.keys(app));

// Export the handler function
// dist/app.js exports: exports.createApp, exports.startServer
// We need to create a handler that uses createApp
const { createApp } = app;

if (!createApp) {
  throw new Error("createApp not found in app module. Available exports:", Object.keys(app));
}

// Import config for database connection
let connectDatabase;
try {
  const configPath = path.join(__dirname, "../dist/config/index.js");
  if (fs.existsSync(configPath)) {
    const configModule = require(configPath);
    connectDatabase = configModule.connectDatabase;
    console.log("✅ [API Index] Config module loaded");
  } else {
    console.warn("⚠️ [API Index] Config module not found, will try to load dynamically");
  }
} catch (err) {
  console.warn("⚠️ [API Index] Failed to load config module:", err.message);
}

// Global app instance for serverless (persists across invocations)
let appInstance = null;
let isDatabaseConnected = false;
let initializationPromise = null;

async function getApp() {
  // If we have a cached instance, return it
  if (appInstance) {
    return appInstance;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return await initializationPromise;
  }

  // Start new initialization
  initializationPromise = (async () => {
    try {
      console.log("🚀 [API Index] Initializing app...");

      // Connect database if available
      if (connectDatabase && !isDatabaseConnected) {
        console.log("🔍 [API Index] Connecting to database...");
        await connectDatabase();
        isDatabaseConnected = true;
        console.log("✅ [API Index] Database connected");
      }

      // Create Fastify app instance
      console.log("🔍 [API Index] Creating Fastify app...");
      appInstance = await createApp({
        logger: false, // Disable logger in serverless
      });

      console.log("✅ [API Index] App initialized successfully");
      return appInstance;
    } catch (error) {
      console.error("❌ [API Index] Error initializing app:", error);
      console.error("❌ [API Index] Error message:", error.message);
      console.error("❌ [API Index] Error stack:", error.stack);
      initializationPromise = null;
      throw error;
    }
  })();

  return await initializationPromise;
}

// Vercel serverless function handler
module.exports = async function handler(req, res) {
  try {
    // Get Fastify app instance
    const fastifyApp = await getApp();

    // Build the full URL path
    let url = req.url || "/";
    if (url.includes("?")) {
      url = url.split("?")[0];
    }

    // Prepare headers (remove host-related headers that Vercel adds)
    const headers = {};
    Object.keys(req.headers).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (
        !lowerKey.startsWith("x-vercel") &&
        lowerKey !== "host" &&
        lowerKey !== "connection"
      ) {
        headers[key] = req.headers[key];
      }
    });

    // Convert request body
    let payload = undefined;
    if (req.body) {
      if (typeof req.body === "string") {
        try {
          payload = JSON.parse(req.body);
        } catch {
          payload = req.body;
        }
      } else {
        payload = req.body;
      }
    }

    // Use Fastify's inject method to handle the request
    const response = await fastifyApp.inject({
      method: req.method || "GET",
      url: url,
      headers: headers,
      query: req.query || {},
      payload: payload,
      cookies: req.cookies || {},
    });

    // Set response headers
    if (response.headers) {
      Object.keys(response.headers).forEach((key) => {
        const value = response.headers[key];
        if (value !== undefined) {
          res.setHeader(key, value);
        }
      });
    }

    // Set status code
    res.statusCode = response.statusCode || 200;

    // Send response body
    const contentType = response.headers?.["content-type"] || "";
    if (contentType.includes("application/json")) {
      try {
        const jsonBody =
          typeof response.body === "string"
            ? JSON.parse(response.body)
            : response.json();
        res.json(jsonBody);
      } catch (parseError) {
        res.send(response.body || "");
      }
    } else {
      res.send(response.body || "");
    }
  } catch (error) {
    console.error("❌ [API Index] Serverless function error:", error);
    console.error("❌ [API Index] Error message:", error.message);
    console.error("❌ [API Index] Error stack:", error.stack);

    res.status(500).json({
      error: "Internal server error",
      message: error.message || "Unknown error",
    });
  }
};

