import { defineDb } from "astro:db";
import { Formulas } from "./tables";

export default defineDb({
  tables: {
    Formulas,
  },
});
