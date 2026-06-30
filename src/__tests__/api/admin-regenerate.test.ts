const mockGetUser = jest.fn();
const mockFetch = jest.fn();

jest.mock("next/server", () => {
  class MockNextRequest {
    url: string;
    private body: unknown;
    constructor(url: string, init?: { body?: string }) {
      this.url = url;
      this.body = init?.body ? JSON.parse(init.body) : {};
    }
    async json() {
      return this.body;
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

jest.mock("@/lib/supabase-server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getUser: () => mockGetUser() },
    }),
}));

global.fetch = mockFetch;
process.env.MODAL_WEBHOOK_URL = "https://modal.example.com/trigger";

import { POST } from "@/app/api/admin/jobs/[jobId]/regenerate/route";

function makeRequest(body: unknown): InstanceType<typeof import("next/server").NextRequest> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextRequest } = require("next/server");
  return new NextRequest("http://localhost/api/admin/jobs/job-1/regenerate", {
    body: JSON.stringify(body),
  });
}

function makeParams(jobId: string) {
  return { params: Promise.resolve({ jobId }) };
}

describe("POST /api/admin/jobs/[jobId]/regenerate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest({ segments: [0] }), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when authenticated as non-admin email", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "other@example.com" } },
    });

    const res = await POST(makeRequest({ segments: [0] }), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 when segments array is empty", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "admin", email: "shwets.ven@gmail.com" } },
    });

    const res = await POST(makeRequest({ segments: [] }), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("segments required");
  });

  it("returns 400 when segments is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "admin", email: "shwets.ven@gmail.com" } },
    });

    const res = await POST(makeRequest({}), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("segments required");
  });

  it("returns 502 when Modal webhook fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "admin", email: "shwets.ven@gmail.com" } },
    });
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const res = await POST(makeRequest({ segments: [0, 2] }), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toBe("Failed to start regeneration");
  });

  it("returns 200 and queues regeneration", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "admin", email: "shwets.ven@gmail.com" } },
    });
    mockFetch.mockResolvedValue({ ok: true });

    const res = await POST(makeRequest({ segments: [0, 2, 6] }), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("queued");
  });

  it("sends correct payload to Modal webhook", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "admin", email: "shwets.ven@gmail.com" } },
    });
    mockFetch.mockResolvedValue({ ok: true });

    await POST(makeRequest({ segments: [0, 2] }), makeParams("job-1"));

    expect(mockFetch).toHaveBeenCalledWith(
      "https://modal.example.com/trigger",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          type: "admin_regenerate",
          job_id: "job-1",
          segments: [0, 2],
        }),
      })
    );
  });
});
