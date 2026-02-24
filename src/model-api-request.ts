import { IncomingHttpHeaders } from "node:http";
import { ModelResponse } from "./models.js";

type ValidRequestHeaders = Record<keyof IncomingHttpHeaders, string>;

type DynamicHeaders = ValidRequestHeaders | (() => ValidRequestHeaders | Promise<ValidRequestHeaders>);

interface RequestBody<Data> {
  body?: (keyof Data)[];
}

export interface ModelAPIRequest<Data, Args> {
  url?: string;
  headers?: DynamicHeaders;
  get: GetRequest<Args>;
  patch: PatchRequest<Data>;
  post?: PostRequest<Data>;
  put?: PutRequest<Data>;
  delete?: DeleteRequest<Data>;
}

type RequireUrlIfMissing<HasBaseUrl extends boolean> = HasBaseUrl extends true
  ? { url?: string }
  : { url: string };

type APIRequestBase<HasBaseUrl extends boolean = true> = RequireUrlIfMissing<HasBaseUrl> & {
  headers?: DynamicHeaders;
};

type GetRequest<Args, HasBaseUrl extends boolean = true> = APIRequestBase<HasBaseUrl> & {
  params?: (keyof Args)[];
};

type PostRequest<Data, HasBaseUrl extends boolean = true> = APIRequestBase<HasBaseUrl> & RequestBody<Data>;

type PutRequest<Data, HasBaseUrl extends boolean = true> = APIRequestBase<HasBaseUrl> & RequestBody<Data>;

type PatchRequest<Data, HasBaseUrl extends boolean = true> = APIRequestBase<HasBaseUrl> & RequestBody<Data>;

type DeleteRequest<Data, HasBaseUrl extends boolean = true> = APIRequestBase<HasBaseUrl> & RequestBody<Data>;

async function resolveHeaders(
  headers?: DynamicHeaders
): Promise<ValidRequestHeaders | undefined> {
  if (typeof headers === "function") return await headers();
  return headers;
}

export async function get<Data, Action>(
  url: string,
  headers?: DynamicHeaders
): Promise<ModelResponse<Data, Action>> {
  const resolvedHeaders = await resolveHeaders(headers);
  const response = await fetch(url, {
    method: "GET",
    ...(resolvedHeaders && { headers: resolvedHeaders }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`${response.status}: ${body}`);
  }
  return response.json() as Promise<ModelResponse<Data, Action>>;
}

export async function post<Data, Action>(
  url: string,
  data: Data,
  headers?: DynamicHeaders
): Promise<ModelResponse<Data, Action>> {
  const resolvedHeaders = await resolveHeaders(headers);
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify({ data }),
    headers: { "Content-Type": "application/json", ...resolvedHeaders },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`${response.status}: ${body}`);
  }
  return response.json() as Promise<ModelResponse<Data, Action>>;
}

export async function patch<Data, Action>(
  url: string,
  data: Partial<Data>,
  headers?: DynamicHeaders
): Promise<ModelResponse<Data, Action>> {
  const resolvedHeaders = await resolveHeaders(headers);
  const response = await fetch(url, {
    method: "PATCH",
    body: JSON.stringify({ data }),
    headers: { "Content-Type": "application/json", ...resolvedHeaders },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`${response.status}: ${body}`);
  }
  return response.json() as Promise<ModelResponse<Data, Action>>;
}

export async function put<Data, Action>(
  url: string,
  data: Data,
  headers?: DynamicHeaders
): Promise<ModelResponse<Data, Action>> {
  const resolvedHeaders = await resolveHeaders(headers);
  const response = await fetch(url, {
    method: "PUT",
    body: JSON.stringify({ data }),
    headers: { "Content-Type": "application/json", ...resolvedHeaders },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`${response.status}: ${body}`);
  }
  return response.json() as Promise<ModelResponse<Data, Action>>;
}

export async function del<Data, Action>(
  url: string,
  data: Partial<Data>,
  headers?: DynamicHeaders
): Promise<ModelResponse<Data, Action>> {
  const resolvedHeaders = await resolveHeaders(headers);
  const response = await fetch(url, {
    method: "DELETE",
    body: JSON.stringify({ data }),
    headers: { "Content-Type": "application/json", ...resolvedHeaders },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`${response.status}: ${body}`);
  }
  return response.json() as Promise<ModelResponse<Data, Action>>;
}
