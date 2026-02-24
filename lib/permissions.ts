export type Permission = "create" | "read" | "update" | "delete";
export type PermissionShorthand = `${"C" | ""}${"R" | ""}${"U" | ""}${"D" | ""}`

export function mergeShorthandPermissions(...shorthands: PermissionShorthand[]): PermissionShorthand {
  const has = { C: false, R: false, U: false, D: false };
  for (const sh of shorthands) {
    for (const char of sh) {
      has[char as keyof typeof has] = true;
    }
  }
  return `${has.C ? "C" : ""}${has.R ? "R" : ""}${has.U ? "U" : ""}${has.D ? "D" : ""}` as PermissionShorthand;
}


export function parseShorthandPermissions(sh: PermissionShorthand): Permission[] {
  const p: Permission[] = [];
  const map = {
    "C": "create",
    "R": "read",
    "U": "update",
    "D": "delete"
  } as const;

  for (const char of sh) {
    p.push(map[char as keyof typeof map]);
  }
  return p;
}

export function expandPermissions(permissions: Permission[] | PermissionShorthand): Permission[] {
  if (Array.isArray(permissions)) return permissions;
  else return parseShorthandPermissions(permissions);
}
