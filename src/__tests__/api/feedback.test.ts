const mockGetUser = jest.fn();
const mockMaybeSingle = jest.fn();
const mockAdminInsert = jest.fn();
const mockResendSend = jest.fn();

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

jest.mock("@/lib/supabase-server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getUser: () => mockGetUser() },
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => mockMaybeSingle(),
            }),
          }),
        }),
      }),
    }),
}));

jest.mock("@/lib/supabase-admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (row: unknown) => mockAdminInsert(row),
    }),
  }),
}));

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: (...args: unknown[]) => mockResendSend(...args) },
  })),
}));

import { POST } from "@/app/api/feedback/route";

function makeRequest(body: unknown): InstanceType<typeof import("next/server").NextRequest> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextRequest } = require("next/server");
  return new NextRequest(JSON.stringify(body));
}

describe("POST /api/feedback", () => {
  const originalKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.RESEND_API_KEY;
  });

  afterAll(() => {
    process.env.RESEND_API_KEY = originalKey;
  });

  it("returns 400 when job_id is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest({ job_id: "job-1" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Not authenticated");
  });

  it("returns 403 when the job does not belong to the authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockMaybeSingle.mockResolvedValue({ data: null });

    const res = await POST(
      makeRequest({ job_id: "job-1", user_id: "someone-elses-id" })
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("Job not found");
  });

  it("ignores a client-supplied user_id and uses the authenticated session's id", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "real-user" } } });
    mockMaybeSingle.mockResolvedValue({ data: { id: "job-1" } });
    mockAdminInsert.mockResolvedValue({ error: null });

    await POST(
      makeRequest({
        job_id: "job-1",
        user_id: "spoofed-user-id",
        role: "Researcher",
        field: "Physics",
        accurate: "Yes",
        clarity: "5",
        animations: "4",
        improve: "nothing",
        use_again: "Definitely",
        purpose: "YouTube / public content",
        extra: "great",
      })
    );

    expect(mockAdminInsert).toHaveBeenCalledWith({
      feedback_type: "video",
      job_id: "job-1",
      user_id: "real-user",
      role: "Researcher",
      field: "Physics",
      accuracy_rating: "Yes",
      clarity_rating: "5",
      animation_helpfulness: "4",
      improvement_suggestions: "nothing",
      would_return: "Definitely",
      content_type: "YouTube / public content",
      additional_comments: "great",
    });
  });

  it("accepts product feedback with no job_id and skips the job ownership check", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "real-user" } } });
    mockAdminInsert.mockResolvedValue({ error: null });

    const res = await POST(
      makeRequest({
        feedback_type: "product",
        top_missing_feature: "Custom voice",
        features_wanted: ["Custom voice", "Script editing"],
        nps_score: "9",
        extra: "love it",
      })
    );
    const resBody = await res.json();

    expect(res.status).toBe(200);
    expect(resBody.ok).toBe(true);
    expect(mockMaybeSingle).not.toHaveBeenCalled();
    expect(mockAdminInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        feedback_type: "product",
        job_id: null,
        user_id: "real-user",
        top_missing_feature: "Custom voice",
        features_wanted: ["Custom voice", "Script editing"],
        nps_score: "9",
        additional_comments: "love it",
      })
    );
  });

  it("returns 401 for product feedback when not authenticated, without requiring job_id", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest({ feedback_type: "product" }));

    expect(res.status).toBe(401);
    expect(mockAdminInsert).not.toHaveBeenCalled();
  });

  it("returns 500 when the insert fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "real-user" } } });
    mockMaybeSingle.mockResolvedValue({ data: { id: "job-1" } });
    mockAdminInsert.mockResolvedValue({ error: { message: "db error" } });

    const res = await POST(makeRequest({ job_id: "job-1" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to save feedback");
  });

  it("returns 200 and skips email when RESEND_API_KEY is not set", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "real-user" } } });
    mockMaybeSingle.mockResolvedValue({ data: { id: "job-1" } });
    mockAdminInsert.mockResolvedValue({ error: null });

    const res = await POST(makeRequest({ job_id: "job-1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("sends a notification email when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "test-key";
    mockGetUser.mockResolvedValue({ data: { user: { id: "real-user" } } });
    mockMaybeSingle.mockResolvedValue({ data: { id: "job-1" } });
    mockAdminInsert.mockResolvedValue({ error: null });
    mockResendSend.mockResolvedValue({});

    await POST(makeRequest({ job_id: "job-1" }));

    expect(mockResendSend).toHaveBeenCalled();
  });
});
