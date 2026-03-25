import { ActionError } from "astro:actions";

export function requireApiUser(locals: App.Locals) {
  if (!locals.user) {
    throw new ActionError({ code: "UNAUTHORIZED", message: "Authentication required." });
  }

  return locals.user;
}

export function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
