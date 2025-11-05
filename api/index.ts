// @ts-nocheck
// This file is a serverless function entry point and doesn't need strict type checking
// The dynamic imports from dist/ are runtime-only and don't exist at compile time

// Import from compiled dist folder where tsc-alias has already resolved path aliases
import type { VercelRequest, VercelResponse } from '@vercel/node';
// Load environment variables (Vercel provides them, but this ensures they're available)
import 'dotenv/config';

// CRITICAL: Runtime path alias resolution MUST run before any module imports
// This ensures @/ paths work even if tsc-alias didn't resolve all paths during build
// Register paths for both src/ and dist/ to handle Vercel's file structure
try {
  const tsPaths = require('tsconfig-paths');
  const path = require('path');
  const fs = require('fs');
  
  // Get absolute paths for better detection
  const projectRoot = path.resolve(__dirname, '..');
  const possibleBasePaths = [
    path.join(projectRoot, 'dist'),
    path.join(projectRoot, 'src'),
    path.join(__dirname, 'dist'),
    path.join(__dirname, 'src'),
    path.resolve('./dist'),
    path.resolve('./src')
  ];
  
  // Register paths for ALL possible locations (both src/ and dist/)
  // This ensures path resolution works regardless of where Vercel puts files
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
  
  // Try to detect actual file location
  let detectedPath = null;
  for (const base of possibleBasePaths) {
    try {
      const testPath = path.join(base, 'config', 'env.js');
      if (fs.existsSync(testPath)) {
        detectedPath = base;
        console.log(`✅ Detected files in: ${detectedPath}`);
        break;
      }
    } catch (e) {
      // Continue to next path
    }
  }
  
  // Register for detected path (primary)
  if (detectedPath) {
    try {
      tsPaths.register({
        baseUrl: detectedPath,
        paths: pathConfig
      });
      console.log(`✅ Registered paths for: ${detectedPath}`);
    } catch (e) {
      console.log(`⚠️ Failed to register for ${detectedPath}:`, e?.message);
    }
  }
  
  // ALWAYS register for both src/ and dist/ regardless of detection
  // This ensures paths work even if detection fails or files are in unexpected locations
  // Vercel might use /var/task/src/ or /var/task/dist/ - we need both
  const fallbackBases = [
    path.join(projectRoot, 'src'),
    path.join(projectRoot, 'dist'),
    path.resolve(process.cwd(), 'src'),
    path.resolve(process.cwd(), 'dist'),
    '/var/task/src',  // Vercel's actual runtime location
    '/var/task/dist'
  ];
  
  for (const base of fallbackBases) {
    try {
      if (!detectedPath || base !== detectedPath) {
        tsPaths.register({
          baseUrl: base,
          paths: pathConfig
        });
        console.log(`✅ Registered paths for: ${base}`);
      }
    } catch (e) {
      // Multiple registrations might fail, but we try all to ensure coverage
      console.log(`⚠️ Could not register for ${base}:`, e?.message);
    }
  }
  
  console.log('✅ Runtime path alias resolution configured');
} catch (e) {
  // tsconfig-paths not available or failed
  console.error('❌ Failed to setup runtime path resolution:', e?.message || e);
  console.error('Stack:', e?.stack);
}

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

