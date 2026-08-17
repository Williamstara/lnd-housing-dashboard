"use client";

import { RedirectToSignIn, Show } from "@clerk/nextjs";

// Client Components can't call auth.protect() (server-only) -- this is
// Clerk's documented client-side equivalent for the couple of pages
// (mallar, planritningar) that fetch their data via API routes instead of
// server-side data fetching. Those API routes already enforce real auth
// (401 if signed out) -- this only fixes the signed-out UX (redirect to
// sign-in instead of rendering a page whose fetch calls silently fail).
// See https://clerk.com/docs/guides/development/upgrading/upgrade-guides/migrate-from-create-route-matcher
export default function RequireSignedIn({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
    </>
  );
}
