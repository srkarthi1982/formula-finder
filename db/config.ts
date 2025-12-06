import { defineDb } from "astro:db";
import {
  FormulaGroups,
  Formulas,
  FormulaExamples,
  UserFormulaState,
} from "./tables";

export default defineDb({
  tables: {
    FormulaGroups,
    Formulas,
    FormulaExamples,
    UserFormulaState,
  },
});
