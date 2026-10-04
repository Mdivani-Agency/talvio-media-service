import middy, { MiddlewareObj } from '@middy/core';
import httpBodyParser from '@middy/http-json-body-parser';
import cors from '@middy/http-cors';
import validator from '@middy/validator';
import { MiddyApiGWEvent } from '../types';
import { errorHandlerMiddleware } from './error-handler.middleware';

interface ValidatorOptions {
  eventSchema?: unknown;
  contextSchema?: unknown;
  responseSchema?: unknown;
  defaultLanguage?: string;
  languages?: object | unknown;
}

// Middy 6 types the chain from raw API Gateway events; handlers use parsed bodies.
// Keep the original helper API and loosen the wrapper types only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wrap = (middleware: unknown) => middleware as any;

export const commonMiddleware = wrap(middy().use(httpBodyParser()).use(errorHandlerMiddleware()));

export const corsMiddlware = commonMiddleware.use(cors());

export const publicMiddleware = <TPath>(
  customMiddlware: MiddlewareObj<MiddyApiGWEvent<null, TPath>>[] = [],
) => {
  const middleware = middy().use(httpBodyParser()).use(cors());

  customMiddlware.forEach((custom) => {
    middleware.use(custom);
  });

  return wrap(middleware.use(errorHandlerMiddleware()));
};

export const publicValidationMiddleware = <T extends ValidatorOptions, TBody, TPath>(
  schema: T,
  customMiddlware: MiddlewareObj<MiddyApiGWEvent<TBody, TPath>>[] = [],
) => {
  const middleware = middy()
    .use(httpBodyParser())
    .use(validator(wrap(schema)))
    .use(cors());

  customMiddlware.forEach((custom) => {
    middleware.use(custom);
  });

  return wrap(middleware.use(errorHandlerMiddleware()));
};

export const privateValidationMiddleware = <T extends ValidatorOptions, TBody>(
  schema: T,
  customMiddlware: MiddlewareObj<MiddyApiGWEvent<TBody>>[] = [],
) => {
  console.log('schema', schema);
  const middleware = middy()
    .use(httpBodyParser())
    .use(validator(wrap(schema)));

  customMiddlware.forEach((custom) => {
    middleware.use(custom);
  });

  return wrap(middleware.use(errorHandlerMiddleware()));
};
