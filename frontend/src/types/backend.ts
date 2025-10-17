export interface Backend {
  name: string;
  url: string;
  healthCheckUrl?: string;
}

export interface PrefixMap {
  [key: string]: string;
}

export interface Queries {
  [key: string]: string;
}

export interface BackendConfig {
  backend: Backend;
  prefixMap: PrefixMap;
  queries: Queries;
  default: boolean;
}
