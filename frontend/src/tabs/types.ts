// ┌─────────────────────────────────┐ \\
// │ Copyright © 2026 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

export interface ExampleOrigin {
  name: string;
  service: string;
  /** The example's query as loaded, to detect later edits. */
  content: string;
}

export interface TabState {
  id: string;
  name: string;
  uri: string;
  content: string;
  exampleOrigin?: ExampleOrigin;
  /** True when the tab's content diverged from `exampleOrigin.content`. */
  exampleChanged?: boolean;
}

export interface TabsState {
  tabs: TabState[];
  activeTabId: string;
  nextId: number;
}

export interface BackendTabsStore {
  backends: Record<string, TabsState>;
}

export type TabQueryStatus = 'idle' | 'running' | 'success' | 'error';

export const STORAGE_KEY = 'QLeverUI tabs';
export const DEFAULT_URI = 'query.rq';
export const SAVE_DEBOUNCE_MS = 500;
