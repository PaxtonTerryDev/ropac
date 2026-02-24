import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { get, post, patch, put, del } from "../model-api-request.js";

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(String(status)),
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch(200, { data: {}, actions: [] }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("get", () => {
  it("makes a GET request and returns parsed JSON", async () => {
    const payload = { data: { name: { data: "Alice", permissions: ["read"] } }, actions: [] };
    vi.stubGlobal("fetch", mockFetch(200, payload));
    const result = await get("https://example.com/api");
    expect(result).toEqual(payload);
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch(403, {}));
    await expect(get("https://example.com/api")).rejects.toThrow("403");
  });

  it("passes static headers to fetch", async () => {
    const fetchSpy = mockFetch(200, { data: {}, actions: [] });
    vi.stubGlobal("fetch", fetchSpy);
    await get("https://example.com/api", { authorization: "Bearer token" } as never);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/api",
      expect.objectContaining({ headers: { authorization: "Bearer token" } }),
    );
  });

  it("resolves function headers before the request", async () => {
    const fetchSpy = mockFetch(200, { data: {}, actions: [] });
    vi.stubGlobal("fetch", fetchSpy);
    const dynamicHeaders = () => ({ authorization: "Bearer dynamic" } as never);
    await get("https://example.com/api", dynamicHeaders);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/api",
      expect.objectContaining({ headers: { authorization: "Bearer dynamic" } }),
    );
  });

  it("resolves async function headers", async () => {
    const fetchSpy = mockFetch(200, { data: {}, actions: [] });
    vi.stubGlobal("fetch", fetchSpy);
    const asyncHeaders = async () => ({ authorization: "Bearer async" } as never);
    await get("https://example.com/api", asyncHeaders);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/api",
      expect.objectContaining({ headers: { authorization: "Bearer async" } }),
    );
  });
});

describe("patch", () => {
  it("makes a PATCH request with JSON body", async () => {
    const fetchSpy = mockFetch(200, { data: {}, actions: [] });
    vi.stubGlobal("fetch", fetchSpy);
    await patch("https://example.com/api", { name: "Bob" });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/api",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ data: { name: "Bob" } }),
      }),
    );
  });

  it("sets Content-Type to application/json", async () => {
    const fetchSpy = mockFetch(200, { data: {}, actions: [] });
    vi.stubGlobal("fetch", fetchSpy);
    await patch("https://example.com/api", {});
    const callArgs = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect((callArgs.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("merges custom headers with Content-Type", async () => {
    const fetchSpy = mockFetch(200, { data: {}, actions: [] });
    vi.stubGlobal("fetch", fetchSpy);
    await patch("https://example.com/api", {}, { authorization: "Bearer token" } as never);
    const callArgs = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const headers = callArgs.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["authorization"]).toBe("Bearer token");
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch(500, {}));
    await expect(patch("https://example.com/api", {})).rejects.toThrow("500");
  });
});

describe("post", () => {
  it("makes a POST request with JSON body", async () => {
    const fetchSpy = mockFetch(200, { data: {}, actions: [] });
    vi.stubGlobal("fetch", fetchSpy);
    await post("https://example.com/api", { name: "Alice" });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/api",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ data: { name: "Alice" } }),
      }),
    );
  });
});

describe("put", () => {
  it("makes a PUT request with JSON body", async () => {
    const fetchSpy = mockFetch(200, { data: {}, actions: [] });
    vi.stubGlobal("fetch", fetchSpy);
    await put("https://example.com/api", { name: "Alice" });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/api",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ data: { name: "Alice" } }),
      }),
    );
  });
});

describe("del", () => {
  it("makes a DELETE request with JSON body", async () => {
    const fetchSpy = mockFetch(200, { data: {}, actions: [] });
    vi.stubGlobal("fetch", fetchSpy);
    await del("https://example.com/api", { id: 1 });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/api",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ data: { id: 1 } }),
      }),
    );
  });
});
