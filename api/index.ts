// @ts-nocheck
// This file is a serverless function entry point and doesn't need strict type checking
// The dynamic imports from dist/ are runtime-only and don't exist at compile time

// CRITICAL: Runtime path alias resolution MUST run BEFORE any imports
// This ensures @/ paths work even if tsc-alias didn't resolve all paths during build
// We use both tsconfig-paths AND a custom Module resolver for maximum compatibility

// Set up path resolver IMMEDIATELY - before any other requires
const path = require('path');
const fs = require('fs');
const Module = require('module');

// Get absolute paths for better detection
const projectRoot = path.resolve(__dirname, '..');

// Now import type definitions and dotenv AFTER resolver setup
// Use require for runtime, types are handled by @ts-nocheck
const vercelNode = require('@vercel/node');
// Load environment variables (Vercel provides them, but this ensures they're available)
require('dotenv/config');

// Type definitions for TypeScript (even though we use @ts-nocheck)
// @ts-ignore - types are available at runtime
type VercelRequest = any;
type VercelResponse = any;
const possibleBasePaths = [
  path.join(projectRoot, 'dist'),
  path.join(projectRoot, 'src'),
  path.join(__dirname, 'dist'),
  path.join(__dirname, 'src'),
  path.resolve('./dist'),
  path.resolve('./src'),
  '/var/task/src',  // Vercel's actual runtime location
  '/var/task/dist'
];

// Detect where files actually are
let detectedBasePath = null;
for (const base of possibleBasePaths) {
  try {
    const testPath = path.join(base, 'config', 'env.js');
    if (fs.existsSync(testPath)) {
      detectedBasePath = base;
      console.log(`✅ Detected files in: ${detectedBasePath}`);
      break;
    }
  } catch (e) {
    // Continue to next path
  }
}

// Path mapping configuration
const pathMapping = {
  '@': detectedBasePath || path.join(projectRoot, 'src'),
  '@/config': path.join(detectedBasePath || path.join(projectRoot, 'src'), 'config'),
  '@/middleware': path.join(detectedBasePath || path.join(projectRoot, 'src'), 'middleware'),
  '@/routes': path.join(detectedBasePath || path.join(projectRoot, 'src'), 'routes'),
  '@/services': path.join(detectedBasePath || path.join(projectRoot, 'src'), 'services'),
  '@/schemas': path.join(detectedBasePath || path.join(projectRoot, 'src'), 'schemas'),
  '@/utils': path.join(detectedBasePath || path.join(projectRoot, 'src'), 'utils'),
  '@/types': path.join(detectedBasePath || path.join(projectRoot, 'src'), 'types'),
  '@/jobs': path.join(detectedBasePath || path.join(projectRoot, 'src'), 'jobs'),
  '@/plugins': path.join(detectedBasePath || path.join(projectRoot, 'src'), 'plugins')
};

// Custom module resolver that intercepts ALL require() calls
// This MUST be set up before any modules are loaded
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request: string, parent: any, isMain: boolean, options: any) {
  // If the request starts with @/, resolve it using our path mapping
  if (request && request.startsWith('@/')) {
    // Extract the path after @/
    const aliasPath = request.substring(2); // Remove '@/'
    
    // Try to resolve using detected base path first
    let resolvedPath = null;
    for (const base of possibleBasePaths) {
      try {
        const candidatePath = path.join(base, aliasPath);
        // Try with .js extension
        if (fs.existsSync(candidatePath + '.js')) {
          resolvedPath = candidatePath + '.js';
          console.log(`✅ Resolved ${request} → ${resolvedPath} (from ${base})`);
          break;
        }
        // Try without extension (for directories with index.js)
        if (fs.existsSync(candidatePath)) {
          const indexPath = path.join(candidatePath, 'index.js');
          if (fs.existsSync(indexPath)) {
            resolvedPath = indexPath;
            console.log(`✅ Resolved ${request} → ${resolvedPath} (from ${base})`);
            break;
          }
        }
      } catch (e) {
        // Continue to next path
      }
    }
    
    if (resolvedPath) {
      try {
        return originalResolveFilename.call(this, resolvedPath, parent, isMain, options);
      } catch (e: any) {
        console.error(`❌ Failed to resolve ${request} → ${resolvedPath}:`, e?.message);
        // Fall through to original resolution
      }
    } else {
      console.error(`❌ Could not resolve ${request} - tried all base paths:`, possibleBasePaths);
    }
  }
  
  // Fall back to original resolution
  try {
    return originalResolveFilename.call(this, request, parent, isMain, options);
  } catch (e: any) {
    // If original resolution fails and it's an @/ path, provide better error
    if (request && request.startsWith('@/')) {
      console.error(`❌ Module resolution failed for ${request}`);
      console.error(`   Parent: ${parent?.filename || 'unknown'}`);
      console.error(`   Available base paths:`, possibleBasePaths);
      throw new Error(`Cannot find module '${request}'. Path resolver tried: ${possibleBasePaths.join(', ')}`);
    }
    throw e;
  }
};

// Also register with tsconfig-paths as fallback
try {
  const tsPaths = require('tsconfig-paths');
  const pathConfig = {
    '@/*': ['*'],
    '@/config/*': ['config/*'],
    '@/middleware/*': ['middleware/*'],
    '@/routes/*': ['routes/*'],
    '@/services/*': ['services/*'],
    '@/schemas/*': ['schemas/*'],
    '@/utils/*': ['utils/*'],
    '@/types/*': ['types/*'],
    '@/jobs/*': ['jobs/*'],
    '@/plugins/*': ['plugins/*']
  };
  
  // Register for all possible base paths
  for (const base of possibleBasePaths) {
    try {
      tsPaths.register({
        baseUrl: base,
        paths: pathConfig
      });
      console.log(`✅ Registered tsconfig-paths for: ${base}`);
    } catch (e) {
      // Multiple registrations might fail, that's okay
    }
  }
  
  console.log('✅ tsconfig-paths registered as fallback');
} catch (e) {
  console.log('⚠️ tsconfig-paths not available, using custom resolver only');
}

console.log('✅ Runtime path alias resolution configured (custom resolver + tsconfig-paths)');

// Use lazy imports to handle module-level errors gracefully
// These will be loaded dynamically when needed
let createAppModule: any = null;
let configModule: any = null;

// Global app instance for serverless (persists across invocations)
let appInstance: any = null;
let isDatabaseConnected = false;
let initializationPromise: Promise<any> | null = null;
let initializationError: Error | null = null;
const MAX_INIT_RETRIES = 3;
const INIT_TIMEOUT_MS = 10000; // 10 seconds timeout for initialization

async function connectDatabaseWithRetry(
  connectDatabaseFn: () => Promise<void>, 
  retries = MAX_INIT_RETRIES
): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Database connection attempt ${attempt}/${retries}...`);
      
      // Add timeout to prevent hanging indefinitely
      const connectionPromise = connectDatabaseFn();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database connection timeout')), INIT_TIMEOUT_MS);
      });
      
      await Promise.race([connectionPromise, timeoutPromise]);
      
      console.log('✅ Database connected successfully');
      isDatabaseConnected = true;
      return;
    } catch (error: any) {
      lastError = error;
      console.error(`Database connection attempt ${attempt} failed:`, error?.message || error);
      
      if (attempt < retries) {
        // Exponential backoff: wait 1s, 2s, 4s between retries
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed - reset state and throw
  isDatabaseConnected = false;
  throw lastError || new Error('Database connection failed after all retries');
}

async function getApp(createAppFn: (options?: any) => Promise<any>, connectDatabaseFn: () => Promise<void>) {
  // If we have a cached instance, return it
  if (appInstance) {
    return appInstance;
  }

  // If initialization failed previously, reset after a delay to allow recovery
  if (initializationError) {
    const errorAge = Date.now() - (initializationError as any).timestamp;
    // Reset error state after 30 seconds to allow retry
    if (errorAge > 30000) {
      console.log('Resetting initialization error state for retry...');
      initializationError = null;
      initializationPromise = null;
    } else {
      throw new Error(`Previous initialization failed: ${initializationError.message}`);
    }
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    try {
      return await initializationPromise;
    } catch (error) {
      // If initialization promise failed, clear it and retry
      initializationPromise = null;
      throw error;
    }
  }

  // Start new initialization
  initializationPromise = (async () => {
    try {
      // Connect database with retry logic
      if (!isDatabaseConnected) {
        await connectDatabaseWithRetry(connectDatabaseFn);
      }
      
      // Create Fastify app instance
      console.log('Creating Fastify app...');
      appInstance = await createAppFn({
        logger: false, // Disable logger in serverless
      });

      // Note: We don't need app.ready() in serverless - Fastify is ready after registration
      // app.ready() is mainly needed for server.listen() which we don't use here
      console.log('✅ Fastify app initialized successfully');
      
      // Clear any previous errors on success
      initializationError = null;
      
      return appInstance;
    } catch (error: any) {
      console.error('❌ Error initializing app:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      
      // Reset state on failure so next request can retry
      appInstance = null;
      isDatabaseConnected = false;
      
      // Store error with timestamp for eventual recovery
      (error as any).timestamp = Date.now();
      initializationError = error;
      initializationPromise = null;
      
      throw error;
    }
  })();

  try {
    return await initializationPromise;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure we always send a response to prevent FUNCTION_INVOCATION_FAILED
  let responseSent = false;
  
  const sendError = (status: number, error: any) => {
    if (responseSent) return;
    responseSent = true;
    
    const errorResponse: any = { 
      error: 'Internal server error', 
      message: error?.message || 'Unknown error',
    };
    
    if (process.env['NODE_ENV'] === 'development') {
      errorResponse.stack = error?.stack;
      errorResponse.details = error;
    }
    
    res.status(status).json(errorResponse);
  };

  // Lazy-load modules using dynamic import to catch module-level errors
  try {
    if (!createAppModule) {
      console.log('Loading app module from dist/app.js...');
      console.log('Current working directory:', process.cwd());
      console.log('__dirname:', __dirname);
      // Try multiple possible paths - Vercel might structure files differently
      // Dynamic imports from dist folder (runtime only, not available at compile time)
      try {
        createAppModule = await import('../dist/app.js') as any;
        console.log('✅ Loaded from ../dist/app.js');
      } catch (e1: any) {
        try {
          createAppModule = await import('./dist/app.js') as any;
          console.log('✅ Loaded from ./dist/app.js');
        } catch (e2: any) {
          try {
            createAppModule = await import('../../dist/app.js') as any;
            console.log('✅ Loaded from ../../dist/app.js');
          } catch (e3: any) {
            // Try looking in src/ as fallback (Vercel might compile from src/)
            try {
              createAppModule = await import('../src/app.js') as any;
              console.log('✅ Loaded from ../src/app.js (Vercel compiled)');
            } catch (e4: any) {
              const err1 = e1 instanceof Error ? e1.message : String(e1);
              const err2 = e2 instanceof Error ? e2.message : String(e2);
              const err3 = e3 instanceof Error ? e3.message : String(e3);
              const err4 = e4 instanceof Error ? e4.message : String(e4);
              throw new Error(`Failed to find app.js. Tried: ../dist/app.js, ./dist/app.js, ../../dist/app.js, ../src/app.js. Errors: ${err1}, ${err2}, ${err3}, ${err4}`);
            }
          }
        }
      }
      console.log('✅ App module loaded successfully');
    }
    if (!configModule) {
      console.log('Loading config module from dist/config/index.js...');
      // Dynamic imports from dist folder (runtime only, not available at compile time)
      try {
        configModule = await import('../dist/config/index.js') as any;
      } catch (e1: any) {
        try {
          configModule = await import('./dist/config/index.js') as any;
        } catch (e2: any) {
          try {
            configModule = await import('../../dist/config/index.js') as any;
          } catch (e3: any) {
            const err1 = e1 instanceof Error ? e1.message : String(e1);
            const err2 = e2 instanceof Error ? e2.message : String(e2);
            const err3 = e3 instanceof Error ? e3.message : String(e3);
            throw new Error(`Failed to find config/index.js in any location. Errors: ${err1}, ${err2}, ${err3}`);
          }
        }
      }
      console.log('✅ Config module loaded successfully');
    }
  } catch (importError: any) {
    console.error('❌ Failed to load modules:', importError);
    console.error('Error message:', importError?.message);
    console.error('Error stack:', importError?.stack);
    console.error('Current working directory:', process.cwd());
    // Note: import.meta.url is ESM-only, but we're using CommonJS
    // Using __filename equivalent for Node.js
    console.error('Module location:', __filename || 'unknown');
    
    // Check if it's an environment variable error
    const errorMessage = importError?.message || String(importError);
    if (errorMessage.includes('Environment validation failed') || 
        errorMessage.includes('DATABASE_URL') || 
        errorMessage.includes('JWT_SECRET')) {
      sendError(503, {
        message: 'Configuration error: Missing or invalid environment variables',
        details: 'Please check Vercel environment variables: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET',
        hint: 'Go to Vercel Dashboard → Your Project → Settings → Environment Variables',
        originalError: errorMessage.split('\n')[0], // First line only
      });
      return;
    }
    
    sendError(500, {
      message: 'Failed to initialize application',
      details: errorMessage.split('\n')[0],
      hint: 'Check Vercel deployment logs for module import errors. Ensure vercel-build completed successfully.',
      buildInfo: 'Verify that npm run vercel-build completed without errors in Vercel build logs',
    });
    return;
  }
  
  const createApp = createAppModule.createApp;
  const connectDatabase = configModule.connectDatabase;

  try {
    const fastifyApp = await getApp(createApp, connectDatabase);
    
    // Build the full URL path - handle Vercel's path format
    let url = req.url || '/';
    // Remove query string for routing if needed
    if (url.includes('?')) {
      url = url.split('?')[0];
    }
    
    // Prepare headers (remove host-related headers that Vercel adds)
    const headers: any = {};
    Object.keys(req.headers).forEach(key => {
      const lowerKey = key.toLowerCase();
      // Skip Vercel-specific headers
      if (!lowerKey.startsWith('x-vercel') && lowerKey !== 'host' && lowerKey !== 'connection') {
        headers[key] = req.headers[key];
      }
    });

    // Convert request body
    let payload: any = undefined;
    if (req.body) {
      if (typeof req.body === 'string') {
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
      method: req.method || 'GET',
      url: url,
      headers: headers,
      query: req.query as any,
      payload: payload,
      cookies: req.cookies as any,
    });

    // Set response headers
    if (response.headers) {
      Object.keys(response.headers).forEach(key => {
        const value = response.headers[key];
        if (value !== undefined) {
          res.setHeader(key, value as string);
        }
      });
    }

    // Set status code
    res.statusCode = response.statusCode || 200;
    
    // Send response body - ensure we only send once
    if (responseSent) return;
    responseSent = true;
    
    const contentType = response.headers?.['content-type'] || '';
    if (contentType.includes('application/json')) {
      try {
        const jsonBody = typeof response.body === 'string' 
          ? JSON.parse(response.body) 
          : response.json();
        res.json(jsonBody);
      } catch (parseError: any) {
        // If JSON parsing fails, send as plain text
        res.send(response.body || response.payload || '');
      }
    } else {
      res.send(response.body || response.payload || '');
    }
  } catch (error: any) {
    console.error('Serverless function error:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    
    // Check if error is related to database connection
    if (error?.message?.includes('Database') || error?.message?.includes('Prisma')) {
      console.error('Database-related error detected - resetting connection state');
      // Reset state on database errors to allow retry
      appInstance = null;
      isDatabaseConnected = false;
      initializationPromise = null;
    }
    
    sendError(500, error);
  }
}

