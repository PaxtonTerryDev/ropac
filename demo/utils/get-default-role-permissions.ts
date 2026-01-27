import { newRolePermissionsMap, RolePermissionsMap } from "@/lib/models";
import { Role } from "@/types/user";

export function getDefaultRolePermissions(): RolePermissionsMap<Role> {
  return newRolePermissionsMap(["admin", "CRUD"], ["team_lead", "RU"], ["employee", "R"])
}
