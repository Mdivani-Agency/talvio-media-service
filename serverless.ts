import type { AWS } from '@serverless/typescript';

import * as functions from './src/functions';

const serverlessConfiguration: AWS = {
  service: 'media-service',
  frameworkVersion: '3',

  provider: {
    name: 'aws',
    runtime: 'nodejs18.x',
    stage: '${opt:stage, "dev"}',
    region: 'us-west-1',
    environment: {
      MEDIA_BUCKET: '${self:custom.${self:provider.stage}.bucketName}',
      BUCKET_PUBLIC_URL: '${self:custom.${self:provider.stage}.publicUrl}',
    },
    apiGateway: {
      minimumCompressionSize: 1024,
    },
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: ['s3:*'],
        Resource: ['arn:aws:s3:::${self:custom.${self:provider.stage}.bucketName}/*'],
      },
    ],
  },
  functions,
  plugins: [
    'serverless-offline',
    'serverless-export-env',
    'serverless-esbuild',
    'serverless-domain-manager',
    'serverless-certificate-creator',
    'serverless-add-api-key',
  ],
  custom: {
    dev: {
      name: 'dev',
      domainName: 'cohub.click',
      bucketName: 'talvio-content',
      publicUrl: 'https://media.cohub.click',
    },
    prod: {
      name: 'prod',
      domainName: 'talvio.co',
      bucketName: 'talvio-content',
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
    esbuild: {
      bundle: true,
      minify: true,
      target: 'node18',
      platform: 'node',
      sourcemap: true,
      external: ['aws-sdk'],
    },
    export: {
      filename: '.env',
    },
  },
  package: {
    individually: true,
  },
};

module.exports = serverlessConfiguration;
