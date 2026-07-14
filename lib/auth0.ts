import { Auth0Client, filterDefaultIdTokenClaims } from "@auth0/nextjs-auth0/server";
import { NATIONS_ID_CLAIM } from "./nations";
import { ROLES_CLAIM } from "./roles";

// Reads AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET and
// APP_BASE_URL from the environment. Mounts routes under /auth/* (login,
// logout, callback, profile, access-token, backchannel-logout).
export const auth0 = new Auth0Client({
  // Without this hook, the SDK strips the ID token down to a hardcoded
  // allowlist (sub, name, email, ...) before saving it to session.user,
  // silently dropping the custom roles claim the Auth0 Action adds.
  async beforeSessionSaved(session, _idToken) {
    return {
      ...session,
      user: {
        ...filterDefaultIdTokenClaims(session.user),
        [ROLES_CLAIM]: session.user[ROLES_CLAIM],
        [NATIONS_ID_CLAIM]: session.user[NATIONS_ID_CLAIM],
      },
    };
  },
});
