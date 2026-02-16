export interface StockPlan {
  schema_version: '1.0';
  project: {
    title: string;
    language: 'pl' | 'en' | 'de' | 'es' | 'fr';
    created_at: string;
    notes: string;
  };
  global: {
    asset_type: 'video';
    orientation: 'landscape' | 'portrait' | 'square';
    clips_per_scene: number;
    max_candidates_per_scene: number;
    min_duration_s: number;
    max_duration_s: number;
    min_width: number;
    min_height: number;
    format_preference: string[];
  };
  scenes: Scene[];
}

export interface Scene {
  order: number;
  id: string;
  label: string;
  slug: string;
  excerpt: string;
  search_queries: string[];
  negative_terms: string[];
  intent: string;
  // Optional overrides of global settings
  clips_per_scene?: number;
  min_duration_s?: number;
  max_duration_s?: number;
  min_width?: number;
  min_height?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
}

// Alias for Scene with all merged settings (for scoring/filtering)
export type SceneDefinition = Scene & {
  description?: string; // Computed from excerpt or label
};

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
