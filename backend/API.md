# Glask IDE API Documentation

## Filesystem API

### List Directory
- **Endpoint**: `GET /api/fs/list`
- **Query Parameters**:
  - `path` (string): Directory path to list (default: ".")
  - `recursive` (boolean): Whether to list recursively
  - `includeHidden` (boolean): Whether to include hidden files
- **Response**: JSON
```json
{
  "items": [
    {
      "path": "string",
      "name": "string",
      "size": "number",
      "mode": "string",
      "modTime": "number",
      "isDir": "boolean"
    }
  ]
}
```

### Watch Directory (WebSocket)
- **Endpoint**: `WebSocket /api/fs/watch`
- **Initial Message (Client -> Server)**:
```json
{
  "path": "string",
  "recursive": "boolean"
}
```
- **Events (Server -> Client)**:
```json
{
  "type": "CREATED|MODIFIED|DELETED|RENAMED",
  "path": "string",
  "fileInfo": {
    "path": "string",
    "name": "string",
    "size": "number",
    "mode": "string",
    "modTime": "number",
    "isDir": "boolean"
  },
  "oldPath": "string" // Only for RENAMED events
}
```

### Read File
- **Endpoint**: `GET /api/fs/read`
- **Query Parameters**:
  - `path` (string): File path to read
- **Response**: File content with appropriate Content-Type

### Write File
- **Endpoint**: `POST|PUT /api/fs/write`
- **Request Body**:
```json
{
  "path": "string",
  "content": "base64 encoded content"
}
```
- **Response**: JSON
```json
{
  "success": "boolean"
}
```

### Delete File
- **Endpoint**: `DELETE /api/fs/delete`
- **Query Parameters**:
  - `path` (string): File path to delete
- **Response**: JSON
```json
{
  "success": "boolean"
}
```

### Move/Rename File
- **Endpoint**: `POST /api/fs/move`
- **Request Body**:
```json
{
  "oldPath": "string",
  "newPath": "string"
}
```
- **Response**: JSON
```json
{
  "success": "boolean"
}
```

### Create Directory
- **Endpoint**: `POST /api/fs/mkdir`
- **Request Body**:
```json
{
  "path": "string"
}
```
- **Response**: JSON
```json
{
  "success": "boolean"
}
```

### Delete Directory
- **Endpoint**: `DELETE /api/fs/rmdir`
- **Query Parameters**:
  - `path` (string): Directory path to delete
- **Response**: JSON
```json
{
  "success": "boolean"
}
```

### Search Files
- **Endpoint**: `GET /api/fs/search`
- **Query Parameters**:
  - `query` (string): Search query
  - `pattern` (string[]): File patterns to match (can be specified multiple times)
  - `maxResults` (number): Maximum number of results to return (default: 100)
- **Response**: JSON
```json
{
  "results": [
    {
      "path": "string",
      "name": "string",
      "size": "number",
      "mode": "string",
      "modTime": "number",
      "isDir": "boolean"
    }
  ],
  "totalCount": "number"
}
```

## Error Responses
All endpoints may return error responses in the following format:
```json
{
  "error": "string"
}
```

Common HTTP status codes:
- 400: Bad Request (invalid parameters)
- 404: Not Found (file/directory not found)
- 405: Method Not Allowed (wrong HTTP method)
- 500: Internal Server Error 