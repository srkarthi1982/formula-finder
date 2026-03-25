import { and, db, desc, eq } from "astro:db";
import { Formulas } from "../../db/tables";

export type FormulaStatus = "active" | "archived";
export type FormulaSubject = "math" | "physics" | "chemistry" | "statistics" | "finance" | "custom";

export type FormulaInput = {
  title: string;
  subject?: FormulaSubject | null;
  topic?: string | null;
  expression: string;
  variablesText?: string | null;
  notes?: string | null;
  exampleText?: string | null;
};

export async function listFormulasByUser(userId: string) {
  return db
    .select()
    .from(Formulas)
    .where(eq(Formulas.userId, userId))
    .orderBy(desc(Formulas.updatedAt));
}

export async function getFormulaByIdForUser(id: number, userId: string) {
  const [formula] = await db
    .select()
    .from(Formulas)
    .where(and(eq(Formulas.id, id), eq(Formulas.userId, userId)));

  return formula ?? null;
}

export async function createFormulaForUser(userId: string, input: FormulaInput) {
  const now = new Date();
  const [formula] = await db
    .insert(Formulas)
    .values({
      userId,
      title: input.title,
      subject: input.subject ?? undefined,
      topic: input.topic ?? undefined,
      expression: input.expression,
      variablesText: input.variablesText ?? undefined,
      notes: input.notes ?? undefined,
      exampleText: input.exampleText ?? undefined,
      isFavorite: false,
      status: "active",
      createdAt: now,
      updatedAt: now,
      archivedAt: undefined,
    })
    .returning();

  return formula;
}

export async function updateFormulaForUser(id: number, userId: string, input: Partial<FormulaInput>) {
  const [updated] = await db
    .update(Formulas)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.subject !== undefined ? { subject: input.subject ?? undefined } : {}),
      ...(input.topic !== undefined ? { topic: input.topic ?? undefined } : {}),
      ...(input.expression !== undefined ? { expression: input.expression } : {}),
      ...(input.variablesText !== undefined ? { variablesText: input.variablesText ?? undefined } : {}),
      ...(input.notes !== undefined ? { notes: input.notes ?? undefined } : {}),
      ...(input.exampleText !== undefined ? { exampleText: input.exampleText ?? undefined } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(Formulas.id, id), eq(Formulas.userId, userId)))
    .returning();

  return updated ?? null;
}

export async function setFormulaArchivedState(id: number, userId: string, status: FormulaStatus) {
  const now = new Date();
  const [updated] = await db
    .update(Formulas)
    .set({
      status,
      archivedAt: status === "archived" ? now : undefined,
      updatedAt: now,
    })
    .where(and(eq(Formulas.id, id), eq(Formulas.userId, userId)))
    .returning();

  return updated ?? null;
}

export async function toggleFormulaFavoriteForUser(id: number, userId: string, isFavorite?: boolean) {
  const formula = await getFormulaByIdForUser(id, userId);
  if (!formula) return null;

  const nextFavorite = isFavorite ?? !formula.isFavorite;
  const [updated] = await db
    .update(Formulas)
    .set({
      isFavorite: nextFavorite,
      updatedAt: new Date(),
    })
    .where(and(eq(Formulas.id, id), eq(Formulas.userId, userId)))
    .returning();

  return updated ?? null;
}

export function summarizeFormulas(formulas: Awaited<ReturnType<typeof listFormulasByUser>>) {
  const active = formulas.filter((formula) => formula.status === "active");
  const favorites = formulas.filter((formula) => formula.isFavorite);
  const archived = formulas.filter((formula) => formula.status === "archived");

  const recentCutoff = Date.now() - 1000 * 60 * 60 * 24 * 7;
  const recentlyUpdated = formulas.filter((formula) => formula.updatedAt.getTime() >= recentCutoff);
  const subjectCount = new Set(formulas.map((formula) => formula.subject).filter(Boolean)).size;

  return {
    total: formulas.length,
    active: active.length,
    favorites: favorites.length,
    archived: archived.length,
    recentlyUpdated: recentlyUpdated.length,
    subjectCount,
    latestTitle: formulas[0]?.title ?? null,
  };
}
