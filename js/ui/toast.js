// Krótki komunikat na dole ekranu.
import { $ } from "../util.js";

const el = $("#toast");

export function toast(msg) {
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2200);
}
