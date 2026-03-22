import { NextRequest, NextResponse } from "next/server";
import { FeedbackSchema } from "@/lib/schemas";
import { kv } from "@/lib/kv";

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  const result = FeedbackSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "invalid feedback", details: result.error.flatten() },
      { status: 400 },
    );
  }

  if (kv) {
    try {
      const key = `feedback:${Date.now()}`;
      await kv.set(key, JSON.stringify(result.data));
    } catch {
      // Log but don't fail the request
      console.error("Failed to persist feedback to KV");
    }
  }

  return NextResponse.json({ ok: true });
}
