export class PermissionDeniedError extends Error {
  violations: string[];
  constructor(violations: string[]) {
    super(`Permission denied: ${violations.join(", ")}`);
    this.name = "PermissionDeniedError";
    this.violations = violations;
  }
}
