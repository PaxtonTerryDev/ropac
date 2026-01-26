import { IncomingHttpHeaders } from "node:http";
// TODO: We need to come back to this -> This needs to be defined in a way that we can encapsulate the data in a serializable format, as its being sent from the server to the client.
// We can't transmit a function signature, so we need to define a format that we can send our parameters in so that the client hook will always know how to get that data.

// The idea here is to provide an interface where we can define the endpoints intended to access a model. 
// We most likely need get and patch requests to objectively function, but for the other methods we can just plan on doing a quick check of the definition exists.
// I think this will be a good place to centralize the endpoint definitions so they can be created by the Model and client hooks. 

export interface ModelAPIRequest<Data, Args> {
  url?: string;
  headers?: ValidRequestHeaders;
  get: GetRequest<Args>;
  patch: PatchRequest<Data>;
  post?: PostRequest<Data>;
  put?: PutRequest<Data>;
  delete?: DeleteRequest<Data>;
}

type ValidRequestHeaders = Record<keyof IncomingHttpHeaders, string>;

interface RequestBody<Data> {
  body?: keyof Data[];
}
interface APIRequestBase {
  /** Overrides the url property specified in the ModelApiRequest object */
  url?: string;
  /** Overrides the headers property specified in the ModelApiRequest object */
  headers?: ValidRequestHeaders;
}

interface GetRequest<Args> extends APIRequestBase {
  params?: keyof Args[];
}

interface PostRequest<Data> extends APIRequestBase, RequestBody<Data> { }

interface PutRequest<Data> extends APIRequestBase, RequestBody<Data> { }

interface PatchRequest<Data> extends APIRequestBase, RequestBody<Data> { }

interface DeleteRequest<Data> extends APIRequestBase, RequestBody<Data> { }
