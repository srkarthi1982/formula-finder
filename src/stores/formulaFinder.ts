import { type Alpine } from "alpinejs";

type Formula = {
  id: number;
  title: string;
  subject?: string;
  topic?: string;
  expression: string;
  variablesText?: string;
  notes?: string;
  exampleText?: string;
  isFavorite: boolean;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

type Summary = {
  total: number;
  active: number;
  favorites: number;
  archived: number;
  recentlyUpdated: number;
  subjectCount: number;
};

type FormulaForm = {
  title: string;
  subject: string;
  topic: string;
  expression: string;
  variablesText: string;
  notes: string;
  exampleText: string;
};

type FormulaFinderStore = {
  formulas: Formula[];
  summary: Summary;
  search: string;
  tab: string;
  subjectFilter: string;
  topicFilter: string;
  activeFormula: Formula | null;
  isDrawerOpen: boolean;
  isEditing: boolean;
  isSubmitting: boolean;
  flash: { type: string; message: string };
  form: FormulaForm;
  hydrate(payload: { formulas: Formula[]; summary: Summary }): void;
  openCreateDrawer(): void;
  openEditDrawer(formula: Formula): void;
  closeDrawer(): void;
  setFlash(type: "success" | "error", message: string): void;
  readonly filteredFormulas: Formula[];
  refresh(): Promise<void>;
  recomputeSummary(): void;
  submitFormula(): Promise<void>;
  archiveFormula(id: number): Promise<void>;
  restoreFormula(id: number): Promise<void>;
  toggleFavorite(id: number, next?: boolean): Promise<void>;
};

const blankForm = {
  title: "",
  subject: "",
  topic: "",
  expression: "",
  variablesText: "",
  notes: "",
  exampleText: "",
};

export function registerFormulaFinderStore(Alpine: Alpine) {
  const formulaFinder: FormulaFinderStore = {
    formulas: [] as Formula[],
    summary: {} as Summary,
    search: "",
    tab: "overview",
    subjectFilter: "all",
    topicFilter: "",
    activeFormula: null as Formula | null,
    isDrawerOpen: false,
    isEditing: false,
    isSubmitting: false,
    flash: { type: "", message: "" },
    form: { ...blankForm },

    hydrate(payload: { formulas: Formula[]; summary: Summary }) {
      this.formulas = payload.formulas;
      this.summary = payload.summary;
    },

    openCreateDrawer() {
      this.form = { ...blankForm };
      this.activeFormula = null;
      this.isEditing = false;
      this.isDrawerOpen = true;
    },

    openEditDrawer(formula: Formula) {
      this.form = {
        title: formula.title,
        subject: formula.subject ?? "",
        topic: formula.topic ?? "",
        expression: formula.expression,
        variablesText: formula.variablesText ?? "",
        notes: formula.notes ?? "",
        exampleText: formula.exampleText ?? "",
      };
      this.activeFormula = formula;
      this.isEditing = true;
      this.isDrawerOpen = true;
    },

    closeDrawer() {
      this.isDrawerOpen = false;
    },

    setFlash(type: "success" | "error", message: string) {
      this.flash = { type, message };
      window.setTimeout(() => {
        this.flash = { type: "", message: "" };
      }, 2200);
    },

    get filteredFormulas() {
      return this.formulas.filter((formula) => {
        const lower = this.search.toLowerCase();
        const searchable = [formula.title, formula.expression, formula.topic ?? "", formula.subject ?? "", formula.notes ?? ""]
          .join(" ")
          .toLowerCase();

        if (this.tab === "favorites" && !formula.isFavorite) return false;
        if (this.tab === "archived" && formula.status !== "archived") return false;
        if (this.tab !== "archived" && formula.status === "archived") return false;
        if (this.subjectFilter !== "all" && formula.subject !== this.subjectFilter) return false;
        if (this.topicFilter && !(formula.topic ?? "").toLowerCase().includes(this.topicFilter.toLowerCase())) return false;
        if (lower && !searchable.includes(lower)) return false;

        return true;
      });
    },

    async refresh() {
      const response = await fetch("/api/formulas");
      const data = await response.json();
      this.formulas = data.items;
      this.recomputeSummary();
    },

    recomputeSummary() {
      const formulas = this.formulas;
      const recentCutoff = Date.now() - 1000 * 60 * 60 * 24 * 7;
      this.summary = {
        total: formulas.length,
        active: formulas.filter((f) => f.status === "active").length,
        favorites: formulas.filter((f) => f.isFavorite).length,
        archived: formulas.filter((f) => f.status === "archived").length,
        recentlyUpdated: formulas.filter((f) => new Date(f.updatedAt).getTime() >= recentCutoff).length,
        subjectCount: new Set(formulas.map((f) => f.subject).filter(Boolean)).size,
      };
    },

    async submitFormula() {
      this.isSubmitting = true;
      const payload = {
        title: this.form.title,
        subject: this.form.subject || null,
        topic: this.form.topic || null,
        expression: this.form.expression,
        variablesText: this.form.variablesText || null,
        notes: this.form.notes || null,
        exampleText: this.form.exampleText || null,
      };

      const url = this.isEditing && this.activeFormula ? `/api/formulas/${this.activeFormula.id}` : "/api/formulas";
      const method = this.isEditing ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      this.isSubmitting = false;
      if (!response.ok) {
        this.setFlash("error", "Unable to save formula.");
        return;
      }

      await this.refresh();
      this.closeDrawer();
      this.setFlash("success", this.isEditing ? "Formula updated." : "Formula created.");
    },

    async archiveFormula(id: number) {
      await fetch(`/api/formulas/${id}/archive`, { method: "POST" });
      await this.refresh();
      this.setFlash("success", "Formula archived.");
    },

    async restoreFormula(id: number) {
      await fetch(`/api/formulas/${id}/restore`, { method: "POST" });
      await this.refresh();
      this.setFlash("success", "Formula restored.");
    },

    async toggleFavorite(id: number, next?: boolean) {
      await fetch(`/api/formulas/${id}/favorite`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isFavorite: next }),
      });
      await this.refresh();
    },
  };

  Alpine.store("formulaFinder", formulaFinder);
}
