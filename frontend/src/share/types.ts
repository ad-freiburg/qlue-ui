export type OutputFormat = 'sparql_json' | 'qlever_json' | 'csv' | 'tsv' | 'turtle' | 'binary';

/** QLever `action=` URL parameter value, used for GET requests. */
export const ACTION_PARAM: Record<OutputFormat, string> = {
  sparql_json: 'sparql_json_export',
  qlever_json: 'qlever_json_export',
  csv: 'csv_export',
  tsv: 'tsv_export',
  turtle: 'turtle_export',
  binary: 'binary_export',
};

/** `Accept` header media type, used for content negotiation (cURL). */
export const MEDIA_TYPE: Record<OutputFormat, string> = {
  sparql_json: 'application/sparql-results+json',
  qlever_json: 'application/qlever-results+json',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  turtle: 'text/turtle',
  binary: 'application/octet-stream',
};

export interface AppLinkOptions {
  mode: 'app-link';
  runAutomatically: boolean;
  idType: 'short' | 'full-query';
}

export interface RawApiRequestOptions {
  mode: 'raw-api-request';
  outputFormat: OutputFormat;
}

export interface CurlCommandOptions {
  mode: 'curl-command';
  outputFormat: OutputFormat;
  method: 'GET' | 'POST';
}

export type ShareOptions = AppLinkOptions | RawApiRequestOptions | CurlCommandOptions;
