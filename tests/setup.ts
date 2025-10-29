import { FastifyInstance } from 'fastify';
import { createApp } from '../src/app';

import { beforeAll } from '@jest/globals';
let app: FastifyInstance;

beforeAll(async () => {
  app = await createApp();
  await app.ready();
});

import { afterAll } from '@jest/globals';

afterAll(async () => {
  if (app) {
    await app.close();
  }
});

export { app };
