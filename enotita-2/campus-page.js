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

function initializeCampusPage() {
  const graph = buildCampusGraph(dromoi);
  const fromSelect = document.querySelector("#from-node");
  const toSelect = document.querySelector("#to-node");
  const routeSource = new ol.source.Vector();

  function addCell(row, value, className = "") {
    const cell = document.createElement("td");
    cell.textContent = value;
    if (className) cell.className = className;
    row.append(cell);
  }

  for (const node of graph.nodes) {
    for (const select of [fromSelect, toSelect]) {
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
    style: (feature) => new ol.style.Style({
      image: new ol.style.Circle({
        radius: 8,
        fill: new ol.style.Fill({ color: "#fbfcf8" }),
        stroke: new ol.style.Stroke({ color: "#172b2b", width: 2 }),
      }),
      text: new ol.style.Text({
        text: feature.get("node").label,
        offsetY: -17,
        font: "700 13px 'Space Grotesk', sans-serif",
        fill: new ol.style.Fill({ color: "#172b2b" }),
        stroke: new ol.style.Stroke({ color: "#fbfcf8", width: 4 }),
      }),
    }),
  });
  const routeLayer = new ol.layer.Vector({
    source: routeSource,
    style: new ol.style.Style({
      stroke: new ol.style.Stroke({ color: "#176f96", width: 8, lineCap: "round", lineJoin: "round" }),
    }),
  });

  const view = new ol.View({ projection, center: ol.extent.getCenter(mapExtent), zoom: 2 });
  const map = new ol.Map({
    target: "map",
    layers: [buildingsLayer, roadsLayer, nodesLayer, routeLayer],
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
}

document.addEventListener("DOMContentLoaded", initializeCampusPage);