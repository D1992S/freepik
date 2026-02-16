import { describe, it, expect } from 'vitest';
import { validateStockPlan, formatValidationErrors } from '../src/validator/stockplan-validator';

describe('StockPlan Validator', () => {
  it('should validate a valid stockplan', () => {
    const validPlan = {
      schema_version: '1.0',
      project: {
        title: 'Test Project',
        language: 'en',
        created_at: '2024-02-16',
        notes: 'Test notes',
      },
      global: {
        asset_type: 'video',
        orientation: 'landscape',
        clips_per_scene: 2,
        max_candidates_per_scene: 20,
        min_duration_s: 5,
        max_duration_s: 30,
        min_width: 1920,
        min_height: 1080,
        format_preference: ['mp4'],
      },
      scenes: [
        {
          order: 1,
          id: 'S001',
          label: 'Test Scene',
          slug: 'test-scene',
          excerpt: 'This is a test scene description that is long enough.',
          search_queries: ['query one', 'query two', 'query three'],
          negative_terms: ['term one', 'term two', 'term three'],
          intent: 'Test intent description for the scene.',
        },
      ],
    };

    const result = validateStockPlan(validPlan);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject plan with missing required fields', () => {
    const invalidPlan = {
      schema_version: '1.0',
      project: {
        title: 'Test Project',
        language: 'en',
      },
    };

    const result = validateStockPlan(invalidPlan);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject plan with invalid schema_version', () => {
    const invalidPlan = {
      schema_version: '2.0',
      project: {
        title: 'Test Project',
        language: 'en',
        created_at: '2024-02-16',
        notes: 'Test',
      },
      global: {
        asset_type: 'video',
        orientation: 'landscape',
        clips_per_scene: 2,
        max_candidates_per_scene: 20,
        min_duration_s: 5,
        max_duration_s: 30,
        min_width: 1920,
        min_height: 1080,
        format_preference: ['mp4'],
      },
      scenes: [],
    };

    const result = validateStockPlan(invalidPlan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes('schema_version'))).toBe(true);
  });

  it('should reject plan with invalid language', () => {
    const invalidPlan = {
      schema_version: '1.0',
      project: {
        title: 'Test Project',
        language: 'invalid',
        created_at: '2024-02-16',
        notes: 'Test',
      },
      global: {
        asset_type: 'video',
        orientation: 'landscape',
        clips_per_scene: 2,
        max_candidates_per_scene: 20,
        min_duration_s: 5,
        max_duration_s: 30,
        min_width: 1920,
        min_height: 1080,
        format_preference: ['mp4'],
      },
      scenes: [],
    };

    const result = validateStockPlan(invalidPlan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('one of'))).toBe(true);
  });

  it('should reject scene with too few search queries', () => {
    const invalidPlan = {
      schema_version: '1.0',
      project: {
        title: 'Test Project',
        language: 'en',
        created_at: '2024-02-16',
        notes: 'Test',
      },
      global: {
        asset_type: 'video',
        orientation: 'landscape',
        clips_per_scene: 2,
        max_candidates_per_scene: 20,
        min_duration_s: 5,
        max_duration_s: 30,
        min_width: 1920,
        min_height: 1080,
        format_preference: ['mp4'],
      },
      scenes: [
        {
          order: 1,
          id: 'S001',
          label: 'Test Scene',
          slug: 'test-scene',
          excerpt: 'This is a test scene description that is long enough.',
          search_queries: ['only one'],
          negative_terms: ['term one', 'term two', 'term three'],
          intent: 'Test intent',
        },
      ],
    };

    const result = validateStockPlan(invalidPlan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('at least 3'))).toBe(true);
  });

  it('should reject scene with invalid ID pattern', () => {
    const invalidPlan = {
      schema_version: '1.0',
      project: {
        title: 'Test Project',
        language: 'en',
        created_at: '2024-02-16',
        notes: 'Test',
      },
      global: {
        asset_type: 'video',
        orientation: 'landscape',
        clips_per_scene: 2,
        max_candidates_per_scene: 20,
        min_duration_s: 5,
        max_duration_s: 30,
        min_width: 1920,
        min_height: 1080,
        format_preference: ['mp4'],
      },
      scenes: [
        {
          order: 1,
          id: 'INVALID',
          label: 'Test Scene',
          slug: 'test-scene',
          excerpt: 'This is a test scene description that is long enough.',
          search_queries: ['query one', 'query two', 'query three'],
          negative_terms: ['term one', 'term two', 'term three'],
          intent: 'Test intent',
        },
      ],
    };

    const result = validateStockPlan(invalidPlan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('pattern'))).toBe(true);
  });

  it('should format validation errors correctly', () => {
    const errors = [
      { path: '/project/title', message: 'Required field missing' },
      { path: '/scenes/0/id', message: 'Invalid pattern' },
    ];

    const formatted = formatValidationErrors(errors);
    expect(formatted).toContain('[1]');
    expect(formatted).toContain('/project/title');
    expect(formatted).toContain('Required field missing');
    expect(formatted).toContain('[2]');
    expect(formatted).toContain('/scenes/0/id');
    expect(formatted).toContain('Invalid pattern');
  });
});
