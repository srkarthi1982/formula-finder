import type { APIRoute } from "astro";
import {
  listFormulasByUser,
  summarizeFormulas,
  toggleFormulaFavoriteForUser,
} from "../../../../../lib/formulas";
import { sendDashboardSummary, sendHighSignalNotification } from "../../../../../lib/integrations";
import { jsonResponse, requireApiUser } from "../../../../../lib/http";

export const POST: APIRoute = async ({ locals, params, request }) => {
  const user = requireApiUser(locals);
  const id = Number(params.id);
  const payload = await request.json().catch(() => ({}));

  const formula = await toggleFormulaFavoriteForUser(id, user.id, payload?.isFavorite);
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

  if (summary.favorites === 1 && formula.isFavorite) {
    await sendHighSignalNotification({
      userId: user.id,
      type: "formula.first_favorite",
      title: "First favorite saved",
      message: `Favorited: ${formula.title}`,
      meta: { formulaId: formula.id },
    });
  }

  return jsonResponse({ formula });
};
