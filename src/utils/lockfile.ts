/**
 * Lockfile Manager
 * Prevents concurrent runs and enables graceful shutdown
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface LockInfo {
  pid: number;
  started_at: string;
  phase: 'search' | 'download';
  status: 'running' | 'interrupted';
}

export class Lockfile {
  private lockPath: string;
  private cleanupHandlers: Array<() => Promise<void>> = [];
  private shutdownInProgress = false;

  constructor(outputDir: string) {
    this.lockPath = path.join(outputDir, '_meta', '.lock');
  }

  /**
   * Acquire lock (throws if already locked)
   */
  async acquire(phase: 'search' | 'download'): Promise<void> {
    // Check if lock exists
    const exists = await this.exists();
    if (exists) {
      const lockInfo = await this.read();
      throw new Error(
        `Another process is running (PID ${lockInfo.pid}, started ${lockInfo.started_at}).\n` +
          `If the process is not running, delete ${this.lockPath}`
      );
    }

    // Create lock
    const lockInfo: LockInfo = {
      pid: process.pid,
      started_at: new Date().toISOString(),
      phase,
      status: 'running',
    };

    await fs.mkdir(path.dirname(this.lockPath), { recursive: true });
    await fs.writeFile(this.lockPath, JSON.stringify(lockInfo, null, 2), 'utf-8');

    // Setup graceful shutdown handlers
    this.setupShutdownHandlers();
  }

  /**
   * Release lock
   */
  async release(): Promise<void> {
    try {
      await fs.unlink(this.lockPath);
    } catch {
      // Lock file doesn't exist, that's fine
    }
  }

  /**
   * Update lock status
   */
  async updateStatus(status: 'running' | 'interrupted'): Promise<void> {
    try {
      const lockInfo = await this.read();
      lockInfo.status = status;
      await fs.writeFile(this.lockPath, JSON.stringify(lockInfo, null, 2), 'utf-8');
    } catch {
      // Lock file doesn't exist, ignore
    }
  }

  /**
   * Check if lock exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.lockPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read lock info
   */
  async read(): Promise<LockInfo> {
    const content = await fs.readFile(this.lockPath, 'utf-8');
    return JSON.parse(content) as LockInfo;
  }

  /**
   * Register cleanup handler (called on graceful shutdown)
   */
  onShutdown(handler: () => void | Promise<void>): void {
    this.cleanupHandlers.push(handler);
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  private setupShutdownHandlers(): void {
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

    for (const signal of signals) {
      process.on(signal, () => {
        void (async () => {
          if (this.shutdownInProgress) {
            console.log('\nForce exit...');
            process.exit(1);
          }

          this.shutdownInProgress = true;

          console.log(`\n\n⚠️  Received ${signal}, shutting down gracefully...`);
          console.log('Press Ctrl+C again to force exit.');

          try {
            // Update lock status
            await this.updateStatus('interrupted');

            // Run cleanup handlers
            for (const handler of this.cleanupHandlers) {
              await handler();
            }

            // Release lock
            await this.release();

            console.log('✅ Shutdown complete.');
            process.exit(0);
          } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
          }
        })();
      });
    }
  }
}
