import { IncomingHttpHeaders } from "node:http";
import { ModelResponse } from "./models.js";

type ValidRequestHeaders = Record<keyof IncomingHttpHeaders, string>;

interface RequestBody<Data> {
  body?: keyof Data[];
}

export interface ModelAPIRequest<Data, Args> {
  url?: string;
  headers?: ValidRequestHeaders;
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
  headers?: ValidRequestHeaders;
};

type GetRequest<Args, HasBaseUrl extends boolean = true> = APIRequestBase<HasBaseUrl> & {
  params?: keyof Args[];
};

type PostRequest<Data, HasBaseUrl extends boolean = true> = APIRequestBase<HasBaseUrl> & RequestBody<Data>;

type PutRequest<Data, HasBaseUrl extends boolean = true> = APIRequestBase<HasBaseUrl> & RequestBody<Data>;

type PatchRequest<Data, HasBaseUrl extends boolean = true> = APIRequestBase<HasBaseUrl> & RequestBody<Data>;

type DeleteRequest<Data, HasBaseUrl extends boolean = true> = APIRequestBase<HasBaseUrl> & RequestBody<Data>;

export async function get<Data, Action>(
  url: string,
  headers?: Partial<ValidRequestHeaders>
): Promise<ModelResponse<Data, Action>> {
  const response = await fetch(url, {
    method: "GET",
    ...(headers && { headers }),
  });
  return response.json() as Promise<ModelResponse<Data, Action>>;
}

export async function post<Data, Action>(
  url: string,
  data: Data,
  headers?: Partial<ValidRequestHeaders>
): Promise<ModelResponse<Data, Action>> {
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify({ data }),
    ...(headers && { headers }),
  });
  return response.json() as Promise<ModelResponse<Data, Action>>;
}

export async function patch<Data, Action>(
  url: string,
  data: Partial<Data>,
  headers?: Partial<ValidRequestHeaders>
): Promise<ModelResponse<Data, Action>> {
  const response = await fetch(url, {
    method: "PATCH",
    body: JSON.stringify({ data }),
    ...(headers && { headers }),
  });
  return response.json() as Promise<ModelResponse<Data, Action>>;
}

export async function put<Data, Action>(
  url: string,
  data: Data,
  headers?: Partial<ValidRequestHeaders>
): Promise<ModelResponse<Data, Action>> {
  const response = await fetch(url, {
    method: "PUT",
    body: JSON.stringify({ data }),
    ...(headers && { headers }),
  });
  return response.json() as Promise<ModelResponse<Data, Action>>;
}

export async function del<Data, Action>(
  url: string,
  data: Partial<Data>,
  headers?: Partial<ValidRequestHeaders>
): Promise<ModelResponse<Data, Action>> {
  const response = await fetch(url, {
    method: "DELETE",
    body: JSON.stringify({ data }),
    ...(headers && { headers }),
  });
  return response.json() as Promise<ModelResponse<Data, Action>>;
}
