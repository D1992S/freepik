/**
 * Freepik API Client
 * Implements auth, retry, rate limiting, and caching as per ADR-0005
 */

import { ApiCache } from '../cache/api-cache.js';
import type {
  FreepikClientConfig,
  FreepikSearchParams,
  FreepikSearchResponse,
  FreepikDownloadResponse,
  FreepikRateLimit,
} from '../types/freepik-api.js';

export class FreepikApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public rateLimit?: FreepikRateLimit
  ) {
    super(message);
    this.name = 'FreepikApiError';
  }
}

export class FreepikClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly retryDelays: number[];
  private readonly cache: ApiCache | null;
  private currentRateLimit: FreepikRateLimit | null = null;

  constructor(config: FreepikClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.freepik.com/v1';
    this.maxRetries = config.maxRetries ?? 5;
    this.retryDelays = config.retryDelays ?? [1000, 2000, 4000, 8000, 16000];

    this.cache =
      config.cacheEnabled !== false ? new ApiCache(config.cacheTtlMs, config.cacheMaxSizeMb) : null;
  }

  /**
   * Search for resources (videos, images, etc.)
   */
  async searchResources(params: FreepikSearchParams): Promise<FreepikSearchResponse> {
    const endpoint = '/resources';
    const queryParams: Record<string, string> = {
      term: params.term,
      locale: params.locale ?? 'en-US',
      limit: (params.limit ?? 10).toString(),
      page: (params.page ?? 1).toString(),
    };

    if (params.filters) {
      queryParams.filters = JSON.stringify(params.filters);
    }

    // Check cache
    const cacheKey = ApiCache.generateKey(endpoint, queryParams);
    if (this.cache) {
      const cached = this.cache.get<FreepikSearchResponse>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Make API call
    const response = await this.makeRequest<FreepikSearchResponse>(endpoint, queryParams);

    // Cache response
    if (this.cache) {
      this.cache.set(cacheKey, response);
    }

    return response;
  }

  /**
   * Get download URL for a resource
   * Note: Download URLs are NOT cached as they expire
   */
  async getDownloadUrl(resourceId: string, format?: string): Promise<FreepikDownloadResponse> {
    const endpoint = `/resources/${resourceId}/download`;
    const queryParams: Record<string, string> = {};

    if (format) {
      queryParams.format = format;
    }

    const response = await this.makeRequest<FreepikDownloadResponse>(endpoint, queryParams);

    // Update rate limit info
    if (response.meta?.rate_limit) {
      this.currentRateLimit = response.meta.rate_limit;
    }

    return response;
  }

  /**
   * Get current rate limit status
   */
  getRateLimit(): FreepikRateLimit | null {
    return this.currentRateLimit ? { ...this.currentRateLimit } : null;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache?.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache?.getStats() ?? null;
  }

  /**
   * Make HTTP request with retry and rate limit handling
   */
  private async makeRequest<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Wait before retry (except first attempt)
        if (attempt > 0) {
          const delay =
            this.retryDelays[attempt - 1] ?? this.retryDelays[this.retryDelays.length - 1];
          await this.sleep(delay);
        }

        const response = await fetch(url.toString(), {
          headers: {
            'x-freepik-api-key': this.apiKey,
            Accept: 'application/json',
          },
        });

        // Parse rate limit from headers
        this.parseRateLimitHeaders(response.headers);

        // Handle rate limiting
        if (response.status === 429) {
          const resetTime = this.currentRateLimit?.reset ?? Date.now() / 1000 + 60;
          const waitMs = Math.max(0, resetTime * 1000 - Date.now());

          if (attempt < this.maxRetries) {
            await this.sleep(waitMs);
            continue;
          }

          throw new FreepikApiError('Rate limit exceeded', 429, this.currentRateLimit ?? undefined);
        }

        // Handle errors
        if (!response.ok) {
          const errorText = await response.text();
          throw new FreepikApiError(
            `API request failed: ${response.status} ${response.statusText}\n${errorText}`,
            response.status
          );
        }

        // Success
        return (await response.json()) as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on auth errors or client errors (except 429)
        if (
          error instanceof FreepikApiError &&
          error.statusCode &&
          error.statusCode >= 400 &&
          error.statusCode < 500 &&
          error.statusCode !== 429
        ) {
          throw error;
        }

        // Continue to next retry attempt
      }
    }

    // All retries exhausted
    throw new FreepikApiError(
      `API request failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`,
      undefined,
      this.currentRateLimit ?? undefined
    );
  }

  /**
   * Parse rate limit headers from response
   */
  private parseRateLimitHeaders(headers: Headers): void {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');

    if (limit && remaining && reset) {
      this.currentRateLimit = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
      };
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
