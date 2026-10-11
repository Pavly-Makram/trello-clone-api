import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/prisma";
import { cleanDatabase, createTestUser } from "./helper";
import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";

describe("ActivityLog Controller Tests", () => {
    beforeEach(async () => {
        await cleanDatabase();
    });

    afterAll(async () => {
        await cleanDatabase();
        await prisma.$disconnect();
    });

    const setupBoardAndCard = async (ownerId: number) => {
        const board = await prisma.board.create({
            data: { title: "Activity Board", ownerId },
        });
        const list = await prisma.list.create({
            data: { title: "Main List", position: 1000, boardId: board.id },
        });
        const card = await prisma.card.create({
            data: { title: "Active Card", position: 1000, listId: list.id },
        });
        return { board, list, card };
    };

    // ==========================================
    // 1. Create Activity
    // ==========================================
    describe("POST /api/activities", () => {
        it("should create activity log for board and card", async () => {
            const { token, user } = await createTestUser();
            const { board, card } = await setupBoardAndCard(user.id);

            const res = await request(app)
                .post("/api/activities")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    action: "created card 'Active Card'",
                    boardId: board.id,
                    cardId: card.id,
                });

            expect(res.status).toBe(201);
            expect(res.body.message).toBe("Activity created successfully");
            expect(res.body.activity.action).toBe("created card 'Active Card'");
            expect(res.body.activity.boardId).toBe(board.id);
        });

        it("should return 403 if card does not belong to specified board", async () => {
            const { token, user } = await createTestUser();
            const fixture1 = await setupBoardAndCard(user.id);
            const fixture2 = await setupBoardAndCard(user.id);

            const res = await request(app)
                .post("/api/activities")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    action: "Mismatched board and card",
                    boardId: fixture1.board.id,
                    cardId: fixture2.card.id, // belongs to board 2
                });

            expect(res.status).toBe(403);
        });
    });

    // ==========================================
    // 2. Get Board Activities
    // ==========================================
    describe("GET /api/activities/board/:id", () => {
        it("should retrieve board activities with pagination", async () => {
            const { token, user } = await createTestUser();
            const { board } = await setupBoardAndCard(user.id);

            await prisma.activityLog.createMany({
                data: [
                    { action: "Action 1", boardId: board.id, userId: user.id },
                    { action: "Action 2", boardId: board.id, userId: user.id },
                ],
            });

            const res = await request(app)
                .get(`/api/activities/board/${board.id}?page=1&limit=10`)
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(2);
            expect(res.body.pagination.totalItems).toBe(2);
        });

        it("should filter board activities by action text", async () => {
            const { token, user } = await createTestUser();
            const { board } = await setupBoardAndCard(user.id);

            await prisma.activityLog.createMany({
                data: [
                    { action: "Created card", boardId: board.id, userId: user.id },
                    { action: "Archived list", boardId: board.id, userId: user.id },
                ],
            });

            const res = await request(app)
                .get(`/api/activities/board/${board.id}?action=Created`)
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].action).toBe("Created card");
        });
    });

    // ==========================================
    // 3. Get Card Activities
    // ==========================================
    describe("GET /api/activities/card/:id", () => {
        it("should retrieve card activities successfully", async () => {
            const { token, user } = await createTestUser();
            const { board, card } = await setupBoardAndCard(user.id);

            await prisma.activityLog.create({
                data: {
                    action: "Changed title",
                    boardId: board.id,
                    cardId: card.id,
                    userId: user.id,
                },
            });

            const res = await request(app)
                .get(`/api/activities/card/${card.id}?page=1&limit=10`)
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].action).toBe("Changed title");
        });
    });
});