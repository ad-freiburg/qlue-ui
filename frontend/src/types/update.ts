export interface ExecuteUpdateResultEntry {
  deltaTriples: DeltaTriples;
  status: "OK" | "ERROR";
  time: TimeInfo;
  update: string;
  warnings: string[];
}

export interface TimeInfo {
  total: number;
  planning: number;
  where: number;
  update: UpdateTiming;
}

export interface UpdateTiming {
  total: number;
  preparation: number;
  delete: number;
  insert: number;
}


export interface DeltaTriples {
  operation: TripleDelta;
  before: TripleDelta;
  after: TripleDelta;
  difference: TripleDelta;
}

export interface TripleDelta {
  total: number;
  deleted: number;
  inserted: number;
}
