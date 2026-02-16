/**
 * Search Runner
 * Orchestrates the search pipeline for all scenes in a stock plan
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { FreepikClient } from '../client/freepik-client.js';
import { FreepikApiError } from '../client/freepik-client.js';
import type { StockPlan, SceneDefinition } from '../types/stockplan.js';
import { VideoScorer, type ScoredVideo } from '../scoring/video-scorer.js';
import type { ErrorLogger } from '../utils/error-logger.js';

export interface SceneCandidates {
  scene_index: number;
  scene_order: number;
  scene_slug: string;
  search_queries: string[];
  candidates: Array<{
    resource_id: string;
    score: number;
    breakdown: {
      resolution: number;
      durationFit: number;
      relevance: number;
      recency: number;
    };
    title: string;
    duration: number;
    resolution: string;
  }>;
  total_found: number;
  filtered_count: number;
  status: 'fulfilled' | 'partial' | 'unfulfilled';
}

export interface SceneSelection {
  scene_index: number;
  scene_order: number;
  scene_slug: string;
  selected: Array<{
    resource_id: string;
    score: number;
    rank: number; // 1-based rank within scene
    download_format: string;
  }>;
  status: 'fulfilled' | 'partial' | 'unfulfilled';
}

export interface SearchResults {
  candidates: SceneCandidates[];
  selection: SceneSelection[];
}

export interface SearchRunnerConfig {
  outputDir: string;
  dryRun?: boolean;
  maxCandidatesPerScene?: number;
  progressCallback?: (current: number, total: number, sceneName: string) => void;
  errorLogger?: ErrorLogger;
}

export class SearchRunner {
  constructor(
    private client: FreepikClient,
    private config: SearchRunnerConfig
  ) {}

  /**
   * Run search pipeline for entire stock plan
   */
  async run(stockPlan: StockPlan): Promise<SearchResults> {
    const results: SearchResults = {
      candidates: [],
      selection: [],
    };

    // Create output directories
    await this.ensureDirectories();

    // Process each scene
    const scenes = stockPlan.scenes || [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];

      if (this.config.progressCallback) {
        this.config.progressCallback(i + 1, scenes.length, scene.slug);
      }

      // Search and score for this scene
      const sceneCandidates = await this.processScene(scene, i, stockPlan);
      results.candidates.push(sceneCandidates);

      // Select top clips
      const sceneSelection = this.selectTopClips(
        sceneCandidates,
        scene.clips_per_scene ?? stockPlan.global?.clips_per_scene ?? 3
      );
      results.selection.push(sceneSelection);

      // Save incrementally (as per requirement)
      await this.saveResults(results);
    }

    return results;
  }

  /**
   * Process a single scene: search, filter, score
   */
  private async processScene(
    scene: SceneDefinition,
    index: number,
    stockPlan: StockPlan
  ): Promise<SceneCandidates> {
    const allCandidates: ScoredVideo[] = [];
    const queries = scene.search_queries || [];

    // Search for each query
    for (const query of queries) {
      try {
        const searchResponse = await this.client.searchResources({
          term: query,
          filters: {
            content_type: ['video'],
            order: 'latest',
            orientation: scene.orientation,
          },
          limit: this.config.maxCandidatesPerScene ?? 20,
        });

        // Filter and score
        for (const resource of searchResponse.data) {
          if (VideoScorer.passesHardFilters(resource, scene)) {
            const scored = VideoScorer.score(resource, scene);
            allCandidates.push(scored);
          }
        }
      } catch (error) {
        // Extract error details
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorName = error instanceof Error ? error.name : 'UnknownError';
        const statusCode = error instanceof FreepikApiError ? error.statusCode : undefined;

        console.error(
          `Error searching for "${query}":`,
          errorName,
          statusCode ? `[${statusCode}]` : '',
          errorMsg
        );

        if (this.config.errorLogger) {
          await this.config.errorLogger.logApiError(
            `Search failed for query: ${query}`,
            statusCode,
            '/resources',
            { scene_slug: scene.slug, query, error_name: errorName }
          );
        }
      }
    }

    // Remove duplicates (same resource ID)
    const uniqueCandidates = this.deduplicateByResourceId(allCandidates);

    // Sort by score
    const sortedCandidates = VideoScorer.sortByScore(uniqueCandidates);

    // Determine status - use consistent targetClips calculation
    const targetClips = scene.clips_per_scene ?? stockPlan.global?.clips_per_scene ?? 3;
    let status: 'fulfilled' | 'partial' | 'unfulfilled';
    if (sortedCandidates.length === 0) {
      status = 'unfulfilled';
    } else if (sortedCandidates.length < targetClips) {
      status = 'partial';
    } else {
      status = 'fulfilled';
    }

    return {
      scene_index: index,
      scene_order: scene.order,
      scene_slug: scene.slug,
      search_queries: queries,
      candidates: sortedCandidates.map((c) => ({
        resource_id: c.resource.id,
        score: c.score,
        breakdown: c.breakdown,
        title: c.resource.title,
        duration: c.resource.video_info?.duration ?? 0,
        resolution: `${c.resource.video_info?.width}x${c.resource.video_info?.height}`,
      })),
      total_found: allCandidates.length,
      filtered_count: sortedCandidates.length,
      status,
    };
  }

  /**
   * Select top N clips from candidates
   */
  private selectTopClips(candidates: SceneCandidates, clipsPerScene: number): SceneSelection {
    const selected = candidates.candidates.slice(0, clipsPerScene).map((c, idx) => ({
      resource_id: c.resource_id,
      score: c.score,
      rank: idx + 1,
      download_format: '1080p', // Default format
    }));

    return {
      scene_index: candidates.scene_index,
      scene_order: candidates.scene_order,
      scene_slug: candidates.scene_slug,
      selected,
      status: candidates.status,
    };
  }

  /**
   * Deduplicate scored videos by resource ID (keep highest score)
   */
  private deduplicateByResourceId(videos: ScoredVideo[]): ScoredVideo[] {
    const map = new Map<string, ScoredVideo>();

    for (const video of videos) {
      const existing = map.get(video.resource.id);
      if (!existing || video.score > existing.score) {
        map.set(video.resource.id, video);
      }
    }

    return Array.from(map.values());
  }

  /**
   * Ensure output directories exist
   */
  private async ensureDirectories(): Promise<void> {
    const metaDir = path.join(this.config.outputDir, '_meta');
    const cacheDir = path.join(this.config.outputDir, '_cache', 'previews');

    await fs.mkdir(metaDir, { recursive: true });
    if (this.config.dryRun) {
      await fs.mkdir(cacheDir, { recursive: true });
    }
  }

  /**
   * Save results to disk (incremental)
   */
  private async saveResults(results: SearchResults): Promise<void> {
    const metaDir = path.join(this.config.outputDir, '_meta');

    await fs.writeFile(
      path.join(metaDir, 'candidates.json'),
      JSON.stringify(results.candidates, null, 2),
      'utf-8'
    );

    await fs.writeFile(
      path.join(metaDir, 'selection.json'),
      JSON.stringify(results.selection, null, 2),
      'utf-8'
    );
  }
}
