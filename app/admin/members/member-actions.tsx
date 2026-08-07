"use client";

import { useTransition } from "react";
import { toggleSuspend, toggleAdminRole } from "@/app/actions/admin";

export default function MemberActions({
  userId,
  suspended,
  role,
}: {
  userId: string;
  suspended: boolean;
  role: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="admin-post-actions">
      <button
        className={`btn btn-sm ${suspended ? "btn-success" : "btn-danger"}`}
        disabled={isPending}
        onClick={() => {
          if (!suspended && !confirm("Suspend this account? They won't be able to post, comment, like, or follow.")) {
            return;
          }
          startTransition(() => {
            toggleSuspend(userId, !suspended);
          });
        }}
      >
        {suspended ? "Unsuspend" : "Suspend"}
      </button>
      <button
        className="btn btn-neutral btn-sm"
        disabled={isPending}
        onClick={() => {
          const makeAdmin = role !== "admin";
          const msg = makeAdmin ? "Make this user an admin?" : "Remove admin access from this user?";
          if (!confirm(msg)) return;
          startTransition(() => {
            toggleAdminRole(userId, makeAdmin);
          });
        }}
      >
        {role === "admin" ? "Remove Admin" : "Make Admin"}
      </button>
    </div>
  );
}
