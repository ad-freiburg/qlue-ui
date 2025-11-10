export type CacheStatus =
  | "cached_not_pinned"
  | "computed";

export type NodeStatus =
  | "fully materialized"
  | "lazily materialized";

export interface NodeDetails {
  "num-blocks-all"?: number;
  "num-blocks-read"?: number;
  "num-elements-read"?: number;
  "time-for-filtering-blocks"?: number;
  "time-cloning"?: number;
}

export interface QueryExecutionNode {
  cache_status: CacheStatus;
  children: QueryExecutionNode[];
  column_names: string[];
  description: string;
  details: NodeDetails | null;
  estimated_column_multiplicities: number[];
  estimated_operation_cost: number;
  estimated_size: number;
  estimated_total_cost: number;
  operation_time: number;
  original_operation_time: number;
  original_total_time: number;
  result_cols: number;
  result_rows: number;
  status: NodeStatus;
  total_time: number;
}

// Type alias for the root node (same structure)
export type QueryExecutionTree = QueryExecutionNode;

// Example usage:
// const tree: QueryExecutionTree = { ... };
