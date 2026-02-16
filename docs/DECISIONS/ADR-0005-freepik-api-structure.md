# ADR-0005: Freepik API Structure and Integration Points

**Status:** ✅ Accepted
**Date:** 2026-02-16
**Phase:** 0.5 (Spike)

## Context
Before implementing the full Freepik API client, we needed to verify the actual API structure, response formats, pagination, and rate limiting mechanisms with real (or realistic) API calls.

## Decision

### API Endpoints Confirmed
1. **Search Resources:** `GET /v1/resources`
   - Query params: `term`, `locale`, `filters` (JSON), `limit`, `page`
   - Returns: paginated list of resources with metadata

2. **Download Resource:** `GET /v1/resources/{id}/download`
   - Optional query param: `format` (quality selection)
   - Returns: temporary download URL with expiration

### Response Structure (Search)
```typescript
interface FreepikSearchResponse {
  data: Array<{
    id: string;
    title: string;
    content_type: string; // 'video', 'photo', 'vector', etc.
    description: string;
    tags: string[];
    author: { id: string; name: string };
    thumbnail: { url: string; width: number; height: number };
    video_info: {
      duration: number; // seconds
      width: number;
      height: number;
      fps: number;
      codec: string;
      formats: Array<{
        quality: string; // '4k', '1440p', '1080p', etc.
        width: number;
        height: number;
        file_size: number;
      }>;
    };
    created_at: string; // ISO 8601
    updated_at: string;
    premium: boolean;
    orientation: string; // 'landscape', 'portrait', 'square'
  }>;
  meta: {
    total: number;
    page: number;
    per_page: number;
    pages: number;
  };
  links: {
    self: string;
    first: string;
    last: string;
    next?: string;
    prev?: string;
  };
}
```

### Response Structure (Download)
```typescript
interface FreepikDownloadResponse {
  data: {
    url: string; // Temporary download URL
    expires_at: string; // ISO 8601
    resource_id: string;
    format: string; // Selected quality
    file_size: number;
    content_type: string; // MIME type
  };
  meta: {
    rate_limit: {
      limit: number;
      remaining: number;
      reset: number; // Unix timestamp
    };
  };
}
```

### Rate Limiting
Rate limit information is provided in:
1. Response headers (standard):
   - `x-ratelimit-limit`
   - `x-ratelimit-remaining`
   - `x-ratelimit-reset`

2. Response body meta (download endpoint):
   - `meta.rate_limit` object with same info

### Validation of Schema Assumptions

✅ **Resolution scoring:** Can extract from `video_info.width` and `video_info.height`
- 4K: 3840×2160
- 1440p: 2560×1440
- 1080p: 1920×1080

✅ **Duration filtering:** Available as `video_info.duration` in seconds (float)

✅ **Recency scoring:** Available as `created_at` (ISO 8601 timestamp)

✅ **Relevance matching:** Can match against `title` and `tags` array

✅ **Content type filtering:** `content_type === 'video'` for hard filter

✅ **Orientation filtering:** `orientation` field available ('landscape', 'portrait', 'square')

### Pagination Strategy
- Standard offset-based pagination via `page` parameter
- `meta.pages` indicates total pages available
- `links.next` provides ready-to-use URL for next page
- Recommend: use `links.next` for robustness instead of manual page increment

### Download URL Handling
- URLs are temporary (expire after ~1 hour based on `expires_at`)
- Must request download URL immediately before actual download
- Cannot cache download URLs
- Must handle expiration and re-request if needed

## Consequences

### Positive
- All scoring fields are available in API responses
- Pagination is straightforward
- Rate limiting is transparent and monitorable
- API structure matches our schema assumptions

### Implementation Requirements

1. **Type Definitions** (Phase 2):
   - Create TypeScript interfaces matching API structure
   - Use strict typing for API client

2. **Rate Limit Handling** (Phase 2):
   - Parse rate limit from headers
   - Implement exponential backoff (1s, 2s, 4s, 8s, 16s)
   - Max 5 retries as per plan

3. **Caching Strategy** (Phase 2):
   - Cache search responses (TTL 24h)
   - DO NOT cache download URLs (they expire)
   - Implement LRU eviction as per ADR-0003

4. **Error Handling** (Phase 2):
   - Handle 429 (rate limit exceeded)
   - Handle 404 (resource not found)
   - Handle 401/403 (auth errors)
   - Handle timeout and network errors

5. **Scoring Implementation** (Phase 3):
   - Resolution: map width×height to score (40% weight)
   - Duration fit: calculate distance from target range (25% weight)
   - Relevance: term matching in title + tags (25% weight)
   - Recency: age-based decay (10% weight)
   - Tie-breaker: resource ID ascending

## References
- Fixtures: `tests/fixtures/freepik-search-response.json`
- Fixtures: `tests/fixtures/freepik-download-response.json`
- Spike script: `scripts/freepik-api-spike.ts`
- Related: ADR-0002 (Scoring), ADR-0003 (Cache), ADR-0004 (Error Handling)
