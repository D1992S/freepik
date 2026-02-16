import { describe, it, expect } from 'vitest';
import { VideoScorer } from '../src/scoring/video-scorer.js';
import type { FreepikResource } from '../src/types/freepik-api.js';
import type { SceneDefinition } from '../src/types/stockplan.js';

const createMockVideo = (overrides: Partial<FreepikResource> = {}): FreepikResource => ({
  id: '123',
  title: 'Mountain sunset landscape',
  content_type: 'video',
  description: 'Beautiful mountain sunset',
  tags: ['mountain', 'sunset', 'landscape', 'nature'],
  author: { id: 'author1', name: 'John Doe' },
  thumbnail: { url: 'https://example.com/thumb.jpg', width: 1920, height: 1080 },
  video_info: {
    duration: 10,
    width: 1920,
    height: 1080,
    fps: 30,
    codec: 'h264',
    formats: [],
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  premium: false,
  orientation: 'landscape',
  ...overrides,
});

const createMockScene = (overrides: Partial<SceneDefinition> = {}): SceneDefinition => ({
  order: 1,
  id: 'scene-1',
  label: 'Test Scene',
  slug: 'test-scene',
  excerpt: 'A test scene for unit testing',
  negative_terms: [],
  intent: 'Testing video scoring functionality',
  description: 'Test scene',
  min_duration_s: 5,
  max_duration_s: 15,
  clips_per_scene: 3,
  search_queries: ['mountain sunset'],
  ...overrides,
});

describe('VideoScorer', () => {
  describe('scoreResolution', () => {
    it('should score 4K video as 40', () => {
      const video = createMockVideo({
        video_info: {
          duration: 10,
          width: 3840,
          height: 2160,
          fps: 30,
          codec: 'h264',
          formats: [],
        },
      });
      const scene = createMockScene();
      const result = VideoScorer.score(video, scene);
      expect(result.breakdown.resolution).toBe(40);
    });

    it('should score 1440p video as 30', () => {
      const video = createMockVideo({
        video_info: {
          duration: 10,
          width: 2560,
          height: 1440,
          fps: 30,
          codec: 'h264',
          formats: [],
        },
      });
      const scene = createMockScene();
      const result = VideoScorer.score(video, scene);
      expect(result.breakdown.resolution).toBe(30);
    });

    it('should score 1080p video as 20', () => {
      const video = createMockVideo();
      const scene = createMockScene();
      const result = VideoScorer.score(video, scene);
      expect(result.breakdown.resolution).toBe(20);
    });

    it('should score lower resolution video as 5', () => {
      const video = createMockVideo({
        video_info: {
          duration: 10,
          width: 1280,
          height: 720,
          fps: 30,
          codec: 'h264',
          formats: [],
        },
      });
      const scene = createMockScene();
      const result = VideoScorer.score(video, scene);
      expect(result.breakdown.resolution).toBe(5);
    });
  });

  describe('scoreDurationFit', () => {
    it('should give max score for duration at middle of range', () => {
      const video = createMockVideo({
        video_info: {
          duration: 10, // middle of 5-15 range
          width: 1920,
          height: 1080,
          fps: 30,
          codec: 'h264',
          formats: [],
        },
      });
      const scene = createMockScene({ min_duration_s: 5, max_duration_s: 15 });
      const result = VideoScorer.score(video, scene);
      expect(result.breakdown.durationFit).toBe(25);
    });

    it('should give 0 score for duration outside range', () => {
      const video = createMockVideo({
        video_info: {
          duration: 20, // outside 5-15 range
          width: 1920,
          height: 1080,
          fps: 30,
          codec: 'h264',
          formats: [],
        },
      });
      const scene = createMockScene({ min_duration_s: 5, max_duration_s: 15 });
      const result = VideoScorer.score(video, scene);
      expect(result.breakdown.durationFit).toBe(0);
    });

    it('should give lower score for duration at edge of range', () => {
      const video = createMockVideo({
        video_info: {
          duration: 5, // at minimum edge
          width: 1920,
          height: 1080,
          fps: 30,
          codec: 'h264',
          formats: [],
        },
      });
      const scene = createMockScene({ min_duration_s: 5, max_duration_s: 15 });
      const result = VideoScorer.score(video, scene);
      expect(result.breakdown.durationFit).toBeLessThan(25);
      expect(result.breakdown.durationFit).toBeGreaterThan(0);
    });
  });

  describe('scoreRelevance', () => {
    it('should give max score when all search queries match', () => {
      const video = createMockVideo({
        title: 'Mountain sunset landscape',
        tags: ['mountain', 'sunset', 'landscape'],
      });
      const scene = createMockScene({ search_queries: ['mountain sunset', 'landscape'] });
      const result = VideoScorer.score(video, scene);
      expect(result.breakdown.relevance).toBe(25);
    });

    it('should give partial score when some queries match', () => {
      const video = createMockVideo({
        title: 'Mountain sunset',
        tags: ['mountain', 'sunset'],
      });
      const scene = createMockScene({
        search_queries: ['mountain sunset', 'beach waves'],
      });
      const result = VideoScorer.score(video, scene);
      expect(result.breakdown.relevance).toBe(13); // 50% match = 12.5, rounded to 13
    });

    it('should give 0 score when no queries match', () => {
      const video = createMockVideo({
        title: 'Beach waves',
        tags: ['beach', 'waves', 'ocean'],
      });
      const scene = createMockScene({ search_queries: ['mountain sunset'] });
      const result = VideoScorer.score(video, scene);
      expect(result.breakdown.relevance).toBe(0);
    });

    it('should give max score when no queries specified', () => {
      const video = createMockVideo();
      const scene = createMockScene({ search_queries: [] });
      const result = VideoScorer.score(video, scene);
      expect(result.breakdown.relevance).toBe(25);
    });
  });

  describe('scoreRecency', () => {
    it('should give max score for brand new video', () => {
      const video = createMockVideo({
        created_at: new Date().toISOString(),
      });
      const scene = createMockScene();
      const result = VideoScorer.score(video, scene);
      expect(result.breakdown.recency).toBe(10);
    });

    it('should give 0 score for video older than 1 year', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const video = createMockVideo({
        created_at: oneYearAgo.toISOString(),
      });
      const scene = createMockScene();
      const result = VideoScorer.score(video, scene);
      expect(result.breakdown.recency).toBe(0);
    });

    it('should give mid-range score for 6-month-old video', () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const video = createMockVideo({
        created_at: sixMonthsAgo.toISOString(),
      });
      const scene = createMockScene();
      const result = VideoScorer.score(video, scene);
      expect(result.breakdown.recency).toBeGreaterThanOrEqual(4);
      expect(result.breakdown.recency).toBeLessThanOrEqual(6);
    });
  });

  describe('passesHardFilters', () => {
    it('should pass video that meets all constraints', () => {
      const video = createMockVideo();
      const scene = createMockScene();
      expect(VideoScorer.passesHardFilters(video, scene)).toBe(true);
    });

    it('should reject non-video content', () => {
      const video = createMockVideo({ content_type: 'photo' });
      const scene = createMockScene();
      expect(VideoScorer.passesHardFilters(video, scene)).toBe(false);
    });

    it('should reject video without video_info', () => {
      const video = createMockVideo({ video_info: undefined });
      const scene = createMockScene();
      expect(VideoScorer.passesHardFilters(video, scene)).toBe(false);
    });

    it('should reject video with duration too short', () => {
      const video = createMockVideo({
        video_info: {
          duration: 3,
          width: 1920,
          height: 1080,
          fps: 30,
          codec: 'h264',
          formats: [],
        },
      });
      const scene = createMockScene({ min_duration_s: 5 });
      expect(VideoScorer.passesHardFilters(video, scene)).toBe(false);
    });

    it('should reject video with duration too long', () => {
      const video = createMockVideo({
        video_info: {
          duration: 20,
          width: 1920,
          height: 1080,
          fps: 30,
          codec: 'h264',
          formats: [],
        },
      });
      const scene = createMockScene({ max_duration_s: 15 });
      expect(VideoScorer.passesHardFilters(video, scene)).toBe(false);
    });

    it('should reject video with resolution too low', () => {
      const video = createMockVideo({
        video_info: {
          duration: 10,
          width: 1280,
          height: 720,
          fps: 30,
          codec: 'h264',
          formats: [],
        },
      });
      const scene = createMockScene({ min_width: 1920, min_height: 1080 });
      expect(VideoScorer.passesHardFilters(video, scene)).toBe(false);
    });

    it('should reject video with wrong orientation', () => {
      const video = createMockVideo({ orientation: 'portrait' });
      const scene = createMockScene({ orientation: 'landscape' });
      expect(VideoScorer.passesHardFilters(video, scene)).toBe(false);
    });

    it('should reject video with negative terms in title', () => {
      const video = createMockVideo({ title: 'Mountain sunset with people' });
      const scene = createMockScene({ negative_terms: ['people', 'crowd'] });
      expect(VideoScorer.passesHardFilters(video, scene)).toBe(false);
    });

    it('should reject video with negative terms in tags', () => {
      const video = createMockVideo({ tags: ['mountain', 'sunset', 'people'] });
      const scene = createMockScene({ negative_terms: ['people'] });
      expect(VideoScorer.passesHardFilters(video, scene)).toBe(false);
    });
  });

  describe('sortByScore', () => {
    it('should sort by score descending', () => {
      const video1 = createMockVideo({ id: '1' });
      const video2 = createMockVideo({ id: '2' });
      const video3 = createMockVideo({ id: '3' });
      const scene = createMockScene();

      const scored = [
        { ...VideoScorer.score(video1, scene), score: 50 },
        { ...VideoScorer.score(video2, scene), score: 70 },
        { ...VideoScorer.score(video3, scene), score: 60 },
      ];

      const sorted = VideoScorer.sortByScore(scored);

      expect(sorted[0].score).toBe(70);
      expect(sorted[1].score).toBe(60);
      expect(sorted[2].score).toBe(50);
    });

    it('should use resource ID as tie-breaker (ascending)', () => {
      const video1 = createMockVideo({ id: 'c' });
      const video2 = createMockVideo({ id: 'a' });
      const video3 = createMockVideo({ id: 'b' });
      const scene = createMockScene();

      const scored = [
        { ...VideoScorer.score(video1, scene), score: 50 },
        { ...VideoScorer.score(video2, scene), score: 50 },
        { ...VideoScorer.score(video3, scene), score: 50 },
      ];

      const sorted = VideoScorer.sortByScore(scored);

      expect(sorted[0].resource.id).toBe('a');
      expect(sorted[1].resource.id).toBe('b');
      expect(sorted[2].resource.id).toBe('c');
    });
  });
});
