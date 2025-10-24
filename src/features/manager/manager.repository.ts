import db from "../../shared/database/client"
// import {
//     Role,
//     Permission,
//     Role_Permission
// } from "./manager.model"

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
}
