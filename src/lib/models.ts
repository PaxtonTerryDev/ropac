import { Action, ActionSet } from "./actions.js";
import { ModelAPIRequest } from "./model-api-request.js";
import { Permission } from "./permissions.js";
import { MappedObject } from "./utils/types/mapped-object.js";

type Value = {
  value: any | any[];
  permissions: Permission[];
}

type ResponseValues<BaseObj> = MappedObject<BaseObj, Value>

export interface ModelResponse<Data, ActionType extends Action> {
  data: ResponseValues<Data>,
  actions: ActionSet<ActionType>
}

// Provide the definitions needed to create both ModelControllers and ModelViews.
export interface Model<Data, Args, Action, Role> extends Controller<Data, Args, Action, Role>, View<Data, Args, Action, Role> {
  endpoints: ModelAPIRequest<Data, Args>;
}

export class ModelInstance<Data, Args, Action, Role> {
  model: Model<Data, Args, Action, Role>;
  constructor(model: Model<Data, Args, Action, Role>) {
    this.model = model;
  }
}


// Used on the server to fetch model data and permissions, and map them together.
// Responds to requests from a corresponding ModelView through the React hook.
export interface Controller<Data, Args, ActionType extends Action, Role> {
// TODO: Would like to figure out a way to safely type the additionally provided arguments in these methods, if possible.
  
  /** Should fetch the full data model values from storage */
  getData<T>(modelArgs?: Args, ...args: T[]): Data;
  
  /** 
  * Should get the relevant permissions for each data field 
  * Is provided with the data returned from getData if data is required to accurately describe permissions 
  * */
  getPermissions<T>(data: Data, modelArgs?: Args, args?: T[]): Role[];

  /** Should get all valid actions to be sent to the client */
  getActions?: (modelArgs?: Args, ...args: unknown[]) => ActionType[];
}

export class ControllerInstance<Data, Args, ActionType extends Action, Role> {
  controller: Model<Data, Args, ActionType, Role>;

  constructor(controller: Model<Data, Args, ActionType, Role>) {
    this.controller = controller;
  }

  handleRequest(data: Data): Promise<ModelResponse<Data, ActionType>> {
    throw new Error("Method not implemented");
  }

  sanitize(response: ModelResponse<Data, ActionType>): ModelResponse<Data, ActionType> {
    throw new Error("Method not implemented");
  }
}

// Serializable -> This is functionally a container that is used to provide the necessary data to the usePermissions hook to build a View object on the client.
export interface View<Data, Args, Action, Role> { }

