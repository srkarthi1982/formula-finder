import type { APIRoute } from "astro";
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
  if (!Number.isInteger(id)) throw new Error("Invalid formula id");
  return id;
}

export const GET: APIRoute = async ({ locals, params }) => {
  const user = requireApiUser(locals);
  const id = getFormulaId(params);

  const formula = await getFormulaByIdForUser(id, user.id);
  if (!formula) return jsonResponse({ error: "Formula not found." }, 404);

  return jsonResponse({ formula });
};

export const PUT: APIRoute = async ({ locals, params, request }) => {
  const user = requireApiUser(locals);
  const id = getFormulaId(params);
  const payload = await request.json();

  const formula = await updateFormulaForUser(id, user.id, payload);
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
