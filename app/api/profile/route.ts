import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Add Firebase Auth integration to fetch user profile
  return NextResponse.json({ message: "Profile endpoint - to be implemented" });
}

