"use client";

import { useEffect } from "react";
import { markAllNotificationsRead } from "@/app/actions/social";

export default function MarkReadOnView() {
  useEffect(() => {
    markAllNotificationsRead();
  }, []);
  return null;
}
