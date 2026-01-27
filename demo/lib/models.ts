import { expandPermissions, mergeShorthandPermissions, Permission, PermissionShorthand } from "./permissions";
import { ModelAPIRequest } from "./model-api-request";
import { MappedObject } from "@/lib/utils/types/mapped-object";
import { objectJoin, objectMap } from "./utils/object-operators";
import { log } from "@paxtonterrydev/quicklog";

function permissionsToShorthand(permissions: Permission[]): PermissionShorthand {
  const map: Record<Permission, string> = { create: "C", read: "R", update: "U", delete: "D" };
  return permissions.map(p => map[p]).join("") as PermissionShorthand;
}

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

export type AppliedPermissions<BaseObj> = MappedObject<BaseObj, Permission[] | PermissionShorthand>

export function updatePermissionField<T extends object>(
  permissions: T,
  path: string,
  value: Permission[] | PermissionShorthand
): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = permissions as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
}

export function updateRolePermission<R extends string>(
  rolePermissions: Record<R, Permission[] | PermissionShorthand>,
  role: R,
  value: Permission[] | PermissionShorthand
): void {
  rolePermissions[role] = value;
}
/** All keys of the provided Base T with an associated FieldView object. Is the `data` property of the ModelResponse object */ type FieldViews<T> = MappedObject<T, FieldView>;
export interface ModelComposite<Data, Action> {
  data: FieldViews<Data>,
  actions: Action[]
}

export interface SanitizedField {
  data: any | any[];
  permissions: Permission[];
}

/** The cleaned ModelComposite object that contains only relevant field values and permissions */
export type SanitizedFieldViews<Data> = MappedObject<Data, SanitizedField>

export interface ModelResponse<Data, Action> {
  data: SanitizedFieldViews<Data>,
  actions: Action[]
}

// Provide the definitions needed to create both ModelControllers and ModelViews.
export interface Model<Data, Args, Action, Role, AdditionalArgs = null> extends Controller<Data, Args, Action, Role, AdditionalArgs>, View<Data, Args, Action, Role> { }

export class ModelInstance<Data, Args, Action, Role, AdditionalArgs = null> {
  model: Model<Data, Args, Action, Role, AdditionalArgs>;
  constructor(model: Model<Data, Args, Action, Role, AdditionalArgs>) {
    this.model = model;
  }

  createController(): ControllerInstance<Data, Args, Action, Role, AdditionalArgs> {
    const { getAdditionalArgs, getClientRoles, getData, getPermissions, applyPermissions, getActions, applyActions } = this.model;
    return new ControllerInstance({
      getData,
      getClientRoles,
      getPermissions,
      ...(applyPermissions && { applyPermissions }),
      ...(getAdditionalArgs && { getAdditionalArgs }),
      ...(getActions && { getActions }),
      ...(applyActions && { applyActions }),
    });
  }

  createView(): View<Data, Args, Action, Role> {
    return { endpoints: this.model.endpoints };
  }
}

// Used on the server to fetch model data and permissions, and map them together.
// Responds to requests from a corresponding ModelView through the React hook.
export interface Controller<Data, Args, Action, Role, AdditionalArgs = null> {

  /** Optionally get additional args for data and permission mapping. */
  getAdditionalArgs?: (modelArgs?: Args) => Promise<AdditionalArgs> | AdditionalArgs;

  /** Should fetch the full data model values from storage */
  getData: (modelArgs?: Args, ...args: AdditionalArgs[]) => Promise<Data> | Data;

  /** Should fetch an array of all roles the (accessing) client possesses. */
  getClientRoles: (modelArgs?: Args, ...args: AdditionalArgs[]) => Promise<Role[]> | Role[]

  /**
   * Optional step to modify client roles before permissions are applied.
   * Receives the fetched roles and can add, remove, or replace them.
   */
  applyClientRoles?: (data: Data, roles: Role[], modelArgs?: Args, ...args: AdditionalArgs[]) => Promise<Role[]> | Role[];

  /**
  * Should get the relevant permissions for each data field
  * Is provided with the data returned from getData if data is required to accurately describe permissions
  * */
  getPermissions: (data: Data, modelArgs?: Args, args?: AdditionalArgs[]) => Promise<FieldPermissions<Data, Role>> | FieldPermissions<Data, Role>;

  /**
   * Optional step to modify applied permissions after default role-based merging.
   * Receives the already-merged permissions (shorthands) and can override specific fields.
   */
  applyPermissions?: (data: Data, appliedPermissions: AppliedPermissions<Data>, roles: Role[], modelArgs?: Args, ...args: AdditionalArgs[]) => Promise<AppliedPermissions<Data>> | AppliedPermissions<Data>;

  /** Should get all valid actions to be sent to the client */
  getActions?: (modelArgs?: Args, ...args: AdditionalArgs[]) => Promise<Action[]> | Action[];

  /** Optional step to modify the actions based on the current application state.  Advised to provide an override for getActions -> otherwise, the `actions` argument will be an empty array. */
  applyActions?: (data: Data, appliedPermissions: AppliedPermissions<Data>, actions: Action[]) => Promise<Action[]> | Action[];
}

export class ControllerInstance<Data, Args, Action, Role, AdditionalArgs = null> {
  controller: Controller<Data, Args, Action, Role, AdditionalArgs>;

  constructor(controller: Controller<Data, Args, Action, Role, AdditionalArgs>) {
    this.controller = controller;
  }

  private defaultApplyPermissions(
    permissions: FieldPermissions<Data, Role>,
    roles: Role[]
  ): AppliedPermissions<Data> {
    return objectMap(permissions as object, (_key: string, value: unknown) => {
      const rolePermMap = value as RolePermissionsMap<Role>;
      const shorthands: PermissionShorthand[] = [];
      for (const role of roles) {
        const perms = rolePermMap.get(role);
        if (perms) {
          if (Array.isArray(perms)) {
            shorthands.push(permissionsToShorthand(perms));
          } else {
            shorthands.push(perms);
          }
        }
      }
      return mergeShorthandPermissions(...shorthands);
    }) as AppliedPermissions<Data>;
  }

  private defaultApplyActions(actions: Action[]): Action[] {
    return actions;
  }

  async handleRequest(args?: Args): Promise<ModelResponse<Data, Action>> {
    const additionalArgs = this.controller.getAdditionalArgs
      ? await this.controller.getAdditionalArgs(args)
      : null;

    const data = await this.controller.getData(args);
    const fetchedRoles = await this.controller.getClientRoles(args);
    const roles = this.controller.applyClientRoles
      ? await this.controller.applyClientRoles(data, fetchedRoles, args)
      : fetchedRoles;
    const permissions = await this.controller.getPermissions(data, args);

    const defaultApplied = this.defaultApplyPermissions(permissions, roles);
    const appliedPermissions = this.controller.applyPermissions
      ? await this.controller.applyPermissions(data, defaultApplied, roles, args)
      : defaultApplied;

    const actions = this.controller.getActions
      ? await this.controller.getActions(args)
      : [];

    const finalActions = this.controller.applyActions
      ? await this.controller.applyActions(data, appliedPermissions, actions)
      : this.defaultApplyActions(actions);

    const composite = {
      data: objectJoin(data as object, "value", appliedPermissions, "permissions"),
      actions: finalActions,
    } as ModelComposite<Data, Action>;

    return this.sanitize(composite);
  }

  sanitize(response: ModelComposite<Data, Action>): ModelResponse<Data, Action> {
    const { data, actions } = response;
    return {
      data: objectMap(data as object, (_key: string, objVal: unknown) => {
        const fv = objVal as FieldView;
        const permissions = expandPermissions(fv.permissions);
        const hasRead = permissions.includes("read");
        return {
          data: hasRead ? fv.value : null,
          permissions
        } as SanitizedField
      }),
      actions
    } as ModelResponse<Data, Action>
  }
}

// Serializable -> This is functionally a container that is used to provide the necessary data to the usePermissions hook to build a View object on the client.
export interface View<Data, Args, Action, Role> {
  endpoints: ModelAPIRequest<Data, Args>;
  // derive:  
}

