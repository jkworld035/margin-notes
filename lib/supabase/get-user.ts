import { cache } from "react";
import { createClient } from "./server";

// One auth lookup per request, shared by the header, layout and page.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
