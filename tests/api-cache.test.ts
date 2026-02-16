import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiCache } from '../src/cache/api-cache.js';

describe('ApiCache', () => {
  let cache: ApiCache;

  beforeEach(() => {
    cache = new ApiCache(1000, 1); // 1 second TTL, 1 MB max size
  });

  describe('get/set', () => {
    it('should store and retrieve data', () => {
      cache.set('key1', { data: 'value1' });
      const result = cache.get<{ data: string }>('key1');

      expect(result).toEqual({ data: 'value1' });
    });

    it('should return null for non-existent key', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should update stats on hits and misses', () => {
      cache.set('key1', { data: 'value1' });

      cache.get('key1'); // hit
      cache.get('key2'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      vi.useFakeTimers();

      cache.set('key1', { data: 'value1' });
      expect(cache.get('key1')).toEqual({ data: 'value1' });

      // Advance time past TTL
      vi.advanceTimersByTime(1001);

      expect(cache.get('key1')).toBeNull();

      vi.useRealTimers();
    });

    it('should not expire entries before TTL', async () => {
      vi.useFakeTimers();

      cache.set('key1', { data: 'value1' });

      // Advance time but not past TTL
      vi.advanceTimersByTime(500);

      expect(cache.get('key1')).toEqual({ data: 'value1' });

      vi.useRealTimers();
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entries when size limit reached', () => {
      const smallCache = new ApiCache(10000, 0.0005); // Very small cache (512 bytes)

      // Add entries until eviction occurs (each ~200 bytes)
      smallCache.set('key1', { data: 'a'.repeat(100) });
      smallCache.set('key2', { data: 'b'.repeat(100) });
      smallCache.set('key3', { data: 'c'.repeat(100) });

      // key1 should be evicted (oldest)
      expect(smallCache.get('key1')).toBeNull();
      expect(smallCache.get('key2')).not.toBeNull();
      expect(smallCache.get('key3')).not.toBeNull();
    });

    it('should update LRU order on access', () => {
      const smallCache = new ApiCache(10000, 0.0005); // Very small cache (512 bytes)

      smallCache.set('key1', { data: 'a'.repeat(100) });
      smallCache.set('key2', { data: 'b'.repeat(100) });

      // Access key1 to make it more recent
      smallCache.get('key1');

      // Add another entry that triggers eviction
      smallCache.set('key3', { data: 'c'.repeat(100) });

      // key2 should be evicted (least recently used)
      expect(smallCache.get('key2')).toBeNull();
      expect(smallCache.get('key1')).not.toBeNull();
      expect(smallCache.get('key3')).not.toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete entry and update stats', () => {
      cache.set('key1', { data: 'value1' });

      const statsBefore = cache.getStats();
      expect(statsBefore.entries).toBe(1);

      const deleted = cache.delete('key1');

      expect(deleted).toBe(true);
      expect(cache.get('key1')).toBeNull();

      const statsAfter = cache.getStats();
      expect(statsAfter.entries).toBe(0);
    });

    it('should return false when deleting non-existent key', () => {
      const deleted = cache.delete('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all entries and reset stats', () => {
      cache.set('key1', { data: 'value1' });
      cache.set('key2', { data: 'value2' });
      cache.get('key1'); // increment hits

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();

      const stats = cache.getStats();
      expect(stats.entries).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('generateKey', () => {
    it('should generate consistent keys for same params', () => {
      const key1 = ApiCache.generateKey('/search', { term: 'test', limit: '10' });
      const key2 = ApiCache.generateKey('/search', { term: 'test', limit: '10' });

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different params', () => {
      const key1 = ApiCache.generateKey('/search', { term: 'test' });
      const key2 = ApiCache.generateKey('/search', { term: 'different' });

      expect(key1).not.toBe(key2);
    });

    it('should generate keys with sorted params for consistency', () => {
      const key1 = ApiCache.generateKey('/search', { a: '1', b: '2' });
      const key2 = ApiCache.generateKey('/search', { b: '2', a: '1' });

      expect(key1).toBe(key2);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cache.set('key1', { data: 'value1' });
      cache.get('key1'); // hit
      cache.get('key2'); // miss

      const stats = cache.getStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.entries).toBe(1);
      expect(stats.size).toBeGreaterThan(0);
    });
  });
});
