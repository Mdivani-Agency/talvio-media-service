import { S3Event, S3Handler } from 'aws-lambda';
import { MediaRepository } from '@lib/repositories';

const mediaRepository = new MediaRepository();

/**
 * S3 notifications URL-encode object keys, with spaces as `+`.
 * The repository stores the original key.
 */
export const decodeS3Key = (key: string): string => decodeURIComponent(key.replace(/\+/g, ' '));

export const main: S3Handler = async (event: S3Event) => {
  console.log('S3 Event received:', JSON.stringify(event, null, 2));

  const failedKeys: string[] = [];

  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name;
    const rawKey = record.s3.object.key;

    let objectKey: string;
    try {
      objectKey = decodeS3Key(rawKey);
    } catch (error) {
      // A malformed key cannot succeed on retry, so skip it rather than fail the batch
      console.error(`Skipping S3 object with undecodable key ${rawKey}:`, error);
      continue;
    }

    console.log(`Processing S3 object: ${objectKey} from bucket: ${bucketName}`);

    try {
      // Try to find the media record in DynamoDB
      // We'll search by the slugified name as the key
      const mediaItem = await mediaRepository.get(objectKey);

      if (mediaItem) {
        console.log(`Found media item: ${JSON.stringify(mediaItem, null, 2)}`);

        // Check if the item is currently invalid
        if (mediaItem.status === 'pending') {
          console.log(`Updating media item ${objectKey} to valid`);

          // Update the media item to mark it as valid
          const updatedItem = await mediaRepository.validate(objectKey);

          console.log(`Successfully updated media item: ${JSON.stringify(updatedItem, null, 2)}`);
        } else {
          console.log(`Media item ${objectKey} is already valid`);
        }
      }
    } catch (error) {
      console.error(`Error processing media item for key ${objectKey}:`, error);
      // Keep processing the batch, then fail the invocation below
      failedKeys.push(objectKey);
    }
  }

  // Failing the invocation lets Lambda retry the async S3 notification.
  // Records that already succeeded are skipped on retry because they are no longer pending.
  if (failedKeys.length > 0) {
    throw new Error(
      `Failed to process ${failedKeys.length} of ${event.Records.length} S3 records: ${failedKeys.join(', ')}`,
    );
  }

  console.log('S3 event processing completed successfully');
};
