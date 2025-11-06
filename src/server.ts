import "dotenv/config";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/index.js";

// Vercel serverless function handler
// DO NOT use app.listen() - Vercel manages the serverless function runtime
export default async function handler(req: any, res: any) {
  try {
    // Connect to database (with caching for serverless)
    await connectDatabase();

    // Create Fastify app instance
    const app = await createApp({
      logger: false, // Disable logger in serverless
    });

    // Use Fastify's inject method to handle the request
    const response = await app.inject({
      method: req.method || 'GET',
      url: req.url || '/',
      headers: req.headers || {},
      query: req.query || {},
      payload: req.body,
      cookies: req.cookies || {},
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
      } catch (parseError: any) {
        res.send(response.body || '');
      }
    } else {
      res.send(response.body || '');
    }
  } catch (error: any) {
    console.error('Serverless function error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Unknown error',
    });
  }
}

// For local development, still allow starting the server
if (require.main === module) {
  import("./app.js").then(({ startServer }) => {
    startServer();
  });
}
