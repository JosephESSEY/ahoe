import swaggerJSDoc from "swagger-jsdoc";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API AHOE",
      version: "1.0.0",
      description: "Documentation de l'API pour le projet Ahoé - Plateforme de location des habitats",
      contact: {
        name: "Joseph ESSEY",
        email: "contact@ahoe.com"
      },
      license: {
        name: "AHOE License",
        url: "https://ahoe.com/license"
      }
    },
    servers: [
      {
        url: "http://localhost:8081/api",
        description: "Serveur de développement"
      },
      {
        url: "https://api.afrodites.com/api",
        description: "Serveur de production"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "integer" },
            pseudo: { type: "string" },
            role: { type: "integer" }
          }
        },
        Error: {
          type: "object",
          properties: {
            statusCode: { type: "integer" },
            message: { type: "string" }
          }
        }
      }
    },
    tags: [
      {
        name: "Auth",
        description: "Endpoints d'authentification"
      }
    ],
    // security: [
    //   {
    //     bearerAuth: []
    //   }
    // ]
  },
  apis: [
    "./src/features/**/*.route.ts",
    "./src/features/**/*.model.ts",
    "./src/features/**/*.controller.ts"
  ]
};

export const swaggerSpec = swaggerJSDoc(options);