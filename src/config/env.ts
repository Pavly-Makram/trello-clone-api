import dotenv from "dotenv";
dotenv.config();

const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error(
            "FATAL SECURITY ERROR: JWT_SECRET must be defined in .env and be at least 32 characters long!"
        );
    }
    return secret;
};

export const ENV = {
    JWT_SECRET: getJwtSecret(),
    JWT_ISSUER: process.env.JWT_ISSUER || "trello-todo-api",
    JWT_AUDIENCE: process.env.JWT_AUDIENCE || "trello-todo-client",
    CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
    IS_PROD: process.env.NODE_ENV === "production",
};