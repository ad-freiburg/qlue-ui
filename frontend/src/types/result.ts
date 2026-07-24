export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

// Constructor helpers (Rust has Ok() / Err(), so mirror that)
export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export namespace Result {
  export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    return result.ok ? Ok(fn(result.value)) : result;
  }

  export function unwrap<T, E>(result: Result<T, E>): T {
    if (!result.ok) {
      throw result.error instanceof Error ? result.error : new Error(String(result.error));
    }
    return result.value;
  }

  export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
    return result.ok ? result.value : fallback;
  }
}
