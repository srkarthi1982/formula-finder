import { defineAction, ActionError, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";
import {
  db,
  eq,
  and,
  FormulaGroups,
  Formulas,
  FormulaExamples,
  UserFormulaState,
} from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

const variableSchema = z.object({
  symbol: z.string().min(1),
  meaning: z.string().optional(),
  unit: z.string().optional(),
});

const updateGroupSchema = z
  .object({
    id: z.number().int(),
    name: z.string().min(1).optional(),
    subject: z.string().optional(),
    tags: z.string().optional(),
    description: z.string().optional(),
    slug: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (input) =>
      input.name !== undefined ||
      input.subject !== undefined ||
      input.tags !== undefined ||
      input.description !== undefined ||
      input.slug !== undefined ||
      input.isActive !== undefined,
    { message: "At least one field must be provided to update." }
  );

const updateFormulaSchema = z
  .object({
    id: z.number().int(),
    groupId: z.number().int().optional(),
    name: z.string().min(1).optional(),
    expression: z.string().min(1).optional(),
    description: z.string().optional(),
    variables: z.array(variableSchema).optional(),
    meta: z.record(z.any()).optional(),
    difficulty: z.enum(["basic", "intermediate", "advanced"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (input) =>
      input.groupId !== undefined ||
      input.name !== undefined ||
      input.expression !== undefined ||
      input.description !== undefined ||
      input.variables !== undefined ||
      input.meta !== undefined ||
      input.difficulty !== undefined ||
      input.isActive !== undefined,
    { message: "At least one field must be provided to update." }
  );

async function getOwnedGroup(groupId: number, userId: string) {
  const [group] = await db
    .select()
    .from(FormulaGroups)
    .where(eq(FormulaGroups.id, groupId));

  if (!group) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Formula group not found.",
    });
  }

  if (group.ownerId && group.ownerId !== userId) {
    throw new ActionError({
      code: "FORBIDDEN",
      message: "You do not have access to this group.",
    });
  }

  return group;
}

async function ensureFormulaIsEditable(formulaId: number, userId: string) {
  const [formula] = await db
    .select()
    .from(Formulas)
    .where(eq(Formulas.id, formulaId));

  if (!formula) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Formula not found.",
    });
  }

  if (formula.groupId !== null && formula.groupId !== undefined) {
    await getOwnedGroup(formula.groupId, userId);
  }

  return formula;
}

export const server = {
  createFormulaGroup: defineAction({
    input: z.object({
      name: z.string().min(1),
      subject: z.string().optional(),
      tags: z.string().optional(),
      description: z.string().optional(),
      slug: z.string().optional(),
      isActive: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const [group] = await db
        .insert(FormulaGroups)
        .values({
          ownerId: user.id,
          name: input.name,
          subject: input.subject,
          tags: input.tags,
          description: input.description,
          slug: input.slug,
          isActive: input.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return {
        success: true,
        data: { group },
      };
    },
  }),

  updateFormulaGroup: defineAction({
    input: updateGroupSchema,
    handler: async (input, context) => {
      const user = requireUser(context);

      await getOwnedGroup(input.id, user.id);

      const [updated] = await db
        .update(FormulaGroups)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.subject !== undefined ? { subject: input.subject } : {}),
          ...(input.tags !== undefined ? { tags: input.tags } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          updatedAt: new Date(),
        })
        .where(eq(FormulaGroups.id, input.id))
        .returning();

      return {
        success: true,
        data: { group: updated },
      };
    },
  }),

  listMyFormulaGroups: defineAction({
    input: z
      .object({
        includeInactive: z.boolean().default(false),
      })
      .optional(),
    handler: async (input, context) => {
      const user = requireUser(context);
      const includeInactive = input?.includeInactive ?? false;

      const groups = await db
        .select()
        .from(FormulaGroups)
        .where(
          includeInactive
            ? eq(FormulaGroups.ownerId, user.id)
            : and(
                eq(FormulaGroups.ownerId, user.id),
                eq(FormulaGroups.isActive, true)
              )
        );

      return {
        success: true,
        data: {
          items: groups,
          total: groups.length,
        },
      };
    },
  }),

  createFormula: defineAction({
    input: z.object({
      groupId: z.number().int().optional(),
      name: z.string().min(1),
      expression: z.string().min(1),
      description: z.string().optional(),
      variables: z.array(variableSchema).optional(),
      meta: z.record(z.any()).optional(),
      difficulty: z.enum(["basic", "intermediate", "advanced"]).default("basic"),
      isActive: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      if (input.groupId !== undefined) {
        await getOwnedGroup(input.groupId, user.id);
      }

      const [formula] = await db
        .insert(Formulas)
        .values({
          groupId: input.groupId,
          name: input.name,
          expression: input.expression,
          description: input.description,
          variables: input.variables,
          meta: input.meta,
          difficulty: input.difficulty,
          isActive: input.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return {
        success: true,
        data: { formula },
      };
    },
  }),

  updateFormula: defineAction({
    input: updateFormulaSchema,
    handler: async (input, context) => {
      const user = requireUser(context);
      const formula = await ensureFormulaIsEditable(input.id, user.id);

      if (input.groupId !== undefined) {
        await getOwnedGroup(input.groupId, user.id);
      } else if (formula.groupId !== null && formula.groupId !== undefined) {
        await getOwnedGroup(formula.groupId, user.id);
      }

      const [updated] = await db
        .update(Formulas)
        .set({
          ...(input.groupId !== undefined ? { groupId: input.groupId } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.expression !== undefined ? { expression: input.expression } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.variables !== undefined ? { variables: input.variables } : {}),
          ...(input.meta !== undefined ? { meta: input.meta } : {}),
          ...(input.difficulty !== undefined
            ? { difficulty: input.difficulty }
            : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          updatedAt: new Date(),
        })
        .where(eq(Formulas.id, input.id))
        .returning();

      return {
        success: true,
        data: { formula: updated },
      };
    },
  }),

  archiveFormula: defineAction({
    input: z.object({ id: z.number().int() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await ensureFormulaIsEditable(input.id, user.id);

      await db
        .update(Formulas)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(Formulas.id, input.id));

      return { success: true };
    },
  }),

  listFormulas: defineAction({
    input: z
      .object({
        groupId: z.number().int().optional(),
        difficulty: z.enum(["basic", "intermediate", "advanced"]).optional(),
        includeInactive: z.boolean().default(false),
      })
      .optional(),
    handler: async (input, context) => {
      requireUser(context);

      const includeInactive = input?.includeInactive ?? false;
      const filters = [];

      if (input?.groupId !== undefined) {
        filters.push(eq(Formulas.groupId, input.groupId));
      }

      if (input?.difficulty) {
        filters.push(eq(Formulas.difficulty, input.difficulty));
      }

      if (!includeInactive) {
        filters.push(eq(Formulas.isActive, true));
      }

      const baseQuery = db.select().from(Formulas);
      const formulas = filters.length
        ? await baseQuery.where(and(...filters))
        : await baseQuery;

      return {
        success: true,
        data: {
          items: formulas,
          total: formulas.length,
        },
      };
    },
  }),

  createFormulaExample: defineAction({
    input: z.object({
      formulaId: z.number().int(),
      title: z.string().optional(),
      problem: z.string().min(1),
      solution: z.string().min(1),
      data: z.record(z.any()).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const formula = await ensureFormulaIsEditable(input.formulaId, user.id);

      if (formula.groupId !== null && formula.groupId !== undefined) {
        await getOwnedGroup(formula.groupId, user.id);
      }

      const [example] = await db
        .insert(FormulaExamples)
        .values({
          formulaId: input.formulaId,
          title: input.title,
          problem: input.problem,
          solution: input.solution,
          data: input.data,
          createdAt: new Date(),
        })
        .returning();

      return {
        success: true,
        data: { example },
      };
    },
  }),

  listFormulaExamples: defineAction({
    input: z.object({
      formulaId: z.number().int(),
    }),
    handler: async (input, context) => {
      requireUser(context);

      const examples = await db
        .select()
        .from(FormulaExamples)
        .where(eq(FormulaExamples.formulaId, input.formulaId));

      return {
        success: true,
        data: {
          items: examples,
          total: examples.length,
        },
      };
    },
  }),

  upsertUserFormulaState: defineAction({
    input: z.object({
      formulaId: z.number().int(),
      isFavorite: z.boolean().optional(),
      note: z.string().optional(),
      familiarity: z
        .enum(["new", "learning", "comfortable", "mastered"])
        .optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const [existing] = await db
        .select()
        .from(UserFormulaState)
        .where(
          and(
            eq(UserFormulaState.formulaId, input.formulaId),
            eq(UserFormulaState.userId, user.id)
          )
        );

      if (existing) {
        const [state] = await db
          .update(UserFormulaState)
          .set({
            ...(input.isFavorite !== undefined
              ? { isFavorite: input.isFavorite }
              : {}),
            ...(input.note !== undefined ? { note: input.note } : {}),
            ...(input.familiarity !== undefined
              ? { familiarity: input.familiarity }
              : {}),
            updatedAt: now,
          })
          .where(eq(UserFormulaState.id, existing.id))
          .returning();

        return {
          success: true,
          data: { state },
        };
      }

      const [state] = await db
        .insert(UserFormulaState)
        .values({
          userId: user.id,
          formulaId: input.formulaId,
          isFavorite: input.isFavorite ?? false,
          note: input.note,
          familiarity: input.familiarity ?? "new",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return {
        success: true,
        data: { state },
      };
    },
  }),

  listUserFormulaStates: defineAction({
    input: z
      .object({
        favoritesOnly: z.boolean().default(false),
      })
      .optional(),
    handler: async (input, context) => {
      const user = requireUser(context);
      const favoritesOnly = input?.favoritesOnly ?? false;

      const filters = [
        eq(UserFormulaState.userId, user.id),
      ];

      if (favoritesOnly) {
        filters.push(eq(UserFormulaState.isFavorite, true));
      }

      const states = await db
        .select()
        .from(UserFormulaState)
        .where(and(...filters));

      return {
        success: true,
        data: {
          items: states,
          total: states.length,
        },
      };
    },
  }),
};
