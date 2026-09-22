/* Gráficos de la página de indicadores.
   Chart.js se carga por CDN en index.html (global `Chart`). Los datos se
   actualizan en caliente con chart.update(): al mover el rango de años no se
   recarga la página ni se vuelve a pintar el DOM, solo cambian las series. */

const charts = new Map();

function css(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function palette() {
  const accent = css("--accent", "#17595f");
  return {
    accent,
    ink: css("--ink", "#131c24"),
    muted: css("--muted", "#5c6b76"),
    line: css("--line", "#dbe3e7"),
    scale: [accent, css("--accent-2", "#3f8f83"), css("--accent-3", "#7fb5a2"),
            css("--accent-4", "#b9cfbf"), css("--muted", "#5c6b76")]
  };
}

function base() {
  const p = palette();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  Chart.defaults.font.family = "IBM Plex Sans, system-ui, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = p.muted;
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: reduce ? false : { duration: 420, easing: "easeOutQuart" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: p.ink, padding: 10, cornerRadius: 3, displayColors: false,
        titleFont: { weight: "600" }
      }
    },
    scales: {
      x: { grid: { display: false }, border: { color: p.line }, ticks: { maxRotation: 0, autoSkipPadding: 8 } },
      y: { beginAtZero: true, grid: { color: p.line }, border: { display: false }, ticks: { precision: 0 } }
    }
  };
}

function make(id, config) {
  const el = document.getElementById(id);
  if (!el || typeof Chart === "undefined") return null;
  const c = new Chart(el, config);
  charts.set(id, c);
  return c;
}

export function destroyAll() {
  charts.forEach((c) => c.destroy());
  charts.clear();
}

/** Crea los tres gráficos. data: { years, pubs, citeYears, cites, typeLabels, typeValues } */
export function mount(data) {
  destroyAll();
  const p = palette();
  if (typeof Chart === "undefined") return;

  make("c-pubs", {
    type: "bar",
    data: {
      labels: data.years,
      datasets: [{
        label: "Publicaciones", data: data.pubs,
        backgroundColor: p.accent, hoverBackgroundColor: p.ink,
        borderRadius: 3, maxBarThickness: 34
      }]
    },
    options: base()
  });

  const opts = base();
  opts.elements = { point: { radius: 0, hitRadius: 14, hoverRadius: 4 } };
  make("c-cites", {
    type: "line",
    data: {
      labels: data.citeYears,
      datasets: [{
        label: "Citas", data: data.cites,
        borderColor: p.accent, borderWidth: 2, tension: 0.32,
        fill: true, backgroundColor: (ctx) => {
          const { ctx: c, chartArea } = ctx.chart;
          if (!chartArea) return "transparent";
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, p.accent + "55");
          g.addColorStop(1, p.accent + "05");
          return g;
        }
      }]
    },
    options: opts
  });

  const donut = base();
  donut.cutout = "62%";
  donut.scales = {};
  donut.plugins.legend = { display: true, position: "right", labels: { boxWidth: 10, boxHeight: 10, padding: 12 } };
  make("c-types", {
    type: "doughnut",
    data: {
      labels: data.typeLabels,
      datasets: [{ data: data.typeValues, backgroundColor: p.scale, borderWidth: 0, hoverOffset: 6 }]
    },
    options: donut
  });
}

/** Actualiza las series sin volver a crear los gráficos. */
export function update(data) {
  const pubs = charts.get("c-pubs");
  if (pubs) {
    pubs.data.labels = data.years;
    pubs.data.datasets[0].data = data.pubs;
    pubs.update();
  }
  const cites = charts.get("c-cites");
  if (cites) {
    cites.data.labels = data.citeYears;
    cites.data.datasets[0].data = data.cites;
    cites.update();
  }
  const types = charts.get("c-types");
  if (types) {
    types.data.labels = data.typeLabels;
    types.data.datasets[0].data = data.typeValues;
    types.update();
  }
}

/** Barra sencilla reutilizable (página de proyectos). */
export function mountBar(id, labels, values) {
  if (typeof Chart === "undefined") return;
  const existing = charts.get(id);
  if (existing) {
    existing.data.labels = labels;
    existing.data.datasets[0].data = values;
    existing.update();
    return;
  }
  const p = palette();
  const opts = base();
  opts.plugins.tooltip.callbacks = {
    label: (ctx) => new Intl.NumberFormat("es-ES").format(ctx.parsed.y) + " €"
  };
  opts.scales.y.ticks.callback = (v) => (v >= 1000000 ? v / 1000000 + " M€" : v / 1000 + " k€");
  make(id, {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: p.accent, borderRadius: 3, maxBarThickness: 30 }] },
    options: opts
  });
}

/** Anillo de reparto (número o importe). */
export function mountDoughnut(id, labels, values, asMoney = false) {
  if (typeof Chart === "undefined") return;
  const existing = charts.get(id);
  if (existing) {
    existing.data.labels = labels;
    existing.data.datasets[0].data = values;
    existing.update();
    return;
  }
  const p = palette();
  const opts = base();
  opts.scales = {};
  opts.cutout = "62%";
  opts.plugins.legend = { display: true, position: "bottom", labels: { boxWidth: 9, boxHeight: 9, padding: 10 } };
  opts.plugins.tooltip.callbacks = {
    label: (ctx) => ctx.label + ": " + (asMoney
      ? new Intl.NumberFormat("es-ES").format(ctx.parsed) + " €"
      : ctx.parsed)
  };
  make(id, {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: p.scale, borderWidth: 0, hoverOffset: 6 }] },
    options: opts
  });
}

/** Barras apiladas por año más una línea de importe en el eje derecho. */
export function mountStacked(id, years, stacks, line, lineLabel = "Importe") {
  if (typeof Chart === "undefined") return;
  const p = palette();
  const existing = charts.get(id);
  if (existing) {
    existing.data.labels = years;
    stacks.forEach((st, i) => {
      existing.data.datasets[i].label = st.label;
      existing.data.datasets[i].data = st.data;
    });
    existing.data.datasets[stacks.length].data = line;
    existing.data.datasets[stacks.length].label = lineLabel;
    existing.update();
    return;
  }
  const opts = base();
  opts.plugins.legend = { display: true, position: "bottom", labels: { boxWidth: 9, boxHeight: 9, padding: 10 } };
  opts.scales.x.stacked = true;
  opts.scales.y.stacked = true;
  opts.scales.y.title = { display: false };
  opts.scales.y2 = {
    position: "right", beginAtZero: true, grid: { display: false },
    border: { display: false },
    ticks: { callback: (v) => (v >= 1000000 ? v / 1000000 + " M€" : Math.round(v / 1000) + " k€") }
  };
  opts.plugins.tooltip.callbacks = {
    label: (ctx) => ctx.dataset.yAxisID === "y2"
      ? ctx.dataset.label + ": " + new Intl.NumberFormat("es-ES").format(ctx.parsed.y) + " €"
      : ctx.dataset.label + ": " + ctx.parsed.y
  };
  make(id, {
    type: "bar",
    data: {
      labels: years,
      datasets: [
        ...stacks.map((st, i) => ({
          label: st.label, data: st.data, backgroundColor: p.scale[i % p.scale.length],
          borderRadius: 2, maxBarThickness: 34, stack: "n"
        })),
        {
          type: "line", label: lineLabel, data: line, yAxisID: "y2",
          borderColor: p.ink, borderWidth: 1.6, tension: 0.32, pointRadius: 0, fill: false
        }
      ]
    },
    options: opts
  });
}

export const ready = () => typeof Chart !== "undefined";
