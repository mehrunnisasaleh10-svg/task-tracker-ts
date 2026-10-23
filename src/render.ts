import type { AsyncState, Task } from "./types";
import { assertNever } from "./types";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

/** Generic state renderer. Callers control success markup; every other state is handled exhaustively. */
export function renderAsyncState<T>(
  state: AsyncState<T>,
  renderSuccess: (data: T) => string,
): string {
  switch (state.status) {
    case "loading":
      return '<section class="state state-loading" role="status"><span class="spinner" aria-hidden="true"></span><h2>Loading tasks</h2><p>Please wait while your tasks are fetched.</p></section>';
    case "empty":
      return '<section class="state state-empty"><h2>No tasks yet</h2><p>Add your first task to get started.</p></section>';
    case "error":
      return `<section class="state state-error" role="alert"><h2>We could not load your tasks</h2><p>${escapeHtml(state.message)}</p><p>Please check your connection and try again.</p><button class="primary-button" type="button" data-action="retry">Retry</button></section>`;
    case "success":
      return renderSuccess(state.data);
    default:
      return assertNever(state);
  }
}

function renderTask(task: Task, now: Date): string {
  const completed = task.completedAt !== null;
  const overdue = !completed && task.createdAt.getTime() < now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const classes = ["task-card", completed ? "is-completed" : "", overdue ? "is-overdue" : ""]
    .filter(Boolean)
    .join(" ");
  const tags = task.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  const taskId = escapeHtml(task.id);
  return `<li class="${classes}" data-task-id="${taskId}">
    <div class="task-main"><strong>${escapeHtml(task.title)}</strong><div class="task-tags">${tags || '<span class="tag">No tags</span>'}</div>
      <p class="task-date">Created ${escapeHtml(task.createdAt.toLocaleDateString())}</p>
    </div>
    <div class="task-meta"><span class="priority priority-${task.priority}">${task.priority}</span>
      <span class="task-status">${completed ? "Done" : "Open"}</span>
      <div class="task-actions">
        <button type="button" class="icon-button" data-action="toggle" data-id="${taskId}" aria-label="${completed ? "Reopen" : "Complete"} ${escapeHtml(task.title)}">${completed ? "Reopen" : "Complete"}</button>
        <button type="button" class="icon-button" data-action="edit" data-id="${taskId}" aria-label="Edit ${escapeHtml(task.title)}">Edit</button>
        <button type="button" class="icon-button danger" data-action="delete" data-id="${taskId}" aria-label="Delete ${escapeHtml(task.title)}">Delete</button>
      </div>
    </div>
  </li>`;
}

export function renderTasks(state: AsyncState<readonly Task[]>, now = new Date()): string {
  return renderAsyncState(
    state,
    (tasks) => `<ul class="task-list">${tasks.map((task) => renderTask(task, now)).join("")}</ul>`,
  );
}
