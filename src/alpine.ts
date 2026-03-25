import type { Alpine } from "alpinejs";
import { registerFormulaFinderStore } from "./stores/formulaFinder";

export default function initAlpine(Alpine: Alpine) {
  registerFormulaFinderStore(Alpine);
}
