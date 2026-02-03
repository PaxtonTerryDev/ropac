import { Recursive } from "./recursive";

const ACCESSOR_PATH_NAME = "__path__";

export interface Accessible {
  [ACCESSOR_PATH_NAME]: string;
}

type AccessibleField<T> = T & Accessible;

function isAccessible(obj: unknown): obj is Accessible {
  const isValid = typeof obj === "object" && obj !== null && obj !== undefined;
  return isValid && obj.hasOwnProperty(ACCESSOR_PATH_NAME);
}

/** Creates an accessible field by providing an empty __path__ property.
 *
 * For obvious reasons, this should only be used on objects that do not natively have a __path__ property.
 * If you do decide to repurpose this field, ensure that it is of type string and will not be used further.
 */
export function createAccessibleField<T extends object>(
  obj: T,
): T & Accessible {
  if (isAccessible(obj)) {
    console.warn(
      "Object already contains a '__path__' property. Ensure this is desired behavior, as `createAccessibleField` will overwrite this property with an empty string",
    );
    if (typeof obj[ACCESSOR_PATH_NAME] !== "string") {
      throw new Error(
        "Object's `__path__` property is not of type `string`.  Cannot overwrite",
      );
    }
  }
  return {
    ...obj,
    __path__: "",
  };
}

/** Processor function that converts an object into an object into an object that can be turned into an accessor.
 *
 * Executes the  guard function to determine leaves -> these are the final fields that will become accessible.
 *
 * The guard function should differentiate the target nested type from the overall structure.
 */
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

/**
 * Allows typed access into individual object fields.
 *
 * Required to extend from the Recursive type -> the object must eventually result in type TargetField, which can be of any structure.
 */
export type Accessor<Base, TargetField> = Recursive<
  Base,
  AccessibleField<TargetField>
>;

export function createAccessor<Data extends object, AccessedField>(
  fields: Data,
  parentPath: string = "",
): Accessor<Data, AccessedField> {
  const accessor: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    const currentPath = parentPath ? `${parentPath}.${key}` : key;
    if (isAccessible(value)) {
      value[ACCESSOR_PATH_NAME] = currentPath;
      accessor[key] = value;
    } else if (typeof value === "object" && value !== null) {
      accessor[key] = createAccessor(value, currentPath);
    }
  }

  return accessor as Accessor<Data, AccessedField>;
}
