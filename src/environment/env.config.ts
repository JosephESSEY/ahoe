import { config } from "dotenv"

config();

interface EnvConfig {
    DB_PORT : number;
    DB_HOST : string;
    DB_USER : string;
    DB_PASSWORD : string;
    DB_NAME: string;
    PORT : number;
    JWT_SECRET : string;
}

const env : EnvConfig = {
    DB_PORT: Number(process.env.DB_PORT) || 5432,
    DB_HOST: process.env.DB_HOST || '',
    DB_USER: process.env.DB_USER || '',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || '',
    PORT: Number(process.env.PORT),
    JWT_SECRET: process.env.JWT_SECRET || ''
    
}

if(!env.DB_HOST) throw new Error('DB_HOST is missing in .env');

if(!env.DB_HOST) throw new Error('DB_HOST is missing in .env');

if(!env.DB_USER) throw new Error('DB_USER is missing in .env');

if(!env.DB_PASSWORD) throw new Error('DB_PASSWORD is missing in .env');

if(!env.JWT_SECRET) throw new Error('JWT_SECRET is missign in .env');

export default env;