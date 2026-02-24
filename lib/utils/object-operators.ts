import { MappedObject } from "./types/mapped-object";

// WARN: We are using these alot, but they are relying heavily on assertions, and we are losing a lot of compiler safety.  Need a better way to do this, or do it more safely.``
export function objectMap<BaseObj extends object, T>(
  obj: BaseObj,
  callback: (key: string, value: unknown) => T,
  isLeaf: (value: unknown) => boolean = () => false,
): MappedObject<BaseObj, T> {
  const newObj: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const value = (obj as Record<string, unknown>)[key];
    if (isLeaf(value)) {
      newObj[key] = callback(key, value);
    } else if (isObject(value)) {
      newObj[key] = objectMap(value as object, callback, isLeaf);
    } else {
      newObj[key] = callback(key, value);
    }
  }
  return newObj as MappedObject<BaseObj, T>;
}

type JoinedObjects<
  Obj1 extends object,
  Obj2 extends object,
  K1 extends string,
  K2 extends string
> = {
  [P in keyof Obj1 & keyof Obj2]: Obj1[P] extends object
    ? Obj2[P] extends object
      ? JoinedObjects<Obj1[P], Obj2[P], K1, K2>
      : Record<K1, Obj1[P]> & Record<K2, Obj2[P]>
    : Record<K1, Obj1[P]> & Record<K2, Obj2[P]>
};

export function objectJoin<
  Obj1 extends object,
  Obj2 extends object,
  K1 extends string,
  K2 extends string
>(
  obj1: Obj1,
  obj1Name: K1,
  obj2: Obj2,
  obj2Name: K2
): JoinedObjects<Obj1, Obj2, K1, K2> {
  const newObj: Record<string, unknown> = {};
  for (const key of Object.keys(obj1)) {
    const val1 = (obj1 as Record<string, unknown>)[key];
    const val2 = (obj2 as Record<string, unknown>)[key];
    if (isObject(val1) && isObject(val2)) {
      newObj[key] = objectJoin(val1, obj1Name, val2, obj2Name);
    } else {
      newObj[key] = { [obj1Name]: val1, [obj2Name]: val2 };
    }
  }
  return newObj as JoinedObjects<Obj1, Obj2, K1, K2>;
}

export function isObject(value: unknown): value is Object {
  return (
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Map) &&
    value !== null
  );
}
