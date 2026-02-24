import { get, patch } from "./model-api-request.js";
import {
  ModelResponse,
  SanitizedField,
  SanitizedFieldViews,
  View,
} from "./models.js";
import { Permission } from "./permissions.js";
import { makeStructureAccessible } from "./utils/types/field-accessor.js";
import { useState, useEffect, useCallback, useRef } from "react";

export interface FieldLeaf<T = unknown> {
  value: T | null;
  permissions: Permission[];
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  readonly __path__: string;
}

export type FieldAccessor<Data> = {
  [K in keyof Data]: Data[K] extends unknown[]
    ? FieldLeaf<Data[K]>
    : Data[K] extends object
    ? FieldAccessor<Data[K]>
    : FieldLeaf<Data[K]>;
};

export type FieldUpdate<T = unknown> = readonly [FieldLeaf<T>, T];

function isSanitizedField(value: unknown): value is SanitizedField {
  return (
    !!value &&
    typeof value === "object" &&
    "data" in value &&
    "permissions" in value
  );
}

function toFieldLeaf(field: SanitizedField): Omit<FieldLeaf, "__path__"> {
  return {
    value: field.data,
    permissions: field.permissions,
    canCreate: field.permissions.includes("create"),
    canRead: field.permissions.includes("read"),
    canUpdate: field.permissions.includes("update"),
    canDelete: field.permissions.includes("delete"),
  };
}

function createFieldAccessor<Data>(
  fields: SanitizedFieldViews<Data>,
  parentPath: string = "",
): FieldAccessor<Data> {
  return makeStructureAccessible(
    fields as object,
    isSanitizedField,
    toFieldLeaf,
    parentPath,
  ) as unknown as FieldAccessor<Data>;
}

function applyUpdatesToFields<Data>(
  fields: FieldAccessor<Data>,
  updates: FieldUpdate[],
): FieldAccessor<Data> {
  const newFields = structuredClone(fields);

  for (const [field, newValue] of updates) {
    const path = field.__path__;
    const keys = path.split(".");
    let current: Record<string, unknown> = newFields as Record<string, unknown>;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]] as Record<string, unknown>;
    }

    const finalKey = keys[keys.length - 1];
    const target = current[finalKey];
    if (target && typeof target === "object" && "value" in target) {
      (target as FieldLeaf).value = newValue;
    }
  }

  return newFields;
}

export function buildUpdatePayload<Data>(
  updates: FieldUpdate[],
): Partial<Data> {
  const result: Record<string, unknown> = {};

  for (const [field, value] of updates) {
    const path = field.__path__;
    const keys = path.split(".");
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
  }

  return result as Partial<Data>;
}

interface PermissionsReturn<Data, Action> {
  response: ModelResponse<Data, Action> | undefined;
  fields: FieldAccessor<Data> | undefined;
  actions: Action[];
  isLoading: boolean;
  error: Error | undefined;
  update: <T>(...updates: FieldUpdate<T>[]) => void;
  flush: () => Promise<void>;
}

interface UsePermissionsProps<Data, Args, Action, Role> {
  view: View<Data, Args, Action, Role>;
  args?: Args;
}

export default function usePermissions<Data, Args, Action, Role>({
  view,
  args,
}: UsePermissionsProps<Data, Args, Action, Role>): PermissionsReturn<
  Data,
  Action
> {
  const [response, setResponse] = useState<
    ModelResponse<Data, Action> | undefined
  >();
  const [fields, setFields] = useState<FieldAccessor<Data> | undefined>();
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | undefined>();
  const pendingUpdates = useRef<FieldUpdate[]>([]);
  const fieldsRef = useRef(fields);

  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  const argsKey = JSON.stringify(args);
  const optimistic = view.config?.optimisticUpdates !== false;
  const enforcePermissions = view.config?.enforceClientPermissions === true;

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);

      try {
        const baseUrl = view.endpoints.get.url ?? view.endpoints.url;
        if (!baseUrl) {
          throw new Error("No URL defined in view endpoints");
        }

        const params = new URLSearchParams();
        const paramKeys = view.endpoints.get.params;
        if (args) {
          for (const [key, value] of Object.entries(args)) {
            if (value !== undefined && value !== null) {
              if (!paramKeys || paramKeys.includes(key as keyof Args)) {
                params.append(key, String(value));
              }
            }
          }
        }

        const queryString = params.toString();
        const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;

        const result = await get<Data, Action>(url, view.endpoints.headers);

        if (!cancelled && result) {
          setResponse(result);
          if (result.data) {
            setFields(createFieldAccessor(result.data));
          }
          setActions(result.actions ?? []);
          setError(undefined);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [argsKey, view.endpoints.get?.url, view.endpoints.url]);

  const update = useCallback(
    <T>(...updates: FieldUpdate<T>[]) => {
      if (enforcePermissions) {
        for (const [field] of updates) {
          if (!field.canUpdate) {
            console.warn(
              `Update blocked: no update permission for ${field.__path__}`,
            );
            return;
          }
        }
      }

      if (optimistic) {
        setFields((currentFields) => {
          if (!currentFields) return currentFields;
          return applyUpdatesToFields(currentFields, updates);
        });
      }

      for (const u of updates) {
        const existingIdx = pendingUpdates.current.findIndex(
          ([f]) => f.__path__ === u[0].__path__,
        );
        if (existingIdx >= 0) {
          pendingUpdates.current[existingIdx] = u;
        } else {
          pendingUpdates.current.push(u);
        }
      }
    },
    [optimistic, enforcePermissions],
  );

  const push = useCallback(async () => {
    if (pendingUpdates.current.length === 0) return;

    const snapshotFields = fieldsRef.current;
    const payload = buildUpdatePayload<Data>(pendingUpdates.current);
    pendingUpdates.current = [];

    const baseUrl = view.endpoints.patch?.url ?? view.endpoints.url;
    if (!baseUrl) {
      throw new Error("No URL defined in view endpoints for PATCH");
    }

    const params = new URLSearchParams();
    if (args) {
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
    }

    const queryString = params.toString();
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;

    try {
      const result = await patch<Data, Action>(
        url,
        payload,
        view.endpoints.headers,
      );
      if (result) {
        setResponse(result);
        if (result.data) {
          setFields(createFieldAccessor(result.data));
        }
        setActions(result.actions ?? []);
        setError(undefined);
      }
    } catch (err) {
      if (snapshotFields) {
        setFields(snapshotFields);
      }
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [view.endpoints, args]);

  return { response, fields, actions, isLoading, error, update, flush: push };
}
