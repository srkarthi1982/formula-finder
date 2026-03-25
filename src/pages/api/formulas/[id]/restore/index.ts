import type { APIRoute } from "astro";
import { listFormulasByUser, setFormulaArchivedState, summarizeFormulas } from "../../../../../lib/formulas";
import { sendDashboardSummary } from "../../../../../lib/integrations";
import { jsonResponse, requireApiUser } from "../../../../../lib/http";

export const POST: APIRoute = async ({ locals, params }) => {
  const user = requireApiUser(locals);
  const id = Number(params.id);

  const formula = await setFormulaArchivedState(id, user.id, "active");
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
