// Podgląd wartości na wykresie pomiaru (trendChart): przesunięcie palcem albo kursorem pokazuje pionową linię,
// kropkę i dymek z godziną i wartością najbliższego punktu. Punkty są w data-points wykresu, policzone przy rysowaniu.
// touch-action: pan-y w CSS zostawia przewijanie panelu w pionie, a ruch w poziomie trafia do podglądu.

export function bindScrub(root) {
  root.querySelectorAll(".chart[data-points]").forEach((chart) => {
    const points = JSON.parse(chart.dataset.points),
      plot = chart.querySelector(".chart-plot"),
      box = chart.querySelector(".chart-scrub"),
      line = box.querySelector(".chart-scrub-line"),
      dot = box.querySelector(".chart-dot"),
      tip = box.querySelector(".chart-tip");
    const show = (e) => {
      const r = plot.getBoundingClientRect(),
        at = ((e.clientX - r.left) / r.width) * 100;
      let best = points[0];
      for (const p of points) if (Math.abs(p[0] - at) < Math.abs(best[0] - at)) best = p;
      const [x, y, text] = best;
      line.style.left = dot.style.left = tip.style.left = `${x}%`;
      dot.style.top = `${y}px`;
      tip.textContent = text;
      tip.className = `chart-tip${x < 20 ? " is-start" : x > 80 ? " is-end" : ""}`;
      box.hidden = false;
      chart.classList.add("is-scrubbing");
    };
    const hide = () => {
      box.hidden = true;
      chart.classList.remove("is-scrubbing");
    };
    plot.addEventListener("pointerdown", show);
    plot.addEventListener("pointermove", (e) => (e.pointerType === "mouse" || e.buttons) && show(e));
    ["pointerup", "pointercancel", "pointerleave"].forEach((t) => plot.addEventListener(t, hide));
  });
}
