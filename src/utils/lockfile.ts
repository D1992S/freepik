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
    // Create lock info
    const lockInfo: LockInfo = {
      pid: process.pid,
      started_at: new Date().toISOString(),
      phase,
      status: 'running',
    };

    // Ensure directory exists
    await fs.mkdir(path.dirname(this.lockPath), { recursive: true });

    // Atomically create lock file with exclusive flag to prevent race conditions
    try {
      const lockData = JSON.stringify(lockInfo, null, 2);
      await fs.writeFile(this.lockPath, lockData, { encoding: 'utf-8', flag: 'wx' });
    } catch (error: unknown) {
      // If file already exists (EEXIST), read the existing lock and throw error
      if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST') {
        const existingLock = await this.read();
        throw new Error(
          `Another process is running (PID ${existingLock.pid}, started ${existingLock.started_at}).\n` +
            `If the process is not running, delete ${this.lockPath}`
        );
      }
      // Re-throw other errors
      throw error;
    }

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
