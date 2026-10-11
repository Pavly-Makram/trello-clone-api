import { OpenAPIV3 } from "openapi-types";

export const swaggerSpec: OpenAPIV3.Document = {
  openapi: "3.0.0",
  info: {
    title: "Trello Clone RESTful API",
    version: "1.0.0",
    description: "Complete API specification for the Trello Clone project, built with Node.js, Express, TypeScript, Prisma, PostgreSQL, and Redis.",
  },
  servers: [
    {
      url: "http://localhost:5001",
      description: "Development Server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter JWT token in the format: Bearer <token>",
      },
    },
    schemas: {
      // ================= Enums =================
      BoardRole: {
        type: "string",
        enum: ["ADMIN", "MEMBER", "VIEWER"],
        example: "MEMBER",
      },
      Priority: {
        type: "string",
        enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
        example: "MEDIUM",
      },

      // ================= Models =================
      User: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          email: { type: "string", format: "email", example: "user@example.com" },
          username: { type: "string", example: "john_doe" },
          avatar: { type: "string", nullable: true, example: "https://example.com/avatar.png" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Board: {
        type: "object",
        properties: {
          id: { type: "integer", example: 10 },
          title: { type: "string", example: "Sprint Workspace" },
          description: { type: "string", nullable: true, example: "Main workspace for sprint tasks" },
          color: { type: "string", example: "#0079bf" },
          ownerId: { type: "integer", example: 1 },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      List: {
        type: "object",
        properties: {
          id: { type: "integer", example: 5 },
          title: { type: "string", example: "In Progress" },
          position: { type: "number", example: 1000 },
          boardId: { type: "integer", example: 10 },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Card: {
        type: "object",
        properties: {
          id: { type: "integer", example: 12 },
          title: { type: "string", example: "Setup CI/CD Pipeline" },
          description: { type: "string", nullable: true, example: "Configure GitHub Actions" },
          position: { type: "number", example: 1000 },
          priority: { $ref: "#/components/schemas/Priority" },
          dueDate: { type: "string", format: "date-time", nullable: true },
          listId: { type: "integer", example: 5 },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Comment: {
        type: "object",
        properties: {
          id: { type: "integer", example: 3 },
          text: { type: "string", example: "Looks good to me!" },
          userId: { type: "integer", example: 1 },
          cardId: { type: "integer", example: 12 },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ActivityLog: {
        type: "object",
        properties: {
          id: { type: "integer", example: 25 },
          action: { type: "string", example: "created card 'Setup CI/CD Pipeline'" },
          boardId: { type: "integer", example: 10 },
          userId: { type: "integer", example: 1 },
          cardId: { type: "integer", nullable: true, example: 12 },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          totalItems: { type: "integer", example: 20 },
          totalPages: { type: "integer", example: 2 },
          currentPage: { type: "integer", example: 1 },
          limit: { type: "integer", example: 10 },
          hasNextPage: { type: "boolean", example: true },
          hasPrevPage: { type: "boolean", example: false },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "Resource not found or unauthorized action" },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    // ========================================================
    // 1. AUTH
    // ========================================================
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "username", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "john@example.com" },
                  username: { type: "string", example: "john_doe" },
                  password: { type: "string", format: "password", example: "password123" },
                  avatar: { type: "string", example: "https://example.com/avatar.png" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "User registered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "User registered successfully" },
                    user: { $ref: "#/components/schemas/User" },
                    token: { type: "string" },
                  },
                },
              },
            },
          },
          409: { description: "Email is already registered" },
          400: { description: "Validation error" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login user",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "john@example.com" },
                  password: { type: "string", format: "password", example: "password123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Login successful" },
                    user: { $ref: "#/components/schemas/User" },
                    token: { type: "string" },
                  },
                },
              },
            },
          },
          401: { description: "Invalid email or password" },
        },
      },
    },
    "/api/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request password reset token",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email", example: "john@example.com" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Password reset token sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "If that email is registered, a password reset token has been sent." },
                    devResetToken: { type: "string", example: "e4f8d2..." },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password using reset token",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "newPassword"],
                properties: {
                  token: { type: "string", example: "e4f8d2..." },
                  newPassword: { type: "string", minLength: 6, example: "newSecurePassword123" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Password has been reset successfully" },
          400: { description: "Invalid or expired password reset token" },
        },
      },
    },

    // ========================================================
    // 2. USERS
    // ========================================================
    "/api/users/profile": {
      get: {
        tags: ["Users"],
        summary: "Get current user profile",
        responses: {
          200: {
            description: "User profile retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "User Profile retrieved successfully" },
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update current user profile",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  username: { type: "string", example: "john_updated" },
                  avatar: { type: "string", example: "https://example.com/new.png" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "User Profile updated successfully" },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Delete current user account",
        responses: {
          200: { description: "User Profile deleted successfully" },
        },
      },
    },
    "/api/users/search": {
      get: {
        tags: ["Users"],
        summary: "Search users by username or email",
        parameters: [
          { name: "query", in: "query", schema: { type: "string" }, description: "Username or email search string" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        ],
        responses: {
          200: {
            description: "Search results retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    data: { type: "array", items: { $ref: "#/components/schemas/User" } },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ========================================================
    // 3. BOARDS
    // ========================================================
    "/api/boards": {
      get: {
        tags: ["Boards"],
        summary: "Get boards for current user with pagination",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "title", in: "query", schema: { type: "string" } },
          { name: "role", in: "query", schema: { type: "string", enum: ["OWNER", "MEMBER"] } },
        ],
        responses: {
          200: {
            description: "List of boards retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    data: { type: "array", items: { $ref: "#/components/schemas/Board" } },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Boards"],
        summary: "Create a new board",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: { type: "string", example: "Project Phoenix" },
                  description: { type: "string", example: "Workspace for Phoenix project" },
                  color: { type: "string", example: "#0079bf" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Board created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    board: { $ref: "#/components/schemas/Board" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/boards/{id}": {
      get: {
        tags: ["Boards"],
        summary: "Get board details with lists, cards, and members (Redis cached)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Board details retrieved successfully" },
          404: { description: "Board Not Found" },
        },
      },
      patch: {
        tags: ["Boards"],
        summary: "Update board details (Admin or Owner only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  color: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Board updated successfully" },
        },
      },
      delete: {
        tags: ["Boards"],
        summary: "Delete board (Owner only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Board deleted successfully" },
          403: { description: "Only the board owner can perform this action" },
        },
      },
    },
    "/api/boards/{id}/members": {
      post: {
        tags: ["Boards"],
        summary: "Add new member to board",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId"],
                properties: {
                  userId: { type: "integer", example: 2 },
                  role: { $ref: "#/components/schemas/BoardRole" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Member added successfully" },
          409: { description: "User is already a member of this board" },
        },
      },
    },
    "/api/boards/{id}/members/{userId}": {
      patch: {
        tags: ["Boards"],
        summary: "Update member role in board",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "userId", in: "path", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role"],
                properties: {
                  role: { $ref: "#/components/schemas/BoardRole" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Member role updated successfully" },
        },
      },
      delete: {
        tags: ["Boards"],
        summary: "Remove member from board or leave board",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "userId", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Member deleted successfully" },
        },
      },
    },

    // ========================================================
    // 4. LISTS
    // ========================================================
    "/api/lists": {
      post: {
        tags: ["Lists"],
        summary: "Create a new list in board",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "boardId", "position"],
                properties: {
                  title: { type: "string", example: "Doing" },
                  boardId: { type: "integer", example: 10 },
                  position: { type: "number", example: 1000 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "List created successfully" },
        },
      },
    },
    "/api/lists/{id}": {
      patch: {
        tags: ["Lists"],
        summary: "Update list title or position",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string", example: "Done" },
                  position: { type: "number", example: 2000 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "List updated successfully" },
        },
      },
      delete: {
        tags: ["Lists"],
        summary: "Delete list (Admin or Owner only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "List deleted successfully" },
        },
      },
    },

    // ========================================================
    // 5. CARDS
    // ========================================================
    "/api/cards": {
      get: {
        tags: ["Cards"],
        summary: "Get cards with filtering options",
        parameters: [
          { name: "title", in: "query", schema: { type: "string" } },
          { name: "priority", in: "query", schema: { $ref: "#/components/schemas/Priority" } },
          { name: "listId", in: "query", schema: { type: "integer" } },
          { name: "userId", in: "query", schema: { type: "integer" } },
          { name: "dueDate", in: "query", schema: { type: "string", format: "date-time" } },
        ],
        responses: {
          200: { description: "Cards retrieved successfully" },
        },
      },
      post: {
        tags: ["Cards"],
        summary: "Create a new card in list",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "position", "listId"],
                properties: {
                  title: { type: "string", example: "Integrate Payment Gateway" },
                  description: { type: "string", example: "Stripe integration" },
                  position: { type: "number", example: 1000 },
                  priority: { $ref: "#/components/schemas/Priority" },
                  listId: { type: "integer", example: 5 },
                  dueDate: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Card created successfully" },
        },
      },
    },
    "/api/cards/{id}": {
      get: {
        tags: ["Cards"],
        summary: "Get card details, assignees, and comments (Redis cached)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Card retrieved successfully" },
          404: { description: "Card not found" },
        },
      },
      patch: {
        tags: ["Cards"],
        summary: "Update card details",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  position: { type: "number" },
                  priority: { $ref: "#/components/schemas/Priority" },
                  dueDate: { type: "string", format: "date-time", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Card updated successfully" },
        },
      },
      delete: {
        tags: ["Cards"],
        summary: "Delete card",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Card deleted successfully" },
        },
      },
    },
    "/api/cards/{id}/move": {
      patch: {
        tags: ["Cards"],
        summary: "Move card between lists or reorder position in same board",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["listId", "position"],
                properties: {
                  listId: { type: "integer", example: 6 },
                  position: { type: "number", example: 500 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Card moved successfully" },
          403: { description: "Cannot move card to a different board" },
        },
      },
    },
    "/api/cards/{id}/assignees": {
      post: {
        tags: ["Cards"],
        summary: "Assign user to card",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId"],
                properties: {
                  userId: { type: "integer", example: 2 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "User assigned successfully" },
          409: { description: "User is already assigned to this card" },
        },
      },
    },
    "/api/cards/{id}/assignees/{userId}": {
      delete: {
        tags: ["Cards"],
        summary: "Unassign user from card",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "userId", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "User unassigned successfully" },
        },
      },
    },

    // ========================================================
    // 6. COMMENTS
    // ========================================================
    "/api/comments": {
      post: {
        tags: ["Comments"],
        summary: "Add comment to card",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["text", "cardId"],
                properties: {
                  text: { type: "string", example: "Working on it today." },
                  cardId: { type: "integer", example: 12 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Comment created successfully" },
        },
      },
    },
    "/api/comments/{id}": {
      patch: {
        tags: ["Comments"],
        summary: "Update comment (Author only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["text"],
                properties: {
                  text: { type: "string", example: "Updated comment text." },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Comment updated successfully" },
          403: { description: "You are only allowed to edit your own comments" },
        },
      },
      delete: {
        tags: ["Comments"],
        summary: "Delete comment (Author, Board Owner, or Admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Comment removed successfully" },
          403: { description: "You do not have permission to delete this comment" },
        },
      },
    },

    // ========================================================
    // 7. ACTIVITIES
    // ========================================================
    "/api/activities": {
      post: {
        tags: ["Activities"],
        summary: "Create new activity log entry",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action", "boardId"],
                properties: {
                  action: { type: "string", example: "archived completed list" },
                  boardId: { type: "integer", example: 10 },
                  cardId: { type: "integer", nullable: true, example: 12 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Activity created successfully" },
        },
      },
    },
    "/api/activities/board/{id}": {
      get: {
        tags: ["Activities"],
        summary: "Get board activity logs with pagination and filters",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "action", in: "query", schema: { type: "string" } },
          { name: "userId", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          200: {
            description: "Activities retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    data: { type: "array", items: { $ref: "#/components/schemas/ActivityLog" } },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/activities/card/{id}": {
      get: {
        tags: ["Activities"],
        summary: "Get card activity logs with pagination",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        ],
        responses: {
          200: { description: "Activities retrieved successfully" },
        },
      },
    },
  },
};