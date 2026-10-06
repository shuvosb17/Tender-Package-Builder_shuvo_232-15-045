// In-page helpers that operate the UI the way a user would (by visible labels).
export const install = `
window.__t = {
  clickText(text) {
    const el = [...document.querySelectorAll('button, a')].find((b) => b.textContent.trim().includes(text));
    if (!el) throw new Error('No button: ' + text);
    el.click();
    return true;
  },
  row(order) {
    return [...document.querySelectorAll('.req')].find((r) => r.querySelector('.req__num').textContent.trim() === String(order));
  },
  pick(order, fileName) {
    const sel = this.row(order).querySelector('select');
    const opt = [...sel.options].find((o) => o.textContent.startsWith(fileName));
    if (!opt) throw new Error('No option ' + fileName);
    if (opt.disabled) return 'disabled: ' + opt.textContent;
    sel.value = opt.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return 'ok';
  },
  date(order, value) {
    const input = this.row(order).querySelector('.date-field__input');
    if (!input) throw new Error('No date input for #' + order);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return 'ok';
  },
  statuses() {
    return [...document.querySelectorAll('.req')].map((r) => r.querySelector('.req__num').textContent.trim() + ' ' + r.querySelector('.req__title').textContent.replace(/^#\\S+\\s/, '') + ' => ' + r.querySelector('.chip').textContent);
  },
  files() {
    return [...document.querySelectorAll('.file')].map((f) => f.innerText.replace(/\\n+/g, ' | '));
  },
  toasts() {
    return [...document.querySelectorAll('.toast')].map((t) => t.innerText);
  },
};
true;
`;

export async function waitFor(page, expr, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await page.eval(expr)) return;
    await page.sleep(150);
  }
  throw new Error('Timed out waiting for ' + expr);
}
