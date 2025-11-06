// api/index.js
// Vercel serverless function entry point
// This file loads the compiled app from dist/app.js

const path = require("path");
const fs = require("fs");

// Try to load dist/app.js
// In Vercel: __dirname is /var/task/api
// Try multiple paths: api/dist/app.js (copied during build), ../dist/app.js (root), etc.
let app;
let foundPath = null;

// Helper function to check if a path exists and is readable
function tryRequire(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        return require(filePath);
      }
    }
  } catch (err) {
    // Ignore errors, will try next path
  }
  return null;
}

// Helper function to list directory contents for debugging
function listDir(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      return fs.readdirSync(dirPath);
    }
  } catch (err) {
    // Ignore errors
  }
  return [];
}

// Build comprehensive list of possible paths
const possiblePaths = [
  // First try: api/dist/app.js (copied during build - most likely location)
  path.join(__dirname, "dist/app.js"),
  // Second try: ../dist/app.js (root dist folder)
  path.join(__dirname, "../dist/app.js"),
  // Third try: absolute path from root
  "/var/task/dist/app.js",
  // Fourth try: absolute path from api
  "/var/task/api/dist/app.js",
  // Fifth try: process.cwd() relative
  path.join(process.cwd(), "dist/app.js"),
  // Sixth try: process.cwd() relative from api
  path.join(process.cwd(), "api/dist/app.js"),
];

console.log("🔍 [API Index] __dirname:", __dirname);
console.log("🔍 [API Index] process.cwd():", process.cwd());
console.log("🔍 [API Index] Trying paths:", possiblePaths);

// Debug: List what's actually in __dirname
console.log("🔍 [API Index] Contents of __dirname:", listDir(__dirname));
console.log("🔍 [API Index] Contents of __dirname/..:", listDir(path.join(__dirname, "..")));

// Try each path
for (const appPath of possiblePaths) {
  try {
    const requiredApp = tryRequire(appPath);
    if (requiredApp) {
      foundPath = appPath;
      app = requiredApp;
      console.log("✅ [API Index] Found app.js at:", appPath);
      break;
    } else {
      console.log("❌ [API Index] Not found:", appPath);
    }
  } catch (checkError) {
    console.log("⚠️ [API Index] Error checking", appPath, ":", checkError.message);
  }
}

if (!app || !foundPath) {
  // Additional debugging: try to find any app.js file
  console.log("🔍 [API Index] Searching for app.js in common locations...");
  const searchPaths = [
    path.join(__dirname, "dist"),
    path.join(__dirname, "../dist"),
    "/var/task/dist",
    "/var/task/api/dist",
  ];
  
  for (const searchPath of searchPaths) {
    try {
      if (fs.existsSync(searchPath)) {
        const files = listDir(searchPath);
        console.log(`🔍 [API Index] Files in ${searchPath}:`, files.slice(0, 10));
        if (files.includes("app.js")) {
          const fullPath = path.join(searchPath, "app.js");
          console.log(`🔍 [API Index] Found app.js at ${fullPath}, trying to require...`);
          try {
            app = require(fullPath);
            foundPath = fullPath;
            console.log("✅ [API Index] Successfully loaded app.js from:", fullPath);
            break;
          } catch (requireError) {
            // Check if it's an environment validation error
            const errorMessage = requireError.message || "";
            if (errorMessage.includes("Environment validation failed") || 
                errorMessage.includes("DATABASE_URL") || 
                errorMessage.includes("JWT_SECRET") ||
                errorMessage.includes("JWT_REFRESH_SECRET")) {
              // Environment validation error - this is expected at module load time
              // The env vars will be available at runtime
              console.log("⚠️ [API Index] Environment validation error (expected at load time):", requireError.message);
              console.log("ℹ️ [API Index] Environment variables will be validated at runtime");
              // Mark the file as found - we'll load it lazily at runtime when env vars are available
              foundPath = fullPath;
              // Clear the module cache so we can require it again at runtime
              try {
                const resolvedPath = require.resolve(fullPath);
                if (require.cache[resolvedPath]) {
                  delete require.cache[resolvedPath];
                  console.log("✅ [API Index] Cleared module cache for lazy loading");
                }
              } catch (cacheError) {
                // Ignore cache errors - module might not be cached yet
                console.log("ℹ️ [API Index] Module not in cache yet (will load at runtime)");
              }
              console.log("✅ [API Index] Marked app.js as found (will load lazily at runtime)");
              // Don't set app here - we'll load it lazily when needed
              break;
            } else {
              console.log("⚠️ [API Index] Failed to require:", requireError.message);
            }
          }
        }
      }
    } catch (err) {
      // Ignore errors
    }
  }
}

if (!foundPath) {
  const error = new Error(
    `Failed to find app.js. Tried: ${possiblePaths.join(", ")}`
  );
  console.error("❌ [API Index] Failed to load app.js:", error);
  console.error("❌ [API Index] Error message:", error.message);
  throw error;
}

// If app is not loaded yet (due to environment validation error), we'll load it lazily
let appModule = app;
let appModulePath = foundPath;

// Lazy load function for app module
function loadAppModule() {
  if (!appModule) {
    // Check if required environment variables are available before requiring
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      const error = new Error(
        `Missing required environment variables: ${missingEnvVars.join(', ')}. ` +
        `Please set them in Vercel Dashboard → Settings → Environment Variables → Production.`
      );
      console.error("❌ [API Index] Environment variables missing:", missingEnvVars);
      throw error;
    }
    
    try {
      console.log("🔄 [API Index] Loading app.js lazily from:", appModulePath);
      appModule = require(appModulePath);
      console.log("✅ [API Index] App loaded successfully from:", appModulePath);
      console.log("✅ [API Index] App exports:", Object.keys(appModule));
    } catch (loadError) {
      const errorMessage = loadError.message || "";
      // Check if it's still an environment validation error
      if (errorMessage.includes("Environment validation failed") || 
          errorMessage.includes("DATABASE_URL") || 
          errorMessage.includes("JWT_SECRET") ||
          errorMessage.includes("JWT_REFRESH_SECRET")) {
        const error = new Error(
          `Environment validation failed. Missing: ${missingEnvVars.join(', ')}. ` +
          `Please set them in Vercel Dashboard → Settings → Environment Variables → Production.`
        );
        console.error("❌ [API Index] Environment validation failed:", errorMessage);
        throw error;
      }
      console.error("❌ [API Index] Failed to load app.js:", loadError);
      console.error("❌ [API Index] Error message:", loadError.message);
      throw loadError;
    }
  }
  return appModule;
}

if (app) {
  console.log("✅ [API Index] App loaded successfully from:", foundPath);
  console.log("✅ [API Index] App exports:", Object.keys(app));
} else {
  console.log("ℹ️ [API Index] App module will be loaded lazily at runtime");
}

// Export the handler function
// dist/app.js exports: exports.createApp, exports.startServer
// We need to create a handler that uses createApp
function getCreateApp() {
  const module = loadAppModule();
  if (!module || !module.createApp) {
    throw new Error("createApp not found in app module. Available exports:", module ? Object.keys(module) : "module not loaded");
  }
  return module.createApp;
}

// Import config for database connection
let connectDatabase;
try {
  // Try multiple paths for config
  const configPaths = [
    path.join(path.dirname(foundPath), "config/index.js"), // Same directory as app.js
    path.join(__dirname, "dist/config/index.js"),
    path.join(__dirname, "../dist/config/index.js"),
    "/var/task/dist/config/index.js",
    "/var/task/api/dist/config/index.js",
  ];
  
  let configModule = null;
  for (const configPath of configPaths) {
    try {
      const requiredConfig = tryRequire(configPath);
      if (requiredConfig) {
        configModule = requiredConfig;
        console.log("✅ [API Index] Config module loaded from:", configPath);
        break;
      }
    } catch (err) {
      // Try next path
    }
  }
  
  if (configModule) {
    connectDatabase = configModule.connectDatabase;
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
      const createApp = getCreateApp();
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

