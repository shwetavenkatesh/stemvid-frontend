const mockGetUser = jest.fn();
const mockFrom = jest.fn();
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
      from: (table: string) => mockFrom(table),
    }),
}));

global.fetch = mockFetch;
process.env.MODAL_WEBHOOK_URL = "https://modal.example.com/trigger";

import { POST } from "@/app/api/jobs/[jobId]/regenerate/route";

function makeRequest(body: unknown): InstanceType<typeof import("next/server").NextRequest> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextRequest } = require("next/server");
  return new NextRequest("http://localhost/api/jobs/job-1/regenerate", {
    body: JSON.stringify(body),
  });
}

function makeParams(jobId: string) {
  return { params: Promise.resolve({ jobId }) };
}

function mockJob(job: Record<string, unknown> | null) {
  mockFrom.mockReturnValue({
    select: () => ({
      eq: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: job }),
        }),
      }),
    }),
  });
}

describe("POST /api/jobs/[jobId]/regenerate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(
      makeRequest({ segment_index: 0, instructions: "bigger title" }),
      makeParams("job-1")
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 404 when job is not owned by the user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockJob(null);

    const res = await POST(
      makeRequest({ segment_index: 0, instructions: "bigger title" }),
      makeParams("job-1")
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Job not found");
  });

  it("returns 400 when job is not in review", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockJob({ id: "job-1", status: "rendering" });

    const res = await POST(
      makeRequest({ segment_index: 0, instructions: "bigger title" }),
      makeParams("job-1")
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/not in review/);
  });

  it("returns 400 when segment_index is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockJob({ id: "job-1", status: "reviewing" });

    const res = await POST(makeRequest({ instructions: "bigger title" }), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/required/);
  });

  it("returns 400 when instructions is blank", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockJob({ id: "job-1", status: "reviewing" });

    const res = await POST(
      makeRequest({ segment_index: 0, instructions: "   " }),
      makeParams("job-1")
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/required/);
  });

  it("returns 502 when Modal webhook fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockJob({ id: "job-1", status: "reviewing" });
    mockFetch.mockResolvedValue({ ok: false });

    const res = await POST(
      makeRequest({ segment_index: 3, instructions: "bigger title" }),
      makeParams("job-1")
    );
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toBe("Failed to start regeneration");
  });

  it("queues regeneration with the correct payload", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockJob({ id: "job-1", status: "reviewing" });
    mockFetch.mockResolvedValue({ ok: true });

    const res = await POST(
      makeRequest({ segment_index: 3, instructions: "  bigger title  " }),
      makeParams("job-1")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("queued");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://modal.example.com/trigger",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          type: "user_regenerate",
          job_id: "job-1",
          segment_index: 3,
          instructions: "bigger title",
        }),
      })
    );
  });
});
