import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";
import { SESSION_COOKIE, signSession } from "../src/lib/session";

describe("admin access with optional two-factor authentication", () => {
  it("allows an authenticated administrator without MFA to open the dashboard", async () => {
    const token = await signSession({ uid: "admin-test", role: "ADMIN", name: "Admin", mfa: false });
    const request = new NextRequest("http://localhost/admin", { headers: { cookie: `${SESSION_COOKIE}=${token}` } });
    expect((await middleware(request)).headers.get("x-middleware-next")).toBe("1");
  });

  it("still redirects unauthenticated requests to sign-in", async () => {
    const response = await middleware(new NextRequest("http://localhost/admin"));
    expect(response.headers.get("location")).toBe("http://localhost/admin/login");
  });

  it("rejects an invalid session instead of exposing the panel", async () => {
    const request = new NextRequest("http://localhost/admin", { headers: { cookie: `${SESSION_COOKIE}=invalid` } });
    expect((await middleware(request)).headers.get("location")).toBe("http://localhost/admin/login");
  });
});
