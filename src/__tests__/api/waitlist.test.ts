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

import { POST } from "@/app/api/waitlist/route";

function makeRequest(body: unknown): InstanceType<typeof import("next/server").NextRequest> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextRequest } = require("next/server");
  return new NextRequest(JSON.stringify(body));
}

describe("POST /api/waitlist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 409 with 'duplicate' when the email already exists", async () => {
    mockInsert.mockResolvedValue({ error: { code: "23505" } });

    const res = await POST(makeRequest({ email: "ada@example.com" }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("duplicate");
  });

  it("returns 500 on other db errors", async () => {
    mockInsert.mockResolvedValue({ error: { code: "XXOOO", message: "db down" } });

    const res = await POST(makeRequest({ email: "ada@example.com" }));

    expect(res.status).toBe(500);
  });

  it("returns 200 and inserts the email on success", async () => {
    mockInsert.mockResolvedValue({ error: null });

    const res = await POST(makeRequest({ email: "ada@example.com" }));
    const body = await res.json();

    expect(mockInsert).toHaveBeenCalledWith({ email: "ada@example.com" });
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});
