export interface Service {
  name: string;
  url: string;
  engine: string;
  healthCheckUrl?: string;
}

export interface PrefixMap {
  [key: string]: string;
}

export interface Queries {
  [key: string]: string;
}

export interface QlueLsServiceConfig {
  service: Service;
  prefixMap: PrefixMap;
  queries: Queries;
  default: boolean;
}

export interface UiServiceConfig {
  slug: string;
  url: string;
  engine: string;
  prefix_map: PrefixMap;
  subject_completion: string;
  predicate_completion_context_sensitive: string;
  predicate_completion_context_insensitive: string;
  object_completion_context_sensitive: string;
  object_completion_context_insensitive: string;
}
