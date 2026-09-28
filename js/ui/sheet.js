// Panel wysuwany od dołu z tłem. Ten sam mechanizm obsługuje wyszukiwarkę miejsc i panele szczegółów.
import { $ } from "../util.js";

const open = [];

// Gdy panel jest otwarty, reszta strony nie przyjmuje fokusu ani kliknięć.
const setInert = (on) => [$(".app-shell"), $(".bottom-nav")].forEach((e) => (e.inert = on));

export function createSheet({ sheet, backdrop, closeButton, onOpen, onClose }) {
  let opener = null;
  const api = {
    get isOpen() {
      return !sheet.hidden;
    },
    open(from) {
      opener = from || null;
      sheet.hidden = false;
      backdrop.hidden = false;
      if (!open.includes(api)) open.push(api);
      setInert(true);
      onOpen?.();
    },
    close() {
      if (sheet.hidden) return;
      sheet.hidden = true;
      backdrop.hidden = true;
      open.splice(open.indexOf(api), 1);
      if (!open.length) setInert(false);
      onClose?.();
      opener?.focus({ preventScroll: true });
      opener = null;
    },
  };
  backdrop.onclick = () => api.close();
  closeButton.onclick = () => api.close();
  return api;
}

// Escape zamyka panel otwarty jako ostatni.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && open.length) open[open.length - 1].close();
});
