import { ManagerRepository } from "./manager.repository";

export class ManagerService{
    private repo: ManagerRepository;

    constructor(){
        this.repo = new ManagerRepository();
    }

    public async getRolesPermission(): Promise<any>{
        const result = await this.repo.getAllRolePermission();
        return result;
    }
}