import { NextRequest, NextResponse } from "next/server";
import { saveGame, loadGame } from "@/lib/persistence";
import { GameStateSchema } from "@/lib/schemas";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const state = await loadGame(id);
  if (!state) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(state);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body: unknown = await req.json();
  const result = GameStateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "invalid state", details: result.error.flatten() },
      { status: 400 },
    );
  }
  const saved = await saveGame(id, result.data);
  if (!saved) {
    return NextResponse.json({ error: "storage unavailable" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
