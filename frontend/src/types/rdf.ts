// Type of a single variable binding
export interface SparqlBindingValue {
  type: "uri" | "literal" | "bnode"; // SPARQL variable type
  value: string;
  "xml:lang"?: string;                 // optional for language-tagged literals
  datatype?: string;                   // optional for typed literals
}

// A single result row: variable name → binding
export type SparqlBinding = Record<string, SparqlBindingValue>;

// Full SPARQL JSON results object
export interface SparqlResults {
  head: {
    vars: string[];
  };
  results: {
    bindings: SparqlBinding[];
  };
}

export interface QleverResponse {
  query: string;
  selected: string[];
  status: string;
  warnings: string[];
  res: string[][];
  resultSizeExported: number;
  resultSizeTotal: number;
  resultsize: number;
  runtimeInformation: RuntimeInformation;
  time: Time;
}

export interface RuntimeInformation {
  meta: Meta;
  query_execution_tree: QueryExecutionTree;
}

export interface Meta {
  time_query_planning: number;
}

export interface QueryExecutionTree {
  cache_status: string;
  children: QueryExecutionTree[];
  column_names: string[];
  description: string;
  details: null | any;
  estimated_column_multiplicities: ColumnMultiplicity[];
  estimated_operation_cost: number;
  estimated_size: number;
  estimated_total_cost: number;
  operation_time: number;
  original_operation_time: number;
  original_total_time: number;
  result_cols: number;
  result_rows: number;
  status: string;
  total_time: number;
}

export interface ColumnMultiplicity {
  source: string;
  parsedValue: number;
}

export interface Time {
  computeResult: string;
  total: string;
}

export interface RdfValue {
  type: 'iri' | 'literal' | 'typed-literal';
  value: string;
  datatype?: string;
  language?: string;
}
