import { User } from '../../features/auth/auth.model';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        phone: string;
        role: string;
      };
    }
  }
}

export {};