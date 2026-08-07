"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false as const };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { supabase, ok: false as const };

  return { supabase, ok: true as const, user };
}

export async function toggleSuspend(targetUserId: string, suspend: boolean) {
  const { supabase, ok, user } = await requireAdmin();
  if (!ok) return { error: "Admins only." };
  if (user!.id === targetUserId) return { error: "You can't suspend your own account." };

  const { error } = await supabase.from("profiles").update({ suspended: suspend }).eq("id", targetUserId);
  if (error) return { error: error.message };

  revalidatePath("/admin/members");
  return { success: true };
}

export async function toggleAdminRole(targetUserId: string, makeAdmin: boolean) {
  const { supabase, ok, user } = await requireAdmin();
  if (!ok) return { error: "Admins only." };
  if (user!.id === targetUserId) return { error: "You can't change your own admin status." };

  const { error } = await supabase
    .from("profiles")
    .update({ role: makeAdmin ? "admin" : "user" })
    .eq("id", targetUserId);
  if (error) return { error: error.message };

  revalidatePath("/admin/members");
  return { success: true };
}
