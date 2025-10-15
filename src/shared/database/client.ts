import { Pool } from "pg";
import env from "../../environment/env.config"


const pool = new Pool({
    user: env.DB_USER,
    host: env.DB_HOST,
    database: env.DB_NAME,
    password: env.DB_PASSWORD,
    port: env.DB_PORT
})

pool.on("connect", () =>{
    console.log('Conneted Successfuly to database on port', env.DB_PORT);
})

pool.on("error", (err) =>{
    console.log('error : ', err);
    process.exit(-1);
})

export default pool;