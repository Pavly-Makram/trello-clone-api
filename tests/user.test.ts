import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/prisma";
import { cleanDatabase, createTestUser } from "./helper";
import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";

describe("User Controller Tests", () => {
    beforeEach(async () => {
        await cleanDatabase();
    });

    afterAll(async () => {
        await cleanDatabase();
        await prisma.$disconnect();
    });

    // ==========================================
    // 1. Get User Profile
    // ==========================================
    describe("GET /api/users/profile", () => {
        it("should return the profile of the authenticated user", async () => {
            const { token, user } = await createTestUser();

            const res = await request(app)
                .get("/api/users/profile")
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("User Profile retrieved successfully");
            expect(res.body.user.id).toBe(user.id);
            expect(res.body.user.email).toBe(user.email);
            expect(res.body.user).not.toHaveProperty("password");
        });

        it("should return 401 if token is not provided", async () => {
            const res = await request(app).get("/api/users/profile");
            expect(res.status).toBe(401);
        });

        it("should return 404 if user no longer exists in database", async () => {
            const { token, user } = await createTestUser();
            await prisma.user.delete({ where: { id: user.id } });

            const res = await request(app)
                .get("/api/users/profile")
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe("User Not Found");
        });
    });

    // ==========================================
    // 2. Update User Profile
    // ==========================================
    describe("PATCH /api/users/profile", () => {
        it("should update user profile successfully", async () => {
            const { token, user } = await createTestUser();

            const res = await request(app)
                .patch("/api/users/profile")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    username: "updated_username",
                    avatar: "https://example.com/new-avatar.png",
                });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("User Profile updated successfully");
            expect(res.body.user.username).toBe("updated_username");
            expect(res.body.user.avatar).toBe("https://example.com/new-avatar.png");

            const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
            expect(dbUser?.username).toBe("updated_username");
        });

        it("should return 400 if validation fails (e.g. short username)", async () => {
            const { token } = await createTestUser();

            const res = await request(app)
                .patch("/api/users/profile")
                .set("Authorization", `Bearer ${token}`)
                .send({ username: "a" });

            expect(res.status).toBe(400);
            expect(res.body.status).toBe("fail");
        });
    });

    // ==========================================
    // 3. Delete User Profile
    // ==========================================
    describe("DELETE /api/users/profile", () => {
        it("should delete authenticated user account", async () => {
            const { token, user } = await createTestUser();

            const res = await request(app)
                .delete("/api/users/profile")
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("User Profile deleted successfully");

            const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
            expect(dbUser).toBeNull();
        });
    });

    // ==========================================
    // 4. Search Users
    // ==========================================
    describe("GET /api/users/search", () => {
        it("should search users excluding current user with pagination", async () => {
            const current = await createTestUser("current@test.com", "current_user");
            await createTestUser("alice@test.com", "alice_wonder");
            await createTestUser("bob@test.com", "bob_builder");

            const res = await request(app)
                .get("/api/users/search?query=alice&page=1&limit=10")
                .set("Authorization", `Bearer ${current.token}`);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].email).toBe("alice@test.com");
            expect(res.body.pagination.totalItems).toBe(1);
        });

        it("should return empty list if query is whitespace or empty", async () => {
            const { token } = await createTestUser();

            const res = await request(app)
                .get("/api/users/search?query=  ")
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
            expect(res.body.pagination.totalItems).toBe(0);
        });
    });
});