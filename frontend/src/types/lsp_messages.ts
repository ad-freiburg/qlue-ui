import type { Binding, SPARQLResults } from './rdf';
import type { ExecuteUpdateResult } from './update';

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface TextEdit {
  range: Range;
  newText: string;
}

export type FormattingResult = TextEdit[];

export interface IdentifyOperationTypeResult {
  operationType: OperationType;
}
export enum OperationType {
  Query = 'Query',
  Update = 'Update',
  Unknown = 'Unknown',
}

export interface JumpResult {
  edits: TextEdit[];
  position: Position | null;
}

export enum SparqlEngine {
  QLever = 'QLever',
  GraphDB = 'GraphDB',
  Virtuoso = 'Virtuoso',
  MillenniumDB = 'MillenniumDB',
  Blazegraph = 'Blazegraph',
  Jena = 'Jena',
}

export interface SparqlService {
  /// Internal name of the SPARQL endpoint.
  name: string;
  /// URL of the SPARQL endpoint.
  url: string;
  /// URL to check the health of the SPARQL endpoint.
  health_check_url?: string;
  /// The engine the runs begind the SPARQL endpoint.
  engine?: SparqlEngine;
}

export type ExecuteOperationResult =
  | { queryResult: ExecuteQueryResult }
  | { updateResult: ExecuteUpdateResult };

export function getOperationTimeMs(result: ExecuteOperationResult): number {
  return 'queryResult' in result ? result.queryResult.timeMs : result.updateResult.time.total;
}

export interface ExecuteQueryResult {
  timeMs: number;
  result: SPARQLResults;
}

export type PartialResult = { header: Header } | { bindings: Binding[] } | { meta: Meta };

export interface Header {
  head: Head;
}

export interface Head {
  vars: string[];
}

export interface Meta {
  'query-time-ms'?: number;
  'result-size-total': number;
}

export interface PingBackendResult {
  available: boolean;
}
