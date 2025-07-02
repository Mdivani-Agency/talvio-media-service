import { APIGatewayEvent } from 'aws-lambda';

export type MiddyApiGWEvent<TBody = null, TPath = null, TQuery = null> = Omit<
  APIGatewayEvent,
  'body' | 'pathParameters' | 'queryStringParameters'
> & { body: TBody; pathParameters: TPath; queryStringParameters: TQuery };

export type MediaContentType = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

export type PresignRequest = { name: string; type: MediaContentType; path?: string };

export type PresignParams = Required<PresignRequest>;

export type PresignResponse = {
  uploadUrl: string;
  publicUrl: string;
};
