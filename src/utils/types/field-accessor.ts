import { Recursive } from "./recursive";

const ACCESSOR_PATH_NAME = "__path__";

export interface Accessible {
  [ACCESSOR_PATH_NAME]: string;
}

type AccessibleField<T> = T & Accessible;

export function makeStructureAccessible<
  T extends object,
  GuardedField,
  TargetField = GuardedField,
>(
  obj: T,
  guard: (value: unknown) => value is GuardedField,
  transform?: (value: GuardedField) => TargetField,
  parentPath: string = "",
): Accessor<T, TargetField> {
  const accessor: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = parentPath ? `${parentPath}.${key}` : key;
    if (guard(value)) {
      const leaf = transform ? transform(value) : value;
      accessor[key] = { ...leaf, __path__: currentPath };
    } else if (typeof value === "object" && value !== null) {
      accessor[key] = makeStructureAccessible(
        value,
        guard,
        transform,
        currentPath,
      );
    }
  }

  return accessor as Accessor<T, TargetField>;
}

export type Accessor<Base, TargetField> = Recursive<
  Base,
  AccessibleField<TargetField>
>;
