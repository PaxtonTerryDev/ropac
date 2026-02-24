import {
  expandPermissions,
  mergeShorthandPermissions,
  Permission,
  PermissionShorthand,
} from "./permissions.js";
import { ModelAPIRequest } from "./model-api-request.js";
import { MappedObject } from "./utils/types/mapped-object.js";
import { objectJoin, objectMap } from "./utils/object-operators.js";
import { SerializableProperty } from "./utils/types/primitive.js";
import { PermissionDeniedError } from "./errors.js";

function permissionsToShorthand(
  permissions: Permission[],
): PermissionShorthand {
  const map: Record<Permission, string> = {
    create: "C",
    read: "R",
    update: "U",
    delete: "D",
  };
  return permissions.map((p) => map[p]).join("") as PermissionShorthand;
}

type FieldView = {
  value: SerializableProperty;
  permissions: Permission[];
};

/** All keys of the provided base T with an associated value */
export type FieldValues<T> = MappedObject<T, SerializableProperty>;

/** A map of Roles correlated to their respective permissions.  Used mainly in FieldPermissions, to map all the permissions for a particular field. */
export type RolePermissionsMap<Role> = Map<
  Role,
  Permission[] | PermissionShorthand
>;

/**
 * A tuple type where index 0 is a role and index 1 is either an array of permissions, or a PermissionShorthand definition
 */
type RolePermissionMapDefinition<Role> = [
  Role,
  Permission[] | PermissionShorthand,
];

/**
 * Creates a new instance of a RolePermissionMap.
 * @param rolePermissions RolePermissionMapDefinition objects
 *
 * @example
 * const permissionMap = newRolePermissionMap([adminRole, "CRUD"], [userRole, "R"])
 * */
export function newRolePermissionsMap<Role>(
  ...rolePermissions: RolePermissionMapDefinition<Role>[]
): RolePermissionsMap<Role> {
  return new Map([...rolePermissions]);
}

/**
 * Applies a single RolePermissionMap to each key in the provided data object.
 */
export function applySingleRolePermissionsMap<BaseObj extends object, Role>(
  data: BaseObj,
  permissionMap: RolePermissionsMap<Role>,
): FieldPermissions<BaseObj, Role> {
  return objectMap(data, (_key, _value) => permissionMap);
}

/** All keys of the provided base T with an associated RolePermissionMap */
export type FieldPermissions<BaseObj, Role> = MappedObject<
  BaseObj,
  RolePermissionsMap<Role>
>;

export type AppliedPermissions<BaseObj> = MappedObject<
  BaseObj,
  Permission[] | PermissionShorthand
>;

export function updatePermissionField<T extends object>(
  permissions: T,
  path: string,
  value: Permission[] | PermissionShorthand,
): void {
  const keys = path.split(".");
  let current: Record<string, unknown> = permissions as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
}

export function updateRolePermission<R extends string>(
  rolePermissions: Record<R, Permission[] | PermissionShorthand>,
  role: R,
  value: Permission[] | PermissionShorthand,
): void {
  rolePermissions[role] = value;
}
/** All keys of the provided Base T with an associated FieldView object. Is the `data` property of the ModelResponse object */ type FieldViews<
  T,
> = MappedObject<T, FieldView>;
export interface ModelComposite<Data, Action> {
  data: FieldViews<Data>;
  actions: Action[];
}

export interface SanitizedField {
  data: unknown | unknown[];
  permissions: Permission[];
}

/** The cleaned ModelComposite object that contains only relevant field values and permissions */
export type SanitizedFieldViews<Data> = MappedObject<Data, SanitizedField>;

export interface ModelResponse<Data, Action> {
  data: SanitizedFieldViews<Data>;
  actions: Action[];
}

// TODO: We don't need this yet, but we should be able to cache this data in a redis or something.  That way we don't need to do so many db calls.

// Provide the definitions needed to create both ModelControllers and ModelViews.
export interface Model<Data, Args, Action, Role>
  extends
    Controller<Data, Args, Action, Role>,
    View<Data, Args, Action, Role> {}

export interface ControllerConfig {
  collectAllViolations?: boolean;
}

export class ModelInstance<Data, Args, Action, Role> {
  model: Model<Data, Args, Action, Role>;
  constructor(model: Model<Data, Args, Action, Role>) {
    this.model = model;
  }

  createController(config: ControllerConfig = {}): ControllerInstance<Data, Args, Action, Role> {
    const {
      getClientRoles,
      getData,
      updateData,
      getPermissions,
      applyPermissions,
      getActions,
      applyActions,
    } = this.model;
    return new ControllerInstance({
      getData,
      getClientRoles,
      getPermissions,
      updateData,
      ...(applyPermissions && { applyPermissions }),
      ...(getActions && { getActions }),
      ...(applyActions && { applyActions }),
    }, config);
  }

  createView(): View<Data, Args, Action, Role> {
    return { endpoints: this.model.endpoints };
  }
}

// Used on the server to fetch model data and permissions, and map them together.
// Responds to requests from a corresponding ModelView through the React hook.
export interface Controller<Data, Args, Action, Role> {
  /** Optionally get additional args for data and permission mapping. */
  // getAdditionalArgs?: (modelArgs?: Args) => Promise<AdditionalArgs> | AdditionalArgs;

  /** Should fetch the full data model values from storage */
  getData: (modelArgs?: Args) => Promise<Data> | Data;

  /** Should fetch an array of all roles the (accessing) client possesses. */
  getClientRoles: (modelArgs?: Args) => Promise<Role[]> | Role[];

  /** Should upsert data into storage, and return the complete structure */
  updateData(data: Partial<Data>, args?: Args): Promise<Data> | Data;

  /**
   * Should get the relevant permissions for each data field
   * Is provided with the data returned from getData if data is required to accurately describe permissions
   * */
  getPermissions: (
    data: Data,
    modelArgs?: Args,
  ) => Promise<FieldPermissions<Data, Role>> | FieldPermissions<Data, Role>;

  /**
   * Optional step to modify client roles before permissions are applied.
   * Receives the fetched roles and can add, remove, or replace them.
   */
  applyClientRoles?: (
    data: Data,
    roles: Role[],
    modelArgs?: Args,
  ) => Promise<Role[]> | Role[];

  /**
   * Optional step to modify applied permissions after default role-based merging.
   * Receives the already-merged permissions (shorthands) and can override specific fields.
   */
  applyPermissions?: (
    data: Data,
    appliedPermissions: AppliedPermissions<Data>,
    roles: Role[],
    modelArgs?: Args,
  ) => Promise<AppliedPermissions<Data>> | AppliedPermissions<Data>;

  /** Should get all valid actions to be sent to the client */
  getActions?: (modelArgs?: Args) => Promise<Action[]> | Action[];

  /** Optional step to modify the actions based on the current application state.  Advised to provide an override for getActions -> otherwise, the `actions` argument will be an empty array. */
  applyActions?: (
    data: Data,
    appliedPermissions: AppliedPermissions<Data>,
    actions: Action[],
  ) => Promise<Action[]> | Action[];
}

export class ControllerInstance<Data, Args, Action, Role> {
  controller: Controller<Data, Args, Action, Role>;
  config: ControllerConfig;

  constructor(controller: Controller<Data, Args, Action, Role>, config: ControllerConfig = {}) {
    this.controller = controller;
    this.config = config;
  }

  private methodDefaults = {
    applyPermissions: (
      permissions: FieldPermissions<Data, Role>,
      roles: Role[],
    ): AppliedPermissions<Data> => {
      return objectMap(
        permissions as object,
        (_key: string, value: unknown) => {
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
        },
      ) as AppliedPermissions<Data>;
    },
    applyActions: (actions: Action[]): Action[] => {
      return actions;
    },
  };

  async handleRequest(args?: Args): Promise<ModelResponse<Data, Action>> {
    const data = await this.controller.getData(args);

    const roles = await this.handleRoles(data, args);
    const appliedPermissions = await this.handlePermissions(data, roles, args);
    const appliedActions = await this.handleActions(
      data,
      appliedPermissions,
      args,
    );
    const composite = this.createModelComposite(
      data,
      appliedPermissions,
      appliedActions,
    );
    const response = this.createModelResponse(composite);

    return response;
  }

  private async handleRoles(data: Data, args?: Args): Promise<Role[]> {
    const fetchedRoles = await this.controller.getClientRoles(args);
    const roles = this.controller.applyClientRoles
      ? await this.controller.applyClientRoles(data, fetchedRoles, args)
      : fetchedRoles;

    return roles;
  }

  private async handlePermissions(
    data: Data,
    roles: Role[],
    args?: Args,
  ): Promise<AppliedPermissions<Data>> {
    const permissions = await this.controller.getPermissions(data, args);
    const defaultApplied = this.methodDefaults.applyPermissions(
      permissions,
      roles,
    );
    const appliedPermissions = this.controller.applyPermissions
      ? await this.controller.applyPermissions(
          data,
          defaultApplied,
          roles,
          args,
        )
      : defaultApplied;

    return appliedPermissions;
  }

  private async handleActions(
    data: Data,
    appliedPermissions: AppliedPermissions<Data>,
    args?: Args,
  ) {
    const actions = this.controller.getActions
      ? await this.controller.getActions(args)
      : [];

    const appliedActions = this.controller.applyActions
      ? await this.controller.applyActions(data, appliedPermissions, actions)
      : this.methodDefaults.applyActions(actions);

    return appliedActions;
  }

  private createModelComposite(
    data: Data,
    appliedPermissions: AppliedPermissions<Data>,
    appliedActions: Action[],
  ): ModelComposite<Data, Action> {
    // WARN: We are casting this -> need to refactor objectJoin to properly type output.
    const composite = {
      data: objectJoin(
        data as object,
        "value",
        appliedPermissions,
        "permissions",
      ),
      actions: appliedActions,
    } as ModelComposite<Data, Action>;

    return composite;
  }

  private createModelResponse(
    composite: ModelComposite<Data, Action>,
  ): ModelResponse<Data, Action> {
    return this.sanitize(composite);
  }

  async handleUpdate(
    updateData: Partial<Data>,
    args?: Args,
  ): Promise<ModelResponse<Data, Action>> {
    const currentData = await this.controller.getData(args);
    const roles = await this.handleRoles(currentData, args);
    const appliedPermissions = await this.handlePermissions(currentData, roles, args);

    this.validateUpdatePermissions(updateData, currentData, appliedPermissions);

    const updatedData = await this.controller.updateData(updateData, args);
    const updatedPermissions = await this.handlePermissions(
      updatedData,
      roles,
      args,
    );
    const updatedActions = await this.handleActions(
      updatedData,
      updatedPermissions,
      args,
    );
    const composite = this.createModelComposite(
      updatedData,
      updatedPermissions,
      updatedActions,
    );

    return this.createModelResponse(composite);
  }

  private validateUpdatePermissions(
    updateData: Partial<Data>,
    currentData: Data,
    appliedPermissions: AppliedPermissions<Data>,
  ): void {
    const collectAll = this.config.collectAllViolations !== false;
    const violations: string[] = [];
    this.collectPermissionViolations(updateData, currentData, appliedPermissions, "", violations, collectAll);
    if (violations.length > 0) {
      throw new PermissionDeniedError(violations);
    }
  }

  private collectPermissionViolations(
    updateData: Partial<Data>,
    currentData: Data,
    appliedPermissions: AppliedPermissions<Data>,
    parentPath: string,
    violations: string[],
    collectAll: boolean,
  ): void {
    for (const [key, newValue] of Object.entries(updateData as object)) {
      const currentPath = parentPath ? `${parentPath}.${key}` : key;
      const currentValue = (currentData as Record<string, unknown>)[key];
      const fieldPerms = (appliedPermissions as Record<string, unknown>)[key];

      if (fieldPerms === undefined) {
        if (!collectAll) throw new PermissionDeniedError([currentPath]);
        violations.push(currentPath);
        continue;
      }

      if (newValue !== null && typeof newValue === "object" && !Array.isArray(newValue)) {
        this.collectPermissionViolations(
          newValue,
          currentValue as Data,
          fieldPerms as AppliedPermissions<Data>,
          currentPath,
          violations,
          collectAll,
        );
      } else {
        const perms = expandPermissions(
          fieldPerms as Permission[] | PermissionShorthand,
        );
        let denied = false;
        if (newValue === null && currentValue !== null && currentValue !== undefined) {
          denied = !perms.includes("delete");
        } else if (newValue !== null && (currentValue === null || currentValue === undefined)) {
          denied = !perms.includes("create");
        } else {
          denied = !perms.includes("update");
        }
        if (denied) {
          if (!collectAll) throw new PermissionDeniedError([currentPath]);
          violations.push(currentPath);
        }
      }
    }
  }

  sanitize(
    response: ModelComposite<Data, Action>,
  ): ModelResponse<Data, Action> {
    const { data, actions } = response;
    const isFieldView = (v: unknown): v is FieldView =>
      !!v && typeof v === "object" && "value" in (v as object) && "permissions" in (v as object);
    return {
      data: objectMap(data as object, (_key: string, objVal: unknown) => {
        const fv = objVal as FieldView;
        const permissions = expandPermissions(fv.permissions);
        const hasRead = permissions.includes("read");
        return {
          data: hasRead ? fv.value : null,
          permissions,
        } as SanitizedField;
      }, isFieldView),
      actions,
    } as ModelResponse<Data, Action>;
  }
}

export interface ViewConfig {
  /**
   * Should the client update the ui state BEFORE receiving the update result?
   *
   * If true, it is recommended to also set `enforceClientPermissions` to true
   */
  optimisticUpdates?: boolean;
  /**
   * Should the client do a permission check before allowing a client update?
   *
   * Note: permission and security checks will always be enforced in the Model's `Controller` on the api.
   */
  enforceClientPermissions?: boolean;
}

// Serializable -> This is functionally a container that is used to provide the necessary data to the usePermissions hook to build a View object on the client.
export interface View<Data, Args, Action, Role> {
  endpoints: ModelAPIRequest<Data, Args>;
  config?: ViewConfig;
}
