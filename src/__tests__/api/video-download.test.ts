const mockGetSignedUrl = jest.fn();
const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockGetObjectCommand = jest.fn().mockImplementation((input) => input);

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

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(),
  GetObjectCommand: class {
    input: unknown;
    constructor(input: unknown) {
      mockGetObjectCommand(input);
      this.input = input;
    }
  },
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

jest.mock("@/lib/supabase-server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getUser: () => mockGetUser() },
      from: (table: string) => mockFrom(table),
    }),
}));

import { GET } from "@/app/api/video/[jobId]/route";

function makeRequest(): InstanceType<typeof import("next/server").NextRequest> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextRequest } = require("next/server");
  return new NextRequest("http://localhost/api/video/job-1");
}

function makeParams(jobId: string): { params: Promise<{ jobId: string }> } {
  return { params: Promise.resolve({ jobId }) };
}

function mockSupabaseJob(job: Record<string, unknown> | null) {
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

describe("GET /api/video/[jobId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 404 when job does not exist", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabaseJob(null);

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Job not found");
  });

  it("returns 400 when job is not ready", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabaseJob({
      id: "job-1",
      user_id: "user-1",
      title: "Test Video",
      status: "rendering",
      video_url: null,
    });

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Video not ready");
  });

  it("returns 400 when status is ready but video_url is null", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabaseJob({
      id: "job-1",
      user_id: "user-1",
      title: "Test Video",
      status: "ready",
      video_url: null,
    });

    const res = await GET(makeRequest(), makeParams("job-1"));
    expect(res.status).toBe(400);
  });

  it("returns signed URL for ready job", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabaseJob({
      id: "job-1",
      user_id: "user-1",
      title: "My Research Paper",
      status: "ready",
      video_url: "videos/job-1/final.mp4",
    });
    mockGetSignedUrl.mockResolvedValue("https://r2.example.com/signed-url");

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe("https://r2.example.com/signed-url");
  });

  it("sanitizes filename from job title", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabaseJob({
      id: "job-1",
      user_id: "user-1",
      title: "My Paper: A Study (2026)",
      status: "ready",
      video_url: "videos/job-1/final.mp4",
    });
    mockGetSignedUrl.mockResolvedValue("https://r2.example.com/signed-url");

    await GET(makeRequest(), makeParams("job-1"));

    expect(mockGetObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        ResponseContentDisposition:
          'attachment; filename="My_Paper__A_Study__2026_.mp4"',
      })
    );
  });

  it("uses fallback filename when title is empty", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabaseJob({
      id: "job-1",
      user_id: "user-1",
      title: "",
      status: "ready",
      video_url: "videos/job-1/final.mp4",
    });
    mockGetSignedUrl.mockResolvedValue("https://r2.example.com/signed-url");

    await GET(makeRequest(), makeParams("job-1"));

    expect(mockGetObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        ResponseContentDisposition: 'attachment; filename="video.mp4"',
      })
    );
  });

  it("passes correct R2 object key", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabaseJob({
      id: "job-1",
      user_id: "user-1",
      title: "Test",
      status: "ready",
      video_url: "videos/job-1/final.mp4",
    });
    mockGetSignedUrl.mockResolvedValue("https://r2.example.com/signed-url");

    await GET(makeRequest(), makeParams("job-1"));

    expect(mockGetObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Key: "videos/job-1/final.mp4",
      })
    );
  });

  it("returns 500 when signing fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabaseJob({
      id: "job-1",
      user_id: "user-1",
      title: "Test",
      status: "ready",
      video_url: "videos/job-1/final.mp4",
    });
    mockGetSignedUrl.mockRejectedValue(new Error("R2 credentials invalid"));

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to generate download link");
  });

  it("requests 5 minute expiry on signed URL", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabaseJob({
      id: "job-1",
      user_id: "user-1",
      title: "Test",
      status: "ready",
      video_url: "videos/job-1/final.mp4",
    });
    mockGetSignedUrl.mockResolvedValue("https://r2.example.com/signed-url");

    await GET(makeRequest(), makeParams("job-1"));

    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 300 }
    );
  });
});
