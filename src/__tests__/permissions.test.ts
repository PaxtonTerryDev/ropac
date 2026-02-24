import { describe, it, expect } from "vitest";
import {
  mergeShorthandPermissions,
  parseShorthandPermissions,
  expandPermissions,
} from "../permissions.js";
import type { PermissionShorthand } from "../permissions.js";

describe("mergeShorthandPermissions", () => {
  it("merges non-overlapping shorthands", () => {
    expect(mergeShorthandPermissions("CR" as PermissionShorthand, "U" as PermissionShorthand)).toBe("CRU");
  });

  it("deduplicates overlapping permissions", () => {
    expect(mergeShorthandPermissions("CR" as PermissionShorthand, "CR" as PermissionShorthand)).toBe("CR");
  });

  it("returns empty string when no shorthands given", () => {
    expect(mergeShorthandPermissions()).toBe("");
  });

  it("returns CRUD when all permissions provided across inputs", () => {
    expect(mergeShorthandPermissions("CR" as PermissionShorthand, "UD" as PermissionShorthand)).toBe("CRUD");
  });

  it("preserves CRUD ordering in output", () => {
    expect(mergeShorthandPermissions("DU" as PermissionShorthand, "RC" as PermissionShorthand)).toBe("CRUD");
  });

  it("handles a single full CRUD shorthand", () => {
    expect(mergeShorthandPermissions("CRUD" as PermissionShorthand)).toBe("CRUD");
  });
});

describe("parseShorthandPermissions", () => {
  it("parses CRUD into all four permissions", () => {
    expect(parseShorthandPermissions("CRUD" as PermissionShorthand)).toEqual([
      "create",
      "read",
      "update",
      "delete",
    ]);
  });

  it("parses R into read only", () => {
    expect(parseShorthandPermissions("R" as PermissionShorthand)).toEqual(["read"]);
  });

  it("parses CU into create and update", () => {
    expect(parseShorthandPermissions("CU" as PermissionShorthand)).toEqual(["create", "update"]);
  });

  it("returns empty array for empty shorthand", () => {
    expect(parseShorthandPermissions("" as PermissionShorthand)).toEqual([]);
  });
});

describe("expandPermissions", () => {
  it("returns the array as-is when given a Permission array", () => {
    const perms = ["read", "update"] as const;
    expect(expandPermissions([...perms])).toEqual(["read", "update"]);
  });

  it("parses a shorthand string into a Permission array", () => {
    expect(expandPermissions("RU" as PermissionShorthand)).toEqual(["read", "update"]);
  });

  it("handles CRUD shorthand", () => {
    expect(expandPermissions("CRUD" as PermissionShorthand)).toEqual([
      "create",
      "read",
      "update",
      "delete",
    ]);
  });

  it("handles empty shorthand", () => {
    expect(expandPermissions("" as PermissionShorthand)).toEqual([]);
  });
});
