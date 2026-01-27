import { getActionsForRoles } from '../../../data/actions';
import { getUserRoles, users, updateUser } from '../../../data/users';
import { applySingleRolePermissionsMap, Model } from '../../../lib/models'
import { Action } from '../../../types/action'
import { FetchUserProfileArgs, Role, UserProfile } from '../../../types/user'
import { getDefaultRolePermissions } from '../../../utils/get-default-role-permissions';

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

    async updateData(data: Partial<UserProfile>, args?: FetchUserProfileArgs) {
        if (!args?.userId) {
            throw new Error("User ID required for update");
        }
        return updateUser(args.userId, data);
    },

    async getPermissions(data) {
        const defaultPermissions = getDefaultRolePermissions();
        return applySingleRolePermissionsMap(data, defaultPermissions);
    },

    applyPermissions(_data, appliedPermissions, roles) {
        const perms = appliedPermissions as Record<string, unknown>;

        if (!roles.includes('admin')) {
            const addr = perms.address as Record<string, unknown>;
            if (addr?.coordinates) {
                addr.coordinates = { lat: '', lng: '' };
            }
        }

        if (!roles.includes('admin') && !roles.includes('team_lead')) {
            perms.email = '';
            const addr = perms.address as Record<string, unknown>;
            if (addr) {
                addr.street = '';
            }
        }

        if (roles.includes('public') && roles.length === 1) {
            perms.name = 'R';
            perms.id = 'R';
            perms.email = '';
            perms.address = { street: '', city: '', country: '', coordinates: { lat: '', lng: '' } };
            perms.preferences = {
                theme: '',
                notifications: { email: '', sms: '', push: { enabled: '', frequency: '' } }
            };
        }

        return appliedPermissions;
    },

    getClientRoles(modelArgs?: FetchUserProfileArgs): Role[] {
        const viewerId = modelArgs?.viewerId ?? modelArgs?.userId;
        if (!viewerId) throw new Error("No viewerId or userId provided");
        try {
            return getUserRoles(viewerId);
        } catch {
            return ['public'];
        }
    },

    getActions(modelArgs?: FetchUserProfileArgs): Action[] {
        const roles = this.getClientRoles(modelArgs);
        return getActionsForRoles(roles);
    },
}

export { userModel }
