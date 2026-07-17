// Lazy-loads Jitsi Meet's External API script (from the given domain, e.g.
// meet.jit.si) and exposes the JitsiMeetExternalAPI constructor. The script is
// injected on first use and cached. Swapping to a self-hosted/JWT domain later only
// changes the domain string passed here.

export interface JitsiApi {
  addListener(event: string, listener: (...args: unknown[]) => void): void;
  removeListener(event: string, listener: (...args: unknown[]) => void): void;
  executeCommand(command: string, ...args: unknown[]): void;
  dispose(): void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi;
  }
}

let loadPromise: Promise<boolean> | null = null;

export function loadJitsi(domain: string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.JitsiMeetExternalAPI) return Promise.resolve(true);
  if (loadPromise) return loadPromise;
  const src = `https://${domain}/external_api.js`;
  loadPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(!!window.JitsiMeetExternalAPI));
      existing.addEventListener('error', () => resolve(false));
      if (window.JitsiMeetExternalAPI) resolve(true);
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve(!!window.JitsiMeetExternalAPI);
    s.onerror = () => { loadPromise = null; resolve(false); };
    document.body.appendChild(s);
  });
  return loadPromise;
}
