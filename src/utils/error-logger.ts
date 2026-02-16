/**
 * Error Logger
 * Implements JSONL error logging as per ADR-0004
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface ErrorLogEntry {
  timestamp: string;
  error_type: 'api_error' | 'network_error' | 'validation_error' | 'download_error' | 'unknown';
  message: string;
  context?: {
    scene_slug?: string;
    resource_id?: string;
    endpoint?: string;
    status_code?: number;
    [key: string]: unknown;
  };
  stack?: string;
}

export class ErrorLogger {
  private logPath: string;

  constructor(outputDir: string) {
    this.logPath = path.join(outputDir, '_meta', 'errors.jsonl');
  }

  /**
   * Log an error to errors.jsonl
   */
  async log(entry: Omit<ErrorLogEntry, 'timestamp'>): Promise<void> {
    const logEntry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    };

    const line = JSON.stringify(logEntry) + '\n';

    try {
      await fs.appendFile(this.logPath, line, 'utf-8');
    } catch (error) {
      // Fallback to console if file write fails
      console.error('Failed to write to error log:', error);
      console.error('Original error:', logEntry);
    }
  }

  /**
   * Log API error
   */
  async logApiError(
    message: string,
    statusCode?: number,
    endpoint?: string,
    context?: ErrorLogEntry['context']
  ): Promise<void> {
    await this.log({
      error_type: 'api_error',
      message,
      context: {
        ...context,
        status_code: statusCode,
        endpoint,
      },
    });
  }

  /**
   * Log download error
   */
  async logDownloadError(
    message: string,
    resourceId: string,
    sceneSlug: string,
    stack?: string
  ): Promise<void> {
    await this.log({
      error_type: 'download_error',
      message,
      context: {
        resource_id: resourceId,
        scene_slug: sceneSlug,
      },
      stack,
    });
  }

  /**
   * Log network error
   */
  async logNetworkError(message: string, context?: ErrorLogEntry['context']): Promise<void> {
    await this.log({
      error_type: 'network_error',
      message,
      context,
    });
  }

  /**
   * Read all error logs
   */
  async readLogs(): Promise<ErrorLogEntry[]> {
    try {
      const content = await fs.readFile(this.logPath, 'utf-8');
      return content
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as ErrorLogEntry);
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear error log
   */
  async clear(): Promise<void> {
    try {
      await fs.unlink(this.logPath);
    } catch {
      // File doesn't exist, that's fine
    }
  }
}
