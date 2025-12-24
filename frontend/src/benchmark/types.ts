interface SparqlRequest {
  serviceLabel: string,
  url: string,
  query: string
  timeMs: number,
  done: boolean,
  failed: boolean
}

