import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { socketAuthMiddleware, AuthenticatedSocket } from "./socketAuth";
import prisma from "../config/prisma";

let io: Server | null = null;

export const initSocket = (httpServer: HttpServer): Server => {
    io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PATCH", "DELETE"],
        },
    });

    io.use(socketAuthMiddleware);

    io.on("connection", (socket: AuthenticatedSocket) => {
        console.log("⚡ Authenticated user connected:", socket.user?.email, "ID:", socket.id);

        // Join board Room
        socket.on("join:board", async (boardId: number) => {
            try {
                const userId = socket.user?.id;

                if (!userId || !boardId) {
                    socket.emit("error", { message: "Invalid user or board id" });
                    return;
                }

                const board = await prisma.board.findFirst({
                    where: {
                        id: Number(boardId),
                        OR: [
                            { ownerId: userId },
                            { members: { some: { userId: userId } } }
                        ]
                    }
                });

                if (!board) {
                    socket.emit("error", { message: "Access denied. You are not a member of this board." });
                    return;
                }

                const room = `board:${boardId}`;
                socket.join(room);
                console.log(`User ${socket.user?.email} joined room: ${room}`);

                socket.to(room).emit("user:joined_board", {
                    userId: socket.user?.id,
                    email: socket.user?.email,
                });

            } catch (error) {
                console.error("Error joining board room:", error);
                socket.emit("error", { message: "Internal server error joining board" });
            }
        })


        // Leave board Room
        socket.on("leave:board", (boardId: number) => {
            const room = `board:${boardId}`;
            socket.leave(room);
            console.log(`User ${socket.user?.email} left room: ${room}`);

            socket.to(room).emit("user:left_board", {
                userId: socket.user?.id,
            });
        });


        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.user?.email);
        });
    });

    return io;
};




export const getIO = (): Server => {
    if (!io) {
        return {
            to: () => ({
                emit: () => {},
            }),
            emit: () => {},
        } as any;
    }
    return io;
};