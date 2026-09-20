import type { AWS } from '@serverless/typescript';

import * as functions from './src/functions';

type ServerlessV4 = AWS & {
  build?: {
    esbuild?: {
      bundle?: boolean;
      minify?: boolean;
      sourcemap?: boolean;
      exclude?: string[];
    };
  };
};

const serverlessConfiguration: ServerlessV4 = {
  service: 'media-service',
  frameworkVersion: '4',

  provider: {
    name: 'aws',
    runtime: 'nodejs22.x',
    stage: '${opt:stage, "dev"}',
    region: 'us-west-1',
    environment: {
      MEDIA_BUCKET: '${self:custom.${self:provider.stage}.mediaBucket}',
      BUCKET_PUBLIC_URL: '${self:custom.${self:provider.stage}.publicUrl}',
      MEDIA_TABLE: '${ssm:/${self:provider.stage}/dynamodb/media}',
      CLOUDFRONT_DISTRIBUTION_ID: '${ssm:/${self:provider.stage}/cf/media/distribution-id}',
    },
    apiGateway: {
      minimumCompressionSize: 1024,
    },
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: ['s3:*'],
        Resource: ['arn:aws:s3:::${self:custom.${self:provider.stage}.mediaBucket}/*'],
      },
      {
        Effect: 'Allow',
        Action: 'cloudfront:CreateInvalidation',
        Resource: '*',
      },
      {
        Effect: 'Allow',
        Action: 'dynamodb:*',
        Resource: [
          'arn:aws:dynamodb:${self:provider.region}:${aws:accountId}:table/${ssm:/${self:provider.stage}/dynamodb/media}',
          'arn:aws:dynamodb:${self:provider.region}:${aws:accountId}:table/${ssm:/${self:provider.stage}/dynamodb/media}/*',
        ],
      },
    ],
  },
  functions,
  plugins: [
    'serverless-offline',
    'serverless-export-env',
    'serverless-domain-manager',
    'serverless-certificate-creator',
    'serverless-add-api-key',
  ],
  build: {
    esbuild: {
      bundle: true,
      minify: true,
      sourcemap: true,
      // Bundle pinned AWS SDK clients instead of the Lambda runtime SDK.
      exclude: ['!@aws-sdk/*'],
    },
  },
  custom: {
    dev: {
      name: 'dev',
      domainName: 'cohub.click',
      mediaBucket: 'talvio-content',
      publicUrl: 'https://media.cohub.click',
    },
    prod: {
      name: 'prod',
      domainName: 'talvio.co',
      mediaBucket: 'content-tlv',
      publicUrl: 'https://media.talvio.co',
    },
    customDomain: {
      rest: {
        domainName: 'api.${self:custom.${self:provider.stage}.domainName}',
        certificateName: '${self:custom.${self:provider.stage}.domainName}',
        stage: '${self:provider.stage}',
        basePath: 'media',
        createRoute53Record: true,
      },
    },
    apiKeys: [
      {
        name: '${ssm:/${self:provider.stage}/gw/generic/api-key-name}',
        usagePlan: {
          name: '${ssm:/${self:provider.stage}/gw/generic/usageplan-name}',
        },
      },
    ],
    export: {
      filename: '.env',
    },
  },
  package: {
    individually: true,
  },
};

module.exports = serverlessConfiguration;
