import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getUserFromReq, UnauthorizedError } from "@/lib/server-auth";

const DEFAULT_PREFERENCES = {
  spontaneousMode: true,
  preferredRadius: 5,
  notifications: { push: true, email: false },
  interests: ["food", "music", "outdoors"],
  aiPersonalizationLevel: "adaptive" as const,
};

const DEFAULT_USER = {
  id: "demo-user-001",
  name: "Traveler",
};

function buildResponse(message: string, overrides = {}) {
  return {
    environment: process.env.NODE_ENV ?? "development",
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...overrides,
    },
    user: DEFAULT_USER,
    message,
  };
}

async function tryResolveUser(req: NextRequest) {
  try {
    const user = await getUserFromReq(req);
    return {
      id: user.id,
      name: user.name ?? DEFAULT_USER.name,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return DEFAULT_USER;
    }
    console.warn("[settings] getUserFromReq failed", error);
    return DEFAULT_USER;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await tryResolveUser(req);
  const payload = buildResponse(
    `Settings loaded successfully in ${(process.env.NODE_ENV ?? "development").toUpperCase()} mode.`
  );
  payload.user = user;
  return NextResponse.json(payload, { status: 200 });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await tryResolveUser(req);
    const body = await req.json().catch(() => ({}));
    const payload = buildResponse("Settings saved (mock response).", body);
    payload.user = user;
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid settings payload",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error("[settings][POST] unexpected error", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
