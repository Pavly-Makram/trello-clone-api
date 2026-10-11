import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { UserPayload } from "../middlewares/verifyToken";

export interface AuthenticatedSocket extends Socket {
  user?: UserPayload;
}

export const socketAuthMiddleware = (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
) => {
  try {
    const tokenHeader =
      socket.handshake.auth?.token || socket.handshake.headers?.authorization;

    if (!tokenHeader) {
      return next(new Error("Authentication error: No token provided"));
    }

    const token = tokenHeader.startsWith("Bearer ")
      ? tokenHeader.split(" ")[1]
      : tokenHeader;

    const secret =
      process.env.JWT_SECRET_KEY ||
      process.env.JWT_SECRET ||
      "super_secret_jwt_key";

    const decoded = jwt.verify(token, secret) as UserPayload;

    socket.user = decoded;

    next();
  } catch (error) {
    return next(new Error("Authentication error: Invalid or expired token"));
  }
};