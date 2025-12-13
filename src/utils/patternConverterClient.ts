import type { WorkerMessage, WorkerResponse } from '../workers/patternConverter.worker';
import PatternConverterWorker from '../workers/patternConverter.worker?worker';
import { parsePenData, type PenData } from './penParser';

export type PyodideState = 'not_loaded' | 'loading' | 'ready' | 'error';

export interface PesPatternData {
  stitches: number[][];  // Original PES stitches (for reference)
  threads: Array<{
    color: number;
    hex: string;
    brand: string | null;
    catalogNumber: string | null;
    description: string | null;
    chart: string | null;
  }>;
  uniqueColors: Array<{
    color: number;
    hex: string;
    brand: string | null;
    catalogNumber: string | null;
    description: string | null;
    chart: string | null;
    threadIndices: number[];
  }>;
  penData: Uint8Array;   // Raw PEN bytes sent to machine
  penStitches: PenData;   // Parsed PEN stitches (for rendering)
  colorCount: number;
  stitchCount: number;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export type ProgressCallback = (progress: number, step: string) => void;

class PatternConverterClient {
  private worker: Worker | null = null;
  private state: PyodideState = 'not_loaded';
  private error: string | null = null;
  private initPromise: Promise<void> | null = null;
  private progressCallbacks: Set<ProgressCallback> = new Set();

  /**
   * Get the current Pyodide state
   */
  getState(): PyodideState {
    return this.state;
  }

  /**
   * Get the error message if state is 'error'
   */
  getError(): string | null {
    return this.error;
  }

  /**
   * Initialize the worker and load Pyodide
   */
  async initialize(onProgress?: ProgressCallback): Promise<void> {
    // If already ready, return immediately
    if (this.state === 'ready') {
      return;
    }

    // If currently loading, add progress callback and wait for the existing promise
    if (this.initPromise) {
      if (onProgress) {
        this.progressCallbacks.add(onProgress);
      }
      return this.initPromise;
    }

    // Create worker if it doesn't exist
    if (!this.worker) {
      console.log('[PatternConverterClient] Creating worker...');
      try {
        this.worker = new PatternConverterWorker();
        console.log('[PatternConverterClient] Worker created successfully');
        this.setupWorkerListeners();
      } catch (err) {
        console.error('[PatternConverterClient] Failed to create worker:', err);
        throw err;
      }
    }

    // Add progress callback if provided
    if (onProgress) {
      this.progressCallbacks.add(onProgress);
    }

    // Start initialization
    this.state = 'loading';
    this.error = null;

    this.initPromise = new Promise<void>((resolve, reject) => {
      const handleMessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;

        switch (message.type) {
          case 'INIT_PROGRESS':
            // Notify all progress callbacks
            this.progressCallbacks.forEach((callback) => {
              callback(message.progress, message.step);
            });
            break;

          case 'INIT_COMPLETE':
            this.state = 'ready';
            this.progressCallbacks.clear();
            this.worker?.removeEventListener('message', handleMessage);
            resolve();
            break;

          case 'INIT_ERROR':
            this.state = 'error';
            this.error = message.error;
            this.progressCallbacks.clear();
            this.worker?.removeEventListener('message', handleMessage);
            reject(new Error(message.error));
            break;
        }
      };

      this.worker?.addEventListener('message', handleMessage);

      // Send initialization message with asset URLs
      // Resolve URLs relative to the current page location
      const baseURL = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
      const pyodideIndexURL = new URL('assets/', baseURL).href;
      const pystitchWheelURL = new URL('pystitch-1.0.0-py3-none-any.whl', baseURL).href;

      console.log('[PatternConverterClient] Base URL:', baseURL);
      console.log('[PatternConverterClient] Pyodide index URL:', pyodideIndexURL);
      console.log('[PatternConverterClient] Pystitch wheel URL:', pystitchWheelURL);

      const initMessage: WorkerMessage = {
        type: 'INITIALIZE',
        pyodideIndexURL,
        pystitchWheelURL,
      };
      this.worker?.postMessage(initMessage);
    });

    return this.initPromise;
  }

  /**
   * Convert PES file to PEN format using the worker
   */
  async convertPesToPen(file: File): Promise<PesPatternData> {
    // Ensure worker is initialized
    if (this.state !== 'ready') {
      throw new Error('Pyodide worker not initialized. Call initialize() first.');
    }

    if (!this.worker) {
      throw new Error('Worker not available');
    }

    return new Promise<PesPatternData>((resolve, reject) => {
      // Store reference to worker for TypeScript null checking
      const worker = this.worker;
      if (!worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const handleMessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;

        switch (message.type) {
          case 'CONVERT_COMPLETE': {
            worker.removeEventListener('message', handleMessage);
            // Convert penData array back to Uint8Array
            const penData = new Uint8Array(message.data.penData);

            // Parse the PEN data to get stitches for rendering
            const penStitches = parsePenData(penData);
            console.log('[PatternConverter] Parsed PEN data:', penStitches.totalStitches, 'stitches,', penStitches.colorCount, 'colors');

            const result: PesPatternData = {
              ...message.data,
              penData,
              penStitches,
            };
            resolve(result);
            break;
          }

          case 'CONVERT_ERROR':
            worker.removeEventListener('message', handleMessage);
            reject(new Error(message.error));
            break;
        }
      };

      worker.addEventListener('message', handleMessage);

      // Read file as ArrayBuffer and send to worker
      const reader = new FileReader();
      reader.onload = () => {
        const convertMessage: WorkerMessage = {
          type: 'CONVERT_PES',
          fileData: reader.result as ArrayBuffer,
          fileName: file.name,
        };
        worker.postMessage(convertMessage);
      };
      reader.onerror = () => {
        worker.removeEventListener('message', handleMessage);
        reject(new Error('Failed to read file'));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Setup worker event listeners
   */
  private setupWorkerListeners() {
    if (!this.worker) return;

    this.worker.addEventListener('error', (event) => {
      console.error('[PyodideWorkerClient] Worker error:', event);
      this.state = 'error';
      this.error = event.message || 'Worker error';
    });

    this.worker.addEventListener('messageerror', (event) => {
      console.error('[PyodideWorkerClient] Worker message error:', event);
      this.state = 'error';
      this.error = 'Failed to deserialize worker message';
    });
  }

  /**
   * Terminate the worker (cleanup)
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.state = 'not_loaded';
    this.error = null;
    this.initPromise = null;
    this.progressCallbacks.clear();
  }
}

// Export singleton instance
export const patternConverterClient = new PatternConverterClient();
