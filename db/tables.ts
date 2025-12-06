import { column, defineTable, NOW } from "astro:db";

/**
 * Logical grouping for formulas.
 * Example: "Physics – Kinematics", "Math – Calculus", etc.
 */
export const FormulaGroups = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),

    // Optional owner if we allow user-specific collections
    ownerId: column.text({ optional: true }),

    name: column.text(), // e.g., "Kinematics"
    subject: column.text({ optional: true }), // "Physics", "Math"
    tags: column.text({ optional: true }),    // simple comma/space list

    description: column.text({ optional: true }),

    slug: column.text({ optional: true }),

    isActive: column.boolean({ default: true }),

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

/**
 * A single formula.
 * Example: s = ut + 1/2 a t^2
 */
export const Formulas = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),

    groupId: column.number({
      references: () => FormulaGroups.columns.id,
      optional: true,
    }),

    // Display name: "Equation of motion", "Ohm's Law", etc.
    name: column.text(),

    // TeX-like or plain representation of the formula
    expression: column.text(),

    // Short explanation of what it represents
    description: column.text({ optional: true }),

    // Variables metadata, stored as JSON:
    // e.g. [{ symbol: "s", meaning: "displacement", unit: "m" }, ...]
    variables: column.json({ optional: true }),

    // Optional: dimensional info, typical use-cases, etc.
    meta: column.json({ optional: true }),

    difficulty: column.text({
      enum: ["basic", "intermediate", "advanced"],
      default: "basic",
    }),

    isActive: column.boolean({ default: true }),

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

/**
 * Worked examples showing how to apply a formula.
 */
export const FormulaExamples = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),

    formulaId: column.number({ references: () => Formulas.columns.id }),

    // Short title for the example
    title: column.text({ optional: true }),

    // Problem statement
    problem: column.text(),

    // Step-by-step solution / explanation
    solution: column.text(),

    // Optional numeric inputs/outputs as structured JSON
    data: column.json({ optional: true }),

    createdAt: column.date({ default: NOW }),
  },
});

/**
 * Per-user relationship with a formula:
 * favorites, notes, difficulty perception, etc.
 */
export const UserFormulaState = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),

    userId: column.text(),
    formulaId: column.number({ references: () => Formulas.columns.id }),

    isFavorite: column.boolean({ default: false }),

    // User's own explanation or memory trick
    note: column.text({ optional: true }),

    // How comfortable they feel with this formula
    familiarity: column.text({
      enum: ["new", "learning", "comfortable", "mastered"],
      default: "new",
    }),

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const formulaFinderTables = {
  FormulaGroups,
  Formulas,
  FormulaExamples,
  UserFormulaState,
} as const;
