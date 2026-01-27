import { mergeShorthandPermissions, PermissionShorthand } from "@/lib/permissions";
import { Role, UserProfile, UserRole } from "../types/user";


export const defaultRolePermissions: Record<Role, PermissionShorthand> = {
  "admin": "CRUD",
  "team_lead": "RU",
  "employee": "R",
  "public": "",
}


export const userRoles: UserRole[] = [
  { userId: "1", roles: ["admin", "employee"] },
  { userId: "2", roles: ["team_lead", "employee"] },
  { userId: "3", roles: ["public"] },
  { userId: "4", roles: ["team_lead", "employee"] },
];

export function getUserRoles(userId: string): Role[] {
  const userRoleAssignment = userRoles.find(ur => ur.userId === userId);
  if (!userRoleAssignment) throw new Error(`No Roles found for user: ${userId}`)
  return userRoleAssignment.roles;
}

export function getDefaultRolePermissions(userId: string) {
  try {
    const roles = getUserRoles(userId);
    const defaultPermissions = roles.map(r => defaultRolePermissions[r])
    const merged = mergeShorthandPermissions(...defaultPermissions);
    return merged;
  } catch {
    throw new Error("Could not fetch default role permissions");
  }
}

function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    const targetValue = target[key];
    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue as object, sourceValue as object) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }
  return result;
}

export function updateUser(userId: string, data: Partial<UserProfile>): UserProfile {
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) {
    throw new Error(`User not found: ${userId}`);
  }
  const updated = deepMerge(users[index], data);
  users[index] = updated;
  return updated;
}

export const users: UserProfile[] = [
  {
    id: "1",
    name: "Alice Johnson",
    email: "alice@example.com",
    address: {
      street: "123 Main St",
      city: "Seattle",
      country: "USA",
      coordinates: {
        lat: 47.6062,
        lng: -122.3321,
      },
    },
    preferences: {
      notifications: {
        email: true,
        sms: false,
        push: {
          enabled: true,
          frequency: "daily",
        },
      },
      theme: "dark",
    },
  },
  {
    id: "2",
    name: "Bob Smith",
    email: "bob@example.com",
    address: {
      street: "456 Oak Ave",
      city: "Portland",
      country: "USA",
      coordinates: {
        lat: 45.5152,
        lng: -122.6784,
      },
    },
    preferences: {
      notifications: {
        email: false,
        sms: true,
        push: {
          enabled: false,
          frequency: "weekly",
        },
      },
      theme: "light",
    },
  },
  {
    id: "3",
    name: "Carol Davis",
    email: "carol@example.com",
    address: {
      street: "789 Pine Rd",
      city: "Denver",
      country: "USA",
      coordinates: {
        lat: 39.7392,
        lng: -104.9903,
      },
    },
    preferences: {
      notifications: {
        email: true,
        sms: true,
        push: {
          enabled: true,
          frequency: "instant",
        },
      },
      theme: "dark",
    },
  },
  {
    id: "4",
    name: "Dan Miller",
    email: "dan@example.com",
    address: {
      street: "321 Elm Blvd",
      city: "Austin",
      country: "USA",
      coordinates: {
        lat: 30.2672,
        lng: -97.7431,
      },
    },
    preferences: {
      notifications: {
        email: false,
        sms: false,
        push: {
          enabled: true,
          frequency: "weekly",
        },
      },
      theme: "light",
    },
  },
];
