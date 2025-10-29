import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/index.js';

// Global app instance for serverless (persists across invocations)
let appInstance: any = null;
let isDatabaseConnected = false;

async function getApp() {
  if (!appInstance) {
    // Connect database once
    if (!isDatabaseConnected) {
      await connectDatabase();
      isDatabaseConnected = true;
    }
    
    // Create Fastify app instance
    appInstance = await createApp({
      logger: false, // Disable logger in serverless
    });

    await appInstance.ready();
  }
  return appInstance;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const fastifyApp = await getApp();
    
    // Build the full URL path
    const url = req.url || '/';
    
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
    
    // Send response body
    const contentType = response.headers?.['content-type'] || '';
    if (contentType.includes('application/json')) {
      try {
        const jsonBody = typeof response.body === 'string' 
          ? JSON.parse(response.body) 
          : response.json();
        res.json(jsonBody);
      } catch {
        res.send(response.body || response.payload);
      }
    } else {
      res.send(response.body || response.payload);
    }
  } catch (error: any) {
    console.error('Serverless function error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      ...(process.env['NODE_ENV'] === 'development' && { stack: error.stack })
    });
  }
}

