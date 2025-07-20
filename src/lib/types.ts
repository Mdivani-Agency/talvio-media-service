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
  key: string;
};

export interface MediaItem {
  key: string; // Partition key
  userId: string; // Sort key
  name: string;
  type: string;
  publicUrl: string;
  isValid: boolean;
  expires?: string; // TTL
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMediaParams {
  key: string;
  userId: string;
  name: string;
  type: string;
  publicUrl: string;
  isValid?: boolean;
  expires?: string;
}

export interface UpdateMediaParams {
  key: string;
  userId: string;
  name?: string;
  type?: string;
  publicUrl?: string;
  isValid?: boolean;
  expires?: string;
}

export interface QueryMediaParams {
  userId?: string;
  key?: string;
  isValid?: boolean;
  limit?: number;
  nextToken?: string;
}
