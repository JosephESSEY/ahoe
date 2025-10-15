import { App } from "./app";
import env from "./environment/env.config"

const app = new App();

const port = env.PORT ? Number(env.PORT) : 8080

app.listen(port);