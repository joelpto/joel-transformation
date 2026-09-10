// ==========================================================================
// GROCERY — weekly list from the Excel, grouped by category, checkable,
// auto-scoped to the current ISO week (resets automatically) with a manual
// reset too. Also doubles as a light meal-prep checklist.
// ==========================================================================
import { icon } from "../utils/icons.js";
import { escapeHtml, toast, pageHeader, pageBody, cardHead } from "../ui.js";
import { PLAN } from "../data/planData.js";
import { getGroceryChecked, toggleGroceryItem, resetGroceryWeek, currentGroceryWeekKey } from "../store.js";
import { nutritionTabs } from "./plan.js";
import { navigate } from "../app.js";

export function render() {
  const checked = getGroceryChecked();
  const total = PLAN.grocery.length;
  const done = checked.size;
  const categories = Object.keys(PLAN.groceryByCategory);

  return `
    ${pageHeader({
      eyebrow: `Week ${currentGroceryWeekKey()}`,
      title: `<em>Grocery</em> run`,
      sub: `${done} of ${total} items checked off. The list resets itself every Monday.`,
      actions: `<button class="icon-btn" data-grocery-reset aria-label="Reset list">${icon("refresh", { size: 17 })}</button>`,
      tabs: nutritionTabs("grocery"),
      tabAttr: "data-plan-tab",
    })}
    ${pageBody(`
      <div class="dash">
        ${categories
          .map(
            (cat) => `
          <div class="card c4">
            ${cardHead("cart", escapeHtml(cat))}
            ${PLAN.groceryByCategory[cat]
              .map((item) => {
                const isChecked = checked.has(item.id);
                return `<div class="check-row ${isChecked ? "done" : ""}" data-grocery-item="${item.id}">
                  <div class="check-circle ${isChecked ? "done" : ""}">${isChecked ? icon("check", { size: 14 }) : ""}</div>
                  <div class="name">${escapeHtml(item.item)}<span class="sub">${escapeHtml(item.amount)}${item.notes ? " · " + escapeHtml(item.notes) : ""}</span></div>
                </div>`;
              })
              .join("")}
          </div>`
          )
          .join("")}
      </div>
      <div class="section" style="text-align:center;">
        <button class="btn btn-secondary" data-grocery-reset>${icon("refresh", { size: 14 })} Reset this week's list</button>
      </div>
    `)}
  `;
}

export function mount() {
  document.querySelectorAll("[data-plan-tab]").forEach((b) =>
    b.addEventListener("click", () => navigate(b.dataset.tabPage || "plan", b.dataset.planTab))
  );
  document.querySelectorAll("[data-grocery-item]").forEach((row) =>
    row.addEventListener("click", () => toggleGroceryItem(row.dataset.groceryItem))
  );
  document.querySelectorAll("[data-grocery-reset]").forEach((btn) =>
    btn.addEventListener("click", async () => { await resetGroceryWeek(); toast("Grocery list reset"); })
  );
}
