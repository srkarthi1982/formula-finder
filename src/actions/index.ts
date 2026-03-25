import { ActionError, defineAction, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";
import {
  createFormulaForUser,
  getFormulaByIdForUser,
  listFormulasByUser,
  setFormulaArchivedState,
  summarizeFormulas,
  toggleFormulaFavoriteForUser,
  updateFormulaForUser,
} from "../lib/formulas";
import { sendDashboardSummary, sendHighSignalNotification } from "../lib/integrations";

const subjectSchema = z
  .enum(["math", "physics", "chemistry", "statistics", "finance", "custom"])
  .nullable()
  .optional();

const createSchema = z.object({
  title: z.string().min(1).max(120),
  subject: subjectSchema,
  topic: z.string().max(120).nullable().optional(),
  expression: z.string().min(1).max(1000),
  variablesText: z.string().max(2000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  exampleText: z.string().max(2000).nullable().optional(),
});

const updateSchema = createSchema.partial().extend({
  id: z.number().int(),
}).refine((value) => Object.keys(value).some((key) => key !== "id"), {
  message: "At least one editable field must be included.",
});

function requireUser(context: ActionAPIContext) {
  const user = (context.locals as App.Locals | undefined)?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in.",
    });
  }

  return user;
}

async function emitIntegrations(userId: string) {
  const formulas = await listFormulasByUser(userId);
  const summary = summarizeFormulas(formulas);

  await sendDashboardSummary({
    userId,
    summary: {
      total: summary.total,
      favorites: summary.favorites,
      subjectCount: summary.subjectCount,
      latestTitle: summary.latestTitle,
    },
  });

  return { formulas, summary };
}

export const server = {
  createFormula: defineAction({
    input: createSchema,
    handler: async (input, context) => {
      const user = requireUser(context);
      const formula = await createFormulaForUser(user.id, input);

      const { summary } = await emitIntegrations(user.id);
      if (summary.total === 1) {
        await sendHighSignalNotification({
          userId: user.id,
          type: "formula.first_created",
          title: "First formula saved",
          message: `You saved your first formula: ${formula.title}`,
          meta: { formulaId: formula.id },
        });
      }

      return { success: true, data: { formula } };
    },
  }),

  updateFormula: defineAction({
    input: updateSchema,
    handler: async (input, context) => {
      const user = requireUser(context);
      const updated = await updateFormulaForUser(input.id, user.id, input);

      if (!updated) {
        throw new ActionError({ code: "NOT_FOUND", message: "Formula not found." });
      }

      await emitIntegrations(user.id);
      return { success: true, data: { formula: updated } };
    },
  }),

  archiveFormula: defineAction({
    input: z.object({ id: z.number().int() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const formula = await setFormulaArchivedState(input.id, user.id, "archived");
      if (!formula) throw new ActionError({ code: "NOT_FOUND", message: "Formula not found." });
      await emitIntegrations(user.id);
      return { success: true, data: { formula } };
    },
  }),

  restoreFormula: defineAction({
    input: z.object({ id: z.number().int() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const formula = await setFormulaArchivedState(input.id, user.id, "active");
      if (!formula) throw new ActionError({ code: "NOT_FOUND", message: "Formula not found." });
      await emitIntegrations(user.id);
      return { success: true, data: { formula } };
    },
  }),

  toggleFormulaFavorite: defineAction({
    input: z.object({ id: z.number().int(), isFavorite: z.boolean().optional() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const formula = await toggleFormulaFavoriteForUser(input.id, user.id, input.isFavorite);

      if (!formula) throw new ActionError({ code: "NOT_FOUND", message: "Formula not found." });

      const { formulas } = await emitIntegrations(user.id);
      const favorites = formulas.filter((item) => item.isFavorite).length;
      if (favorites === 1 && formula.isFavorite) {
        await sendHighSignalNotification({
          userId: user.id,
          type: "formula.first_favorite",
          title: "First favorite saved",
          message: `Favorited: ${formula.title}`,
          meta: { formulaId: formula.id },
        });
      }

      return { success: true, data: { formula } };
    },
  }),

  listFormulas: defineAction({
    input: z
      .object({
        status: z.enum(["active", "archived"]).optional(),
        favoritesOnly: z.boolean().optional(),
      })
      .optional(),
    handler: async (input, context) => {
      const user = requireUser(context);
      const formulas = await listFormulasByUser(user.id);

      const items = formulas.filter((formula) => {
        if (input?.status && formula.status !== input.status) return false;
        if (input?.favoritesOnly && !formula.isFavorite) return false;
        return true;
      });

      return { success: true, data: { items, total: items.length } };
    },
  }),

  getFormulaDetail: defineAction({
    input: z.object({ id: z.number().int() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const formula = await getFormulaByIdForUser(input.id, user.id);
      if (!formula) throw new ActionError({ code: "NOT_FOUND", message: "Formula not found." });
      return { success: true, data: { formula } };
    },
  }),
};
