const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockFetch = jest.fn();

jest.mock("next/server", () => {
  class MockNextRequest {
    url: string;
    constructor(url: string) {
      this.url = url;
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

import { POST } from "@/app/api/jobs/[jobId]/finalize/route";

function makeRequest(): InstanceType<typeof import("next/server").NextRequest> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextRequest } = require("next/server");
  return new NextRequest("http://localhost/api/jobs/job-1/finalize");
}

function makeParams(jobId: string) {
  return { params: Promise.resolve({ jobId }) };
}

function mockTables(job: Record<string, unknown> | null, inFlight: Record<string, unknown>[] = []) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "jobs") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: job }),
            }),
          }),
        }),
      };
    }
    // segment_status
    return {
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: inFlight }),
        }),
      }),
    };
  });
}

describe("POST /api/jobs/[jobId]/finalize", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 404 when job is not owned by the user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables(null);

    const res = await POST(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Job not found");
  });

  it("returns 400 when job is not in review", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables({ id: "job-1", status: "ready" });

    const res = await POST(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/nothing to finalize/i);
  });

  it("returns 409 when a segment is still regenerating", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables({ id: "job-1", status: "reviewing" }, [{ segment_index: 4 }]);

    const res = await POST(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toMatch(/still regenerating/i);
  });

  it("returns 502 when Modal webhook fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables({ id: "job-1", status: "reviewing" }, []);
    mockFetch.mockResolvedValue({ ok: false });

    const res = await POST(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toBe("Failed to start finalize");
  });

  it("queues finalize with the correct payload", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables({ id: "job-1", status: "reviewing" }, []);
    mockFetch.mockResolvedValue({ ok: true });

    const res = await POST(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("queued");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://modal.example.com/trigger",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ type: "user_finalize", job_id: "job-1" }),
      })
    );
  });
});
