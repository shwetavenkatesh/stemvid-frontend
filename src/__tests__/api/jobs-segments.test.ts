const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockSend = jest.fn();
const mockGetSignedUrl = jest.fn();
const mockGetObjectCommand = jest.fn().mockImplementation((input) => input);
const mockListObjectsV2Command = jest.fn().mockImplementation((input) => input);

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
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  ListObjectsV2Command: class {
    input: unknown;
    constructor(input: unknown) {
      mockListObjectsV2Command(input);
      this.input = input;
    }
  },
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

import { GET } from "@/app/api/jobs/[jobId]/segments/route";

function makeRequest(): InstanceType<typeof import("next/server").NextRequest> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextRequest } = require("next/server");
  return new NextRequest("http://localhost/api/jobs/job-1/segments");
}

function makeParams(jobId: string) {
  return { params: Promise.resolve({ jobId }) };
}

function mockTables(
  job: Record<string, unknown> | null,
  statuses: Record<string, unknown>[] = []
) {
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
    return {
      select: () => ({
        eq: () => Promise.resolve({ data: statuses }),
      }),
    };
  });
}

describe("GET /api/jobs/[jobId]/segments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSignedUrl.mockResolvedValue("https://r2.example.com/signed-url");
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 404 when job is not owned by the user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables(null);

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Job not found");
  });

  it("returns segments sorted by index with status defaulting to ready", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables(
      { id: "job-1", status: "reviewing" },
      [{ segment_index: 1, status: "regenerating" }]
    );
    mockSend.mockResolvedValue({
      Contents: [
        { Key: "videos/segments/job-1/seg_01.mp4" },
        { Key: "videos/segments/job-1/seg_00.mp4" },
      ],
    });

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.job_status).toBe("reviewing");
    expect(body.segments).toEqual([
      { index: 0, video_url: "https://r2.example.com/signed-url", status: "ready" },
      { index: 1, video_url: "https://r2.example.com/signed-url", status: "regenerating" },
    ]);
  });

  it("ignores non-mp4 keys under the segments prefix", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables({ id: "job-1", status: "reviewing" }, []);
    mockSend.mockResolvedValue({
      Contents: [
        { Key: "videos/segments/job-1/seg_00.mp4" },
        { Key: "videos/segments/job-1/.keep" },
      ],
    });

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(body.segments).toHaveLength(1);
    expect(body.segments[0].index).toBe(0);
  });
});
