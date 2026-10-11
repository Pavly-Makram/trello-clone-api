import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/prisma";
import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";

describe("Auth Controller - Real Integration Tests", () => {
    beforeEach(async () => {
        await prisma.user.deleteMany();
    });

    afterAll(async () => {
        await prisma.user.deleteMany();
        await prisma.$disconnect();
    });

    // ========================================================
    // 1. Register Tests
    // ========================================================
    describe("POST /api/auth/register", () => {
        const validUser = {
            username: "john_doe",
            email: "john@example.com",
            password: "password123",
            avatar: "https://example.com/avatar.png",
        };

        it("should register a new user successfully with status 201", async () => {
            const response = await request(app)
                .post("/api/auth/register")
                .send(validUser);

            expect(response.status).toBe(201);
            expect(response.body.message).toBe("User registered successfully");
            expect(response.body).toHaveProperty("token");
            expect(response.body.user).toHaveProperty("id");
            expect(response.body.user.email).toBe(validUser.email);
            expect(response.body.user).not.toHaveProperty("password");

            // Verify directly from the real test database
            const dbUser = await prisma.user.findUnique({
                where: { email: validUser.email },
            });
            expect(dbUser).not.toBeNull();
            expect(dbUser?.username).toBe(validUser.username);
        });

        it("should return 409 Conflict if email is already registered", async () => {
            // Register the user first
            await request(app).post("/api/auth/register").send(validUser);

            // Attempt to register again with same email
            const response = await request(app)
                .post("/api/auth/register")
                .send(validUser);

            expect(response.status).toBe(409);
            expect(response.body.message).toBe("Email is already registered");
        });

        it("should return 400 Bad Request if validation fails (Zod)", async () => {
            const invalidData = {
                username: "ab", // shorter than 3 characters
                email: "invalid-email-format",
                password: "123", // shorter than 6 characters
            };

            const response = await request(app)
                .post("/api/auth/register")
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.status).toBe("fail");
            expect(response.body.message).toBe("Validation Error");
            expect(response.body).toHaveProperty("errors");
        });
    });

    // ========================================================
    // 2. Login Tests
    // ========================================================
    describe("POST /api/auth/login", () => {
        const registeredUser = {
            username: "jane_doe",
            email: "jane@example.com",
            password: "password123",
        };

        beforeEach(async () => {
            await request(app).post("/api/auth/register").send(registeredUser);
        });

        it("should login successfully with correct credentials and return 200", async () => {
            const response = await request(app)
                .post("/api/auth/login")
                .send({
                    email: registeredUser.email,
                    password: registeredUser.password,
                });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe("Login successful");
            expect(response.body).toHaveProperty("token");
            expect(response.body.user.email).toBe(registeredUser.email);
            expect(response.body.user).not.toHaveProperty("password");
        });

        it("should return 401 Unauthorized for incorrect password", async () => {
            const response = await request(app)
                .post("/api/auth/login")
                .send({
                    email: registeredUser.email,
                    password: "wrongPassword123",
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe("Invalid email or password");
        });

        it("should return 401 Unauthorized for non-existing email", async () => {
            const response = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "unknown@example.com",
                    password: "password123",
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe("Invalid email or password");
        });

        it("should return 400 Bad Request if fields are missing", async () => {
            const response = await request(app)
                .post("/api/auth/login")
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.status).toBe("fail");
            expect(response.body.message).toBe("Validation Error");
        });
    });
});