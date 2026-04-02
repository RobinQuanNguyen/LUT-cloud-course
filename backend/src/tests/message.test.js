import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { jest } from "@jest/globals";

import { ENV } from "../lib/env.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";
const mongoUri = process.env.MONGO_URI_TEST || ENV.MONGO_URI_TEST || process.env.MONGO_URI || ENV.MONGO_URI;

jest.setTimeout(30000);

function createTestUser(label) {
  const id = new mongoose.Types.ObjectId().toString();

  return {
    fullName: `Test User ${label}`,
    email: `message-test+${label}-${id}@gmail.com`,
    password: "Test@1234",
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
    throw new Error("MONGO_URI_TEST or MONGO_URI must be defined for message tests");
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  await User.deleteMany({ email: /message-test\+.*@gmail\.com/ });
  await Message.deleteMany({
    $or: [
      { text: /Message test:/ },
      { text: /Hello from user/ },
    ],
  });
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe("unauthenticated message access", () => {
  test("GET /api/message/:id returns 401 without token", async () => {
    const fakeUserId = new mongoose.Types.ObjectId().toString();
    const response = await sendRequest("GET", `/api/message/${fakeUserId}`);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("message", "Unauthorized");
  });

  test("GET /api/message/:id returns 401 with invalid token", async () => {
    const fakeUserId = new mongoose.Types.ObjectId().toString();
    const response = await sendRequest(
      "GET",
      `/api/message/${fakeUserId}`,
      undefined,
      "jwt=this-is-not-a-valid-token"
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("message", "Unauthorized");
  });

  test("GET /api/message/:id returns 401 when token user does not exist", async () => {
    const nonExistingUserId = new mongoose.Types.ObjectId().toString();
    const receiverId = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign({ userId: nonExistingUserId }, ENV.JWT_SECRET, { expiresIn: "7d" });

    const response = await sendRequest(
      "GET",
      `/api/message/${receiverId}`,
      undefined,
      `${ENV.JWT_COOKIE_NAME || "jwt"}=${token}`
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("message", "Unauthorized");
  });
});

describe("GET /api/message/contacts", () => {
  let firstUser;
  let secondUser;
  let firstUserCookie;

  beforeEach(async () => {
    firstUser = createTestUser("contacts-a");
    secondUser = createTestUser("contacts-b");

    const signupRes1 = await sendRequest("POST", "/api/auth/signup", firstUser);
    firstUserCookie = getJwtCookie(signupRes1);

    await sendRequest("POST", "/api/auth/signup", secondUser);
  });

  test("returns 200 and a list of contacts when authenticated", async () => {
    const totalUsers = await User.countDocuments();
    const response = await sendRequest("GET", "/api/message/contacts", undefined, firstUserCookie);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(totalUsers - 1);
    expect(data.some((user) => user.email === secondUser.email)).toBe(true);
  });

  test("returns 401 when not authenticated", async () => {
    const response = await sendRequest("GET", "/api/message/contacts");
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("message", "Unauthorized");
  });
});

describe("message endpoints", () => {
  let sender;
  let receiver;
  let thirdUser;
  let senderCookie;

  beforeEach(async () => {
    sender = createTestUser("sender");
    receiver = createTestUser("receiver");
    thirdUser = createTestUser("third");

    const senderSignup = await sendRequest("POST", "/api/auth/signup", sender);
    senderCookie = getJwtCookie(senderSignup);

    const senderData = await senderSignup.json();
    sender._id = senderData._id;

    const receiverSignup = await sendRequest("POST", "/api/auth/signup", receiver);
    const receiverData = await receiverSignup.json();
    receiver._id = receiverData._id;

    const thirdSignup = await sendRequest("POST", "/api/auth/signup", thirdUser);
    const thirdData = await thirdSignup.json();
    thirdUser._id = thirdData._id;
  });

  test("POST /api/message/send/:id sends a message successfully", async () => {
    const text = "Message test: hello from sender to receiver.";
    const response = await sendRequest(
      "POST",
      `/api/message/send/${receiver._id}`,
      { text },
      senderCookie
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty("message", "Message sent successfully");
    expect(data).toHaveProperty("data");
    expect(data.data).toHaveProperty("senderId", sender._id);
    expect(data.data).toHaveProperty("receiverId", receiver._id);
    expect(data.data).toHaveProperty("text", text);
    expect(data.data).toHaveProperty("_id");
    expect(data.data).toHaveProperty("createdAt");
  });

  test("GET /api/message/:id returns messages between authenticated user and target user", async () => {
    const text = "Message test: get messages between users.";

    await sendRequest(
      "POST",
      `/api/message/send/${receiver._id}`,
      { text },
      senderCookie
    );

    const response = await sendRequest("GET", `/api/message/${receiver._id}`, undefined, senderCookie);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0]).toHaveProperty("senderId", sender._id);
    expect(data[0]).toHaveProperty("receiverId", receiver._id);
    expect(data[0]).toHaveProperty("text", text);
    expect(data[0]).toHaveProperty("_id");
    expect(data[0]).toHaveProperty("createdAt");
  });

  test("GET /api/message/:id returns 404 when receiver does not exist", async () => {
    const missingUserId = new mongoose.Types.ObjectId().toString();
    const response = await sendRequest("GET", `/api/message/${missingUserId}`, undefined, senderCookie);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toHaveProperty("message", "User not found");
  });

  test("GET /api/message/chats returns chat partners", async () => {
    await sendRequest(
      "POST",
      `/api/message/send/${receiver._id}`,
      { text: "Hello from user 1 to user 2" },
      senderCookie
    );

    await sendRequest(
      "POST",
      `/api/message/send/${thirdUser._id}`,
      { text: "Hello from user 1 to user 3" },
      senderCookie
    );

    const response = await sendRequest("GET", "/api/message/chats", undefined, senderCookie);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
    expect(data.some((user) => user._id === receiver._id)).toBe(true);
    expect(data.some((user) => user._id === thirdUser._id)).toBe(true);
  });
});
