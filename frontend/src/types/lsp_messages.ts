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
  Vituoso = 'Vituoso',
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
