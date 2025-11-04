import { Router } from "express";
import { ManagerContoller } from "./manager.controller";

const router = Router()
const managerController = new ManagerContoller()

router.get("/roles_permissions", managerController.getRolesPermission.bind(managerController))
router.post("/create-super-admin", managerController.createSuperAdmin.bind(managerController))
router.post("/create-admin", managerController.createAdmin.bind(managerController))

export default router;