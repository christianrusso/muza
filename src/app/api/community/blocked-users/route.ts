import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import { loadBlockedUsers } from "@/lib/community/blocks";

export async function GET() {
  if (!isDemoMode()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "No autenticado." } },
        { status: 401 },
      );
    }
  }

  try {
    return NextResponse.json({ data: await loadBlockedUsers() });
  } catch {
    return NextResponse.json(
      { error: { code: "BLOCKED_USERS_LOAD_FAILED", message: "No se pudo cargar la lista." } },
      { status: 500 },
    );
  }
}
