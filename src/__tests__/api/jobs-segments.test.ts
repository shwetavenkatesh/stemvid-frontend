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
    input: { Prefix?: string; Key?: string };
    constructor(input: { Prefix?: string; Key?: string }) {
      mockListObjectsV2Command(input);
      this.input = input;
    }
  },
  GetObjectCommand: class {
    input: { Prefix?: string; Key?: string };
    constructor(input: { Prefix?: string; Key?: string }) {
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
  statusRows: Record<string, unknown>[] = []
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
        eq: () => Promise.resolve({ data: statusRows }),
      }),
    };
  });
}

function mockR2({
  segmentKeys = [],
  audioKeys = [],
  segmentsJsonBody,
  scriptBody,
}: {
  segmentKeys?: string[];
  audioKeys?: string[];
  segmentsJsonBody?: string;
  scriptBody?: string;
}) {
  mockSend.mockImplementation((cmd: { input: { Prefix?: string; Key?: string } }) => {
    if (cmd.input.Prefix?.startsWith("videos/segments/")) {
      return Promise.resolve({ Contents: segmentKeys.map((Key) => ({ Key })) });
    }
    if (cmd.input.Prefix?.startsWith("videos/audio/")) {
      return Promise.resolve({ Contents: audioKeys.map((Key) => ({ Key })) });
    }
    if (cmd.input.Key?.endsWith("segments.json")) {
      if (segmentsJsonBody === undefined) return Promise.reject(new Error("NoSuchKey"));
      return Promise.resolve({ Body: { transformToString: () => Promise.resolve(segmentsJsonBody) } });
    }
    if (cmd.input.Key?.endsWith("script.md")) {
      if (scriptBody === undefined) return Promise.reject(new Error("NoSuchKey"));
      return Promise.resolve({ Body: { transformToString: () => Promise.resolve(scriptBody) } });
    }
    return Promise.reject(new Error(`unexpected key: ${cmd.input.Key}`));
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

  it("returns segments sorted by index, using status rows when present", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables(
      { id: "job-1", status: "reviewing" },
      [
        { segment_index: 0, video_status: "ready", audio_status: "ready" },
        { segment_index: 1, video_status: "regenerating", audio_status: "ready" },
      ]
    );
    mockR2({ segmentKeys: ["videos/segments/job-1/seg_01.mp4", "videos/segments/job-1/seg_00.mp4"] });

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.job_status).toBe("reviewing");
    expect(body.segments).toEqual([
      {
        index: 0,
        video_url: "https://r2.example.com/signed-url",
        video_status: "ready",
        audio_status: "ready",
        audio_url: null,
        narration_text: null,
        duration: null,
        regenerated: false,
      },
      {
        index: 1,
        video_url: "https://r2.example.com/signed-url",
        video_status: "regenerating",
        audio_status: "ready",
        audio_url: null,
        narration_text: null,
        duration: null,
        regenerated: false,
      },
    ]);
  });

  it("includes a seeded segment with no rendered mp4 yet as pending, with a null video_url", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables(
      { id: "job-1", status: "creating_animations" },
      [{ segment_index: 0, video_status: "pending", audio_status: "ready" }]
    );
    mockR2({ segmentKeys: [] });

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(body.segments).toEqual([
      { index: 0, video_url: null, video_status: "pending", audio_status: "ready", audio_url: null, narration_text: null, duration: null, regenerated: false },
    ]);
  });

  it("reflects regenerated=true from the status row", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables(
      { id: "job-1", status: "reviewing" },
      [{ segment_index: 0, video_status: "ready", audio_status: "ready", regenerated: true }]
    );
    mockR2({ segmentKeys: [] });

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(body.segments[0].regenerated).toBe(true);
  });

  it("infers ready status for a legacy segment with an mp4 but no status row", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables({ id: "job-1", status: "reviewing" }, []);
    mockR2({ segmentKeys: ["videos/segments/job-1/seg_00.mp4"] });

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(body.segments).toEqual([
      {
        index: 0,
        video_url: "https://r2.example.com/signed-url",
        video_status: "ready",
        audio_status: "ready",
        audio_url: null,
        narration_text: null,
        duration: null,
        regenerated: false,
      },
    ]);
  });

  it("ignores non-mp4 keys under the segments prefix", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables({ id: "job-1", status: "reviewing" }, []);
    mockR2({ segmentKeys: ["videos/segments/job-1/seg_00.mp4", "videos/segments/job-1/.keep"] });

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(body.segments).toHaveLength(1);
    expect(body.segments[0].index).toBe(0);
  });

  it("includes narration_text once segments.json is available", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables(
      { id: "job-1", status: "creating_animations" },
      [{ segment_index: 0, video_status: "pending", audio_status: "ready" }]
    );
    mockR2({
      segmentKeys: [],
      segmentsJsonBody: JSON.stringify([{ narration_text: "Hello world." }]),
    });

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(body.segments[0].narration_text).toBe("Hello world.");
  });

  it("leaves narration_text null when segments.json isn't uploaded yet", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables(
      { id: "job-1", status: "generating_audio" },
      [{ segment_index: 0, video_status: "pending", audio_status: "pending" }]
    );
    mockR2({ segmentKeys: [] });

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(body.segments[0].narration_text).toBeNull();
  });

  it("includes duration once segments.json is available", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables(
      { id: "job-1", status: "creating_animations" },
      [{ segment_index: 0, video_status: "pending", audio_status: "ready" }]
    );
    mockR2({
      segmentKeys: [],
      segmentsJsonBody: JSON.stringify([{ narration_text: "Hi.", duration: 12.5 }]),
    });

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(body.segments[0].duration).toBe(12.5);
  });

  it("includes a signed audio_url once the segment's mp3 exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables(
      { id: "job-1", status: "creating_animations" },
      [{ segment_index: 0, video_status: "pending", audio_status: "ready" }]
    );
    mockR2({ segmentKeys: [], audioKeys: ["videos/audio/job-1/seg_00.mp3"] });

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(body.segments[0].audio_url).toBe("https://r2.example.com/signed-url");
  });

  it("leaves audio_url null when the segment's mp3 doesn't exist yet", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables(
      { id: "job-1", status: "generating_audio" },
      [{ segment_index: 0, video_status: "pending", audio_status: "pending" }]
    );
    mockR2({ segmentKeys: [], audioKeys: [] });

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(body.segments[0].audio_url).toBeNull();
  });

  it("includes the raw script once script.md is available", async () => {
    // script.md uploads the moment the script is written — well before
    // segments.json, which needs the whole audio stage to finish first. This is
    // the early-availability fallback the script dock uses while narration_text
    // per segment is still empty.
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables({ id: "job-1", status: "generating_audio" }, []);
    mockR2({ segmentKeys: [], scriptBody: "# Title\n\nNarration: Hello.\n[VISUAL: a circle]" });

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(body.script).toBe("# Title\n\nNarration: Hello.\n[VISUAL: a circle]");
  });

  it("leaves script null when script.md isn't uploaded yet", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockTables({ id: "job-1", status: "queued" }, []);
    mockR2({ segmentKeys: [] });

    const res = await GET(makeRequest(), makeParams("job-1"));
    const body = await res.json();

    expect(body.script).toBeNull();
  });
});
