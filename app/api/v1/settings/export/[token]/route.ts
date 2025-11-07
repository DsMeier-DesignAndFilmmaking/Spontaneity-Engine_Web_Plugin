import { NextRequest, NextResponse } from "next/server";
import { getUserFromReq, UnauthorizedError } from "@/lib/server-auth";
import { getSettingsExportByToken } from "@/lib/settings-store";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const user = await getUserFromReq(req);
    const record = await getSettingsExportByToken(token);
    if (!record) {
      return NextResponse.json({ error: "Export not found" }, { status: 404 });
    }
    if (record.user_id !== user.id) {
      throw new UnauthorizedError();
    }

    const body = JSON.stringify(record.artifact ?? {}, null, 2);
    const response = new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="travelai-settings-${user.id}.json"`,
      },
    });
    return response;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Export download error", error);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
