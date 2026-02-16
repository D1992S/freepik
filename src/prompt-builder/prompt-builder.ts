import type { StockPlan, Scene } from '../types/stockplan.js';

export function buildPrompt(stockplan: StockPlan): string {
  const sections: string[] = [];

  sections.push('# Stock Video Project Plan');
  sections.push('');
  sections.push(`## Project: ${stockplan.project.title}`);
  sections.push(`Language: ${stockplan.project.language}`);
  sections.push(`Created: ${stockplan.project.created_at}`);
  sections.push('');

  if (stockplan.project.notes) {
    sections.push('## Notes');
    sections.push(stockplan.project.notes);
    sections.push('');
  }

  sections.push('## Global Settings');
  sections.push(`- Asset Type: ${stockplan.global.asset_type}`);
  sections.push(`- Orientation: ${stockplan.global.orientation}`);
  sections.push(`- Clips per Scene: ${stockplan.global.clips_per_scene}`);
  sections.push(`- Max Candidates: ${stockplan.global.max_candidates_per_scene}`);
  sections.push(
    `- Duration Range: ${stockplan.global.min_duration_s}s - ${stockplan.global.max_duration_s}s`
  );
  sections.push(`- Min Resolution: ${stockplan.global.min_width}x${stockplan.global.min_height}`);
  sections.push(`- Format Preference: ${stockplan.global.format_preference.join(', ')}`);
  sections.push('');

  sections.push(`## Scenes (${stockplan.scenes.length} total)`);
  sections.push('');

  for (const scene of stockplan.scenes) {
    sections.push(formatScene(scene));
    sections.push('');
  }

  return sections.join('\n');
}

function formatScene(scene: Scene): string {
  const lines: string[] = [];

  lines.push(`### Scene ${scene.order}: ${scene.label}`);
  lines.push(`**ID:** ${scene.id} | **Slug:** ${scene.slug}`);
  lines.push('');
  lines.push(`**Excerpt:** ${scene.excerpt}`);
  lines.push('');
  lines.push(`**Intent:** ${scene.intent}`);
  lines.push('');
  lines.push('**Search Queries:**');
  for (const query of scene.search_queries) {
    lines.push(`- ${query}`);
  }
  lines.push('');
  lines.push('**Negative Terms:**');
  for (const term of scene.negative_terms) {
    lines.push(`- ${term}`);
  }

  return lines.join('\n');
}

export function buildCompactSummary(stockplan: StockPlan): string {
  const lines: string[] = [];

  lines.push(`Project: ${stockplan.project.title}`);
  lines.push(`Scenes: ${stockplan.scenes.length}`);
  lines.push(`Total clips needed: ${stockplan.scenes.length * stockplan.global.clips_per_scene}`);
  lines.push(
    `Settings: ${stockplan.global.orientation}, ${stockplan.global.min_duration_s}-${stockplan.global.max_duration_s}s`
  );

  return lines.join('\n');
}
