# Media Service

A comprehensive media management service that provides APIs for generating presigned S3 upload URLs and querying media records. The service includes automatic file validation, user-specific storage, and pagination support.

Linear: [MDI-185](https://linear.app/mdivani/issue/MDI-185/media-service-67-devtalvioco-stage-config-github-actions-deploy) (stage + GitHub Actions). Authorizer: [MDI-187](https://linear.app/mdivani/issue/MDI-187). Presign-path: [MDI-188](https://linear.app/mdivani/issue/MDI-188).

## Features

- **Presigned Upload URLs**: Generate secure S3 upload URLs for direct file uploads
- **Media Records Query**: Retrieve and paginate user media records
- **Automatic Validation**: S3 event-driven media item validation
- **User-Specific Storage**: Organized file structure per user
- **Pagination Support**: Efficient handling of large media collections
- **TTL Support**: Automatic expiration of invalid media items

## API Overview

- **Development URL:** https://api.dev.talvio.co/media
- **Production URL:** https://api.talvio.co/media
- **Public files (dev):** https://media.dev.talvio.co

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
  "uploadUrl": "https://talvio-media-dev.s3.amazonaws.com/resume/user-123/my-resume-2024.pdf?X-Amz-Algorithm=...",
  "publicUrl": "https://media.dev.talvio.co/resume/user-123/my-resume-2024.pdf"
}
```

### 2. Query User Media Records

**Endpoint:** `GET /records/{userId}`

Retrieves media records for a specific user with pagination support. Returns a list of valid media items associated with the user.

#### Authentication
- **Type:** Bearer Token (Supabase JWT)
- **Header:** `Authorization: Bearer <supabase-access-token>`
- Token `sub` must match `{userId}`. Expired / wrong-issuer / missing header → 401. Other user's token → 403.

#### Request
- **Headers:**
  - `Authorization: Bearer <supabase-access-token>`
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
    'Authorization': 'Bearer supabase-access-token'
  }
});

const { items, nextToken } = await response.json();

// Get next page if available
if (nextToken) {
  const nextPageResponse = await fetch(
    `https://api.talvio.co/media/records/user-123?limit=50&nextToken=${nextToken}`,
    {
      headers: {
        'Authorization': 'Bearer supabase-access-token'
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

- Node.js 22+
- Yarn 4
- AWS CLI configured
- Serverless Framework 4 access/license key (`SERVERLESS_ACCESS_KEY` or `SERVERLESS_LICENSE_KEY`)

### Tooling (MDI-191)

- Lambda runtime `nodejs22.x`
- Serverless Framework 4.42 with native esbuild (no `serverless-esbuild`)
- TypeScript 5.8
- AWS SDK v3 `3.1136.0` (bundled; not the Lambda runtime SDK)
- Middy 6 (Jest 29 stays CJS; Middy 7 is ESM-only)
- `serverless-offline@14` for `yarn start` on Node 22

SF4 requires a license or access key. Organizations over $2M/year need a paid subscription; otherwise the CLI is free after sign-in.

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
cp .env.example .env
```

| Local / Lambda env | Source on deploy |
| --- | --- |
| `MEDIA_BUCKET` | Stage config (`talvio-media-dev` / `talvio-media-prod`) |
| `BUCKET_PUBLIC_URL` | `https://media.dev.talvio.co` / `https://media.talvio.co` |
| `MEDIA_TABLE` | SSM `/${stage}/dynamodb/media` |
| `CLOUDFRONT_DISTRIBUTION_ID` | SSM `/${stage}/cf/media/distribution-id` |
| `SUPABASE_URL` | SSM `/${stage}/supabase/url` — JWKS at `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` |

## Authorizer (MDI-187)

Public JWT routes (`GET /{userId}/records`, `POST /public/{userId}/presign`) use a TOKEN authorizer in this service. It verifies the Supabase access token against `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` (`iss = ${SUPABASE_URL}/auth/v1`, `aud = authenticated`) and puts `sub` on the authorizer context. `authorization.middleware.ts` then requires `pathParameters.userId === requestContext.authorizer.sub`.

This replaces the retired auth-service Lambda authorizer. Private presign routes still use `X-API-KEY`.

## Stage / SSM

| Stage | Domain | API | Bucket | Public CDN |
| --- | --- | --- | --- | --- |
| `dev` | `dev.talvio.co` | `api.dev.talvio.co/media` | `talvio-media-dev` | `https://media.dev.talvio.co` |
| `prod` | `talvio.co` | `api.talvio.co/media` | `talvio-media-prod` | `https://media.talvio.co` |

Custom domain uses the TF ACM cert (`*.dev.talvio.co` / SSM `/${stage}/ssl/arn/${domain}`). S3 notifications stay on the service (`existing: true`); Terraform must not add `aws_s3_bucket_notification`.

| Path | Use |
| --- | --- |
| `/${stage}/dynamodb/media` | Media table name |
| `/${stage}/cf/media/distribution-id` | CloudFront invalidation |
| `/${stage}/gw/generic/api-key-name` | Private route API key |
| `/${stage}/gw/generic/usageplan-name` | Usage plan |
| `/${stage}/ssl/arn/${domain}` | Existing us-east-1 ACM cert (edge custom domain) |
| `/${stage}/supabase/url` | Supabase project URL |
| `/${stage}/ci/deploy-role-arn` | GitHub Actions OIDC role |

## GitHub Actions

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) replaces `.gitlab-ci.yml`.

| Event | What runs |
| --- | --- |
| Pull request | lint + typecheck + test |
| Push (or `workflow_dispatch`) on `development` | `sls deploy --stage dev` (Environment `dev`) |
| Push (or `workflow_dispatch`) on `main` | `sls deploy --stage prod` (Environment `prod`) |

`development` is the default working branch and **only** deploys dev. `main` is production and is the **only** branch that deploys prod.

OIDC role is `talvio-gha-deploy-<env>` from `talvio-terraform-iac` bootstrap. Set Environment variable `AWS_DEPLOY_ROLE_ARN` (value is also in SSM `/${env}/ci/deploy-role-arn`). The workflow needs `id-token: write`.

Deploy jobs also need Environment secret `SERVERLESS_ACCESS_KEY` or `SERVERLESS_LICENSE_KEY` (Serverless Framework 4).

Trust `development` + Environment `dev` for the dev role, and `main` + Environment `prod` for the prod role.

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
