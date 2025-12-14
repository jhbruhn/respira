import { loadPyodide, type PyodideInterface } from "pyodide";

export type PyodideState = "not_loaded" | "loading" | "ready" | "error";

class PyodideLoader {
  private pyodide: PyodideInterface | null = null;
  private state: PyodideState = "not_loaded";
  private error: string | null = null;
  private loadPromise: Promise<PyodideInterface> | null = null;

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
   * Initialize Pyodide and install PyStitch
   */
  async initialize(): Promise<PyodideInterface> {
    // If already ready, return immediately
    if (this.state === "ready" && this.pyodide) {
      return this.pyodide;
    }

    // If currently loading, wait for the existing promise
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Start loading
    this.state = "loading";
    this.error = null;

    this.loadPromise = (async () => {
      try {
        console.log("[PyodideLoader] Loading Pyodide...");

        // Load Pyodide with CDN indexURL for packages
        // The core files will be loaded from our bundle, but packages will come from CDN
        this.pyodide = await loadPyodide();

        console.log("[PyodideLoader] Pyodide loaded, loading micropip...");

        // Load micropip package
        /*await this.pyodide.loadPackage('micropip');

        console.log('[PyodideLoader] Installing PyStitch...');

        // Install PyStitch using micropip
        await this.pyodide.runPythonAsync(`
          import micropip
          await micropip.install('pystitch')
        `);*/
        await this.pyodide.loadPackage("pystitch-1.0.0-py3-none-any.whl");

        console.log("[PyodideLoader] PyStitch installed successfully");

        this.state = "ready";
        return this.pyodide;
      } catch (err) {
        this.state = "error";
        this.error =
          err instanceof Error ? err.message : "Unknown error loading Pyodide";
        console.error("[PyodideLoader] Error:", this.error);
        throw err;
      }
    })();

    return this.loadPromise;
  }

  /**
   * Get the Pyodide instance (must be initialized first)
   */
  getInstance(): PyodideInterface | null {
    return this.pyodide;
  }
}

// Export singleton instance
export const pyodideLoader = new PyodideLoader();
