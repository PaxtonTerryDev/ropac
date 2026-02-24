import { describe, it, expect } from "vitest";
import { makeStructureAccessible } from "../../utils/types/field-accessor.js";

type Leaf = { data: unknown; permissions: string[] };

function isLeaf(v: unknown): v is Leaf {
  return !!v && typeof v === "object" && "data" in (v as object) && "permissions" in (v as object);
}

describe("makeStructureAccessible", () => {
  it("attaches __path__ to top-level leaf nodes", () => {
    const obj = {
      name: { data: "Alice", permissions: ["read"] },
    };
    const result = makeStructureAccessible(obj, isLeaf);
    expect((result.name as Leaf & { __path__: string }).__path__).toBe("name");
  });

  it("uses dot notation for nested paths", () => {
    const obj = {
      profile: {
        bio: { data: "hello", permissions: ["read"] },
      },
    };
    const result = makeStructureAccessible(obj, isLeaf);
    const bio = (result as Record<string, Record<string, unknown>>).profile.bio as Leaf & { __path__: string };
    expect(bio.__path__).toBe("profile.bio");
  });

  it("applies the transform function to leaf nodes", () => {
    const obj = {
      name: { data: "Alice", permissions: ["read"] },
    };
    const transform = (v: Leaf) => ({ value: v.data, canRead: v.permissions.includes("read") });
    const result = makeStructureAccessible(obj, isLeaf, transform);
    const name = (result as Record<string, unknown>).name as ReturnType<typeof transform> & { __path__: string };
    expect(name.value).toBe("Alice");
    expect(name.canRead).toBe(true);
    expect(name.__path__).toBe("name");
  });

  it("uses a parentPath prefix for nested paths", () => {
    const obj = {
      name: { data: "Alice", permissions: ["read"] },
    };
    const result = makeStructureAccessible(obj, isLeaf, undefined, "root");
    const name = (result as Record<string, unknown>).name as Leaf & { __path__: string };
    expect(name.__path__).toBe("root.name");
  });

  it("recurses into nested non-leaf objects", () => {
    const obj = {
      outer: {
        inner: { data: 42, permissions: ["read", "update"] },
      },
    };
    const result = makeStructureAccessible(obj, isLeaf);
    const inner = (result as Record<string, Record<string, unknown>>).outer.inner as Leaf & { __path__: string };
    expect(inner.__path__).toBe("outer.inner");
    expect(inner.data).toBe(42);
  });
});
