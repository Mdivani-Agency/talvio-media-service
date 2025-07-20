import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { CreateMediaParams, MediaItem, UpdateMediaParams } from '@lib/types';

export const EXPIRATION_TIME = 3600; // 1 hour

export class MediaRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor() {
    const dynamoClient = new DynamoDBClient();
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = process.env.MEDIA_TABLE || 'media-table-dev';
  }

  /**
   * Create a new media item
   */
  async create(params: CreateMediaParams): Promise<MediaItem> {
    const now = new Date().toISOString();
    const item: MediaItem = {
      ...params,
      isValid: !!params.isValid,
      expires: params.isValid ? undefined : new Date(Date.now() + EXPIRATION_TIME).toISOString(),
      createdAt: now,
      updatedAt: now,
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
      ConditionExpression: 'attribute_not_exists(#key)',
      ExpressionAttributeNames: {
        '#key': 'key',
        '#userId': 'userId',
      },
    });

    try {
      await this.client.send(command);
      return item;
    } catch (error) {
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
        throw new Error('Media item already exists');
      }
      throw error;
    }
  }

  /**
   * Get a media item by key and userId
   */
  async get(key: string, userId: string): Promise<MediaItem | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        key,
        userId,
      },
    });

    try {
      const result = await this.client.send(command);
      return result.Item as MediaItem | null;
    } catch (error) {
      throw new Error(`Failed to get media item: ${error}`);
    }
  }

  /**
   * Get all media items for a user
   */
  async getByUserId(
    userId: string,
    limit = 50,
    nextToken?: string,
  ): Promise<{
    items: MediaItem[];
    nextToken?: string;
  }> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'userId-index', // Assuming GSI on userId
      KeyConditionExpression: '#userId = :userId',
      ExpressionAttributeNames: {
        '#userId': 'userId',
      },
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      Limit: limit,
      ExclusiveStartKey: nextToken ? JSON.parse(nextToken) : undefined,
    });

    try {
      const result = await this.client.send(command);
      return {
        items: (result.Items as MediaItem[]) || [],
        nextToken: result.LastEvaluatedKey ? JSON.stringify(result.LastEvaluatedKey) : undefined,
      };
    } catch (error) {
      throw new Error(`Failed to get media items for user: ${error}`);
    }
  }

  /**
   * Get valid media items for a user
   */
  async getValidByUserId(
    userId: string,
    limit = 50,
    nextToken?: string,
  ): Promise<{
    items: MediaItem[];
    nextToken?: string;
  }> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'userId-index',
      KeyConditionExpression: '#userId = :userId',
      FilterExpression: '#isValid = :isValid',
      ExpressionAttributeNames: {
        '#userId': 'userId',
        '#isValid': 'isValid',
      },
      ExpressionAttributeValues: {
        ':userId': userId,
        ':isValid': true,
      },
      Limit: limit,
      ExclusiveStartKey: nextToken ? JSON.parse(nextToken) : undefined,
    });

    try {
      const result = await this.client.send(command);
      return {
        items: (result.Items as MediaItem[]) || [],
        nextToken: result.LastEvaluatedKey ? JSON.stringify(result.LastEvaluatedKey) : undefined,
      };
    } catch (error) {
      throw new Error(`Failed to get valid media items for user: ${error}`);
    }
  }

  /**
   * Update a media item
   */
  async update(params: UpdateMediaParams): Promise<MediaItem> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Build update expression dynamically
    Object.entries(params).forEach(([key, value]) => {
      if (key !== 'key' && key !== 'userId' && value !== undefined) {
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;
        updateExpressions.push(`${attributeName} = ${attributeValue}`);
        expressionAttributeNames[attributeName] = key;
        expressionAttributeValues[attributeValue] = value;
      }
    });

    // Always update updatedAt
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    if (params.isValid) {
      updateExpressions.push('#expires = :expires');
      expressionAttributeNames['#expires'] = 'expires';
      expressionAttributeValues[':expires'] = undefined;
    }

    if (typeof params.isValid === 'boolean' && params.isValid === false) {
      updateExpressions.push('#expires = :expires');
      expressionAttributeNames['#expires'] = 'expires';
      expressionAttributeValues[':expires'] = new Date(Date.now() + EXPIRATION_TIME).toISOString();
    }

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        key: params.key,
        userId: params.userId,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: {
        ...expressionAttributeNames,
        '#key': 'key',
        '#userId': 'userId',
      },
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
      ConditionExpression: 'attribute_exists(#key) AND attribute_exists(#userId)',
    });

    try {
      const result = await this.client.send(command);
      return result.Attributes as MediaItem;
    } catch (error) {
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
        throw new Error('Media item not found');
      }
      throw new Error(`Failed to update media item: ${error}`);
    }
  }

  async validate(key: string, userId: string): Promise<MediaItem> {
    return this.update({
      key,
      userId,
      isValid: true,
    });
  }

  /**
   * Delete a media item
   */
  async delete(key: string, userId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        key,
        userId,
      },
      ConditionExpression: 'attribute_exists(#key) AND attribute_exists(#userId)',
      ExpressionAttributeNames: {
        '#key': 'key',
        '#userId': 'userId',
      },
    });

    try {
      await this.client.send(command);
    } catch (error) {
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
        throw new Error('Media item not found');
      }
      throw new Error(`Failed to delete media item: ${error}`);
    }
  }

  /**
   * Soft delete by marking as invalid
   */
  async softDelete(key: string, userId: string): Promise<MediaItem> {
    return this.update({
      key,
      userId,
      isValid: false,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    });
  }

  /**
   * Check if media item exists
   */
  async exists(key: string, userId: string): Promise<boolean> {
    const item = await this.get(key, userId);
    return item !== null;
  }

  /**
   * Get media item count for a user
   */
  async getCountByUserId(userId: string): Promise<number> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'userId-index',
      KeyConditionExpression: '#userId = :userId',
      ExpressionAttributeNames: {
        '#userId': 'userId',
      },
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      Select: 'COUNT',
    });

    try {
      const result = await this.client.send(command);
      return result.Count || 0;
    } catch (error) {
      throw new Error(`Failed to get media count for user: ${error}`);
    }
  }
}

export const mediaRepository = new MediaRepository();
