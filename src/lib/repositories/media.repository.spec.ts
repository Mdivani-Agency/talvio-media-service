import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { MOCK_INVALID_MEDIA_ITEM, MOCK_VALID_MEDIA_ITEM } from '../../tests/mocks/media';
import { EXPIRATION_TIME, MediaRepository } from './media.repository';

const NOW_MS = Date.UTC(2026, 0, 1, 12, 0, 0, 500);
const EXPECTED_EXPIRES = Math.floor(NOW_MS / 1000) + EXPIRATION_TIME;

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
    jest.restoreAllMocks();
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
      expires: 123,
    });

    const input = sentInput();
    expect(input.UpdateExpression).toBe(
      'SET #status = :status, #updatedAt = :updatedAt REMOVE #expires',
    );
    expect(input.ExpressionAttributeValues).not.toHaveProperty(':expires');
  });

  it('sets expires once, in epoch seconds one hour out, when the status is pending', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);

    await repository.update({
      key: MOCK_VALID_MEDIA_ITEM.key,
      status: 'pending',
      expires: 123,
    });

    const input = sentInput();
    expect(input.UpdateExpression).toBe(
      'SET #status = :status, #updatedAt = :updatedAt, #expires = :expires',
    );
    expect(input.UpdateExpression).not.toContain('REMOVE');
    expect(input.ExpressionAttributeValues?.[':expires']).toBe(EXPECTED_EXPIRES);
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

describe('MediaRepository create', () => {
  let send: jest.SpyInstance;
  let repository: MediaRepository;

  const sentItem = () => (send.mock.calls[0][0] as PutCommand).input.Item;

  beforeEach(() => {
    send = jest.spyOn(DynamoDBDocumentClient.prototype, 'send').mockResolvedValue({} as never);
    jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
    repository = new MediaRepository();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes a pending item with expires as epoch seconds one hour out', async () => {
    const { key, userId, name, type, publicUrl } = MOCK_INVALID_MEDIA_ITEM;

    const item = await repository.create({ key, userId, name, type, publicUrl });

    expect(item.status).toBe('pending');
    expect(item.expires).toBe(EXPECTED_EXPIRES);
    expect(Number.isInteger(item.expires)).toBe(true);
    expect(sentItem()).toMatchObject({ status: 'pending', expires: EXPECTED_EXPIRES });
  });

  it('writes an uploaded item without expires', async () => {
    const { key, userId, name, type, publicUrl } = MOCK_VALID_MEDIA_ITEM;

    const item = await repository.create({
      key,
      userId,
      name,
      type,
      publicUrl,
      status: 'uploaded',
    });

    expect(item.expires).toBeUndefined();
    expect(sentItem()?.expires).toBeUndefined();
  });
});
