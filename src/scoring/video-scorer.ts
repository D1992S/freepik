/**
 * Video Scoring Algorithm
 * Implements deterministic scoring as per ADR-0002
 */

import type { FreepikResource } from '../types/freepik-api.js';
import type { SceneDefinition } from '../types/stockplan.js';

export interface ScoredVideo {
  resource: FreepikResource;
  score: number;
  breakdown: {
    resolution: number; // 0-40
    durationFit: number; // 0-25
    relevance: number; // 0-25
    recency: number; // 0-10
  };
}

export class VideoScorer {
  /**
   * Score a video resource against scene requirements
   */
  static score(resource: FreepikResource, scene: SceneDefinition): ScoredVideo {
    const breakdown = {
      resolution: this.scoreResolution(resource),
      durationFit: this.scoreDurationFit(resource, scene),
      relevance: this.scoreRelevance(resource, scene),
      recency: this.scoreRecency(resource),
    };

    const score = breakdown.resolution + breakdown.durationFit + breakdown.relevance + breakdown.recency;

    return { resource, score, breakdown };
  }

  /**
   * Resolution scoring (40% weight)
   * 4K/UHD (3840×2160+) = 40
   * 1440p (2560×1440) = 30
   * 1080p (1920×1080) = 20
   * Lower = 5
   */
  private static scoreResolution(resource: FreepikResource): number {
    if (!resource.video_info) return 0;

    const { width, height } = resource.video_info;
    const pixels = width * height;

    // 4K: 3840×2160 = 8,294,400 pixels
    if (pixels >= 8_294_400) return 40;

    // 1440p: 2560×1440 = 3,686,400 pixels
    if (pixels >= 3_686_400) return 30;

    // 1080p: 1920×1080 = 2,073,600 pixels
    if (pixels >= 2_073_600) return 20;

    // Lower resolution
    return 5;
  }

  /**
   * Duration fit scoring (25% weight)
   * Score based on how close duration is to middle of target range
   */
  private static scoreDurationFit(resource: FreepikResource, scene: SceneDefinition): number {
    if (!resource.video_info) return 0;

    const duration = resource.video_info.duration;
    const minDuration = scene.min_duration_s ?? 5;
    const maxDuration = scene.max_duration_s ?? 30;

    // Out of range = 0
    if (duration < minDuration || duration > maxDuration) return 0;

    // Calculate distance from middle of range
    const targetDuration = (minDuration + maxDuration) / 2;
    const range = maxDuration - minDuration;
    const distance = Math.abs(duration - targetDuration);

    // Linear decay from center
    // Perfect fit (at center) = 25, at edges = 12.5
    const normalizedDistance = distance / (range / 2); // 0 to 1
    return Math.round(25 * (1 - normalizedDistance * 0.5));
  }

  /**
   * Relevance scoring (25% weight)
   * Based on proportion of search queries matching title + tags
   */
  private static scoreRelevance(resource: FreepikResource, scene: SceneDefinition): number {
    const queries = scene.search_queries || [];
    if (queries.length === 0) return 25; // No queries = perfect match

    const searchableText = [
      resource.title.toLowerCase(),
      ...resource.tags.map((t) => t.toLowerCase()),
    ].join(' ');

    let matchCount = 0;
    for (const query of queries) {
      const terms = query.toLowerCase().split(/\s+/);
      const allTermsMatch = terms.every((term) => searchableText.includes(term));
      if (allTermsMatch) matchCount++;
    }

    return Math.round((matchCount / queries.length) * 25);
  }

  /**
   * Recency scoring (10% weight)
   * Newer resources score higher
   */
  private static scoreRecency(resource: FreepikResource): number {
    const created = new Date(resource.created_at);
    const now = new Date();
    const ageMs = now.getTime() - created.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    // Linear decay over 365 days
    // Brand new = 10, 1 year old = 0
    if (ageDays <= 0) return 10;
    if (ageDays >= 365) return 0;

    return Math.round(10 * (1 - ageDays / 365));
  }

  /**
   * Apply hard filters to resource
   * Returns true if resource passes all filters
   */
  static passesHardFilters(resource: FreepikResource, scene: SceneDefinition): boolean {
    // Must be video
    if (resource.content_type !== 'video') return false;

    // Must have video info
    if (!resource.video_info) return false;

    // Duration constraints
    const minDuration = scene.min_duration_s ?? 0;
    const maxDuration = scene.max_duration_s ?? Infinity;
    if (
      resource.video_info.duration < minDuration ||
      resource.video_info.duration > maxDuration
    ) {
      return false;
    }

    // Resolution constraints
    const minWidth = scene.min_width ?? 0;
    const minHeight = scene.min_height ?? 0;
    if (resource.video_info.width < minWidth || resource.video_info.height < minHeight) {
      return false;
    }

    // Orientation constraint
    if (scene.orientation && resource.orientation !== scene.orientation) {
      return false;
    }

    // Negative terms
    if (scene.negative_terms && scene.negative_terms.length > 0) {
      const searchableText = [
        resource.title.toLowerCase(),
        ...resource.tags.map((t) => t.toLowerCase()),
      ].join(' ');

      for (const negTerm of scene.negative_terms) {
        if (searchableText.includes(negTerm.toLowerCase())) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Sort scored videos by score (desc), then by resource ID (asc) for tie-breaking
   */
  static sortByScore(scoredVideos: ScoredVideo[]): ScoredVideo[] {
    return [...scoredVideos].sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // Higher score first
      }
      // Tie-breaker: resource ID ascending
      return a.resource.id.localeCompare(b.resource.id);
    });
  }
}
