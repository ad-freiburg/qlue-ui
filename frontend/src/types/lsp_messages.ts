import type { Binding } from "./rdf";

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
  position: Position;
  insertBefore?: string;
  insertAfter?: string;
}


export enum SparqlEngine {
  QLever = 'QLever',
  GraphDB = 'GraphDB',
  Virtuoso = 'Virtuoso',
  MillenniumDB = "MillenniumDB",
  Blazegraph = "Blazegraph",
  Jena = "Jena"
}


export interface SparqlService {
  /// Internal name of the SPARQL endpoint.
  name: String,
  /// URL of the SPARQL endpoint.
  url: String,
  /// URL to check the health of the SPARQL endpoint.
  health_check_url?: String,
  /// The engine the runs begind the SPARQL endpoint.
  engine?: SparqlEngine,
}

export interface ExecuteQueryResult {
  /// End-to-End duration of the Query execution.
  timeMs: number
}

export type PartialResult =
  | { header: Header }
  | { bindings: Binding[] };

export interface Header {
  head: Head;
}

export interface Head {
  vars: string[];
}
