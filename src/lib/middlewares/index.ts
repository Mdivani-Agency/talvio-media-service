import middy, { MiddlewareObj } from '@middy/core';
import httpBodyParser from '@middy/http-json-body-parser';
import cors from '@middy/http-cors';
import validator from '@middy/validator';
import { MiddyApiGWEvent } from '../types';
import { errorHandlerMiddleware } from './error-handler-middleware';
import Ajv from 'ajv';

const ajv = new Ajv({
  allErrors: true,
  useDefaults: true,
  coerceTypes: false // disable coercion
});

interface ValidatorOptions {
  eventSchema?: unknown;
  contextSchema?: unknown;
  responseSchema?: unknown;
  defaultLanguage?: string;
  languages?: object | unknown;
}

export const commonMiddleware = middy().use(httpBodyParser()).use(errorHandlerMiddleware());

export const corsMiddlware = commonMiddleware.use(cors());

export const publicMiddleware = <TPath>(
  customMiddlware: MiddlewareObj<MiddyApiGWEvent<null, TPath>>[] = [],
) => {
  const middleware = middy().use(httpBodyParser()).use(cors());

  customMiddlware.forEach((custom) => {
    middleware.use(custom);
  });

  return middleware.use(errorHandlerMiddleware());
};

export const publicValidationMiddleware = <T extends ValidatorOptions, TBody, TPath>(
  schema: T,
  customMiddlware: MiddlewareObj<MiddyApiGWEvent<TBody, TPath>>[] = [],
) => {
  const middleware = middy().use(httpBodyParser()).use(validator({
    ...schema,
    ajvPlugins: { bsontype: null }
  })).use(cors());

  customMiddlware.forEach((custom) => {
    middleware.use(custom);
  });

  return middleware.use(errorHandlerMiddleware());
};

export const privateValidationMiddleware = <T extends ValidatorOptions, TBody>(
  schema: T,
  customMiddlware: MiddlewareObj<MiddyApiGWEvent<TBody>>[] = [],
) => {
  console.log('schema', schema);
  const middleware = middy().use(httpBodyParser()).use(validator({
    ...schema,
    ajvPlugins: { bsontype: null }
  }));

  customMiddlware.forEach((custom) => {
    middleware.use(custom);
  });

  return middleware.use(errorHandlerMiddleware());
};
