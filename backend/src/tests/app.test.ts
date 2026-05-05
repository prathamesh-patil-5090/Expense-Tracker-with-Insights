import request from "supertest";
import app from "../index.js";

describe("Backend app integration", () => {
  test("GET /health returns status ok", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "ok" });
    expect(typeof response.body.timestamp).toBe("string");
  });

  test("GET /api returns JSON 404 response", async () => {
    const response = await request(app).get("/api");
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: "Not Found" });
  });
});
