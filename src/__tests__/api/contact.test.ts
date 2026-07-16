const mockInsert = jest.fn();

jest.mock("next/server", () => {
  class MockNextRequest {
    private body: string;
    constructor(body: string) {
      this.body = body;
    }
    json() {
      return Promise.resolve(JSON.parse(this.body));
    }
  }
  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        json: () => Promise.resolve(body),
      }),
    },
  };
});

jest.mock("@/lib/supabase-admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (row: unknown) => mockInsert(row),
    }),
  }),
}));

import { POST } from "@/app/api/contact/route";

function makeRequest(body: unknown): InstanceType<typeof import("next/server").NextRequest> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextRequest } = require("next/server");
  return new NextRequest(JSON.stringify(body));
}

describe("POST /api/contact", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when email or message is missing", async () => {
    const res = await POST(makeRequest({ name: "Ada" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when the insert fails", async () => {
    mockInsert.mockResolvedValue({ error: { message: "db error" } });

    const res = await POST(
      makeRequest({ email: "ada@example.com", message: "hi" })
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to send message");
  });

  it("inserts into contact_submissions with mapped columns", async () => {
    mockInsert.mockResolvedValue({ error: null });

    const res = await POST(
      makeRequest({
        name: "Ada",
        email: "ada@example.com",
        type: "bug",
        message: "broken",
      })
    );
    const body = await res.json();

    expect(mockInsert).toHaveBeenCalledWith({
      name: "Ada",
      email: "ada@example.com",
      subject: "bug",
      message: "broken",
    });
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("defaults subject to 'general' when type is omitted", async () => {
    mockInsert.mockResolvedValue({ error: null });

    await POST(makeRequest({ email: "ada@example.com", message: "hi" }));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "general" })
    );
  });
});
