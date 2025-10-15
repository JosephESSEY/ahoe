import express, {Application, json, Request, Response} from "express"
import cors from "cors"
import cookieParser from "cookie-parser";
import pool  from "./shared/database/client";
import { errorHandler } from "./shared/middlewares/error.middleware";

import swaggerRoute from "./shared/docs/swagger";


export class App{
    public app :Application;

    constructor(){
        this.app = express();
        this.initializeMiddlewares();
        this.initializeError();
        this.initializerRoutes();
    }

    private initializeMiddlewares(){
        this.app.use(cors())
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(cookieParser());
        this.app.use(cors({
            origin: process.env.CORS_ORIGIN || '*',
            credentials: true,
        }));
    }

    private initializeError(){
        this.app.use(errorHandler);
    }

    private initializerRoutes(){

        this.app.get("/", (req : Request, res : Response) => {
            res.json({ status: "Bienvenu sur Ahoé" });
        });

        this.app.get("/test-db", async (req: Request, res: Response) => {
            const result = await pool.query("SELECT NOW()");
            res.send({
                message: "Connexion à la base de données d'Ahoé réussie",
                temps : result.rows
            });
        });

        this.app.get("/health", (req: Request, res: Response) => {
            res.status(200).json({ status: "Ahoé bien opérationnelle" });
        });


        // this.app.use("/api/auth", AuthRoutes);
        this.app.use("/api-docs", swaggerRoute);
    }
    
    public listen(PORT : number){
        this.app.listen(PORT, () =>{
            console.log(`Server is runnig on port ${PORT}`)
        })
    }
}