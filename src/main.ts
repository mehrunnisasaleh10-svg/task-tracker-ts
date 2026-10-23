import { SimulatedTaskApi, type TaskDraft } from "./api";
import { filterTasks, sortTasks, type TaskFilter } from "./filters";
import { computeStats } from "./stats";
import { createTaskStore } from "./store";
import { renderTasks } from "./render";
import { toTaskId, type Priority, type Task } from "./types";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error('App element "#app" was not found.');

const daysAgo = (days: number): Date => new Date(Date.now() - days * 86_400_000);
const sampleTasks: Task[] = [
  {
    id: toTaskId("task-1"),
    title: "Review project requirements",
    priority: "high",
    completedAt: null,
    createdAt: daysAgo(1),
    tags: ["work", "planning"],
  },
  {
    id: toTaskId("task-2"),
    title: "Write unit tests",
    priority: "medium",
    completedAt: null,
    createdAt: daysAgo(2),
    tags: ["testing"],
  },
  {
    id: toTaskId("task-3"),
    title: "Update project README",
    priority: "low",
    completedAt: daysAgo(0.5),
    createdAt: daysAgo(1.5),
    tags: ["docs", "work"],
  },
];
const api = new SimulatedTaskApi(sampleTasks, 35);
const store = createTaskStore(api, sampleTasks);
let query = "";
let priorityFilter: Priority | "all" = "all";
let completionFilter: "all" | "open" | "done" = "all";
let sortBy: keyof Task = "createdAt";
let sortDirection: "asc" | "desc" = "desc";
let notice = "";
let searchTimer: ReturnType<typeof setTimeout> | undefined;

app.innerHTML = `
  <main class="shell">
    <header class="hero">
      <div><p class="eyebrow">PERSONAL PRODUCTIVITY</p><h1>Typed Task Tracker</h1><p class="subtitle">A reliable place to plan, prioritize, and finish your work.</p></div>
      <div class="hero-mark" aria-hidden="true">✓</div>
    </header>
    <section id="stats" class="stats" aria-label="Task statistics"></section>
    <section class="panel task-form" aria-labelledby="form-title">
      <div class="form-heading"><h2 id="form-title">Create a task</h2><p>Keep it focused. You can edit or complete it any time.</p></div>
      <form id="task-form">
        <label for="task-title">Task title</label><input id="task-title" name="title" maxlength="120" placeholder="e.g. Review the sprint plan" required />
        <div class="form-row"><div><label for="task-priority">Priority</label><select id="task-priority" name="priority"><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select></div>
        <div><label for="task-tags">Tags (comma-separated)</label><input id="task-tags" name="tags" placeholder="work, planning" /></div></div>
        <button class="primary-button" type="submit">+ Add task</button>
      </form>
      <p id="notice" class="form-notice" role="status" aria-live="polite"></p>
    </section>
    <section class="toolbar" aria-label="Task controls"><div><h2>Your tasks</h2><p id="result-count">Loading tasks…</p></div>
      <div class="filters"><label class="sr-only" for="search">Search tasks</label><input id="search" type="search" placeholder="Search tasks or tags…" />
        <label class="sr-only" for="filter-priority">Filter by priority</label><select id="filter-priority"><option value="all">All priorities</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select>
        <label class="sr-only" for="filter-status">Filter by status</label><select id="filter-status"><option value="all">All tasks</option><option value="open">Open</option><option value="done">Completed</option></select>
        <label class="sr-only" for="sort-by">Sort tasks</label><select id="sort-by"><option value="createdAt">Newest first</option><option value="title">Title A–Z</option><option value="priority">Priority</option></select>
      </div>
    </section>
    <section class="panel task-content"><div id="task-list" aria-live="polite"></div></section>
    <footer>Typed data · Safe rendering · Simulated in-memory API · No backend required</footer>
  </main>`;

const statsElement = app.querySelector<HTMLElement>("#stats");
const listElement = app.querySelector<HTMLElement>("#task-list");
const countElement = app.querySelector<HTMLElement>("#result-count");
const noticeElement = app.querySelector<HTMLElement>("#notice");
const titleInput = app.querySelector<HTMLInputElement>("#task-title");
const searchInput = app.querySelector<HTMLInputElement>("#search");
const prioritySelect = app.querySelector<HTMLSelectElement>("#filter-priority");
const statusSelect = app.querySelector<HTMLSelectElement>("#filter-status");
const sortSelect = app.querySelector<HTMLSelectElement>("#sort-by");

function getVisibleTasks(): Task[] {
  const state = store.getState();
  let tasks = [...state.tasks];
  const filter: TaskFilter = {
    ...(priorityFilter === "all" ? {} : { priority: priorityFilter }),
    ...(completionFilter === "all" ? {} : { completed: completionFilter === "done" }),
  };
  tasks = filterTasks(tasks, filter);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (normalizedQuery)
    tasks = tasks.filter(
      (task) =>
        task.title.toLocaleLowerCase().includes(normalizedQuery) ||
        task.tags.some((tag) => tag.toLocaleLowerCase().includes(normalizedQuery)),
    );
  return sortTasks(tasks, sortBy, sortBy === "createdAt" ? sortDirection : "asc");
}

function renderDashboard(): void {
  const state = store.getState();
  const stats = computeStats(state.tasks);
  if (statsElement)
    statsElement.innerHTML = `
    <article><span>Total tasks</span><strong>${stats.total}</strong></article>
    <article><span>Completed</span><strong>${stats.completed}</strong></article>
    <article><span>Still open</span><strong>${stats.open}</strong></article>
    <article><span>Completion rate</span><strong>${Math.round(stats.completionRate * 100)}%</strong></article>`;
  const visible = getVisibleTasks();
  if (countElement)
    countElement.textContent = `${visible.length} of ${state.tasks.length} task${state.tasks.length === 1 ? "" : "s"}`;
  if (listElement) {
    if (state.error)
      listElement.innerHTML =
        renderTasks({ status: "error", message: state.error }) +
        (visible.length ? renderTasks({ status: "success", data: visible }) : "");
    else
      listElement.innerHTML = renderTasks(
        visible.length
          ? { status: "success", data: visible }
          : state.tasks.length
            ? { status: "empty" }
            : { status: "empty" },
      );
  }
  if (noticeElement) noticeElement.textContent = notice;
}

store.subscribe(() => renderDashboard());
renderDashboard();

app.addEventListener("submit", (event: SubmitEvent) => {
  const target = event.target;
  if (!(target instanceof HTMLFormElement) || target.id !== "task-form") return;
  event.preventDefault();
  const formData = new FormData(target);
  const title = formData.get("title");
  const priority = formData.get("priority");
  const tagsText = formData.get("tags");
  if (typeof title !== "string" || title.trim().length === 0 || title.length > 120) {
    notice = "Please enter a title between 1 and 120 characters.";
    renderDashboard();
    titleInput?.focus();
    return;
  }
  if (priority !== "low" && priority !== "medium" && priority !== "high") return;
  const draft: TaskDraft = {
    title: title.trim(),
    priority,
    tags:
      typeof tagsText === "string"
        ? tagsText
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
  };
  notice = "Adding task…";
  renderDashboard();
  void store.addTask(draft).then(() => {
    notice = store.getState().error
      ? "Task could not be saved. See the error above."
      : "Task added successfully.";
    target.reset();
    renderDashboard();
    titleInput?.focus();
  });
});

app.addEventListener("click", (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLButtonElement>("button[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const idValue = button.dataset.id;
  if (action === "retry") {
    store.clearError();
    void api
      .list()
      .then((tasks) => {
        notice = "Connection restored.";
        // Reconcile latest simulated API data through normal store actions where possible.
        for (const task of tasks)
          if (!store.getState().tasks.some((existing) => existing.id === task.id))
            void store.addTask({ title: task.title, priority: task.priority, tags: task.tags });
        renderDashboard();
      })
      .catch(() => {
        notice = "Retry failed. Please try again.";
        renderDashboard();
      });
    return;
  }
  if (!idValue || !["toggle", "edit", "delete"].includes(action ?? "")) return;
  const id = toTaskId(idValue);
  const task = store.getState().tasks.find((item) => item.id === id);
  if (!task) return;
  if (action === "toggle") {
    notice = task.completedAt === null ? "Marking task complete…" : "Reopening task…";
    void store.toggleComplete(id);
  } else if (action === "delete") {
    notice = "Deleting task…";
    void store.deleteTask(id);
  } else if (action === "edit") {
    const title = window.prompt("Edit task title", task.title);
    if (title === null) return;
    if (!title.trim() || title.trim().length > 120) {
      notice = "Title must contain 1–120 characters.";
      renderDashboard();
      return;
    }
    const priority = window.prompt("Priority: low, medium, or high", task.priority);
    if (priority === null) return;
    if (priority !== "low" && priority !== "medium" && priority !== "high") {
      notice = "Priority must be low, medium, or high.";
      renderDashboard();
      return;
    }
    const tags = window.prompt("Tags separated by commas", task.tags.join(", "));
    if (tags === null) return;
    notice = "Saving changes…";
    void store.updateTask(id, {
      title: title.trim(),
      priority,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
  }
  renderDashboard();
});

searchInput?.addEventListener("input", () => {
  if (searchTimer !== undefined) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    query = searchInput.value;
    renderDashboard();
  }, 180);
});
prioritySelect?.addEventListener("change", () => {
  const value = prioritySelect.value;
  if (value === "all" || value === "low" || value === "medium" || value === "high")
    priorityFilter = value;
  renderDashboard();
});
statusSelect?.addEventListener("change", () => {
  const value = statusSelect.value;
  if (value === "all" || value === "open" || value === "done") completionFilter = value;
  renderDashboard();
});
sortSelect?.addEventListener("change", () => {
  if (
    sortSelect.value === "title" ||
    sortSelect.value === "priority" ||
    sortSelect.value === "createdAt"
  )
    sortBy = sortSelect.value;
  sortDirection = sortBy === "createdAt" ? "desc" : "asc";
  renderDashboard();
});
