import { Request, Response, NextFunction } from "express";
import { ZodTypeAny, ZodError } from "zod";

interface RequestValidators {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export const validate = (validators: RequestValidators) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (validators.body) {
        req.body = await validators.body.parseAsync(req.body);
      }
      if (validators.query) {
        const parsedQuery = await validators.query.parseAsync(req.query);
        Object.defineProperty(req, "query", {
          value: parsedQuery,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
      if (validators.params) {
        req.params = (await validators.params.parseAsync(req.params)) as any;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          status: "fail",
          message: "Validation Error",
          errors: error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }

      console.error("Validation Middleware Error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};