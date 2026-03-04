export type SafeFetchSuccess<T> = {
  ok: true;
  status: number;
  data: T;
};

export type SafeFetchFailure = {
  ok: false;
  status: number;
  error: string;
  rawText?: string;
};

export type SafeFetchResult<T> = SafeFetchSuccess<T> | SafeFetchFailure;

export async function safeFetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<SafeFetchResult<T>> {
  const { timeoutMs = 12_000, ...requestInit } = init ?? {};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...requestInit,
      signal: controller.signal,
    });

    const rawText = await response.text();
    let parsed: unknown = null;

    if (rawText) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        return {
          ok: false,
          status: response.status,
          error: "Response was not valid JSON.",
          rawText,
        };
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: "Request failed.",
        rawText,
      };
    }

    return {
      ok: true,
      status: response.status,
      data: parsed as T,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        ok: false,
        status: 408,
        error: "Request timeout.",
      };
    }

    return {
      ok: false,
      status: 0,
      error: "Network error.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
