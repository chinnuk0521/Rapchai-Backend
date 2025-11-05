// @ts-nocheck
// This file is a serverless function entry point and doesn't need strict type checking
// The dynamic imports from dist/ are runtime-only and don't exist at compile time

// Import from compiled dist folder where tsc-alias has already resolved path aliases
import type { VercelRequest, VercelResponse } from '@vercel/node';
// Load environment variables (Vercel provides them, but this ensures they're available)
import 'dotenv/config';

// Runtime path alias resolution fallback (in case tsc-alias didn't resolve all paths)
// This ensures @/ paths work even if some paths weren't resolved during build
// Note: This is a fallback - tsc-alias should resolve paths during build
try {
  const tsPaths = require('tsconfig-paths');
  // Register paths for dist/ folder (runtime fallback)
  tsPaths.register({
    baseUrl: './dist',
    paths: {
      '@/*': ['*'],
      '@/config/*': ['config/*'],
      '@/middleware/*': ['middleware/*'],
      '@/routes/*': ['routes/*'],
      '@/services/*': ['services/*'],
      '@/utils/*': ['utils/*']
    }
  });
  console.log('✅ Runtime path alias fallback registered');
} catch (e) {
  // tsconfig-paths not available or failed, that's okay - we rely on tsc-alias
  console.log('tsconfig-paths fallback not available, using tsc-alias resolved paths');
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
      // Try multiple possible paths
      // Dynamic imports from dist folder (runtime only, not available at compile time)
      try {
        createAppModule = await import('../dist/app.js') as any;
      } catch (e1: any) {
          try {
            createAppModule = await import('./dist/app.js') as any;
        } catch (e2: any) {
          try {
            createAppModule = await import('../../dist/app.js') as any;
          } catch (e3: any) {
            const err1 = e1 instanceof Error ? e1.message : String(e1);
            const err2 = e2 instanceof Error ? e2.message : String(e2);
            const err3 = e3 instanceof Error ? e3.message : String(e3);
            throw new Error(`Failed to find app.js in any location. Errors: ${err1}, ${err2}, ${err3}`);
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

