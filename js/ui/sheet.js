// Panel wysuwany od dołu. Ten sam mechanizm obsługuje panele szczegółów, mapę i ekran miejsc.
// backdrop i closeButton są opcjonalne: ekran miejsc zajmuje cały ekran i zamyka się wyborem miejsca albo klawiszem Escape.
// Fokus: po otwarciu trafia do focusOn (domyślnie przycisk zamknięcia, a bez niego sam panel), po zamknięciu wraca do przycisku,
// który panel otworzył. Reszta strony jest inert, więc Tab nie wychodzi z panelu.
// page: ekran zamiast panelu (ekran miejsc). Zastępuje treść strony i przewija go sam Safari, jak stronę główną,
// bo pod paskami Safari przypięta warstwa pokazuje płaski kolor albo stronę pod spodem. Po zamknięciu wraca
// położenie przewinięcia strony głównej.
import { $ } from "../util.js";

// Czas animacji zamykania z CSS (.sheet) z zapasem. Po nim panel dostaje hidden; wcześniej ucinało koniec ruchu.
const CLOSE_MS = 300;
const open = [];

// Gdy panel jest otwarty, reszta strony nie przyjmuje fokusu ani kliknięć.
// Klasa sheet-open blokuje też przewijanie strony pod panelem.
const setInert = (on) => {
  [$(".app-shell"), $(".fab-bar")].forEach((e) => (e.inert = on));
  document.documentElement.classList.toggle("sheet-open", on);
};

export function createSheet({ sheet, backdrop, closeButton, focusOn, onOpen, onClose, page = false }) {
  let opener = null,
    shown = false,
    hideTimer,
    homeScroll = 0;
  const api = {
    get isOpen() {
      return shown;
    },
    open(from) {
      opener = from || null;
      shown = true;
      clearTimeout(hideTimer);
      if (page) {
        homeScroll = window.scrollY;
        document.documentElement.classList.add("page-open");
        sheet.hidden = false;
        window.scrollTo(0, 0);
        if (!open.includes(api)) open.push(api);
        onOpen?.();
        (focusOn || closeButton || sheet).focus({ preventScroll: true });
        return;
      }
      sheet.hidden = false;
      if (backdrop) backdrop.hidden = false;
      // Odczyt wymiaru zapisuje stan początkowy (panel pod ekranem), żeby przejście do .open było animowane.
      void sheet.offsetHeight;
      sheet.classList.add("open");
      backdrop?.classList.add("open");
      if (!open.includes(api)) open.push(api);
      setInert(true);
      onOpen?.();
      (focusOn || closeButton || sheet).focus({ preventScroll: true });
    },
    close() {
      if (!shown) return;
      shown = false;
      if (page) {
        sheet.hidden = true;
        document.documentElement.classList.remove("page-open");
        window.scrollTo(0, homeScroll);
        open.splice(open.indexOf(api), 1);
        onClose?.();
        opener?.focus({ preventScroll: true });
        opener = null;
        return;
      }
      sheet.classList.remove("open");
      backdrop?.classList.remove("open");
      hideTimer = setTimeout(() => {
        sheet.hidden = true;
        if (backdrop) backdrop.hidden = true;
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
  if (backdrop) backdrop.onclick = () => api.close();
  if (closeButton) closeButton.onclick = () => api.close();
  return api;
}

// Escape zamyka panel otwarty jako ostatni.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && open.length) open[open.length - 1].close();
});
