import { describe, it, expect, vi } from "vitest";
import { ControllerInstance } from "../models.js";
import { PermissionDeniedError } from "../errors.js";
import type { Controller, FieldPermissions } from "../models.js";
import type { PermissionShorthand } from "../permissions.js";

type Role = "admin" | "user";

type FlatData = {
  name: string;
  age: number;
};

type NullableData = {
  name: string | null;
  bio: string | null;
};

type NestedData = {
  profile: {
    bio: string;
    avatar: string;
  };
};

type Action = "edit" | "delete";

function makePerms<D extends object>(
  data: D,
  shorthand: PermissionShorthand,
): FieldPermissions<D, Role> {
  const m = new Map<Role, PermissionShorthand>([
    ["admin", shorthand],
  ]);
  return Object.fromEntries(
    Object.keys(data).map((k) => [k, m]),
  ) as FieldPermissions<D, Role>;
}

describe("ControllerInstance.handleRequest", () => {
  it("fetches data, applies permissions, and returns a ModelResponse", async () => {
    const data: FlatData = { name: "Alice", age: 30 };
    const controller: Controller<FlatData, undefined, Action, Role> = {
      getData: vi.fn().mockResolvedValue(data),
      getClientRoles: vi.fn().mockResolvedValue(["admin"] as Role[]),
      updateData: vi.fn(),
      getPermissions: vi.fn().mockResolvedValue(makePerms(data, "CRUD")),
    };

    const instance = new ControllerInstance(controller);
    const response = await instance.handleRequest();

    expect(response.data.name.data).toBe("Alice");
    expect(response.data.age.data).toBe(30);
    expect(response.data.name.permissions).toContain("read");
  });

  it("nulls out values for fields where the client lacks read permission", async () => {
    const data: FlatData = { name: "Alice", age: 30 };
    const perms: FieldPermissions<FlatData, Role> = {
      name: new Map([["admin", "CRUD" as PermissionShorthand]]),
      age: new Map([["admin", "CUD" as PermissionShorthand]]),
    };
    const controller: Controller<FlatData, undefined, Action, Role> = {
      getData: vi.fn().mockResolvedValue(data),
      getClientRoles: vi.fn().mockResolvedValue(["admin"] as Role[]),
      updateData: vi.fn(),
      getPermissions: vi.fn().mockResolvedValue(perms),
    };

    const instance = new ControllerInstance(controller);
    const response = await instance.handleRequest();

    expect(response.data.name.data).toBe("Alice");
    expect(response.data.age.data).toBeNull();
    expect(response.data.age.permissions).not.toContain("read");
  });

  it("merges permissions across multiple roles", async () => {
    const data: FlatData = { name: "Alice", age: 30 };
    const perms: FieldPermissions<FlatData, Role> = {
      name: new Map<Role, PermissionShorthand>([
        ["admin", "CR"],
        ["user", "U"],
      ]),
      age: new Map<Role, PermissionShorthand>([["admin", "R"]]),
    };
    const controller: Controller<FlatData, undefined, Action, Role> = {
      getData: vi.fn().mockResolvedValue(data),
      getClientRoles: vi.fn().mockResolvedValue(["admin", "user"] as Role[]),
      updateData: vi.fn(),
      getPermissions: vi.fn().mockResolvedValue(perms),
    };

    const instance = new ControllerInstance(controller);
    const response = await instance.handleRequest();

    expect(response.data.name.permissions).toContain("create");
    expect(response.data.name.permissions).toContain("read");
    expect(response.data.name.permissions).toContain("update");
    expect(response.data.name.permissions).not.toContain("delete");
  });

  it("invokes applyClientRoles when defined", async () => {
    const data: FlatData = { name: "Alice", age: 30 };
    const controller: Controller<FlatData, undefined, Action, Role> = {
      getData: vi.fn().mockResolvedValue(data),
      getClientRoles: vi.fn().mockResolvedValue([] as Role[]),
      updateData: vi.fn(),
      getPermissions: vi.fn().mockResolvedValue(makePerms(data, "CRUD")),
      applyClientRoles: vi.fn().mockResolvedValue(["admin"] as Role[]),
    };

    const instance = new ControllerInstance(controller);
    await instance.handleRequest();

    expect(controller.applyClientRoles).toHaveBeenCalled();
    expect(controller.getPermissions).toHaveBeenCalledWith(data, undefined);
  });

  it("invokes applyPermissions when defined and passes the result through", async () => {
    const data: FlatData = { name: "Alice", age: 30 };
    const overriddenPerms = { name: "R" as PermissionShorthand, age: "R" as PermissionShorthand };
    const controller: Controller<FlatData, undefined, Action, Role> = {
      getData: vi.fn().mockResolvedValue(data),
      getClientRoles: vi.fn().mockResolvedValue(["admin"] as Role[]),
      updateData: vi.fn(),
      getPermissions: vi.fn().mockResolvedValue(makePerms(data, "CRUD")),
      applyPermissions: vi.fn().mockResolvedValue(overriddenPerms),
    };

    const instance = new ControllerInstance(controller);
    const response = await instance.handleRequest();

    expect(response.data.name.permissions).toEqual(["read"]);
    expect(response.data.age.permissions).toEqual(["read"]);
  });

  it("returns actions from getActions", async () => {
    const data: FlatData = { name: "Alice", age: 30 };
    const controller: Controller<FlatData, undefined, Action, Role> = {
      getData: vi.fn().mockResolvedValue(data),
      getClientRoles: vi.fn().mockResolvedValue(["admin"] as Role[]),
      updateData: vi.fn(),
      getPermissions: vi.fn().mockResolvedValue(makePerms(data, "CRUD")),
      getActions: vi.fn().mockResolvedValue(["edit", "delete"] as Action[]),
    };

    const instance = new ControllerInstance(controller);
    const response = await instance.handleRequest();

    expect(response.actions).toEqual(["edit", "delete"]);
  });

  it("filters actions through applyActions when defined", async () => {
    const data: FlatData = { name: "Alice", age: 30 };
    const controller: Controller<FlatData, undefined, Action, Role> = {
      getData: vi.fn().mockResolvedValue(data),
      getClientRoles: vi.fn().mockResolvedValue(["user"] as Role[]),
      updateData: vi.fn(),
      getPermissions: vi.fn().mockResolvedValue(makePerms(data, "CRUD")),
      getActions: vi.fn().mockResolvedValue(["edit", "delete"] as Action[]),
      applyActions: vi.fn().mockResolvedValue(["edit"] as Action[]),
    };

    const instance = new ControllerInstance(controller);
    const response = await instance.handleRequest();

    expect(response.actions).toEqual(["edit"]);
  });
});

describe("ControllerInstance.handleUpdate", () => {
  it("applies the update when the client has update permission", async () => {
    const currentData: FlatData = { name: "Alice", age: 30 };
    const updatedData: FlatData = { name: "Bob", age: 30 };
    const controller: Controller<FlatData, undefined, Action, Role> = {
      getData: vi.fn().mockResolvedValue(currentData),
      getClientRoles: vi.fn().mockResolvedValue(["admin"] as Role[]),
      updateData: vi.fn().mockResolvedValue(updatedData),
      getPermissions: vi.fn().mockResolvedValue(makePerms(currentData, "CRUD")),
    };

    const instance = new ControllerInstance(controller);
    const response = await instance.handleUpdate({ name: "Bob" });

    expect(response.data.name.data).toBe("Bob");
    expect(controller.updateData).toHaveBeenCalledWith({ name: "Bob" }, undefined);
  });

  it("throws PermissionDeniedError when client lacks update permission", async () => {
    const data: FlatData = { name: "Alice", age: 30 };
    const controller: Controller<FlatData, undefined, Action, Role> = {
      getData: vi.fn().mockResolvedValue(data),
      getClientRoles: vi.fn().mockResolvedValue(["user"] as Role[]),
      updateData: vi.fn(),
      getPermissions: vi.fn().mockResolvedValue(makePerms(data, "R")),
    };

    const instance = new ControllerInstance(controller);
    await expect(instance.handleUpdate({ name: "Bob" })).rejects.toThrow(PermissionDeniedError);
    expect(controller.updateData).not.toHaveBeenCalled();
  });

  it("requires create permission when setting a null field to a value", async () => {
    const currentData: NullableData = { name: null, bio: "existing" };
    const perms: FieldPermissions<NullableData, Role> = {
      name: new Map([["admin", "RU" as PermissionShorthand]]),
      bio: new Map([["admin", "CRUD" as PermissionShorthand]]),
    };
    const controller: Controller<NullableData, undefined, Action, Role> = {
      getData: vi.fn().mockResolvedValue(currentData),
      getClientRoles: vi.fn().mockResolvedValue(["admin"] as Role[]),
      updateData: vi.fn(),
      getPermissions: vi.fn().mockResolvedValue(perms),
    };

    const instance = new ControllerInstance(controller);
    await expect(instance.handleUpdate({ name: "Alice" })).rejects.toThrow(PermissionDeniedError);
  });

  it("requires delete permission when setting a field to null", async () => {
    const currentData: NullableData = { name: "Alice", bio: "existing" };
    const perms: FieldPermissions<NullableData, Role> = {
      name: new Map([["admin", "RU" as PermissionShorthand]]),
      bio: new Map([["admin", "CRUD" as PermissionShorthand]]),
    };
    const controller: Controller<NullableData, undefined, Action, Role> = {
      getData: vi.fn().mockResolvedValue(currentData),
      getClientRoles: vi.fn().mockResolvedValue(["admin"] as Role[]),
      updateData: vi.fn(),
      getPermissions: vi.fn().mockResolvedValue(perms),
    };

    const instance = new ControllerInstance(controller);
    await expect(instance.handleUpdate({ name: null })).rejects.toThrow(PermissionDeniedError);
  });

  it("validates permissions on nested object fields", async () => {
    const currentData: NestedData = { profile: { bio: "hello", avatar: "img.png" } };
    const perms: FieldPermissions<NestedData, Role> = {
      profile: {
        bio: new Map([["admin", "CRUD" as PermissionShorthand]]),
        avatar: new Map([["admin", "R" as PermissionShorthand]]),
      } as unknown as Map<Role, PermissionShorthand>,
    };
    const controller: Controller<NestedData, undefined, Action, Role> = {
      getData: vi.fn().mockResolvedValue(currentData),
      getClientRoles: vi.fn().mockResolvedValue(["admin"] as Role[]),
      updateData: vi.fn(),
      getPermissions: vi.fn().mockResolvedValue(perms),
    };

    const instance = new ControllerInstance(controller);
    await expect(
      instance.handleUpdate({ profile: { avatar: "new.png" } } as Partial<NestedData>),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("treats an unknown key in updateData as a permission denied violation", async () => {
    const data: FlatData = { name: "Alice", age: 30 };
    const controller: Controller<FlatData, undefined, Action, Role> = {
      getData: vi.fn().mockResolvedValue(data),
      getClientRoles: vi.fn().mockResolvedValue(["admin"] as Role[]),
      updateData: vi.fn(),
      getPermissions: vi.fn().mockResolvedValue(makePerms(data, "CRUD")),
    };

    const instance = new ControllerInstance(controller);
    await expect(
      instance.handleUpdate({ unknownField: "value" } as unknown as Partial<FlatData>),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("collects all violations by default (collectAllViolations unset)", async () => {
    const data: FlatData = { name: "Alice", age: 30 };
    const controller: Controller<FlatData, undefined, Action, Role> = {
      getData: vi.fn().mockResolvedValue(data),
      getClientRoles: vi.fn().mockResolvedValue(["user"] as Role[]),
      updateData: vi.fn(),
      getPermissions: vi.fn().mockResolvedValue(makePerms(data, "R")),
    };

    const instance = new ControllerInstance(controller);
    const err = await instance.handleUpdate({ name: "Bob", age: 25 }).catch((e) => e);

    expect(err).toBeInstanceOf(PermissionDeniedError);
    expect(err.violations).toHaveLength(2);
    expect(err.violations).toContain("name");
    expect(err.violations).toContain("age");
  });

  it("throws on first violation when collectAllViolations is false", async () => {
    const data: FlatData = { name: "Alice", age: 30 };
    const controller: Controller<FlatData, undefined, Action, Role> = {
      getData: vi.fn().mockResolvedValue(data),
      getClientRoles: vi.fn().mockResolvedValue(["user"] as Role[]),
      updateData: vi.fn(),
      getPermissions: vi.fn().mockResolvedValue(makePerms(data, "R")),
    };

    const instance = new ControllerInstance(controller, { collectAllViolations: false });
    const err = await instance.handleUpdate({ name: "Bob", age: 25 }).catch((e) => e);

    expect(err).toBeInstanceOf(PermissionDeniedError);
    expect(err.violations).toHaveLength(1);
  });
});

describe("ControllerInstance.sanitize", () => {
  it("includes all permissions in the response", async () => {
    const data: FlatData = { name: "Alice", age: 30 };
    const controller: Controller<FlatData, undefined, Action, Role> = {
      getData: vi.fn().mockResolvedValue(data),
      getClientRoles: vi.fn().mockResolvedValue(["admin"] as Role[]),
      updateData: vi.fn(),
      getPermissions: vi.fn().mockResolvedValue(makePerms(data, "CRUD")),
    };

    const instance = new ControllerInstance(controller);
    const response = await instance.handleRequest();

    expect(response.data.name.permissions).toEqual(["create", "read", "update", "delete"]);
  });

  it("returns null for the value when the field has no read permission", async () => {
    const data: FlatData = { name: "Alice", age: 30 };
    const perms: FieldPermissions<FlatData, Role> = {
      name: new Map([["admin", "CRUD" as PermissionShorthand]]),
      age: new Map([["admin", "" as PermissionShorthand]]),
    };
    const controller: Controller<FlatData, undefined, Action, Role> = {
      getData: vi.fn().mockResolvedValue(data),
      getClientRoles: vi.fn().mockResolvedValue(["admin"] as Role[]),
      updateData: vi.fn(),
      getPermissions: vi.fn().mockResolvedValue(perms),
    };

    const instance = new ControllerInstance(controller);
    const response = await instance.handleRequest();

    expect(response.data.age.data).toBeNull();
    expect(response.data.name.data).toBe("Alice");
  });
});
