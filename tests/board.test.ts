import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/prisma";
import { cleanDatabase, createTestUser } from "./helper";
import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";

describe("Board Controller Tests", () => {
    beforeEach(async () => {
        await cleanDatabase();
    });

    afterAll(async () => {
        await cleanDatabase();
        await prisma.$disconnect();
    });

    // ==========================================
    // 1. Create Board
    // ==========================================
    describe("POST /api/boards", () => {
        it("should create a new board for authenticated user", async () => {
            const { token, user } = await createTestUser();

            const res = await request(app)
                .post("/api/boards")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    title: "Project Alpha",
                    description: "Main workspace",
                    color: "#0079bf",
                });

            expect(res.status).toBe(201);
            expect(res.body.message).toBe("Board Created successfully");
            expect(res.body.board.title).toBe("Project Alpha");
            expect(res.body.board.ownerId).toBe(user.id);

            const dbBoard = await prisma.board.findUnique({
                where: { id: res.body.board.id },
            });
            expect(dbBoard).not.toBeNull();
        });

        it("should return 401 if user is not authenticated", async () => {
            const res = await request(app)
                .post("/api/boards")
                .send({ title: "Unauthorized Board" });

            expect(res.status).toBe(401);
        });
    });

    // ==========================================
    // 2. Get User Boards
    // ==========================================
    describe("GET /api/boards", () => {
        it("should return only boards belonging to the logged-in user", async () => {
            const user1 = await createTestUser();
            const user2 = await createTestUser();

            await request(app)
                .post("/api/boards")
                .set("Authorization", `Bearer ${user1.token}`)
                .send({ title: "User1 Board" });

            await request(app)
                .post("/api/boards")
                .set("Authorization", `Bearer ${user2.token}`)
                .send({ title: "User2 Board" });

            const res = await request(app)
                .get("/api/boards?page=1&limit=10")
                .set("Authorization", `Bearer ${user1.token}`);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].title).toBe("User1 Board");
        });
    });

    // ==========================================
    // 3. Delete Board
    // ==========================================
    describe("DELETE /api/boards/:id", () => {
        it("should allow OWNER to delete their board", async () => {
            const { token, user } = await createTestUser();

            const board = await prisma.board.create({
                data: { title: "To Delete", ownerId: user.id },
            });

            const res = await request(app)
                .delete(`/api/boards/${board.id}`)
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(200);

            const check = await prisma.board.findUnique({ where: { id: board.id } });
            expect(check).toBeNull();
        });

        it("should forbid non-owner from deleting the board", async () => {
            const owner = await createTestUser();
            const attacker = await createTestUser();

            const board = await prisma.board.create({
                data: { title: "Owner Board", ownerId: owner.user.id },
            });

            const res = await request(app)
                .delete(`/api/boards/${board.id}`)
                .set("Authorization", `Bearer ${attacker.token}`);

            expect(res.status).toBe(403);
        });
    });

    // ==========================================
    // 4. Add Member
    // ==========================================
    describe("POST /api/boards/:id/members", () => {
        it("should add a member to the board successfully", async () => {
            const owner = await createTestUser();
            const newMember = await createTestUser();

            const board = await prisma.board.create({
                data: { title: "Team Board", ownerId: owner.user.id },
            });

            const res = await request(app)
                .post(`/api/boards/${board.id}/members`)
                .set("Authorization", `Bearer ${owner.token}`)
                .send({
                    userId: newMember.user.id,
                    role: "MEMBER",
                });

            expect(res.status).toBe(201);
            expect(res.body.member.userId).toBe(newMember.user.id);
            expect(res.body.member.role).toBe("MEMBER");
        });
    });
});