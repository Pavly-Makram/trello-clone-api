import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/prisma";
import { cleanDatabase, createTestUser } from "./helper";
import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";

describe("List Controller Tests", () => {
    beforeEach(async () => {
        await cleanDatabase();
    });

    afterAll(async () => {
        await cleanDatabase();
        await prisma.$disconnect();
    });

    // Helper: Create Board
    const setupBoard = async (ownerId: number) => {
        return prisma.board.create({
            data: { title: "Test Board", ownerId },
        });
    };

    // ==========================================
    // 1. Create List
    // ==========================================
    describe("POST /api/lists", () => {
        it("should allow board owner to create a new list", async () => {
            const { token, user } = await createTestUser();
            const board = await setupBoard(user.id);

            const res = await request(app)
                .post("/api/lists")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    title: "To Do",
                    boardId: board.id,
                    position: 1000,
                });

            expect(res.status).toBe(201);
            expect(res.body.message).toBe("List created successfully");
            expect(res.body.list.title).toBe("To Do");
            expect(res.body.list.boardId).toBe(board.id);
        });

        it("should forbid non-members from creating a list", async () => {
            const owner = await createTestUser();
            const stranger = await createTestUser();
            const board = await setupBoard(owner.user.id);

            const res = await request(app)
                .post("/api/lists")
                .set("Authorization", `Bearer ${stranger.token}`)
                .send({
                    title: "Hacked List",
                    boardId: board.id,
                    position: 1000,
                });

            expect(res.status).toBe(403);
            expect(res.body.message).toBe("You are not a member of this board");
        });

        it("should return 400 for invalid input", async () => {
            const { token, user } = await createTestUser();
            const board = await setupBoard(user.id);

            const res = await request(app)
                .post("/api/lists")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    title: "Hi", // Less than 3 chars
                    boardId: board.id,
                    position: 1000,
                });

            expect(res.status).toBe(400);
        });
    });

    // ==========================================
    // 2. Update List
    // ==========================================
    describe("PATCH /api/lists/:id", () => {
        it("should update list title and position", async () => {
            const { token, user } = await createTestUser();
            const board = await setupBoard(user.id);
            const list = await prisma.list.create({
                data: { title: "In Progress", position: 1000, boardId: board.id },
            });

            const res = await request(app)
                .patch(`/api/lists/${list.id}`)
                .set("Authorization", `Bearer ${token}`)
                .send({
                    title: "Doing",
                    position: 2000,
                });

            expect(res.status).toBe(200);
            expect(res.body.list.title).toBe("Doing");
            expect(res.body.list.position).toBe(2000);
        });

        it("should forbid VIEWER role from updating list", async () => {
            const owner = await createTestUser();
            const viewer = await createTestUser();
            const board = await setupBoard(owner.user.id);

            await prisma.boardMember.create({
                data: { boardId: board.id, userId: viewer.user.id, role: "VIEWER" },
            });

            const list = await prisma.list.create({
                data: { title: "Fixed List", position: 1000, boardId: board.id },
            });

            const res = await request(app)
                .patch(`/api/lists/${list.id}`)
                .set("Authorization", `Bearer ${viewer.token}`)
                .send({ title: "Viewer Try" });

            expect(res.status).toBe(403);
            expect(res.body.message).toBe("Action not allowed for viewers");
        });
    });

    // ==========================================
    // 3. Delete List
    // ==========================================
    describe("DELETE /api/lists/:id", () => {
        it("should allow board ADMIN or OWNER to delete list", async () => {
            const owner = await createTestUser();
            const board = await setupBoard(owner.user.id);
            const list = await prisma.list.create({
                data: { title: "Delete Me", position: 1000, boardId: board.id },
            });

            const res = await request(app)
                .delete(`/api/lists/${list.id}`)
                .set("Authorization", `Bearer ${owner.token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("List deleted successfully");

            const check = await prisma.list.findUnique({ where: { id: list.id } });
            expect(check).toBeNull();
        });

        it("should forbid regular MEMBER from deleting list (requires ADMIN)", async () => {
            const owner = await createTestUser();
            const member = await createTestUser();
            const board = await setupBoard(owner.user.id);

            await prisma.boardMember.create({
                data: { boardId: board.id, userId: member.user.id, role: "MEMBER" },
            });

            const list = await prisma.list.create({
                data: { title: "Protected", position: 1000, boardId: board.id },
            });

            const res = await request(app)
                .delete(`/api/lists/${list.id}`)
                .set("Authorization", `Bearer ${member.token}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toBe("Requires Board Admin privilege");
        });
    });
});