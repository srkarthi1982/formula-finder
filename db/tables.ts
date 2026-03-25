import { column, defineTable, NOW } from "astro:db";

export const Formulas = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.text(),
    title: column.text(),
    subject: column.text({
      optional: true,
      enum: ["math", "physics", "chemistry", "statistics", "finance", "custom"],
    }),
    topic: column.text({ optional: true }),
    expression: column.text(),
    variablesText: column.text({ optional: true }),
    notes: column.text({ optional: true }),
    exampleText: column.text({ optional: true }),
    isFavorite: column.boolean({ default: false }),
    status: column.text({ enum: ["active", "archived"], default: "active" }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
    archivedAt: column.date({ optional: true }),
  },
  indexes: [
    { on: ["userId"] },
    { on: ["userId", "status"] },
    { on: ["userId", "subject", "topic"] },
    { on: ["userId", "isFavorite"] },
    { on: ["userId", "updatedAt"] },
  ],
});

export const formulaFinderTables = {
  Formulas,
} as const;
