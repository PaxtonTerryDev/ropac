import { PermissionShorthand } from "./permissions.js";
import { ModelAPIRequest } from "./model-api-request.js";
import { Permission } from "./permissions.js";
import { MappedObject } from "./utils/types/mapped-object.js";
import { objectMap } from "./utils/object-operators.js";

type FieldView = {
  value: any | any[];
  permissions: Permission[];
}

/** All keys of the provided base T with an associated value */
export type FieldValues<T> = MappedObject<T, any | any[]>

/** A map of Roles correlated to their respective permissions.  Used mainly in FieldPermissions, to map all the permissions for a particular field. */
export type RolePermissionsMap<Role> = Map<Role, Permission[] | PermissionShorthand>

/**
 * A tuple type where index 0 is a role and index 1 is either an array of permissions, or a PermissionShorthand definition
 */
type RolePermissionMapDefinition<Role> = [Role, Permission[] | PermissionShorthand]

/** 
* Creates a new instance of a RolePermissionMap.  
* @param rolePermissions RolePermissionMapDefinition objects
*
* @example
* const permissionMap = newRolePermissionMap([adminRole, "CRUD"], [userRole, "R"])
* */
export function newRolePermissionsMap<Role>(...rolePermissions: RolePermissionMapDefinition<Role>[]): RolePermissionsMap<Role> {
  return new Map([...rolePermissions])
}

/**
 * Applies a single RolePermissionMap to each key in the provided data object.
 */
export function applySingleRolePermissionsMap<BaseObj extends object, Role>(data: BaseObj, permissionMap: RolePermissionsMap<Role>): FieldPermissions<BaseObj, Role> {
  return objectMap(data, (_key, _value) => permissionMap);
}

/** All keys of the provided base T with an associated RolePermissionMap */
export type FieldPermissions<BaseObj, Role> = MappedObject<BaseObj, RolePermissionsMap<Role>>

/** All keys of the provided Base T with an associated FieldView object. Is the `data` property of the ModelResponse object */ type FieldViews<T> = MappedObject<T, FieldView>;

export interface ModelResponse<Data, Action> {
  data: FieldViews<Data>,
  actions: Action[]
}

// Provide the definitions needed to create both ModelControllers and ModelViews.
export interface Model<Data, Args, Action, Role, AdditionalArgs = null> extends Controller<Data, Args, Action, Role, AdditionalArgs>, View<Data, Args, Action, Role> { }

export class ModelInstance<Data, Args, Action, Role, AdditionalArgs = null> {
  model: Model<Data, Args, Action, Role, AdditionalArgs>;
  constructor(model: Model<Data, Args, Action, Role, AdditionalArgs>) {
    this.model = model;
  }

  createController(): Controller<Data, Args, Action, Role, AdditionalArgs> {
    const { getAdditionalArgs, getData, getPermissions, getActions } = this.model
  }
}

// Used on the server to fetch model data and permissions, and map them together.
// Responds to requests from a corresponding ModelView through the React hook.
export interface Controller<Data, Args, Action, Role, AdditionalArgs = null> {

  /** Optionally get additional args for data and permission mapping. */
  getAdditionalArgs?: (modelArgs?: Args) => Promise<AdditionalArgs> | AdditionalArgs;

  /** Should fetch the full data model values from storage */
  getData: (modelArgs?: Args, ...args: AdditionalArgs[]) => Promise<Data> | Data;

  /** 
  * Should get the relevant permissions for each data field 
  * Is provided with the data returned from getData if data is required to accurately describe permissions 
  * */
  getPermissions: (data: Data, modelArgs?: Args, args?: AdditionalArgs[]) => Promise<FieldPermissions<Data, Role>> | FieldPermissions<Data, Role>;

  /** Should get all valid actions to be sent to the client */
  getActions?: (modelArgs?: Args, ...args: AdditionalArgs[]) => Promise<Action[]> | Action[];
}

export class ControllerInstance<Data, Args, Action, Role, AdditionalArgs = null> {
  controller: Controller<Data, Args, Action, Role, AdditionalArgs>;

  constructor(controller: Controller<Data, Args, Action, Role, AdditionalArgs>) {
    this.controller = controller;
  }

  handleRequest(data: Data): Promise<ModelResponse<Data, Action>> {
    throw new Error("Method not implemented")
  }

  sanitize(response: ModelResponse<Data, Action>) {
    throw new Error("Method not Implemented")
  }
}

// Serializable -> This is functionally a container that is used to provide the necessary data to the usePermissions hook to build a View object on the client.
export interface View<Data, Args, Action, Role> {
  endpoints: ModelAPIRequest<Data, Args>;
}

