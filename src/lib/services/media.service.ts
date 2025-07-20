import createHttpError from 'http-errors';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CreateMediaParams, MediaItem, PresignRequest, PresignResponse } from '@lib/types';
import { slugifyAndRemoveExtension } from '@lib/utils';
import { EXPIRATION_TIME, MediaRepository, mediaRepository } from '@lib/repositories';
import { cloudfrontApi, CloudFrontApi } from '@lib/clients';

const bucketName = process.env.MEDIA_BUCKET || 'media-service-dev';
const region = process.env.REGION || 'us-west-1';
const bucketPublicUrl =
  process.env.BUCKET_PUBLIC_URL || 'https://media-service-dev.s3.us-west-1.amazonaws.com';

class MediaService {
  private readonly mediaRepository: MediaRepository;
  private readonly cloudfrontApi: CloudFrontApi;

  constructor() {
    this.mediaRepository = mediaRepository;
    this.cloudfrontApi = cloudfrontApi;
  }

  public async upsertMedia(params: CreateMediaParams): Promise<MediaItem> {
    const media = await this.mediaRepository.get(params.key);

    if (media) {
      await this.cloudfrontApi.invalidate(media.key);
      return this.mediaRepository.update({
        key: media.key,
        userId: media.userId,
        isValid: false,
      });
    }

    return this.mediaRepository.create(params);
  }

  public async getPresignUrl(
    { name, type, path }: PresignRequest,
    userId: string,
  ): Promise<PresignResponse> {
    const client = new S3Client({ region });
    const key = `${path ? `${path}/` : ''}/${userId}/${slugifyAndRemoveExtension(name)}.${type.split('/')[1]}`;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: type,
    });

    try {
      const uploadUrl = await getSignedUrl(client, command, { expiresIn: EXPIRATION_TIME });
      const publicUrl = `${bucketPublicUrl}/${key}`;

      await this.upsertMedia({
        key,
        userId,
        name,
        type,
        publicUrl,
      });

      return {
        uploadUrl,
        publicUrl,
      };
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new createHttpError.InternalServerError('Failed to generate presign url');
    }
  }

  public async queryUserMedia(
    userId: string,
    limit = 50,
    nextToken?: string,
  ): Promise<{
    items: MediaItem[];
    nextToken?: string;
  }> {
    return this.mediaRepository.getByUserId(userId, limit, nextToken);
  }
}

export const mediaService = new MediaService();
