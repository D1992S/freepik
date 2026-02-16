/**
 * API Response Cache
 * Implements LRU cache with TTL as per ADR-0003
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  size: number; // bytes
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number; // bytes
  entries: number;
}

export class ApiCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private stats: CacheStats;
  private readonly ttlMs: number;
  private readonly maxSizeBytes: number;

  constructor(ttlMs: number = 24 * 60 * 60 * 1000, maxSizeMb: number = 2048) {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, size: 0, entries: 0 };
    this.ttlMs = ttlMs;
    this.maxSizeBytes = maxSizeMb * 1024 * 1024;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttlMs) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.stats.hits++;
    return entry.data;
  }

  set<T>(key: string, data: T): void {
    const size = this.estimateSize(data);
    const now = Date.now();

    // Remove old entry if exists
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Evict LRU entries if needed
    while (this.stats.size + size > this.maxSizeBytes && this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.delete(firstKey);
      }
    }

    // Add new entry
    const entry: CacheEntry<T> = { data, timestamp: now, size };
    this.cache.set(key, entry);
    this.stats.size += size;
    this.stats.entries++;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    this.cache.delete(key);
    this.stats.size -= entry.size;
    this.stats.entries--;
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, size: 0, entries: 0 };
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Estimate size of data in bytes (approximate)
   */
  private estimateSize(data: unknown): number {
    try {
      return JSON.stringify(data).length * 2; // UTF-16 chars
    } catch {
      return 1024; // fallback estimate
    }
  }

  /**
   * Generate cache key from request params
   */
  static generateKey(endpoint: string, params?: Record<string, unknown>): string {
    const paramsStr = params ? JSON.stringify(params, Object.keys(params).sort()) : '';
    return `${endpoint}:${paramsStr}`;
  }
}
