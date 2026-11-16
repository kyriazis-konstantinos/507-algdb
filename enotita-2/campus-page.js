const NODE_LABELS = ["Α", "Β", "Γ", "Δ", "Ε", "Ζ", "Η", "Θ", "Ι", "Κ", "Λ", "Μ", "Ν", "Ξ", "Ο", "Π", "Ρ", "Σ", "Τ", "Υ", "Φ", "Χ", "Ψ", "Ω"];
const NODE_TOLERANCE = 0.5;

function buildCampusGraph(roads) {
  const nodes = [];
  const edges = [];

  function nodeFor(point) {
    const existing = nodes.find((node) => Math.hypot(node.x - point[0], node.y - point[1]) < NODE_TOLERANCE);
    if (existing) return existing;
    const node = { x: point[0], y: point[1], neighbors: [], outDegree: 0 };
    nodes.push(node);
    return node;
  }

  for (const road of roads) {
    const coordinates = road.simeia.map((point) => point.slice());
    const start = nodeFor(coordinates[0]);
    const end = nodeFor(coordinates[coordinates.length - 1]);
    const length = coordinates.slice(1).reduce((total, point, index) => {
      const previous = coordinates[index];
      return total + Math.hypot(point[0] - previous[0], point[1] - previous[1]);
    }, 0);
    edges.push({ ...road, coordinates, start, end, length });
  }

  nodes.sort((first, second) => second.y - first.y || first.x - second.x);
  nodes.forEach((node, index) => { node.label = NODE_LABELS[index] || `Κ${index + 1}`; });

  for (const edge of edges) {
    edge.start.neighbors.push({ node: edge.end, edge, forward: true });
    edge.start.outDegree += 1;
    if (!edge.monodromos) {
      edge.end.neighbors.push({ node: edge.start, edge, forward: false });
      edge.end.outDegree += 1;
    }
  }

  return { nodes, edges };
}

function shortestPath(graph, start, target) {
  const distances = new Map(graph.nodes.map((node) => [node, Infinity]));
  const previous = new Map();
  const settled = new Set();
  distances.set(start, 0);

  while (settled.size < graph.nodes.length) {
    let current = null;
    let shortest = Infinity;
    for (const node of graph.nodes) {
      if (!settled.has(node) && distances.get(node) < shortest) {
        shortest = distances.get(node);
        current = node;
      }
    }
    if (!current) break;
    settled.add(current);
    if (current === target) break;

    for (const connection of current.neighbors) {
      if (settled.has(connection.node)) continue;
      const candidate = shortest + connection.edge.length;
      if (candidate < distances.get(connection.node)) {
        distances.set(connection.node, candidate);
        previous.set(connection.node, { node: current, connection });
      }
    }
  }

  if (!Number.isFinite(distances.get(target))) return null;
  const nodes = [target];
  const connections = [];
  let current = target;
  while (current !== start) {
    const step = previous.get(current);
    if (!step) return null;
    connections.push(step.connection);
    current = step.node;
    nodes.push(current);
  }
  nodes.reverse();
  connections.reverse();
  return { nodes, connections, length: distances.get(target) };
}

function factorial(n) {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function permutations(arr) {
  if (arr.length <= 1) return [arr.slice()];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of permutations(rest)) {
      result.push([arr[i]].concat(p));
    }
  }
  return result;
}

function initializeCampusPage() {
  const graph = buildCampusGraph(dromoi);
  const fromSelect = document.querySelector("#from-node");
  const toSelect = document.querySelector("#to-node");
  const coffeeOrigin = document.querySelector("#coffee-origin");
  const stopsList = document.querySelector("#stops-list");
  const btnAll = document.querySelector("#btn-all-perms");
  const btnNN = document.querySelector("#btn-nearest");
  const coffeeInfo = document.querySelector("#coffee-info");
  const routeSource = new ol.source.Vector();
  const allRoutesSource = new ol.source.Vector();
  const nnRouteSource = new ol.source.Vector();

  function addCell(row, value, className = "") {
    const cell = document.createElement("td");
    cell.textContent = value;
    if (className) cell.className = className;
    row.append(cell);
  }

  for (const node of graph.nodes) {
    for (const select of [fromSelect, toSelect, coffeeOrigin]) {
      const option = document.createElement("option");
      option.value = node.label;
      option.textContent = node.label;
      select.append(option);
    }
    const row = document.createElement("tr");
    addCell(row, node.label, "node-label");
    addCell(row, node.x.toFixed(2));
    addCell(row, node.y.toFixed(2));
    addCell(row, String(node.outDegree));
    document.querySelector("#node-rows").append(row);
  }
  if (graph.nodes.length > 1) toSelect.selectedIndex = graph.nodes.length - 1;
  const mNode = graph.nodes.find(n => n.label === "Μ");
  if (mNode) coffeeOrigin.value = "Μ";

  // Default stops: Θ, Α, Λ
  const defaultStops = new Set(["Θ", "Α", "Λ"]);
  for (const node of graph.nodes) {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = node.label;
    cb.checked = defaultStops.has(node.label);
    cb.addEventListener("change", onCoffeeChange);
    label.append(cb, document.createTextNode(" " + node.label));
    stopsList.append(label);
  }

  for (const edge of graph.edges) {
    const row = document.createElement("tr");
    addCell(row, edge.kodikos, "edge-code");
    addCell(row, edge.odos);
    addCell(row, edge.start.label);
    addCell(row, edge.end.label, "direction");
    addCell(row, `${edge.length.toFixed(1)} m`);
    addCell(row, edge.monodromos ? "Ναι" : "Όχι");
    document.querySelector("#edge-rows").append(row);
  }
  document.querySelector("#node-count").textContent = `${graph.nodes.length} κόμβοι`;
  document.querySelector("#edge-count").textContent = `${graph.edges.length} ακμές`;

  const allCoordinates = [
    ...graph.edges.flatMap((edge) => edge.coordinates),
    ...ktiria.flatMap((building) => building.perigramma),
  ];
  const minX = Math.min(...allCoordinates.map(([x]) => x));
  const maxX = Math.max(...allCoordinates.map(([x]) => x));
  const minY = Math.min(...allCoordinates.map(([, y]) => y));
  const maxY = Math.max(...allCoordinates.map(([, y]) => y));
  const margin = 30;
  const mapExtent = [minX - margin, minY - margin, maxX + margin, maxY + margin];
  const projection = new ol.proj.Projection({
    code: "CAMPUS:EGSA87",
    units: "m",
    extent: mapExtent,
  });

  const buildingFeatures = ktiria.map((building) => {
    const geometry = new ol.geom.Polygon([building.perigramma]);
    return new ol.Feature({ geometry, name: building.onoma });
  });
  const buildingsLayer = new ol.layer.Vector({
    source: new ol.source.Vector({ features: buildingFeatures }),
    style: (feature) => [
      new ol.style.Style({
        fill: new ol.style.Fill({ color: "rgba(220, 229, 197, 0.82)" }),
        stroke: new ol.style.Stroke({ color: "#879779", width: 1.5 }),
      }),
      new ol.style.Style({
        geometry: feature.getGeometry().getInteriorPoint(),
        text: new ol.style.Text({
          text: feature.get("name"),
          font: "600 12px 'DM Sans', sans-serif",
          fill: new ol.style.Fill({ color: "#34463c" }),
          stroke: new ol.style.Stroke({ color: "#fbfcf8", width: 3 }),
          textAlign: "center",
        }),
      }),
    ],
  });

  const roadFeatures = graph.edges.map((edge) => {
    const feature = new ol.Feature({ geometry: new ol.geom.LineString(edge.coordinates), edge });
    const geometry = feature.getGeometry();
    const middle = geometry.getCoordinateAt(0.5);
    const labelText = `${edge.odos}, ${edge.length.toFixed(1)} m`;
    const styles = [
      new ol.style.Style({
        stroke: new ol.style.Stroke({ color: edge.monodromos ? "#df744f" : "#27705f", width: 4, lineCap: "round", lineJoin: "round" }),
      }),
      new ol.style.Style({
        geometry: new ol.geom.Point(middle),
        text: new ol.style.Text({
          text: labelText,
          font: "600 10px 'DM Sans', sans-serif",
          placement: "point",
          overflow: true,
          fill: new ol.style.Fill({ color: edge.monodromos ? "#9c492f" : "#205448" }),
          stroke: new ol.style.Stroke({ color: "#fbfcf8", width: 3 }),
        }),
      }),
    ];
    if (edge.monodromos) {
      const along = geometry.getCoordinateAt(0.72);
      const after = geometry.getCoordinateAt(0.74);
      styles.push(new ol.style.Style({
        geometry: new ol.geom.Point(along),
        image: new ol.style.RegularShape({
          points: 3,
          radius: 8,
          rotation: Math.atan2(after[1] - along[1], after[0] - along[0]),
          fill: new ol.style.Fill({ color: "#df744f" }),
          stroke: new ol.style.Stroke({ color: "#fff", width: 1 }),
        }),
      }));
    }
    feature.setStyle(styles);
    return feature;
  });
  const roadsLayer = new ol.layer.Vector({ source: new ol.source.Vector({ features: roadFeatures }) });

  const nodeFeatures = graph.nodes.map((node) => new ol.Feature({
    geometry: new ol.geom.Point([node.x, node.y]),
    node,
  }));
  const nodesLayer = new ol.layer.Vector({
    source: new ol.source.Vector({ features: nodeFeatures }),
    style: (feature) => {
      const node = feature.get("node");
      const origin = coffeeOrigin.value;
      const isOrigin = node.label === origin;
      const isStop = Array.from(stopsList.querySelectorAll("input:checked")).some(cb => cb.value === node.label && node.label !== origin);
      let fill = "#fbfcf8";
      let stroke = "#172b2b";
      if (isOrigin) { fill = "#e66d45"; stroke = "#9c492f"; }
      else if (isStop) { fill = "#1b6658"; stroke = "#124a40"; }
      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: 8,
          fill: new ol.style.Fill({ color: fill }),
          stroke: new ol.style.Stroke({ color: stroke, width: 2 }),
        }),
        text: new ol.style.Text({
          text: node.label,
          offsetY: -17,
          font: "700 13px 'Space Grotesk', sans-serif",
          fill: new ol.style.Fill({ color: "#172b2b" }),
          stroke: new ol.style.Stroke({ color: "#fbfcf8", width: 4 }),
        }),
      });
    },
  });
  const routeLayer = new ol.layer.Vector({
    source: routeSource,
    style: new ol.style.Style({
      stroke: new ol.style.Stroke({ color: "#176f96", width: 8, lineCap: "round", lineJoin: "round" }),
    }),
  });
  const allRoutesLayer = new ol.layer.Vector({
    source: allRoutesSource,
    style: new ol.style.Style({
      stroke: new ol.style.Stroke({ color: "#1b6658", width: 7, lineCap: "round", lineJoin: "round" }),
    }),
  });
  const nnRouteLayer = new ol.layer.Vector({
    source: nnRouteSource,
    style: new ol.style.Style({
      stroke: new ol.style.Stroke({ color: "#e66d45", width: 5, lineDash: [12, 8], lineCap: "round", lineJoin: "round" }),
    }),
  });

  const view = new ol.View({ projection, center: ol.extent.getCenter(mapExtent), zoom: 2 });
  const map = new ol.Map({
    target: "map",
    layers: [buildingsLayer, roadsLayer, nodesLayer, routeLayer, allRoutesLayer, nnRouteLayer],
    view,
    controls: ol.control.defaults.defaults({ attribution: false }),
  });
  map.once("rendercomplete", () => view.fit(mapExtent, {
    size: map.getSize(),
    padding: [42, 42, 42, 42],
    maxZoom: 4,
  }));

  function updateRoute() {
    const start = graph.nodes.find((node) => node.label === fromSelect.value);
    const target = graph.nodes.find((node) => node.label === toSelect.value);
    const route = shortestPath(graph, start, target);
    routeSource.clear();
    const summary = document.querySelector("#route-summary");
    const details = document.querySelector("#route-details");
    if (!route) {
      summary.textContent = "Δεν υπάρχει διαδρομή";
      details.textContent = `${start.label} προς ${target.label}`;
      return;
    }

    for (const connection of route.connections) {
      const coordinates = connection.forward
        ? connection.edge.coordinates
        : connection.edge.coordinates.slice().reverse();
      routeSource.addFeature(new ol.Feature({ geometry: new ol.geom.LineString(coordinates) }));
    }
    summary.textContent = `${route.nodes.map((node) => node.label).join(" → ")} · ${route.length.toFixed(1)} m`;
    details.textContent = `${start.label} προς ${target.label}`;
  }

  fromSelect.addEventListener("change", updateRoute);
  toSelect.addEventListener("change", updateRoute);
  updateRoute();

  // Coffee delivery logic
  let distanceMatrix = null;
  let pathCache = null;

  function getSelectedStops() {
    const origin = coffeeOrigin.value;
    return Array.from(stopsList.querySelectorAll("input:checked"))
      .map(cb => cb.value)
      .filter(label => label !== origin);
  }

  function buildDistanceMatrix() {
    const originLabel = coffeeOrigin.value;
    const stops = getSelectedStops();
    const points = [originLabel, ...stops];
    const nodesByLabel = Object.fromEntries(graph.nodes.map(n => [n.label, n]));
    const matrix = {};
    const paths = {};
    for (const from of points) {
      matrix[from] = {};
      paths[from] = {};
      const fromNode = nodesByLabel[from];
      for (const to of points) {
        if (from === to) {
          matrix[from][to] = 0;
          paths[from][to] = null;
          continue;
        }
        const toNode = nodesByLabel[to];
        const result = shortestPath(graph, fromNode, toNode);
        matrix[from][to] = result ? result.length : Infinity;
        paths[from][to] = result;
      }
    }
    distanceMatrix = matrix;
    pathCache = paths;
    updateDistanceTable();
  }

  function updateDistanceTable() {
    const section = document.querySelector("#dist-section");
    const table = document.querySelector("#dist-table");
    const note = document.querySelector("#dist-note");
    if (!distanceMatrix) {
      section.style.display = "none";
      return;
    }
    const points = Object.keys(distanceMatrix);
    table.innerHTML = "";
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    hr.append(document.createElement("th"));
    for (const p of points) {
      const th = document.createElement("th");
      th.textContent = p;
      hr.append(th);
    }
    thead.append(hr);
    table.append(thead);
    const tbody = document.createElement("tbody");
    for (const from of points) {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.textContent = from;
      tr.append(th);
      for (const to of points) {
        const td = document.createElement("td");
        const d = distanceMatrix[from][to];
        td.textContent = Number.isFinite(d) ? d.toFixed(1) : "∞";
        tr.append(td);
      }
      tbody.append(tr);
    }
    table.append(tbody);
    note.textContent = `Αφετηρία ${coffeeOrigin.value} και ${getSelectedStops().length} στάσεις`;
    section.style.display = "block";
  }

  function clearTours() {
    allRoutesSource.clear();
    nnRouteSource.clear();
    document.querySelector("#tours-section").style.display = "none";
    document.querySelector("#diff-sentence").textContent = "";
    document.querySelector("#tours-rows").innerHTML = "";
  }

  function drawTour(source, order, colorStyle) {
    source.clear();
    if (!pathCache || order.length < 2) return;
    for (let i = 0; i < order.length - 1; i++) {
      const from = order[i];
      const to = order[i + 1];
      const path = pathCache[from] && pathCache[from][to];
      if (!path) continue;
      for (const connection of path.connections) {
        const coordinates = connection.forward
          ? connection.edge.coordinates
          : connection.edge.coordinates.slice().reverse();
        source.addFeature(new ol.Feature({ geometry: new ol.geom.LineString(coordinates) }));
      }
    }
  }

  function showTours(allResult, nnResult) {
    const section = document.querySelector("#tours-section");
    const rows = document.querySelector("#tours-rows");
    const diff = document.querySelector("#diff-sentence");
    rows.innerHTML = "";

    function addTourRow(method, order, length, tried, time) {
      const tr = document.createElement("tr");
      addCell(tr, method);
      addCell(tr, order.join(" → "));
      addCell(tr, length.toFixed(1));
      addCell(tr, String(tried));
      addCell(tr, time.toFixed(1));
      rows.append(tr);
    }

    if (allResult) {
      addTourRow("Όλες οι σειρές", allResult.order, allResult.length, allResult.tried, allResult.time);
      drawTour(allRoutesSource, allResult.order);
    }
    if (nnResult) {
      addTourRow("Πλησιέστερος γείτονας", nnResult.order, nnResult.length, 1, nnResult.time);
      drawTour(nnRouteSource, nnResult.order);
    }

    if (allResult && nnResult && Number.isFinite(allResult.length) && allResult.length > 0) {
      const meters = nnResult.length - allResult.length;
      const pct = (meters / allResult.length) * 100;
      diff.textContent = `Ο γύρος του πλησιέστερου γείτονα είναι ${meters.toFixed(1)} m (${pct.toFixed(1)}%) μακρύτερος από τον συντομότερο.`;
    } else {
      diff.textContent = "";
    }
    section.style.display = "block";
  }

  function computeAllPerms() {
    const origin = coffeeOrigin.value;
    const stops = getSelectedStops();
    if (stops.length > 10) {
      const n = factorial(stops.length);
      alert(`Οι στάσεις είναι ${stops.length}. Θα χρειάζονταν ${n.toLocaleString("el-GR")} σειρές (παραγοντικό). Είναι πάρα πολλές.`);
      return null;
    }
    if (stops.length === 0) return null;
    const start = performance.now();
    const perms = permutations(stops);
    let best = null;
    let bestLen = Infinity;
    for (const perm of perms) {
      const order = [origin, ...perm, origin];
      let len = 0;
      let ok = true;
      for (let i = 0; i < order.length - 1; i++) {
        const d = distanceMatrix[order[i]][order[i + 1]];
        if (!Number.isFinite(d)) { ok = false; break; }
        len += d;
      }
      if (ok && len < bestLen) {
        bestLen = len;
        best = { order, length: len };
      }
    }
    const time = performance.now() - start;
    if (!best) return null;
    return { ...best, tried: perms.length, time };
  }

  function computeNearestNeighbor() {
    const origin = coffeeOrigin.value;
    const stops = getSelectedStops();
    if (stops.length === 0) return null;
    const start = performance.now();
    const remaining = new Set(stops);
    const order = [origin];
    let current = origin;
    let len = 0;
    while (remaining.size > 0) {
      let best = null;
      let bestD = Infinity;
      for (const s of remaining) {
        const d = distanceMatrix[current][s];
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      }
      if (!best || !Number.isFinite(bestD)) return null;
      order.push(best);
      len += bestD;
      remaining.delete(best);
      current = best;
    }
    const back = distanceMatrix[current][origin];
    if (!Number.isFinite(back)) return null;
    order.push(origin);
    len += back;
    const time = performance.now() - start;
    return { order, length: len, time };
  }

  function updateCoffeeInfo() {
    const stops = getSelectedStops();
    const n = stops.length;
    const perms = n <= 20 ? factorial(n) : "πολύ μεγάλο";
    coffeeInfo.textContent = `${n} στάσεις · ${typeof perms === "number" ? perms.toLocaleString("el-GR") : perms} δυνατές σειρές`;
  }

  function onCoffeeChange() {
    clearTours();
    buildDistanceMatrix();
    updateCoffeeInfo();
    nodesLayer.changed();
  }

  coffeeOrigin.addEventListener("change", onCoffeeChange);
  btnAll.addEventListener("click", () => {
    if (!distanceMatrix) buildDistanceMatrix();
    const all = computeAllPerms();
    const nn = computeNearestNeighbor();
    showTours(all, nn);
  });
  btnNN.addEventListener("click", () => {
    if (!distanceMatrix) buildDistanceMatrix();
    const all = null; // only NN requested
    const nn = computeNearestNeighbor();
    showTours(all, nn);
  });

  onCoffeeChange();
}

document.addEventListener("DOMContentLoaded", initializeCampusPage);
