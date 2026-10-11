import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/prisma";
import { cleanDatabase, createTestUser } from "./helper";
import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";

describe("Comment Controller Tests", () => {
    beforeEach(async () => {
        await cleanDatabase();
    });

    afterAll(async () => {
        await cleanDatabase();
        await prisma.$disconnect();
    });

    const setupCardFixture = async (ownerId: number) => {
        const board = await prisma.board.create({
            data: { title: "Comment Board", ownerId },
        });
        const list = await prisma.list.create({
            data: { title: "General List", position: 1000, boardId: board.id },
        });
        const card = await prisma.card.create({
            data: { title: "Card with comments", position: 1000, listId: list.id },
        });
        return { board, list, card };
    };

    // ==========================================
    // 1. Create Comment
    // ==========================================
    describe("POST /api/comments", () => {
        it("should add a comment to a card", async () => {
            const { token, user } = await createTestUser();
            const { card } = await setupCardFixture(user.id);

            const res = await request(app)
                .post("/api/comments")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    text: "This is a great idea!",
                    cardId: card.id,
                });

            expect(res.status).toBe(201);
            expect(res.body.message).toBe("Comment created successfully");
            expect(res.body.comment.text).toBe("This is a great idea!");
            expect(res.body.comment.userId).toBe(user.id);
        });

        it("should forbid non-board member from commenting", async () => {
            const owner = await createTestUser();
            const stranger = await createTestUser();
            const { card } = await setupCardFixture(owner.user.id);

            const res = await request(app)
                .post("/api/comments")
                .set("Authorization", `Bearer ${stranger.token}`)
                .send({
                    text: "Unauthorized comment",
                    cardId: card.id,
                });

            expect(res.status).toBe(403);
        });
    });

    // ==========================================
    // 2. Update Comment
    // ==========================================
    describe("PATCH /api/comments/:id", () => {
        it("should allow author to update their comment", async () => {
            const { token, user } = await createTestUser();
            const { card } = await setupCardFixture(user.id);

            const comment = await prisma.comment.create({
                data: { text: "Original Text", cardId: card.id, userId: user.id },
            });

            const res = await request(app)
                .patch(`/api/comments/${comment.id}`)
                .set("Authorization", `Bearer ${token}`)
                .send({ text: "Edited Text" });

            expect(res.status).toBe(200);
            expect(res.body.commentUpdated.text).toBe("Edited Text");
        });

        it("should forbid non-author from updating comment", async () => {
            const owner = await createTestUser();
            const otherUser = await createTestUser();
            const { card } = await setupCardFixture(owner.user.id);

            const comment = await prisma.comment.create({
                data: { text: "Owner Comment", cardId: card.id, userId: owner.user.id },
            });

            const res = await request(app)
                .patch(`/api/comments/${comment.id}`)
                .set("Authorization", `Bearer ${otherUser.token}`)
                .send({ text: "Trying to edit" });

            expect(res.status).toBe(403);
            expect(res.body.message).toBe("You are only allowed to edit your own comments");
        });
    });

    // ==========================================
    // 3. Delete Comment
    // ==========================================
    describe("DELETE /api/comments/:id", () => {
        it("should allow board owner to delete any comment", async () => {
            const owner = await createTestUser();
            const member = await createTestUser();
            const { board, card } = await setupCardFixture(owner.user.id);

            await prisma.boardMember.create({
                data: { boardId: board.id, userId: member.user.id, role: "MEMBER" },
            });

            const comment = await prisma.comment.create({
                data: { text: "Member Comment", cardId: card.id, userId: member.user.id },
            });

            // Owner deletes it
            const res = await request(app)
                .delete(`/api/comments/${comment.id}`)
                .set("Authorization", `Bearer ${owner.token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Comment removed successfully");
        });

        it("should forbid member from deleting another member's comment", async () => {
            const owner = await createTestUser();
            const member1 = await createTestUser();
            const member2 = await createTestUser();
            const { board, card } = await setupCardFixture(owner.user.id);

            await prisma.boardMember.createMany({
                data: [
                    { boardId: board.id, userId: member1.user.id, role: "MEMBER" },
                    { boardId: board.id, userId: member2.user.id, role: "MEMBER" },
                ],
            });

            const comment = await prisma.comment.create({
                data: { text: "Comment by User 1", cardId: card.id, userId: member1.user.id },
            });

            const res = await request(app)
                .delete(`/api/comments/${comment.id}`)
                .set("Authorization", `Bearer ${member2.token}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toBe("You do not have permission to delete this comment");
        });
    });
});