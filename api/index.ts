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

// Load environment variables FIRST (before any other requires)
// Vercel provides them, but this ensures they're available
require('dotenv/config');

// Now import type definitions AFTER resolver setup
// Use require for runtime, types are handled by @ts-nocheck
// Note: @vercel/node is only needed for type definitions, not for runtime
// We'll import it lazily if needed

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
console.log('🔍 [Path Resolver] Setting up Module._resolveFilename interceptor...');

Module._resolveFilename = function(request: string, parent: any, isMain: boolean, options: any) {
  // Log all require() calls for debugging
  const parentFile = parent?.filename || parent?.id || 'unknown';
  const isAliasPath = request && request.startsWith('@/');
  
  if (isAliasPath) {
    console.log(`🔍 [Path Resolver] Intercepted require('${request}') from: ${parentFile}`);
  }
  
  // If the request starts with @/, resolve it using our path mapping
  if (isAliasPath) {
    // Extract the path after @/
    const aliasPath = request.substring(2); // Remove '@/'
    console.log(`🔍 [Path Resolver] Resolving alias path: ${aliasPath}`);
    
    // Try to resolve using detected base path first
    let resolvedPath = null;
    let triedPaths: string[] = [];
    
    for (const base of possibleBasePaths) {
      try {
        const candidatePath = path.join(base, aliasPath);
        triedPaths.push(candidatePath);
        
        // Try with .js extension
        const jsPath = candidatePath + '.js';
        console.log(`🔍 [Path Resolver] Trying: ${jsPath}`);
        if (fs.existsSync(jsPath)) {
          resolvedPath = jsPath;
          console.log(`✅ [Path Resolver] Found: ${resolvedPath} (from ${base})`);
          break;
        }
        
        // Try without extension (for directories with index.js)
        if (fs.existsSync(candidatePath)) {
          const indexPath = path.join(candidatePath, 'index.js');
          console.log(`🔍 [Path Resolver] Trying directory with index: ${indexPath}`);
          if (fs.existsSync(indexPath)) {
            resolvedPath = indexPath;
            console.log(`✅ [Path Resolver] Found: ${resolvedPath} (from ${base})`);
            break;
          }
        }
      } catch (e: any) {
        console.log(`⚠️ [Path Resolver] Error checking ${base}/${aliasPath}:`, e?.message);
        // Continue to next path
      }
    }
    
    if (resolvedPath) {
      try {
        console.log(`✅ [Path Resolver] Successfully resolved ${request} → ${resolvedPath}`);
        return originalResolveFilename.call(this, resolvedPath, parent, isMain, options);
      } catch (e: any) {
        console.error(`❌ [Path Resolver] Failed to load resolved path ${resolvedPath}:`, e?.message);
        console.error(`❌ [Path Resolver] Error stack:`, e?.stack);
        // Fall through to original resolution
      }
    } else {
      console.error(`❌ [Path Resolver] Could not resolve ${request}`);
      console.error(`❌ [Path Resolver] Tried paths:`, triedPaths);
      console.error(`❌ [Path Resolver] Available base paths:`, possibleBasePaths);
      console.error(`❌ [Path Resolver] Parent file: ${parentFile}`);
    }
  }
  
  // Fall back to original resolution
  try {
    if (isAliasPath) {
      console.log(`⚠️ [Path Resolver] Falling back to original resolution for ${request}`);
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  } catch (e: any) {
    // If original resolution fails and it's an @/ path, provide better error
    if (isAliasPath) {
      console.error(`❌ [Path Resolver] Original resolution also failed for ${request}`);
      console.error(`❌ [Path Resolver] Parent: ${parentFile}`);
      console.error(`❌ [Path Resolver] Available base paths:`, possibleBasePaths);
      console.error(`❌ [Path Resolver] Error:`, e?.message);
      console.error(`❌ [Path Resolver] Error stack:`, e?.stack);
      throw new Error(`Cannot find module '${request}'. Path resolver tried: ${possibleBasePaths.join(', ')}. Parent: ${parentFile}`);
    }
    throw e;
  }
};

console.log('✅ [Path Resolver] Module._resolveFilename interceptor installed');

// Also register with tsconfig-paths as fallback
console.log('🔍 [Path Resolver] Registering tsconfig-paths as fallback...');
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
  
  console.log('🔍 [Path Resolver] Path config:', pathConfig);
  
  // Register for all possible base paths
  let registeredCount = 0;
  for (const base of possibleBasePaths) {
    try {
      tsPaths.register({
        baseUrl: base,
        paths: pathConfig
      });
      console.log(`✅ [Path Resolver] Registered tsconfig-paths for: ${base}`);
      registeredCount++;
    } catch (e: any) {
      console.log(`⚠️ [Path Resolver] Failed to register tsconfig-paths for ${base}:`, e?.message);
      // Multiple registrations might fail, that's okay
    }
  }
  
  if (registeredCount > 0) {
    console.log(`✅ [Path Resolver] tsconfig-paths registered for ${registeredCount} base path(s)`);
  } else {
    console.warn('⚠️ [Path Resolver] tsconfig-paths registration failed for all base paths');
  }
} catch (e: any) {
  console.log('⚠️ [Path Resolver] tsconfig-paths not available:', e?.message);
  console.log('⚠️ [Path Resolver] Using custom resolver only');
}

console.log('✅ [Path Resolver] Runtime path alias resolution configured (custom resolver + tsconfig-paths)');
console.log('✅ [Path Resolver] Ready to intercept require() calls');

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

  console.log('🔍 [DB Connection] Starting database connection...');
  console.log('🔍 [DB Connection] DATABASE_URL present:', !!process.env.DATABASE_URL);
  console.log('🔍 [DB Connection] DATABASE_URL preview:', process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 20)}...` : 'MISSING');

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔍 [DB Connection] Attempt ${attempt}/${retries}...`);

      // Add timeout to prevent hanging indefinitely
      const connectionPromise = connectDatabaseFn();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database connection timeout')), INIT_TIMEOUT_MS);
      });

      await Promise.race([connectionPromise, timeoutPromise]);

      console.log('✅ [DB Connection] Database connected successfully');
      isDatabaseConnected = true;
      return;
    } catch (error: any) {
      lastError = error;
      console.error(`❌ [DB Connection] Attempt ${attempt} failed:`, error?.message || error);
      console.error(`❌ [DB Connection] Error details:`, {
        message: error?.message,
        code: error?.code,
        name: error?.name,
        stack: error?.stack?.split('\n').slice(0, 5).join('\n')
      });

      if (attempt < retries) {
        // Exponential backoff: wait 1s, 2s, 4s between retries
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ [DB Connection] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed - reset state and throw
  isDatabaseConnected = false;
  const finalError = lastError || new Error('Database connection failed after all retries');
  console.error('❌ [DB Connection] All connection attempts failed');
  console.error('❌ [DB Connection] Final error:', finalError.message);
  throw finalError;
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
      console.log('🚀 [App Init] Starting application initialization...');
      console.log('🔍 [App Init] Checking environment variables...');
      
      // Check required environment variables
      const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
      const missingEnvVars: string[] = [];
      
      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          missingEnvVars.push(envVar);
          console.error(`❌ [App Init] Missing required environment variable: ${envVar}`);
        } else {
          console.log(`✅ [App Init] ${envVar} is set (${process.env[envVar].substring(0, 10)}...)`);
        }
      }
      
      if (missingEnvVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}. Please set them in Vercel Dashboard → Settings → Environment Variables`);
      }
      
      // Check Prisma client path
      console.log('🔍 [App Init] Checking Prisma client path...');
      const prismaPaths = [
        path.join(projectRoot, 'src', 'generated', 'prisma'),
        path.join(projectRoot, 'dist', 'generated', 'prisma'),
        path.join(__dirname, '..', 'src', 'generated', 'prisma'),
        path.join(__dirname, '..', 'dist', 'generated', 'prisma'),
      ];
      
      let prismaFound = false;
      for (const prismaPath of prismaPaths) {
        const clientPath = path.join(prismaPath, 'client.js');
        if (fs.existsSync(clientPath)) {
          console.log(`✅ [App Init] Prisma client found at: ${prismaPath}`);
          prismaFound = true;
          break;
        } else {
          console.log(`🔍 [App Init] Checking Prisma path: ${prismaPath} (not found)`);
        }
      }
      
      if (!prismaFound) {
        console.warn('⚠️ [App Init] Prisma client not found in expected paths, but continuing...');
      }
      
      // Connect database with retry logic
      if (!isDatabaseConnected) {
        console.log('🔍 [App Init] Connecting to database...');
        await connectDatabaseWithRetry(connectDatabaseFn);
        console.log('✅ [App Init] Database connection established');
      } else {
        console.log('✅ [App Init] Database already connected');
      }
      
      // Create Fastify app instance
      console.log('🔍 [App Init] Creating Fastify app instance...');
      appInstance = await createAppFn({
        logger: false, // Disable logger in serverless
      });

      // Note: We don't need app.ready() in serverless - Fastify is ready after registration
      // app.ready() is mainly needed for server.listen() which we don't use here
      console.log('✅ [App Init] Fastify app initialized successfully');
      console.log('✅ [App Init] Application initialization complete');
      
      // Clear any previous errors on success
      initializationError = null;
      
      return appInstance;
    } catch (error: any) {
      console.error('❌ [App Init] Error initializing app:', error);
      console.error('❌ [App Init] Error message:', error?.message);
      console.error('❌ [App Init] Error name:', error?.name);
      console.error('❌ [App Init] Error code:', error?.code);
      console.error('❌ [App Init] Error stack:', error?.stack);
      
      // Log additional context
      console.error('❌ [App Init] Current working directory:', process.cwd());
      console.error('❌ [App Init] __dirname:', __dirname);
      console.error('❌ [App Init] NODE_ENV:', process.env.NODE_ENV);
      console.error('❌ [App Init] DATABASE_URL present:', !!process.env.DATABASE_URL);
      
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
  // Log request for debugging
  console.log('📥 [Handler] Incoming request:', {
    method: req.method,
    url: req.url,
    path: req.url?.split('?')[0],
  });
  
  // Ensure we always send a response to prevent FUNCTION_INVOCATION_FAILED
  let responseSent = false;
  
  const sendError = (status: number, error: any) => {
    if (responseSent) return;
    responseSent = true;
    
    // Always include detailed error information for debugging
    const errorResponse: any = { 
      error: error?.error || error?.name || 'Internal server error', 
      message: error?.message || error || 'Unknown error',
    };
    
    // Include error code if available
    if (error?.code) {
      errorResponse.code = error.code;
    }
    
    // Include details if available
    if (error?.details) {
      errorResponse.details = error.details;
    }
    
    // Include hint if available
    if (error?.hint) {
      errorResponse.hint = error.hint;
    }
    
    // Include additional context for debugging
    if (error?.cwd || error?.dirname) {
      errorResponse.context = {
        cwd: error.cwd || process.cwd(),
        dirname: error.dirname || __dirname,
      };
    }
    
    // In development, include full stack trace
    if (process.env['NODE_ENV'] === 'development' || process.env['VERCEL_ENV'] === 'development') {
      errorResponse.stack = error?.stack;
      errorResponse.fullError = error;
    }
    
    console.error('❌ [Error Response] Sending error response:', {
      status,
      error: errorResponse.error,
      message: errorResponse.message,
    });
    
    res.status(status).json(errorResponse);
  };

  // Lazy-load modules using dynamic import to catch module-level errors
  try {
    if (!createAppModule) {
      console.log('🔍 [Module Loader] Loading app module from dist/app.js...');
      console.log('🔍 [Module Loader] Current working directory:', process.cwd());
      console.log('🔍 [Module Loader] __dirname:', __dirname);
      // Try multiple possible paths - Vercel might structure files differently
      // Dynamic imports from dist folder (runtime only, not available at compile time)
      // Check what files actually exist first
      console.log('🔍 [Module Loader] Checking available paths...');
      console.log('🔍 [Module Loader] __dirname:', __dirname);
      console.log('🔍 [Module Loader] process.cwd():', process.cwd());
      console.log('🔍 [Module Loader] projectRoot:', projectRoot);
      
      const possibleAppPaths = [
        path.join(projectRoot, 'dist', 'app.js'),
        path.join(__dirname, '..', 'dist', 'app.js'),
        path.join(__dirname, 'dist', 'app.js'),
        path.join(process.cwd(), 'dist', 'app.js'),
        path.join(process.cwd(), 'src', 'app.js'),
        '/var/task/dist/app.js',
        '/var/task/src/app.js',
      ];
      
      console.log('🔍 [Module Loader] Checking paths:', possibleAppPaths);
      
      let foundPath = null;
      for (const appPath of possibleAppPaths) {
        if (fs.existsSync(appPath)) {
          foundPath = appPath;
          console.log(`✅ [Module Loader] Found app.js at: ${appPath}`);
          break;
        } else {
          console.log(`❌ [Module Loader] Not found: ${appPath}`);
        }
      }
      
      if (foundPath) {
        // Use require for absolute paths
        try {
          // Try to require the file
          const requiredModule = require(foundPath);
          // Handle both CommonJS and ES module exports
          createAppModule = requiredModule.default || requiredModule;
          console.log('✅ [Module Loader] Loaded app.js using require from:', foundPath);
          console.log('✅ [Module Loader] Module exports:', Object.keys(requiredModule));
        } catch (requireError: any) {
          console.error('❌ [Module Loader] require() failed for:', foundPath);
          console.error('❌ [Module Loader] require() error:', requireError?.message);
          console.error('❌ [Module Loader] require() stack:', requireError?.stack);
          // Fall through to dynamic import
          foundPath = null;
        }
      }
      
      if (!createAppModule && !foundPath) {
        // Fallback to dynamic imports
        try {
          createAppModule = await import('../dist/app.js') as any;
          console.log('✅ [Module Loader] Loaded from ../dist/app.js');
        } catch (e1: any) {
          try {
            createAppModule = await import('./dist/app.js') as any;
            console.log('✅ [Module Loader] Loaded from ./dist/app.js');
          } catch (e2: any) {
            try {
              createAppModule = await import('../../dist/app.js') as any;
              console.log('✅ [Module Loader] Loaded from ../../dist/app.js');
            } catch (e3: any) {
              // Try looking in src/ as fallback (Vercel might compile from src/)
              try {
                createAppModule = await import('../src/app.js') as any;
                console.log('✅ [Module Loader] Loaded from ../src/app.js (Vercel compiled)');
              } catch (e4: any) {
                const err1 = e1 instanceof Error ? e1.message : String(e1);
                const err2 = e2 instanceof Error ? e2.message : String(e2);
                const err3 = e3 instanceof Error ? e3.message : String(e3);
                const err4 = e4 instanceof Error ? e4.message : String(e4);
                throw new Error(`Failed to find app.js. Tried: ${possibleAppPaths.join(', ')}. Errors: ${err1}, ${err2}, ${err3}, ${err4}`);
              }
            }
          }
        }
      }
      console.log('✅ [Module Loader] App module loaded successfully');
    }
    if (!configModule) {
      console.log('🔍 [Module Loader] Loading config module from dist/config/index.js...');
      
      const possibleConfigPaths = [
        path.join(projectRoot, 'dist', 'config', 'index.js'),
        path.join(__dirname, '..', 'dist', 'config', 'index.js'),
        path.join(__dirname, 'dist', 'config', 'index.js'),
        path.join(process.cwd(), 'dist', 'config', 'index.js'),
        '/var/task/dist/config/index.js',
      ];
      
      console.log('🔍 [Module Loader] Checking config paths:', possibleConfigPaths);
      
      let foundConfigPath = null;
      for (const configPath of possibleConfigPaths) {
        if (fs.existsSync(configPath)) {
          foundConfigPath = configPath;
          console.log(`✅ [Module Loader] Found config/index.js at: ${configPath}`);
          break;
        } else {
          console.log(`❌ [Module Loader] Not found: ${configPath}`);
        }
      }
      
      if (foundConfigPath) {
        // Use require for absolute paths
        try {
          // Try to require the file
          const requiredModule = require(foundConfigPath);
          // Handle both CommonJS and ES module exports
          configModule = requiredModule.default || requiredModule;
          console.log('✅ [Module Loader] Loaded config/index.js using require from:', foundConfigPath);
          console.log('✅ [Module Loader] Config module exports:', Object.keys(requiredModule));
        } catch (requireError: any) {
          console.error('❌ [Module Loader] require() failed for:', foundConfigPath);
          console.error('❌ [Module Loader] require() error:', requireError?.message);
          console.error('❌ [Module Loader] require() stack:', requireError?.stack);
          // Fall through to dynamic import
          foundConfigPath = null;
        }
      }
      
      if (!configModule && !foundConfigPath) {
        // Fallback to dynamic imports
        try {
          configModule = await import('../dist/config/index.js') as any;
          console.log('✅ [Module Loader] Loaded from ../dist/config/index.js');
        } catch (e1: any) {
          try {
            configModule = await import('./dist/config/index.js') as any;
            console.log('✅ [Module Loader] Loaded from ./dist/config/index.js');
          } catch (e2: any) {
            try {
              configModule = await import('../../dist/config/index.js') as any;
              console.log('✅ [Module Loader] Loaded from ../../dist/config/index.js');
            } catch (e3: any) {
              const err1 = e1 instanceof Error ? e1.message : String(e1);
              const err2 = e2 instanceof Error ? e2.message : String(e2);
              const err3 = e3 instanceof Error ? e3.message : String(e3);
              throw new Error(`Failed to find config/index.js in any location. Errors: ${err1}, ${err2}, ${err3}`);
            }
          }
        }
      }
      console.log('✅ [Module Loader] Config module loaded successfully');
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
      error: errorMessage.split('\n')[0],
      details: importError?.stack?.split('\n').slice(0, 5).join('\n') || 'No stack trace available',
      hint: 'Check Vercel deployment logs for module import errors. Ensure vercel-build completed successfully.',
      buildInfo: 'Verify that npm run vercel-build completed without errors in Vercel build logs',
      cwd: process.cwd(),
      dirname: __dirname,
    });
    return;
  }
  
  const createApp = createAppModule.createApp;
  const connectDatabase = configModule.connectDatabase;

  try {
    console.log('🔍 [Handler] Getting Fastify app instance...');
    const fastifyApp = await getApp(createApp, connectDatabase);
    console.log('✅ [Handler] Fastify app instance obtained');
    
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
    console.error('❌ [Handler] Serverless function error:', error);
    console.error('❌ [Handler] Error message:', error?.message);
    console.error('❌ [Handler] Error name:', error?.name);
    console.error('❌ [Handler] Error code:', error?.code);
    console.error('❌ [Handler] Error stack:', error?.stack);

    // Check if error is related to database connection
    if (error?.message?.includes('Database') || error?.message?.includes('Prisma') || error?.message?.includes('connection')) {
      console.error('❌ [Handler] Database-related error detected - resetting connection state');
      // Reset state on database errors to allow retry
      appInstance = null;
      isDatabaseConnected = false;
      initializationPromise = null;
    }

    // Send detailed error response
    sendError(500, {
      message: error?.message || 'Internal server error',
      error: error?.name || 'UnknownError',
      code: error?.code || 'UNKNOWN',
      details: error?.stack?.split('\n').slice(0, 10).join('\n') || 'No stack trace available',
      hint: error?.message?.includes('Database') ? 'Check DATABASE_URL in Vercel environment variables' : 'Check Vercel deployment logs for details',
    });
  }
}

