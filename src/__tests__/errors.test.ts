import { describe, it, expect } from "vitest";
import { PermissionDeniedError } from "../errors.js";

describe("PermissionDeniedError", () => {
  it("is an instance of Error", () => {
    const err = new PermissionDeniedError(["field1"]);
    expect(err).toBeInstanceOf(Error);
  });

  it("sets the name to PermissionDeniedError", () => {
    const err = new PermissionDeniedError(["field1"]);
    expect(err.name).toBe("PermissionDeniedError");
  });

  it("stores violations array", () => {
    const violations = ["user.name", "user.email"];
    const err = new PermissionDeniedError(violations);
    expect(err.violations).toEqual(violations);
  });

  it("formats message with all violations", () => {
    const err = new PermissionDeniedError(["user.name", "user.email"]);
    expect(err.message).toBe("Permission denied: user.name, user.email");
  });

  it("formats message with a single violation", () => {
    const err = new PermissionDeniedError(["age"]);
    expect(err.message).toBe("Permission denied: age");
  });
});
