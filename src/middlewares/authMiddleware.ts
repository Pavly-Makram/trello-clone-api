import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import prisma from "../config/prisma";

export interface UserPayload extends JwtPayload {
    id: number;
    email: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
        }
    }
}

export function verifyToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization || (req.headers.token as string);

    let token: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    } else if (authHeader) {
        token = authHeader;
    }

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
        const secret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || "default_super_secret_key";
        const decoded = jwt.verify(token, secret) as UserPayload;
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token." });
    }
}

export function verifySameUser(req: Request, res: Response, next: NextFunction) {
    verifyToken(req, res, () => {
        if (req.user && req.user.id === Number(req.params.id)) {
            next();
        } else {
            return res.status(403).json({ message: "You are not authorized to perform this action!" });
        }
    });
}

export function checkUserExists(req: Request, res: Response, next: NextFunction) {
    verifyToken(req, res, async () => {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
        });
        if (user) {
            next();
        } else {
            return res.status(404).json({ message: "User Not Found" });
        }
    });
}