import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FreepikClient, FreepikApiError } from '../src/client/freepik-client.js';
import type { FreepikSearchResponse, FreepikDownloadResponse } from '../src/types/freepik-api.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('FreepikClient', () => {
  let client: FreepikClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new FreepikClient({
      apiKey: 'test-api-key',
      cacheEnabled: false, // Disable cache for testing
    });
  });

  describe('searchResources', () => {
    it('should search for videos successfully', async () => {
      const mockResponse: FreepikSearchResponse = {
        data: [
          {
            id: '123',
            title: 'Test video',
            content_type: 'video',
            description: 'A test video',
            tags: ['test', 'video'],
            author: { id: 'author1', name: 'Test Author' },
            thumbnail: { url: 'https://example.com/thumb.jpg', width: 1920, height: 1080 },
            video_info: {
              duration: 10.5,
              width: 1920,
              height: 1080,
              fps: 30,
              codec: 'h264',
              formats: [],
            },
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            premium: false,
            orientation: 'landscape',
          },
        ],
        meta: { total: 1, page: 1, per_page: 10, pages: 1 },
        links: { self: '', first: '', last: '' },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          'x-ratelimit-limit': '1000',
          'x-ratelimit-remaining': '999',
          'x-ratelimit-reset': '1234567890',
        }),
        json: async () => mockResponse,
      });

      const result = await client.searchResources({
        term: 'mountain sunset',
        filters: { content_type: ['video'] },
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Test video');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors', async () => {
      const mockResponse: FreepikSearchResponse = {
        data: [],
        meta: { total: 0, page: 1, per_page: 10, pages: 0 },
        links: { self: '', first: '', last: '' },
      };

      // Fail twice, then succeed
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => mockResponse,
        });

      const result = await client.searchResources({ term: 'test' });

      expect(result.data).toHaveLength(0);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw error on auth failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
        text: async () => 'Invalid API key',
      });

      await expect(client.searchResources({ term: 'test' })).rejects.toThrow(FreepikApiError);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retry on 401
    });

    it('should handle rate limiting', async () => {
      const mockResponse: FreepikSearchResponse = {
        data: [],
        meta: { total: 0, page: 1, per_page: 10, pages: 0 },
        links: { self: '', first: '', last: '' },
      };

      // First call: rate limited, second call: success
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Headers({
            'x-ratelimit-limit': '1000',
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 1),
          }),
          text: async () => 'Rate limit exceeded',
        })
        .mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => mockResponse,
        });

      const result = await client.searchResources({ term: 'test' });

      expect(result.data).toHaveLength(0);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getDownloadUrl', () => {
    it('should get download URL successfully', async () => {
      const mockResponse: FreepikDownloadResponse = {
        data: {
          url: 'https://download.example.com/video.mp4',
          expires_at: '2026-02-17T00:00:00Z',
          resource_id: '123',
          format: '1080p',
          file_size: 10485760,
          content_type: 'video/mp4',
        },
        meta: {
          rate_limit: {
            limit: 1000,
            remaining: 998,
            reset: 1234567890,
          },
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockResponse,
      });

      const result = await client.getDownloadUrl('123', '1080p');

      expect(result.data.url).toBe('https://download.example.com/video.mp4');
      expect(result.data.resource_id).toBe('123');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle resource not found', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        text: async () => 'Resource not found',
      });

      await expect(client.getDownloadUrl('999')).rejects.toThrow(FreepikApiError);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retry on 404
    });
  });

  describe('caching', () => {
    it('should cache search results', async () => {
      const clientWithCache = new FreepikClient({
        apiKey: 'test-api-key',
        cacheEnabled: true,
      });

      const mockResponse: FreepikSearchResponse = {
        data: [],
        meta: { total: 0, page: 1, per_page: 10, pages: 0 },
        links: { self: '', first: '', last: '' },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockResponse,
      });

      // First call: fetch from API
      await clientWithCache.searchResources({ term: 'test' });
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call: should use cache
      await clientWithCache.searchResources({ term: 'test' });
      expect(global.fetch).toHaveBeenCalledTimes(1); // No additional fetch

      // Different query: should fetch again
      await clientWithCache.searchResources({ term: 'different' });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
