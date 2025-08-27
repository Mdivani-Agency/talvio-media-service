import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID || 'media-service-dev';

export class CloudFrontApi {
  private readonly distributionId: string;
  private readonly client: CloudFrontClient;

  constructor(distributionId: string) {
    this.distributionId = distributionId;
    this.client = new CloudFrontClient();
  }

  async invalidate(key: string) {
    const params = {
      DistributionId: this.distributionId,
      InvalidationBatch: {
        CallerReference: `invalidate-${Date.now()}`,
        Paths: {
          Quantity: 1,
          Items: [`/${key}`], // e.g., "/images/logo.png" or "/*"
        },
      },
    };

    const command = new CreateInvalidationCommand(params);
    const response = await this.client.send(command);
    return response.Invalidation?.Id; // Return invalidation ID if needed
  }
}

export const cloudfrontApi = new CloudFrontApi(distributionId);
