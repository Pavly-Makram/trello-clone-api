import { getIO } from "../sockets/socket";

export const emitToBoard = (boardId: number, event: string, payload: any) => {
    getIO().to(`board:${boardId}`).emit(event, payload);
};