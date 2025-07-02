import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import createHttpError from 'http-errors';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PresignRequest, PresignResponse } from '@lib/types';

class MediaService {
  private readonly $s3: S3Client;

  private readonly $bucketName: string;

  constructor() {
    if (!process.env.MEDIA_BUCKET) throw new Error('Missing Bucket Name');

    this.$bucketName = process.env.MEDIA_BUCKET;
    this.$s3 = new S3Client();
  }

  public async getPresignUrl({ name, type, path }: PresignRequest): Promise<PresignResponse> {
    const command = new PutObjectCommand({
      Bucket: this.$bucketName,
      Key: name,
      ContentType: type,
    });

    try {
      const uploadUrl = await getSignedUrl(this.$s3, command, { expiresIn: 3600 });
      const publicUrl = `${process.env.BUCKET_PUBLIC_URL}${path ? `/${path}` : ''}/${name}`;

      return {
        uploadUrl,
        publicUrl,
      };
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new createHttpError.InternalServerError('Failed to generate presign url');
    }
  }
}

export const mediaService = new MediaService();
