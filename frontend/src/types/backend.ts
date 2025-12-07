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

export interface ServiceConfig {
  service: Service;
  prefixMap: PrefixMap;
  queries: Queries;
  default: boolean;
}
