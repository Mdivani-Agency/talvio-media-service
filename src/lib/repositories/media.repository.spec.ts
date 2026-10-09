import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { MOCK_VALID_MEDIA_ITEM } from '../../tests/mocks/media';
import { MediaRepository } from './media.repository';

describe('MediaRepository update', () => {
  let send: jest.SpyInstance;
  let repository: MediaRepository;

  const sentInput = () => (send.mock.calls[0][0] as UpdateCommand).input;

  beforeEach(() => {
    jest.clearAllMocks();
    send = jest
      .spyOn(DynamoDBDocumentClient.prototype, 'send')
      .mockResolvedValue({ Attributes: MOCK_VALID_MEDIA_ITEM } as never);
    repository = new MediaRepository();
  });

  afterEach(() => {
    send.mockRestore();
  });

  it('validate sets status and removes expires in a separate REMOVE clause', async () => {
    const result = await repository.validate(MOCK_VALID_MEDIA_ITEM.key);

    expect(result).toEqual(MOCK_VALID_MEDIA_ITEM);
    expect(send).toHaveBeenCalledTimes(1);

    const input = sentInput();
    expect(input.Key).toEqual({ key: MOCK_VALID_MEDIA_ITEM.key });
    expect(input.UpdateExpression).toBe(
      'SET #status = :status, #updatedAt = :updatedAt REMOVE #expires',
    );
    expect(input.ExpressionAttributeNames).toMatchObject({
      '#status': 'status',
      '#updatedAt': 'updatedAt',
      '#expires': 'expires',
    });
    expect(input.ExpressionAttributeValues).toMatchObject({ ':status': 'uploaded' });
    expect(input.ExpressionAttributeValues).not.toHaveProperty(':expires');
  });

  it('ignores a caller expires when the status is uploaded', async () => {
    await repository.update({
      key: MOCK_VALID_MEDIA_ITEM.key,
      status: 'uploaded',
      expires: new Date().toISOString(),
    });

    const input = sentInput();
    expect(input.UpdateExpression).toBe(
      'SET #status = :status, #updatedAt = :updatedAt REMOVE #expires',
    );
    expect(input.ExpressionAttributeValues).not.toHaveProperty(':expires');
  });

  it('sets expires once when the status is pending', async () => {
    await repository.update({
      key: MOCK_VALID_MEDIA_ITEM.key,
      status: 'pending',
      expires: 'caller-value',
    });

    const input = sentInput();
    expect(input.UpdateExpression).toBe(
      'SET #status = :status, #updatedAt = :updatedAt, #expires = :expires',
    );
    expect(input.UpdateExpression).not.toContain('REMOVE');
    expect(input.ExpressionAttributeValues?.[':expires']).not.toBe('caller-value');
  });

  it('builds a SET-only expression when the status does not change', async () => {
    await repository.update({ key: MOCK_VALID_MEDIA_ITEM.key, name: 'renamed.jpg' });

    const input = sentInput();
    expect(input.UpdateExpression).toBe('SET #name = :name, #updatedAt = :updatedAt');
    expect(input.ExpressionAttributeNames).not.toHaveProperty('#expires');
  });

  it('maps a failed condition to a not found error', async () => {
    const error = new Error('conditional');
    error.name = 'ConditionalCheckFailedException';
    send.mockRejectedValueOnce(error);

    await expect(repository.validate(MOCK_VALID_MEDIA_ITEM.key)).rejects.toThrow(
      'Media item not found',
    );
  });
});
