import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";

export async function POST() {
  if (isDemoMode()) {
    const store = getDemoStore();
    store.analyses.clear();
    store.posts.clear();
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No autenticado." } }, { status: 401 });
  }

  const admin = createAdminClient();

  // Storage isn't covered by the DB's ON DELETE CASCADE, so clean it up explicitly.
  const { data: files } = await admin.storage.from("outfit-photos").list(user.id);
  if (files?.length) {
    await admin.storage.from("outfit-photos").remove(files.map((f) => `${user.id}/${f.name}`));
  }
  await admin.storage.from("avatars").remove([`${user.id}.jpg`]);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: { code: "DELETE_FAILED", message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
