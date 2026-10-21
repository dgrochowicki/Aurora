// Podgląd wartości na wykresie pomiaru (lineChart ze scrub): przesunięcie palcem albo kursorem pokazuje pionową linię,
// kropkę i dymek z godziną i wartością najbliższego punktu. Punkty są w data-points wykresu, policzone przy rysowaniu.
// touch-action: none w CSS: na wykresie palec tylko przesuwa podgląd, a panel przewija się poza nim.
// Dymek stoi nad punktem, ale co najmniej 8 px od krawędzi wykresu, żeby nie poszerzał panelu.

const EDGE = 8;

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
      line.style.left = dot.style.left = `${x}%`;
      dot.style.top = `${y}px`;
      tip.textContent = text;
      box.hidden = false;
      const w = tip.offsetWidth,
        px = (x / 100) * r.width;
      tip.style.left = `${Math.min(r.width - w - EDGE, Math.max(EDGE, px - w / 2))}px`;
      chart.classList.add("is-scrubbing");
    };
    const hide = () => {
      box.hidden = true;
      chart.classList.remove("is-scrubbing");
    };
    plot.addEventListener("pointerdown", (e) => {
      // Palec zostaje przy wykresie, nawet gdy zjedzie poza niego, więc podgląd nie gaśnie w połowie ruchu.
      plot.setPointerCapture?.(e.pointerId);
      show(e);
    });
    plot.addEventListener("pointermove", (e) => (e.pointerType === "mouse" || e.buttons) && show(e));
    ["pointerup", "pointercancel", "pointerleave"].forEach((t) => plot.addEventListener(t, hide));
  });
}
