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
