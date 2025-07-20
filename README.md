# Media Service

A comprehensive media management service that provides APIs for generating presigned S3 upload URLs and querying media records. The service includes automatic file validation, user-specific storage, and pagination support.

## Features

- **Presigned Upload URLs**: Generate secure S3 upload URLs for direct file uploads
- **Media Records Query**: Retrieve and paginate user media records
- **Automatic Validation**: S3 event-driven media item validation
- **User-Specific Storage**: Organized file structure per user
- **Pagination Support**: Efficient handling of large media collections
- **TTL Support**: Automatic expiration of invalid media items

## API Overview

- **Development URL:** https://api.cohub.click/media
- **Production URL:** https://api.talvio.co/media

## Endpoints

### 1. Generate Presigned Upload URL

**Endpoint:** `POST /presign/{userId}`

Generates a presigned S3 URL for uploading a media file for a specific user. The file will be stored in the user's directory structure.

#### Authentication
- **Type:** API Key
- **Header:** `X-API-KEY: <your-api-key>`

#### Request
- **Headers:**
  - `Content-Type: application/json`
  - `X-API-KEY: <your-api-key>`
- **Path Parameters:**
  - `userId` (string, required): User UUID
- **Body:**
```json
{
  "name": "my-resume-2024.pdf",
  "type": "application/pdf",
  "path": "resume" // optional
}
```

#### Supported File Types
- `image/jpeg` - JPEG images
- `image/png` - PNG images
- `image/webp` - WebP images
- `application/pdf` - PDF documents

#### Response
- **Status:** 200 OK
- **Body:**
```json
{
  "uploadUrl": "https://talvio-content.s3.amazonaws.com/resume/user-123/my-resume-2024.pdf?X-Amz-Algorithm=...",
  "publicUrl": "https://media.talvio.co/resume/user-123/my-resume-2024.pdf"
}
```

### 2. Query User Media Records

**Endpoint:** `GET /records/{userId}`

Retrieves media records for a specific user with pagination support. Returns a list of valid media items associated with the user.

#### Authentication
- **Type:** Bearer Token
- **Header:** `Authorization: Bearer <jwt-token>`

#### Request
- **Headers:**
  - `Authorization: Bearer <jwt-token>`
- **Path Parameters:**
  - `userId` (string, required): User UUID
- **Query Parameters:**
  - `limit` (optional): Number of items to return (50, 100, 200)
  - `nextToken` (optional): Pagination token for next page

#### Response
- **Status:** 200 OK
- **Body:**
```json
{
  "items": [
    {
      "key": "resume/user-123/my-resume-2024.pdf",
      "userId": "user-123",
      "name": "my-resume-2024.pdf",
      "type": "application/pdf",
      "publicUrl": "https://media.talvio.co/resume/user-123/my-resume-2024.pdf",
      "isValid": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "nextToken": "eyJ1c2VySWQiOiJ1c2VyLTEyMyIsImtleSI6Imxhc3QtaXRlbS1rZXkifQ=="
}
```

## Usage Examples

### 1. Upload a File

```javascript
// 1. Request a presigned URL
const response = await fetch('https://api.talvio.co/media/presign/user-123', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': 'your-api-key'
  },
  body: JSON.stringify({
    name: 'my-resume-2024.pdf',
    type: 'application/pdf',
    path: 'resume'
  })
});

const { uploadUrl, publicUrl } = await response.json();

// 2. Upload the file directly to S3
const file = document.getElementById('fileInput').files[0];
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': 'application/pdf'
  }
});

// 3. File is now available at publicUrl
console.log('File uploaded:', publicUrl);
```

### 2. Query User Media

```javascript
// Get first page of user's media records
const response = await fetch('https://api.talvio.co/media/records/user-123?limit=50', {
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  }
});

const { items, nextToken } = await response.json();

// Get next page if available
if (nextToken) {
  const nextPageResponse = await fetch(
    `https://api.talvio.co/media/records/user-123?limit=50&nextToken=${nextToken}`,
    {
      headers: {
        'Authorization': 'Bearer your-jwt-token'
      }
    }
  );
  const nextPage = await nextPageResponse.json();
}
```

## Architecture

### Components

- **API Gateway**: RESTful API endpoints with validation
- **Lambda Functions**: Serverless compute for API handlers
- **S3 Bucket**: File storage with event-driven triggers
- **DynamoDB**: Media records storage with TTL support
- **CloudFront**: CDN for public file access

### File Structure

```
user-123/
├── resume/
│   ├── my-resume-2024.pdf
│   └── cover-letter.pdf
├── profile/
│   └── avatar.jpg
└── documents/
    └── contract.pdf
```

### Data Flow

1. **Upload Request**: Client requests presigned URL with file details
2. **URL Generation**: Service generates S3 presigned URL and creates media record
3. **File Upload**: Client uploads file directly to S3 using presigned URL
4. **Event Trigger**: S3 triggers Lambda function on file creation
5. **Validation**: Lambda validates media record and marks as valid
6. **Query**: Client can query validated media records with pagination

## Error Handling

### Common Error Responses

```json
// 400 Bad Request - Validation Error
{
  "error": true,
  "message": "Event object failed validation"
}

// 401 Unauthorized - Authentication Error
{
  "error": true,
  "message": "Unauthorized access"
}

// 500 Internal Server Error
{
  "error": true,
  "message": "Internal Server Error"
}
```

## Development

### Prerequisites

- Node.js 18.18.0+
- Yarn package manager
- AWS CLI configured

### Installation

```bash
# Install dependencies
yarn install

# Run tests
yarn test:integration

# Start local development
yarn start
```

### Environment Variables

```bash
# Required
MEDIA_BUCKET=your-s3-bucket-name
MEDIA_TABLE=your-dynamodb-table-name
REGION=us-west-1

# Optional
BUCKET_PUBLIC_URL=https://your-cdn-domain.com
```

### Testing

```bash
# Run all tests
yarn test:integration

# Run specific test file
yarn test:integration src/functions/presign/handler.spec.ts

# Run with coverage
yarn test:coverage
```

## API Documentation

For complete API documentation, see the [OpenAPI specification](docs/openapi.yml).

## Contributing

1. Follow the existing code structure and patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure all tests pass before submitting

## License

ISC License - see LICENSE file for details.
