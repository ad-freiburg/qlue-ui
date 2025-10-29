export interface SPARQLResults {
  head: SPARQLHead;
  results: SPARQLBindings;
}

export interface SPARQLHead {
  vars: string[];
  prefixes?: PrefixMap;
  link?: string[];
}

export interface PrefixMap {
  [prefix: string]: string;
}

export interface SPARQLBindings {
  bindings: Binding[];
}

export interface Binding {
  [variable: string]: BindingValue;
}

export type BindingValue = URIValue | LiteralValue | BlankNodeValue | TripleValue;

export interface URIValue {
  type: 'uri';
  value: string;
  curie?: string;
}

export interface LiteralValue {
  type: 'literal';
  value: string;
  'xml:lang'?: string;
  datatype?: string;
}

export interface BlankNodeValue {
  type: 'bnode';
  value: string;
}

// SPARQL-star support
export interface TripleValue {
  type: 'triple';
  value: {
    subject: BindingValue;
    predicate: BindingValue;
    object: BindingValue;
  };
}

// Helper type for type guards
export function isURIValue(value: BindingValue): value is URIValue {
  return value.type === 'uri';
}

export function isLiteralValue(value: BindingValue): value is LiteralValue {
  return value.type === 'literal';
}

export function isBlankNodeValue(value: BindingValue): value is BlankNodeValue {
  return value.type === 'bnode';
}

export function isTripleValue(value: BindingValue): value is TripleValue {
  return value.type === 'triple';
}
