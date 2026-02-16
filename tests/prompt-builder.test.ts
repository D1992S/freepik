import { describe, it, expect } from 'vitest';
import { buildPrompt, buildCompactSummary } from '../src/prompt-builder/prompt-builder';
import type { StockPlan } from '../src/types/stockplan';

describe('Prompt Builder', () => {
  const samplePlan: StockPlan = {
    schema_version: '1.0',
    project: {
      title: 'Test Video Project',
      language: 'en',
      created_at: '2024-02-16',
      notes: 'Sample project notes',
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
      format_preference: ['mp4', 'webm'],
    },
    scenes: [
      {
        order: 1,
        id: 'S001',
        label: 'Opening Scene',
        slug: 'opening-scene',
        excerpt: 'Beautiful nature landscape for opening the video.',
        search_queries: ['nature landscape', 'mountain sunset', 'forest aerial'],
        negative_terms: ['people', 'city', 'urban'],
        intent: 'Set a calm natural tone',
      },
      {
        order: 2,
        id: 'S002',
        label: 'Tech Workspace',
        slug: 'tech-workspace',
        excerpt: 'Modern office with technology and productivity.',
        search_queries: ['office workspace', 'laptop coding', 'tech startup'],
        negative_terms: ['nature', 'outdoor', 'landscape'],
        intent: 'Show professional work environment',
      },
    ],
  };

  it('should build a complete prompt from stockplan', () => {
    const prompt = buildPrompt(samplePlan);

    expect(prompt).toContain('# Stock Video Project Plan');
    expect(prompt).toContain('Test Video Project');
    expect(prompt).toContain('Language: en');
    expect(prompt).toContain('Sample project notes');
    expect(prompt).toContain('## Global Settings');
    expect(prompt).toContain('landscape');
    expect(prompt).toContain('5s - 30s');
    expect(prompt).toContain('## Scenes (2 total)');
    expect(prompt).toContain('Opening Scene');
    expect(prompt).toContain('Tech Workspace');
  });

  it('should include all scene details', () => {
    const prompt = buildPrompt(samplePlan);

    expect(prompt).toContain('Scene 1: Opening Scene');
    expect(prompt).toContain('S001');
    expect(prompt).toContain('opening-scene');
    expect(prompt).toContain('Beautiful nature landscape');
    expect(prompt).toContain('Set a calm natural tone');
    expect(prompt).toContain('nature landscape');
    expect(prompt).toContain('people');
  });

  it('should build a compact summary', () => {
    const summary = buildCompactSummary(samplePlan);

    expect(summary).toContain('Project: Test Video Project');
    expect(summary).toContain('Scenes: 2');
    expect(summary).toContain('Total clips needed: 4');
    expect(summary).toContain('landscape');
    expect(summary).toContain('5-30s');
  });

  it('should handle project without notes', () => {
    const planWithoutNotes: StockPlan = {
      ...samplePlan,
      project: {
        ...samplePlan.project,
        notes: '',
      },
    };

    const prompt = buildPrompt(planWithoutNotes);
    expect(prompt).toContain('# Stock Video Project Plan');
    expect(prompt).not.toContain('## Notes');
  });

  it('should format multiple format preferences', () => {
    const prompt = buildPrompt(samplePlan);
    expect(prompt).toContain('Format Preference: mp4, webm');
  });
});
