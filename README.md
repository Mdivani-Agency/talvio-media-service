# Media Service

This service provides a simple API to generate presigned S3 upload URLs for media files (images, PDFs, etc.), allowing clients to securely upload files directly to S3 and retrieve their public URLs.

## API Overview

- **Development URL:** https://api.cohub.click/media
- **Production URL:** https://api.talvio.co/media

### Endpoint: `POST /presign`

Generates a presigned S3 URL for uploading a media file. Returns both the upload URL and the public URL for accessing the file after upload.

#### Request
- **Headers:**
  - `Content-Type: application/json`
  - `X-API-KEY: <your-api-key>`
- **Body:**
```json
{
  "name": "example.jpg",
  "type": "image/jpeg",
  "path": "user-uploads/2024/06" // optional
}
```

#### Response
- **Status:** 200 OK
- **Body:**
```json
{
  "uploadUrl": "https://talvio-content.s3.amazonaws.com/example.jpg?X-Amz-Algorithm=...",
  "publicUrl": "https://media.talvio.co/user-uploads/2024/06/example.jpg"
}
```

## Usage Example

1. **Request a presigned URL:**
   Send a POST request to `/presign` with the file details.
2. **Upload the file:**
   Use the returned `uploadUrl` to upload your file directly to S3 using an HTTP PUT request.
3. **Access the file:**
   After upload, access the file via the `publicUrl`.

---

For more details, see the [OpenAPI documentation](docs/openapi.yml).
