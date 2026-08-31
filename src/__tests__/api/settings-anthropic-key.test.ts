const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockFetch = jest.fn();

jest.mock("next/server", () => {
  class MockNextRequest {
    private body: unknown;
    constructor(_url: string, init?: { body?: string }) {
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
      rpc: (fn: string, args?: unknown) => mockRpc(fn, args),
    }),
}));

global.fetch = mockFetch;

import { GET, POST, DELETE } from "@/app/api/settings/anthropic-key/route";

function makeRequest(body: unknown): InstanceType<typeof import("next/server").NextRequest> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextRequest } = require("next/server");
  return new NextRequest("http://localhost/api/settings/anthropic-key", {
    body: JSON.stringify(body),
  });
}

function mockProfile(profile: Record<string, unknown> | null) {
  mockFrom.mockReturnValue({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: profile }),
      }),
    }),
  });
}

describe("GET /api/settings/anthropic-key", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns hasKey: true when a key is on file", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockProfile({ anthropic_api_key_id: "some-uuid" });

    const res = await GET();
    const body = await res.json();

    expect(body.hasKey).toBe(true);
  });

  it("returns hasKey: false when no key is on file", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockProfile({ anthropic_api_key_id: null });

    const res = await GET();
    const body = await res.json();

    expect(body.hasKey).toBe(false);
  });
});

describe("POST /api/settings/anthropic-key", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest({ key: "sk-ant-test" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 when key is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const res = await POST(makeRequest({}));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/required/);
  });

  it("returns 400 and does not save when the key fails Anthropic validation", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFetch.mockResolvedValue({ ok: false });

    const res = await POST(makeRequest({ key: "sk-ant-bad" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/didn't validate/);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("validates against Anthropic's models endpoint, then saves via RPC", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFetch.mockResolvedValue({ ok: true });
    mockRpc.mockResolvedValue({ error: null });

    const res = await POST(makeRequest({ key: "sk-ant-good" }));

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/models",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-api-key": "sk-ant-good" }),
      })
    );
    expect(mockRpc).toHaveBeenCalledWith("save_byok_anthropic_key", { new_key: "sk-ant-good" });
  });

  it("returns 500 when the save RPC fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFetch.mockResolvedValue({ ok: true });
    mockRpc.mockResolvedValue({ error: { message: "db error" } });

    const res = await POST(makeRequest({ key: "sk-ant-good" }));

    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/settings/anthropic-key", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await DELETE();
    expect(res.status).toBe(401);
  });

  it("calls the remove RPC on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockRpc.mockResolvedValue({ error: null });

    const res = await DELETE();

    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith("remove_byok_anthropic_key", undefined);
  });

  it("returns 500 when the remove RPC fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockRpc.mockResolvedValue({ error: { message: "db error" } });

    const res = await DELETE();

    expect(res.status).toBe(500);
  });
});
