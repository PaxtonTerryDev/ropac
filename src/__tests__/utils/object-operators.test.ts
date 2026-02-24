import { describe, it, expect } from "vitest";
import { objectMap, objectJoin, isObject } from "../../utils/object-operators.js";

describe("isObject", () => {
  it("returns true for plain objects", () => {
    expect(isObject({ a: 1 })).toBe(true);
  });

  it("returns false for arrays", () => {
    expect(isObject([1, 2, 3])).toBe(false);
  });

  it("returns false for Maps", () => {
    expect(isObject(new Map())).toBe(false);
  });

  it("returns false for null", () => {
    expect(isObject(null)).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isObject("string")).toBe(false);
    expect(isObject(42)).toBe(false);
    expect(isObject(true)).toBe(false);
  });
});

describe("objectMap", () => {
  it("maps values in a flat object", () => {
    const obj = { a: 1, b: 2 };
    const result = objectMap(obj, (_key, value) => (value as number) * 2);
    expect(result).toEqual({ a: 2, b: 4 });
  });

  it("recurses into nested plain objects", () => {
    const obj = { outer: { inner: 10 } };
    const result = objectMap(obj, (_key, value) => (value as number) + 1);
    expect(result).toEqual({ outer: { inner: 11 } });
  });

  it("treats arrays as leaf values and passes them to the callback", () => {
    const obj = { tags: ["a", "b"] };
    const result = objectMap(obj, (_key, value) => value);
    expect(result).toEqual({ tags: ["a", "b"] });
  });

  it("applies isLeaf guard to stop recursion", () => {
    const obj = { field: { value: "hello", permissions: "CRUD" } };
    const isLeaf = (v: unknown) =>
      !!v &&
      typeof v === "object" &&
      "value" in (v as object) &&
      "permissions" in (v as object);
    const result = objectMap(obj, (_key, value) => value, isLeaf);
    expect(result).toEqual({ field: { value: "hello", permissions: "CRUD" } });
  });
});

describe("objectJoin", () => {
  it("joins two flat objects into value/permissions pairs", () => {
    const data = { name: "Alice", age: 30 };
    const perms = { name: "CRUD", age: "R" };
    const result = objectJoin(data, "value", perms, "permissions");
    expect(result).toEqual({
      name: { value: "Alice", permissions: "CRUD" },
      age: { value: 30, permissions: "R" },
    });
  });

  it("recurses into nested objects", () => {
    const data = { profile: { bio: "hello" } };
    const perms = { profile: { bio: "RU" } };
    const result = objectJoin(data, "value", perms, "permissions");
    expect(result).toEqual({
      profile: {
        bio: { value: "hello", permissions: "RU" },
      },
    });
  });

  it("treats array values as leaves", () => {
    const data = { tags: ["a", "b"] };
    const perms = { tags: "R" };
    const result = objectJoin(data, "value", perms, "permissions");
    expect(result).toEqual({
      tags: { value: ["a", "b"], permissions: "R" },
    });
  });
});
