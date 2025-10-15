declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      pseudo: string;
      role: "admin" | "user";
    };
  }
}
