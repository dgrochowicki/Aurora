// Panel wysuwany od dołu z tłem. Ten sam mechanizm obsługuje wyszukiwarkę miejsc i panele szczegółów.
import { $ } from "../util.js";

// Czas animacji zamykania, taki sam jak w CSS (.sheet). Po nim panel dostaje hidden.
const CLOSE_MS = 280;
const open = [];

// Gdy panel jest otwarty, reszta strony nie przyjmuje fokusu ani kliknięć.
// Klasa sheet-open blokuje też przewijanie strony pod panelem.
const setInert = (on) => {
  [$(".app-shell"), $(".bottom-nav")].forEach((e) => (e.inert = on));
  document.documentElement.classList.toggle("sheet-open", on);
};

export function createSheet({ sheet, backdrop, closeButton, onOpen, onClose }) {
  let opener = null,
    shown = false,
    hideTimer;
  const api = {
    get isOpen() {
      return shown;
    },
    open(from) {
      opener = from || null;
      shown = true;
      clearTimeout(hideTimer);
      sheet.hidden = false;
      backdrop.hidden = false;
      // Odczyt wymiaru zapisuje stan początkowy (panel pod ekranem), żeby przejście do .open było animowane.
      void sheet.offsetHeight;
      sheet.classList.add("open");
      backdrop.classList.add("open");
      if (!open.includes(api)) open.push(api);
      setInert(true);
      onOpen?.();
    },
    close() {
      if (!shown) return;
      shown = false;
      sheet.classList.remove("open");
      backdrop.classList.remove("open");
      hideTimer = setTimeout(() => {
        sheet.hidden = true;
        backdrop.hidden = true;
      }, CLOSE_MS);
      open.splice(open.indexOf(api), 1);
      if (!open.length) setInert(false);
      onClose?.();
      opener?.focus({ preventScroll: true });
      opener = null;
    },
  };
  // Po przewinięciu treści nagłówek dostaje linię oddzielającą (.scrolled).
  const scroller = sheet.querySelector(".sheet-scroll");
  if (scroller) scroller.onscroll = () => sheet.classList.toggle("scrolled", scroller.scrollTop > 0);
  backdrop.onclick = () => api.close();
  closeButton.onclick = () => api.close();
  return api;
}

// Escape zamyka panel otwarty jako ostatni.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && open.length) open[open.length - 1].close();
});
