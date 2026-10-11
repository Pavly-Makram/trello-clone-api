import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

export const NotFound = (req: Request, res: Response, next: NextFunction): void => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

export const errorHandler: ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    if (process.env.NODE_ENV !== "production") {
        console.error("Error Log:", err);
    }

    res.status(statusCode).json({ 
        message: err.message,
        stack: process.env.NODE_ENV === "production" ? null : err.stack 
    });
};