import express, { Application } from 'express';
import { NotFound, errorHandler } from './middlewares/errors';
import { apiLimiter } from "./middlewares/rateLimiter";
import dotenv from 'dotenv';
import authRouter from "./routes/authRoute";
import boardRouter from "./routes/boardRoute";
import userRouter from "./routes/userRoute";
import listRouter from "./routes/listRoute";
import cardRouter from "./routes/cardRoute";
import commentRouter from "./routes/commentRoute";
import activityLogRouter from "./routes/activityLogRoute";

import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

import logger from './middlewares/logger';
import cors from 'cors';
import helmet from 'helmet';

dotenv.config();

const app: Application = express();

app.use(express.json());



// Security
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false, }));


app.use(logger);


// Swagger Documentation Route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// Rate Limit
app.use("/api", apiLimiter);

app.use("/api/auth", authRouter);
app.use("/api/boards", boardRouter)
app.use("/api/users", userRouter)
app.use("/api/lists", listRouter)
app.use("/api/cards", cardRouter)
app.use("/api/comments", commentRouter)
app.use("/api/activities", activityLogRouter)

app.use(NotFound);
app.use(errorHandler);

export default app;