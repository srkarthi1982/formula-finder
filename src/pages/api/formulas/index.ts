import type { APIRoute } from "astro";
import {
  createFormulaForUser,
  listFormulasByUser,
  summarizeFormulas,
} from "../../../lib/formulas";
import { sendDashboardSummary, sendHighSignalNotification } from "../../../lib/integrations";
import { jsonResponse, requireApiUser } from "../../../lib/http";

export const GET: APIRoute = async ({ locals, url }) => {
  const user = requireApiUser(locals);
  const query = url.searchParams.get("status");
  const favoritesOnly = url.searchParams.get("favoritesOnly") === "1";

  const formulas = await listFormulasByUser(user.id);
  const items = formulas.filter((formula) => {
    if ((query === "active" || query === "archived") && formula.status !== query) return false;
    if (favoritesOnly && !formula.isFavorite) return false;
    return true;
  });

  return jsonResponse({ items, total: items.length });
};

export const POST: APIRoute = async ({ locals, request }) => {
  const user = requireApiUser(locals);
  const payload = await request.json();

  const formula = await createFormulaForUser(user.id, payload);
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

  if (summary.total === 1) {
    await sendHighSignalNotification({
      userId: user.id,
      type: "formula.first_created",
      title: "First formula saved",
      message: `You saved your first formula: ${formula.title}`,
      meta: { formulaId: formula.id },
    });
  }

  return jsonResponse({ formula }, 201);
};
