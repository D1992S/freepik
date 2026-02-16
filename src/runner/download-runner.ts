/**
 * Download Runner
 * Manages downloading of selected videos with concurrency control
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { FreepikClient } from '../client/freepik-client.js';
import type { SceneSelection } from './search-runner.js';
import type { StockPlan } from '../types/stockplan.js';

export interface SceneManifest {
  scene_index: number;
  scene_order: number;
  scene_slug: string;
  description: string;
  downloads: Array<{
    rank: number;
    resource_id: string;
    filename: string;
    format: string;
    downloaded_at: string;
    file_size?: number;
  }>;
}

export interface DownloadProgress {
  totalScenes: number;
  completedScenes: number;
  totalFiles: number;
  completedFiles: number;
  currentScene: string;
  currentFile: string;
}

export interface DownloadRunnerConfig {
  outputDir: string;
  maxConcurrent?: number;
  progressCallback?: (progress: DownloadProgress) => void;
}

export class DownloadRunner {
  private semaphore: number;
  private readonly maxConcurrent: number;

  constructor(
    private client: FreepikClient,
    private config: DownloadRunnerConfig,
  ) {
    this.maxConcurrent = config.maxConcurrent ?? 3;
    this.semaphore = this.maxConcurrent;
  }

  /**
   * Download all selected videos from selection.json
   */
  async run(stockPlan: StockPlan, selection: SceneSelection[]): Promise<void> {
    // Check disk space
    await this.checkDiskSpace();

    const totalFiles = selection.reduce((sum, s) => sum + s.selected.length, 0);
    let completedFiles = 0;

    // Process each scene
    for (let i = 0; i < selection.length; i++) {
      const sceneSelection = selection[i];
      const scene = stockPlan.scenes?.[sceneSelection.scene_index];

      if (!scene) {
        console.warn(`Scene ${sceneSelection.scene_index} not found in stock plan`);
        continue;
      }

      // Create scene directory
      const sceneDir = await this.createSceneDirectory(scene.order, scene.slug);

      // Download files for this scene (with concurrency control)
      const downloads: SceneManifest['downloads'] = [];

      // Process downloads with concurrency limit
      const downloadPromises = sceneSelection.selected.map(async (selected) => {
        await this.acquireSemaphore();

        try {
          const filename = this.generateFilename(
            scene.order,
            scene.slug,
            selected.resource_id,
            selected.rank,
            selected.download_format,
          );

          if (this.config.progressCallback) {
            this.config.progressCallback({
              totalScenes: selection.length,
              completedScenes: i,
              totalFiles,
              completedFiles,
              currentScene: scene.slug,
              currentFile: filename,
            });
          }

          const filePath = path.join(sceneDir, filename);

          // Check if already downloaded (idempotence)
          const exists = await this.fileExists(filePath);
          if (exists) {
            console.log(`Skipping ${filename} (already exists)`);
            const stats = await fs.stat(filePath);
            downloads.push({
              rank: selected.rank,
              resource_id: selected.resource_id,
              filename,
              format: selected.download_format,
              downloaded_at: stats.mtime.toISOString(),
              file_size: stats.size,
            });
          } else {
            // Download the video
            const fileSize = await this.downloadVideo(
              selected.resource_id,
              selected.download_format,
              filePath,
            );

            downloads.push({
              rank: selected.rank,
              resource_id: selected.resource_id,
              filename,
              format: selected.download_format,
              downloaded_at: new Date().toISOString(),
              file_size: fileSize,
            });
          }

          completedFiles++;
        } finally {
          this.releaseSemaphore();
        }
      });

      await Promise.all(downloadPromises);

      // Create scene manifest
      const manifest: SceneManifest = {
        scene_index: sceneSelection.scene_index,
        scene_order: scene.order,
        scene_slug: scene.slug,
        description: scene.excerpt || scene.label || '',
        downloads: downloads.sort((a, b) => a.rank - b.rank),
      };

      await this.saveSceneManifest(sceneDir, manifest);
    }

    if (this.config.progressCallback) {
      this.config.progressCallback({
        totalScenes: selection.length,
        completedScenes: selection.length,
        totalFiles,
        completedFiles: totalFiles,
        currentScene: '',
        currentFile: '',
      });
    }
  }

  /**
   * Download a single video file
   */
  private async downloadVideo(
    resourceId: string,
    format: string,
    outputPath: string,
  ): Promise<number> {
    // Get download URL
    const downloadInfo = await this.client.getDownloadUrl(resourceId, format);

    // Download the file
    const response = await fetch(downloadInfo.data.url);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await fs.writeFile(outputPath, Buffer.from(buffer));

    return buffer.byteLength;
  }

  /**
   * Create scene directory with proper naming
   */
  private async createSceneDirectory(order: number, slug: string): Promise<string> {
    const dirName = `${String(order).padStart(3, '0')}_${slug}`;
    const dirPath = path.join(this.config.outputDir, dirName);
    await fs.mkdir(dirPath, { recursive: true });
    return dirPath;
  }

  /**
   * Generate filename for downloaded video
   * Format: 001_scene-slug__freepik_123456__a.mp4
   */
  private generateFilename(
    order: number,
    slug: string,
    resourceId: string,
    rank: number,
    format: string,
  ): string {
    const orderPadded = String(order).padStart(3, '0');
    const rankLetter = String.fromCharCode(96 + rank); // 1='a', 2='b', etc.
    const ext = format.includes('webm') ? 'webm' : 'mp4';

    return `${orderPadded}_${slug}__freepik_${resourceId}__${rankLetter}.${ext}`;
  }

  /**
   * Save scene manifest (scene.json)
   */
  private async saveSceneManifest(sceneDir: string, manifest: SceneManifest): Promise<void> {
    const manifestPath = path.join(sceneDir, 'scene.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check available disk space
   */
  private async checkDiskSpace(): Promise<void> {
    // Note: This is a simplified check. In production, would use a library
    // like 'check-disk-space' for accurate cross-platform disk space checking
    try {
      await fs.mkdir(this.config.outputDir, { recursive: true });
    } catch (error) {
      throw new Error(`Cannot create output directory: ${error}`);
    }
  }

  /**
   * Acquire semaphore (wait if all slots taken)
   */
  private async acquireSemaphore(): Promise<void> {
    while (this.semaphore <= 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this.semaphore--;
  }

  /**
   * Release semaphore
   */
  private releaseSemaphore(): void {
    this.semaphore++;
  }
}
