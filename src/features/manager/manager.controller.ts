import { Request, Response } from "express";
import { ManagerService } from "./manager.service";
import { getMissingFields } from "../../shared/middlewares/validation.middleware";

export class ManagerContoller{
    private managerService : ManagerService;

    constructor(){
        this.managerService = new ManagerService();
    }

    public async getRolesPermission(req: Request, res: Response): Promise<void>{
        try {
            const result = await this.managerService.getRolesPermission()
            res.status(200).json({
                success: "true",
                message: "Roles et Permission Récupérée avec succès",
                data: result
            })
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: "false",
                message: error.message || "Erreur Serveur",
                error: error
            })
        }
    }
}