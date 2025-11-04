import { ManagerRepository } from "./manager.repository";
import {
  hashPassword,
  comparePassword,
  generatePassword
} from '../../shared/utils/password.utils';
import { User, RoleType } from "../auth/auth.model";

import { generateOtp } from '../../shared/utils/generateOtp.utils';
import { sendEmail, sendWelcomeEmail, sendOtpEmail, sendSuperAdminInviteEmail, sendAdminInviteEmail } from '../../shared/utils/sendEmail';
import { Permission } from '../../shared/permissions/permissions';


import { OtpChannel } from "./manager.model";

export class ManagerService{
    private repo: ManagerRepository;

    constructor(){
        this.repo = new ManagerRepository();
    }

    public async getRolesPermission(): Promise<any>{
        const result = await this.repo.getAllRolePermission();
        return result;
    }
  
    async createSuperAdmin(email: string): Promise<any> {   

        const existingEmail = await this.repo.findUserByEmail(email);
        if (existingEmail) throw { statusCode: 400, message: 'Cet email est déjà utilisé' };
   
        const password = generatePassword();
        const hashedPassword = await hashPassword(password);

        const role_id = await this.repo.getOrCreateRole(RoleType.SUPER_ADMIN, 'Administrateur principal with all permissions');
   
        const superAdminPermissions = [
            Permission.PROPERTIES_CREATE,
            Permission.PROPERTIES_READ_ALL,
            Permission.PROPERTIES_UPDATE_OWN,
            Permission.PROPERTIES_UPDATE_ANY,
            Permission.PROPERTIES_DELETE,
            Permission.PROPERTIES_MODERATE,
            Permission.USERS_READ_OWN,
            Permission.USERS_UPDATE_OWN,
            Permission.USERS_READ_ALL,
            Permission.USERS_UPDATE_ANY,
            Permission.USERS_DELETE,
            Permission.BOOKINGS_CREATE,
            Permission.BOOKINGS_READ_OWN,
            Permission.BOOKINGS_READ_ALL,
            Permission.BOOKINGS_CANCEL,
            Permission.ADMIN_ACCESS,
            Permission.ADMIN_MODERATE,
            Permission.ADMIN_SETTINGS,
        ];
   
        for (const permission of superAdminPermissions) {
           const permission_id = await this.repo.getOrCreatePermission(permission);
           await this.repo.linkRoleToPermission(role_id, permission_id);
        }
   
        const user = await this.repo.createUserWithRole(email, hashedPassword, role_id);
        await this.repo.createUserProfile(user.id, "super_admin", "super_admin");
        await sendSuperAdminInviteEmail(email, password);
        return user;
    }

    async createAdmin(email: string): Promise<any> {   

        const existingEmail = await this.repo.findUserByEmail(email);
        if (existingEmail) throw { statusCode: 400, message: 'Cet email est déjà utilisé' };
   
        const password = generatePassword();
        const hashedPassword = await hashPassword(password);

        const role_id = await this.repo.getOrCreateRole(RoleType.ADMIN, 'Administrateur simple with restricted permissions');
   
        const superAdminPermissions = [
            Permission.PROPERTIES_READ_ALL,
            Permission.PROPERTIES_MODERATE,
            Permission.USERS_READ_ALL,
            Permission.USERS_UPDATE_ANY,
            Permission.BOOKINGS_READ_ALL,
            Permission.ADMIN_ACCESS,
            Permission.ADMIN_MODERATE
        ];
   
        for (const permission of superAdminPermissions) {
           const permission_id = await this.repo.getOrCreatePermission(permission);
           await this.repo.linkRoleToPermission(role_id, permission_id);
        }
   
        const user = await this.repo.createUserWithRole(email, hashedPassword, role_id);
        await this.repo.createUserProfile(user.id, "admin", "admin");
        await sendAdminInviteEmail(email, password);
        return user;
    }
   
}