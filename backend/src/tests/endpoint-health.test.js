const BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";

async function sendRequest(method, path, body) {
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("general backend endpoints", () => {
  test("GET /health should return 200", async () => {
    const response = await sendRequest("GET", "/health");

    expect(response.status).toBe(200);
    expect(response.status).toBeLessThan(500);
  });

  test("GET /metrics should return 200 and plain text", async () => {
    const response = await sendRequest("GET", "/metrics");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type") || "").toMatch(/text\/plain/);
  });
});

describe("auth endpoint health checks", () => {
  test("GET /api/auth/test should return 200", async () => {
    const response = await sendRequest("GET", "/api/auth/test");

    expect(response.status).toBe(200);
    expect(response.status).toBeLessThan(500);
  });

  test("POST /api/auth/signup should reject invalid signup data", async () => {
    const response = await sendRequest("POST", "/api/auth/signup", {
      fullName: "",
      email: "invalid",
      password: "short",
    });

    expect(response.status).toBe(400);
    expect(response.status).toBeLessThan(500);
  });

  test("POST /api/auth/login should reject invalid login data", async () => {
    const response = await sendRequest("POST", "/api/auth/login", {
      email: "invalid",
      password: "short",
    });

    expect(response.status).toBe(400);
    expect(response.status).toBeLessThan(500);
  });

  test("POST /api/auth/logout should require authentication", async () => {
    const response = await sendRequest("POST", "/api/auth/logout");

    expect(response.status).toBe(401);
    expect(response.status).toBeLessThan(500);
  });

  test("PUT /api/auth/update-profile should require authentication", async () => {
    const response = await sendRequest("PUT", "/api/auth/update-profile", {
      profilePic: "data:image/png;base64,AAAA",
    });

    expect(response.status).toBe(401);
    expect(response.status).toBeLessThan(500);
  });

  test("PATCH /api/auth/content-filter should require authentication", async () => {
    const response = await sendRequest("PATCH", "/api/auth/content-filter", {
      enabled: true,
    });

    expect(response.status).toBe(401);
    expect(response.status).toBeLessThan(500);
  });

  test("GET /api/auth/check should require authentication", async () => {
    const response = await sendRequest("GET", "/api/auth/check");

    expect(response.status).toBe(401);
    expect(response.status).toBeLessThan(500);
  });
});

describe("message endpoint health checks", () => {
  test("GET /api/message/contacts should require authentication", async () => {
    const response = await sendRequest("GET", "/api/message/contacts");

    expect(response.status).toBe(401);
    expect(response.status).toBeLessThan(500);
  });

  test("GET /api/message/chats should require authentication", async () => {
    const response = await sendRequest("GET", "/api/message/chats");

    expect(response.status).toBe(401);
    expect(response.status).toBeLessThan(500);
  });

  test("GET /api/message/:id should require authentication", async () => {
    const response = await sendRequest("GET", "/api/message/not-a-valid-id");

    expect(response.status).toBe(401);
    expect(response.status).toBeLessThan(500);
  });

  test("POST /api/message/send/:id should require authentication", async () => {
    const response = await sendRequest("POST", "/api/message/send/not-a-valid-id", {
      text: "health-check",
    });

    expect(response.status).toBe(401);
    expect(response.status).toBeLessThan(500);
  });
});
