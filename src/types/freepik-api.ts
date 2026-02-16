/**
 * Freepik API type definitions
 * Based on ADR-0005 API structure validation
 */

export interface FreepikAuthor {
  id: string;
  name: string;
}

export interface FreepikThumbnail {
  url: string;
  width: number;
  height: number;
}

export interface FreepikVideoFormat {
  quality: string; // '4k', '1440p', '1080p', etc.
  width: number;
  height: number;
  file_size: number;
}

export interface FreepikVideoInfo {
  duration: number; // seconds
  width: number;
  height: number;
  fps: number;
  codec: string;
  formats: FreepikVideoFormat[];
}

export type FreepikOrientation = 'landscape' | 'portrait' | 'square';

export interface FreepikResource {
  id: string;
  title: string;
  content_type: string; // 'video', 'photo', 'vector', etc.
  description: string;
  tags: string[];
  author: FreepikAuthor;
  thumbnail: FreepikThumbnail;
  video_info?: FreepikVideoInfo; // Only for videos
  created_at: string; // ISO 8601
  updated_at: string;
  premium: boolean;
  orientation: FreepikOrientation;
}

export interface FreepikSearchMeta {
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface FreepikSearchLinks {
  self: string;
  first: string;
  last: string;
  next?: string;
  prev?: string;
}

export interface FreepikSearchResponse {
  data: FreepikResource[];
  meta: FreepikSearchMeta;
  links: FreepikSearchLinks;
}

export interface FreepikRateLimit {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

export interface FreepikDownloadData {
  url: string; // Temporary download URL
  expires_at: string; // ISO 8601
  resource_id: string;
  format: string; // Selected quality
  file_size: number;
  content_type: string; // MIME type
}

export interface FreepikDownloadResponse {
  data: FreepikDownloadData;
  meta?: {
    rate_limit?: FreepikRateLimit;
  };
}

export interface FreepikSearchParams {
  term: string;
  locale?: string;
  filters?: {
    content_type?: string[];
    order?: 'latest' | 'popular' | 'random';
    orientation?: FreepikOrientation;
  };
  limit?: number;
  page?: number;
}

export interface FreepikClientConfig {
  apiKey: string;
  baseUrl?: string;
  maxRetries?: number;
  retryDelays?: number[]; // milliseconds
  cacheEnabled?: boolean;
  cacheTtlMs?: number;
  cacheMaxSizeMb?: number;
}
