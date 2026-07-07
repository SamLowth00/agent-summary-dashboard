import type { Express, ErrorRequestHandler } from 'express';
import { initialize } from 'express-openapi';
import path from 'path';

const routesPath = path.resolve(__dirname, '..', 'paths');
console.log(routesPath);

const errorMiddleware: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  const status = typeof err?.status === 'number' ? err.status : 500;
  const message =
    err?.message ??
    (status < 500 ? 'Request validation failed' : 'Internal server error');
  res.status(status).json({
    error: {
      message,
      errors: err?.errors,
    },
  });
};

export const expressOpenApi = async (app: Express) => {
  return await initialize({
    apiDoc: {
      info: {
        title: 'ConnexAI Tech Test API',
        version: '0.0.1',
      },
      openapi: '3.1.0',
      paths: {},
    },
    app,
    promiseMode: true,
    paths: routesPath,
    routesGlob: '**/!(*.test).js',
    routesIndexFileRegExp: /(?:index)?\.js$/,
    errorMiddleware,
  });
};
