import db from "../../shared/database/client"
import {
    Role,
    Permission,
    Role_Permission,
    RoleType,
    OtpChannel,
    OtpCode
} from "./manager.model"

export class ManagerRepository {

    public async getAllRolePermission(): Promise<any>{
        const query = `
        SELECT *
        FROM role_permission
        JOIN roles R ON R.role_id = role_permission.role_id
        JOIN permission P ON P.permission_id = role_permission.permission_id`;
        const execute = await db.query(query);
        return execute.rows;
    }

    // ==================== USER ROLES ====================
    
    public async getOrCreateRole(roleName: RoleType, description: string): Promise<string> {
        const insertRes = await db.query(
          `
            INSERT INTO roles (role_name, role_description)
            VALUES ($1, $2)
            ON CONFLICT (role_name) DO NOTHING
            RETURNING role_id
          `,
          [roleName, description]
        );
    
        if (insertRes.rows[0]?.role_id) return insertRes.rows[0].role_id;
    
        const selectRes = await db.query(
          `SELECT role_id FROM roles WHERE role_name = $1`,
          [roleName]
        );
    
        return selectRes.rows[0].role_id;
      }
    
      async getOrCreatePermission(permissionName: string): Promise<string> {
        const insertRes = await db.query(
          `
            INSERT INTO permission (permission_name)
            VALUES ($1)
            ON CONFLICT (permission_name) DO NOTHING
            RETURNING permission_id
          `,
          [permissionName]
        );
    
        if (insertRes.rows[0]?.permission_id) return insertRes.rows[0].permission_id;
    
        const selectRes = await db.query(
          `SELECT permission_id FROM permission WHERE permission_name = $1`,
          [permissionName]
        );
    
        return selectRes.rows[0].permission_id;
      }
    
      async linkRoleToPermission(roleId: string, permId: string) {
        await db.query(
          `INSERT INTO role_permission (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleId, permId],
        );
      }


    public async createUserWithRole(email: string, passwordHash: string, roleId: string): Promise<any> {
        const q = `
        INSERT INTO users (email, password_hash, status, email_verified, phone_verified, created_at, updated_at, role_id)
        VALUES (lower($1), $2, 'pending_verification', false, false, NOW(), NOW(), $3)
        RETURNING email, id
        `;
        const res = await db.query(q, [email.toLowerCase().trim(), passwordHash, roleId]);
        return res.rows[0];
    }

    async createUserProfile(userId: string, last_name: string, first_name: string): Promise<any> {
        const query = `
        INSERT INTO user_profiles 
        (user_id, first_name, last_name, preferred_language, notification_preferences)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `;
        const values = [
        userId,
        first_name,
        last_name,
        'fr',
        JSON.stringify({ email: true, sms: false, push: true, marketing: false })
        ];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    public async findUserByEmail(email: string): Promise<any | null> {
    const q = `SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1`;
    const res = await db.query(q, [email]);
    return res.rows[0] ?? null;
  }

  async saveOtp(
    target: string,
    channel: OtpChannel,
    code: string,
    expiresAt: Date | null,
    userId?: string | null,
    purpose: string = 'verification',
    maxAttempts: number = 5,
  ): Promise<OtpCode> {
    const normalizedTarget = channel === OtpChannel.EMAIL ? target.toLowerCase() : target;

    const updateQuery = `
      UPDATE otp_codes
      SET code = $1,
          expires_at = $2,
          attempts = 0,
          max_attempts = $3,
          user_id = $4,
          purpose = $5,
          updated_at = NOW(),
          used = false
      WHERE lower(target) = lower($6) AND channel = $7
      RETURNING *
    `;

    const updateValues = [
      code,
      expiresAt,
      maxAttempts,
      userId,
      purpose,
      normalizedTarget,
      channel
    ];

    const updateRes = await db.query(updateQuery, updateValues);
    if (updateRes.rowCount! > 0) {
      return updateRes.rows[0];
    }

    const insertQuery = `
      INSERT INTO otp_codes
      (user_id, channel, target, code, purpose, attempts, max_attempts, used, expires_at, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,0,$6,false,$7,NOW(),NOW())
      RETURNING *
    `;

    const insertValues = [
      userId,
      channel,
      normalizedTarget,
      code,
      purpose,
      maxAttempts,
      expiresAt,
    ];

    const insertRes = await db.query(insertQuery, insertValues);
    return insertRes.rows[0];
  }

}
