import { users, userRoles } from '@/data/users';
import { applySingleRolePermissionsMap, FieldPermissions, Model, newRolePermissionsMap } from '@/lib/models'
import { Action } from '@/types/action'
import { FetchUserProfileArgs, Role, UserProfile } from '@/types/user'
import { getDefaultRolePermissions } from '@/utils/get-default-role-permissions';

const userModel: Model<UserProfile, FetchUserProfileArgs, Action, Role> = {
  endpoints: {
    url: "/api/user",
    get: {},
    patch: {},
  },

  async getData(modelArgs) {
    const user = users.find(u => u.id === modelArgs?.userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  },

  async getPermissions(data) {
    const defaultPermissions = getDefaultRolePermissions();
    return applySingleRolePermissionsMap(data, defaultPermissions);
  },
}

export { userModel }
