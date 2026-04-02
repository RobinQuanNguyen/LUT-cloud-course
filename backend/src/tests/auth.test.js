import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { jest } from "@jest/globals";

import User from "../models/User.js";
import { ENV } from "../lib/env.js";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";
const mongoUri = process.env.MONGO_URI_TEST || ENV.MONGO_URI_TEST || process.env.MONGO_URI || ENV.MONGO_URI;

jest.setTimeout(30000);

const testUserTemplate = {
  fullName: "Test User",
  password: "Test@1234",
};

function createTestUser() {
  return {
    ...testUserTemplate,
    email: `test+${new mongoose.Types.ObjectId().toString()}@gmail.com`,
  };
}

async function sendRequest(method, path, body, cookie) {
  const headers = {};

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  if (cookie) {
    headers.Cookie = cookie;
  }

  return fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function getJwtCookie(response) {
  const rawCookie = response.headers.get("set-cookie");

  if (!rawCookie) {
    return "";
  }

  return rawCookie.split(";")[0];
}

beforeAll(async () => {
  if (!mongoUri) {
    throw new Error("MONGO_URI_TEST or MONGO_URI must be defined for auth tests");
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  await User.deleteMany({ email: /test\+[a-f0-9]{24}@gmail\.com/ });
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe("auth check and invalid credentials", () => {
  test("GET /api/auth/check returns 401 when not authenticated", async () => {
    const response = await sendRequest("GET", "/api/auth/check");
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("message", "Unauthorized");
  });

  test("GET /api/auth/check returns 401 when token user does not exist", async () => {
    const nonExistingUserId = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign({ userId: nonExistingUserId }, ENV.JWT_SECRET, { expiresIn: "7d" });

    const response = await sendRequest("GET", "/api/auth/check", undefined, `${ENV.JWT_COOKIE_NAME || "jwt"}=${token}`);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("message", "Unauthorized");
  });

  test("POST /api/auth/login returns 401 for wrong credentials", async () => {
    const response = await sendRequest("POST", "/api/auth/login", {
      email: "wrong@example.com",
      password: "wrongpassword",
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("message", "Invalid credentials");
  });
});

describe("POST /api/auth/signup", () => {
  test("creates a new user and returns 201", async () => {
    const testUser = createTestUser();
    const response = await sendRequest("POST", "/api/auth/signup", testUser);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty("_id");
    expect(data).toHaveProperty("fullName", testUser.fullName);
    expect(data).toHaveProperty("email", testUser.email);
    expect(data).toHaveProperty("profilePic", "");
    expect(data).toHaveProperty("contentFilter", false);
    expect(data).not.toHaveProperty("password");
  });

  test("stores a hashed password in the database", async () => {
    const testUser = createTestUser();

    await sendRequest("POST", "/api/auth/signup", testUser);
    const userInDb = await User.findOne({ email: testUser.email });

    expect(userInDb).toBeDefined();
    expect(userInDb.password).not.toBe(testUser.password);
  });

  test("generates a jwt cookie after signup", async () => {
    const testUser = createTestUser();
    const response = await sendRequest("POST", "/api/auth/signup", testUser);
    const jwtCookie = getJwtCookie(response);

    expect(response.status).toBe(201);
    expect(jwtCookie.startsWith(`${ENV.JWT_COOKIE_NAME || "jwt"}=`)).toBe(true);
  });

  test("returns 409 when email already exists", async () => {
    const testUser = createTestUser();

    await sendRequest("POST", "/api/auth/signup", testUser);
    const response = await sendRequest("POST", "/api/auth/signup", testUser);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data).toHaveProperty("message", "Email already exists");
  });

  test("returns 400 for invalid email format", async () => {
    const response = await sendRequest("POST", "/api/auth/signup", {
      fullName: "Test User",
      email: "invalid-email",
      password: "Test@1234",
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty("message", "Please provide a valid email address");
  });

  test("returns 400 when password is too short", async () => {
    const response = await sendRequest("POST", "/api/auth/signup", {
      fullName: "Test User",
      email: "test-short-password@gmail.com",
      password: "12345",
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty("message", "Password must be between 6 and 72 characters");
  });
});

describe("POST /api/auth/login", () => {
  test("logs in with correct credentials and returns 200", async () => {
    const testUser = createTestUser();

    await sendRequest("POST", "/api/auth/signup", testUser);
    const response = await sendRequest("POST", "/api/auth/login", {
      email: testUser.email,
      password: testUser.password,
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("_id");
    expect(data).toHaveProperty("fullName", testUser.fullName);
    expect(data).toHaveProperty("email", testUser.email);
    expect(data).toHaveProperty("profilePic", "");
    expect(data).toHaveProperty("contentFilter", false);
    expect(data).not.toHaveProperty("password");
  });

  test("returns 400 when login payload is invalid", async () => {
    const response = await sendRequest("POST", "/api/auth/login", {
      email: "",
      password: "",
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty("message", "Email must be between 5 and 254 characters");
  });

  test("returns 401 when email does not exist", async () => {
    const response = await sendRequest("POST", "/api/auth/login", {
      email: "nothing@gmail.com",
      password: "Test@1234",
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("message", "Invalid credentials");
  });

  test("returns 401 when password is wrong", async () => {
    const testUser = createTestUser();

    await sendRequest("POST", "/api/auth/signup", testUser);
    const response = await sendRequest("POST", "/api/auth/login", {
      email: testUser.email,
      password: "WrongPassword123",
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("message", "Invalid credentials");
  });
});

describe("POST /api/auth/logout", () => {
  test("logs out an authenticated user and clears the cookie", async () => {
    const testUser = createTestUser();

    await sendRequest("POST", "/api/auth/signup", testUser);
    const loginResponse = await sendRequest("POST", "/api/auth/login", {
      email: testUser.email,
      password: testUser.password,
    });
    const jwtCookie = getJwtCookie(loginResponse);

    const response = await sendRequest("POST", "/api/auth/logout", {}, jwtCookie);
    const data = await response.json();
    const clearedCookie = response.headers.get("set-cookie") || "";

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("message", "Logged out successfully");
    expect(clearedCookie).toContain(`${ENV.JWT_COOKIE_NAME || "jwt"}=`);
  });
});

describe("protected auth routes", () => {
  test("PUT /api/auth/update-profile returns 401 without authentication", async () => {
    const response = await sendRequest("PUT", "/api/auth/update-profile", {
      profilePic: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("message", "Unauthorized");
  });

  test("PATCH /api/auth/content-filter updates the preference for an authenticated user", async () => {
    const testUser = createTestUser();

    await sendRequest("POST", "/api/auth/signup", testUser);
    const loginResponse = await sendRequest("POST", "/api/auth/login", {
      email: testUser.email,
      password: testUser.password,
    });
    const jwtCookie = getJwtCookie(loginResponse);

    const response = await sendRequest(
      "PATCH",
      "/api/auth/content-filter",
      { contentFilter: true },
      jwtCookie
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("contentFilter", true);
  });
});
