import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/prisma";
import { cleanDatabase, createTestUser } from "./helper";
import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";

describe("Card Controller Tests", () => {
    beforeEach(async () => {
        await cleanDatabase();
    });

    afterAll(async () => {
        await cleanDatabase();
        await prisma.$disconnect();
    });

    const setupBoardAndList = async (ownerId: number) => {
        const board = await prisma.board.create({
            data: { title: "Main Board", ownerId },
        });
        const list = await prisma.list.create({
            data: { title: "Todo List", position: 1000, boardId: board.id },
        });
        return { board, list };
    };

    // ==========================================
    // 1. Create Card
    // ==========================================
    describe("POST /api/cards", () => {
        it("should create card successfully", async () => {
            const { token, user } = await createTestUser();
            const { list } = await setupBoardAndList(user.id);

            const res = await request(app)
                .post("/api/cards")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    title: "Setup CI/CD",
                    description: "Configure GitHub Actions",
                    position: 1000,
                    priority: "HIGH",
                    listId: list.id,
                });

            expect(res.status).toBe(201);
            expect(res.body.message).toBe("Card created successfully");
            expect(res.body.card.title).toBe("Setup CI/CD");
            expect(res.body.card.priority).toBe("HIGH");
            expect(res.body.card.listId).toBe(list.id);
        });
    });

    // ==========================================
    // 2. Get Card By ID
    // ==========================================
    describe("GET /api/cards/:id", () => {
        it("should return card details along with assignees and comments", async () => {
            const { token, user } = await createTestUser();
            const { list } = await setupBoardAndList(user.id);

            const card = await prisma.card.create({
                data: { title: "Inspect Card", position: 1000, listId: list.id },
            });

            const res = await request(app)
                .get(`/api/cards/${card.id}`)
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.card.id).toBe(card.id);
            expect(res.body.card).toHaveProperty("assignees");
            expect(res.body.card).toHaveProperty("comments");
        });
    });

    // ==========================================
    // 3. Update Card
    // ==========================================
    describe("PATCH /api/cards/:id", () => {
        it("should update card details", async () => {
            const { token, user } = await createTestUser();
            const { list } = await setupBoardAndList(user.id);

            const card = await prisma.card.create({
                data: { title: "Old Title", position: 1000, listId: list.id },
            });

            const res = await request(app)
                .patch(`/api/cards/${card.id}`)
                .set("Authorization", `Bearer ${token}`)
                .send({
                    title: "Updated Title",
                    priority: "URGENT",
                });

            expect(res.status).toBe(200);
            expect(res.body.card.title).toBe("Updated Title");
            expect(res.body.card.priority).toBe("URGENT");
        });
    });

    // ==========================================
    // 4. Move Card
    // ==========================================
    describe("PATCH /api/cards/:id/move", () => {
        it("should move card within same board lists", async () => {
            const { token, user } = await createTestUser();
            const { board, list: listA } = await setupBoardAndList(user.id);
            const listB = await prisma.list.create({
                data: { title: "Done List", position: 2000, boardId: board.id },
            });

            const card = await prisma.card.create({
                data: { title: "Movable Card", position: 1000, listId: listA.id },
            });

            const res = await request(app)
                .patch(`/api/cards/${card.id}/move`)
                .set("Authorization", `Bearer ${token}`)
                .send({
                    listId: listB.id,
                    position: 500,
                });

            expect(res.status).toBe(200);
            expect(res.body.card.listId).toBe(listB.id);
            expect(res.body.card.position).toBe(500);
        });

        it("should forbid moving card to a different board", async () => {
            const { token, user } = await createTestUser();
            const { list: listBoard1 } = await setupBoardAndList(user.id);
            const { list: listBoard2 } = await setupBoardAndList(user.id);

            const card = await prisma.card.create({
                data: { title: "Cross Board Card", position: 1000, listId: listBoard1.id },
            });

            const res = await request(app)
                .patch(`/api/cards/${card.id}/move`)
                .set("Authorization", `Bearer ${token}`)
                .send({
                    listId: listBoard2.id,
                    position: 1000,
                });

            expect(res.status).toBe(403);
            expect(res.body.message).toBe("Cannot move card to a different board");
        });
    });

    // ==========================================
    // 5. Assign and Unassign User
    // ==========================================
    describe("POST & DELETE /api/cards/:id/assignees", () => {
        it("should assign and then unassign member from card", async () => {
            const owner = await createTestUser();
            const member = await createTestUser();
            const { board, list } = await setupBoardAndList(owner.user.id);

            await prisma.boardMember.create({
                data: { boardId: board.id, userId: member.user.id, role: "MEMBER" },
            });

            const card = await prisma.card.create({
                data: { title: "Task Card", position: 1000, listId: list.id },
            });

            // 1. Assign
            const assignRes = await request(app)
                .post(`/api/cards/${card.id}/assignees`)
                .set("Authorization", `Bearer ${owner.token}`)
                .send({ userId: member.user.id });

            expect(assignRes.status).toBe(201);
            expect(assignRes.body.output_card.userId).toBe(member.user.id);

            // 2. Duplicate assignment check
            const duplicateRes = await request(app)
                .post(`/api/cards/${card.id}/assignees`)
                .set("Authorization", `Bearer ${owner.token}`)
                .send({ userId: member.user.id });

            expect(duplicateRes.status).toBe(409);

            // 3. Unassign
            const unassignRes = await request(app)
                .delete(`/api/cards/${card.id}/assignees/${member.user.id}`)
                .set("Authorization", `Bearer ${owner.token}`);

            expect(unassignRes.status).toBe(200);
            expect(unassignRes.body.message).toBe("User unassigned successfully");
        });

        it("should return 403 when trying to assign user not in the board", async () => {
            const owner = await createTestUser();
            const stranger = await createTestUser();
            const { list } = await setupBoardAndList(owner.user.id);

            const card = await prisma.card.create({
                data: { title: "Task Card", position: 1000, listId: list.id },
            });

            const res = await request(app)
                .post(`/api/cards/${card.id}/assignees`)
                .set("Authorization", `Bearer ${owner.token}`)
                .send({ userId: stranger.user.id });

            expect(res.status).toBe(403);
            expect(res.body.message).toBe("User is not a member of this board");
        });
    });

    // ==========================================
    // 6. Delete Card
    // ==========================================
    describe("DELETE /api/cards/:id", () => {
        it("should delete card", async () => {
            const { token, user } = await createTestUser();
            const { list } = await setupBoardAndList(user.id);

            const card = await prisma.card.create({
                data: { title: "Delete Me", position: 1000, listId: list.id },
            });

            const res = await request(app)
                .delete(`/api/cards/${card.id}`)
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(200);

            const check = await prisma.card.findUnique({ where: { id: card.id } });
            expect(check).toBeNull();
        });
    });
});