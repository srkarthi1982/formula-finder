import type { APIRoute } from "astro";
import { updateFormulaSchema } from "../../../../lib/formulaSchemas";
import {
  getFormulaByIdForUser,
  listFormulasByUser,
  summarizeFormulas,
  updateFormulaForUser,
} from "../../../../lib/formulas";
import { sendDashboardSummary } from "../../../../lib/integrations";
import { jsonResponse, requireApiUser } from "../../../../lib/http";

function getFormulaId(params: Record<string, string | undefined>) {
  const id = Number(params.id);
  return Number.isInteger(id) ? id : null;
}

export const GET: APIRoute = async ({ locals, params }) => {
  const user = requireApiUser(locals);
  const id = getFormulaId(params);
  if (id === null) return jsonResponse({ error: "Formula not found." }, 404);

  const formula = await getFormulaByIdForUser(id, user.id);
  if (!formula) return jsonResponse({ error: "Formula not found." }, 404);

  return jsonResponse({ formula });
};

export const PUT: APIRoute = async ({ locals, params, request }) => {
  const user = requireApiUser(locals);
  const id = getFormulaId(params);
  if (id === null) return jsonResponse({ error: "Formula not found." }, 404);

  const payload = updateFormulaSchema.safeParse({
    ...(await request.json().catch(() => ({}))),
    id,
  });

  if (!payload.success) {
    return jsonResponse({ error: "Invalid formula payload.", issues: payload.error.issues }, 400);
  }

  const formula = await updateFormulaForUser(id, user.id, payload.data);
  if (!formula) return jsonResponse({ error: "Formula not found." }, 404);

  const formulas = await listFormulasByUser(user.id);
  const summary = summarizeFormulas(formulas);

  await sendDashboardSummary({
    userId: user.id,
    summary: {
      total: summary.total,
      favorites: summary.favorites,
      subjectCount: summary.subjectCount,
      latestTitle: summary.latestTitle,
    },
  });

  return jsonResponse({ formula });
};
