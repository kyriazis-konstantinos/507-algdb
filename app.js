function buildNetwork(roads, tolerance) {
  const nodes = [];
  const edges = [];

  function findOrCreateNode(point) {
    const existing = nodes.find((node) => Math.hypot(node.x - point[0], node.y - point[1]) < tolerance);
    if (existing) return existing;

    const node = {
      id: `Κ${nodes.length + 1}`,
      x: point[0],
      y: point[1],
      neighbors: new Map(),
      incoming: 0,
      outgoing: 0,
      reachable: false,
    };
    nodes.push(node);
    return node;
  }

  for (const road of roads) {
    const start = findOrCreateNode(road.simeia[0]);
    const end = findOrCreateNode(road.simeia[road.simeia.length - 1]);
    const length = road.simeia.slice(1).reduce((total, point, index) => {
      const previous = road.simeia[index];
      return total + Math.hypot(point[0] - previous[0], point[1] - previous[1]);
    }, 0);
    edges.push({ name: road.onoma, start, end, length, oneWay: road.monodromos });
  }

  const outgoing = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    const { start, end } = edge;
    start.neighbors.set(end.id, edge.oneWay ? `${end.id} →` : `${end.id} ↔`);
    end.neighbors.set(start.id, edge.oneWay ? `← ${start.id}` : `${start.id} ↔`);
    start.outgoing += 1;
    end.incoming += 1;
    outgoing.get(start.id).push(end.id);

    if (!edge.oneWay) {
      end.outgoing += 1;
      start.incoming += 1;
      outgoing.get(end.id).push(start.id);
    }
  }

  const root = nodes[0];
  const queue = root ? [root.id] : [];
  if (root) root.reachable = true;

  for (let index = 0; index < queue.length; index += 1) {
    for (const neighborId of outgoing.get(queue[index])) {
      const neighbor = nodes.find((node) => node.id === neighborId);
      if (!neighbor.reachable) {
        neighbor.reachable = true;
        queue.push(neighborId);
      }
    }
  }

  return { nodes, edges };
}

function initializeNetworkPage() {
  const { nodes, edges } = buildNetwork(dromoi, ANOCHI_METRA);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const unreachable = nodes.filter((node) => !node.reachable);
  const canvas = document.querySelector("#network-canvas");
  const nodeRows = document.querySelector("#node-rows");
  const edgeRows = document.querySelector("#edge-rows");

  function addCell(row, value, className = "") {
    const cell = document.createElement("td");
    cell.textContent = value;
    if (className) cell.className = className;
    row.append(cell);
  }

  for (const node of nodes) {
    const row = document.createElement("tr");
    row.dataset.reachable = String(node.reachable);
    addCell(row, node.id, "node-id");
    addCell(row, `${node.x.toFixed(1)}, ${node.y.toFixed(1)}`, "coordinates");
    addCell(row, String(node.neighbors.size), "degree");
    addCell(row, [...node.neighbors.values()].join(", ") || "—", "neighbors");
    addCell(row, node.reachable ? "Προσβάσιμος" : "Μη προσβάσιμος", node.reachable ? "reachable" : "unreachable");
    nodeRows.append(row);
  }

  for (const edge of edges) {
    const row = document.createElement("tr");
    addCell(row, edge.name, "edge-name");
    addCell(row, `${edge.start.id} ${edge.oneWay ? "→" : "↔"} ${edge.end.id}`, "edge-direction");
    addCell(row, `${edge.length.toFixed(2)} m`, "edge-length");
    edgeRows.append(row);
  }

  document.querySelector("#node-count").textContent = String(nodes.length);
  document.querySelector("#edge-count").textContent = String(edges.length);
  document.querySelector("#unreachable-count").textContent = String(unreachable.length);
  document.querySelector("#tolerance-value").textContent = `${ANOCHI_METRA.toFixed(1)} m`;
  document.querySelector("#unreachable-list").textContent = unreachable.length
    ? unreachable.map((node) => node.id).join(" · ")
    : "Όλοι οι κόμβοι είναι προσβάσιμοι από τον Κ1.";

  function drawNetwork() {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, bounds.width, bounds.height);

    const points = dromoi.flatMap((road) => road.simeia);
    const minX = Math.min(...points.map((point) => point[0]));
    const maxX = Math.max(...points.map((point) => point[0]));
    const minY = Math.min(...points.map((point) => point[1]));
    const maxY = Math.max(...points.map((point) => point[1]));
    const padding = 54;
    const scale = Math.min(
      (bounds.width - padding * 2) / Math.max(maxX - minX, 1),
      (bounds.height - padding * 2) / Math.max(maxY - minY, 1),
    );
    const offsetX = (bounds.width - (maxX - minX) * scale) / 2;
    const offsetY = (bounds.height - (maxY - minY) * scale) / 2;
    const project = ([x, y]) => ({
      x: offsetX + (x - minX) * scale,
      y: bounds.height - offsetY - (y - minY) * scale,
    });

    function pointAlong(path, fraction) {
      const segments = path.slice(1).map((point, index) => {
        const from = project(path[index]);
        const to = project(point);
        return { from, to, length: Math.hypot(to.x - from.x, to.y - from.y) };
      });
      const total = segments.reduce((sum, segment) => sum + segment.length, 0);
      let distance = total * fraction;
      for (const segment of segments) {
        if (distance <= segment.length) {
          const ratio = segment.length ? distance / segment.length : 0;
          return {
            x: segment.from.x + (segment.to.x - segment.from.x) * ratio,
            y: segment.from.y + (segment.to.y - segment.from.y) * ratio,
            angle: Math.atan2(segment.to.y - segment.from.y, segment.to.x - segment.from.x),
          };
        }
        distance -= segment.length;
      }
      return { ...project(path[path.length - 1]), angle: 0 };
    }

    edges.forEach((edge, index) => {
      const path = dromoi[index].simeia.map(project);
      const color = edge.start.reachable && edge.end.reachable ? "#276a58" : "#cb684c";
      context.beginPath();
      path.forEach((point, pointIndex) => {
        if (pointIndex === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.strokeStyle = color;
      context.lineWidth = 5;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.stroke();

      const label = pointAlong(dromoi[index].simeia, 0.5);
      context.font = "600 11px 'DM Sans', sans-serif";
      const labelWidth = context.measureText(edge.name).width + 12;
      context.fillStyle = "#fbfcf8";
      context.fillRect(label.x - labelWidth / 2, label.y - 19, labelWidth, 17);
      context.fillStyle = color;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(edge.name, label.x, label.y - 10.5);

      if (edge.oneWay) {
        const arrow = pointAlong(dromoi[index].simeia, 0.72);
        context.save();
        context.translate(arrow.x, arrow.y);
        context.rotate(arrow.angle);
        context.beginPath();
        context.moveTo(8, 0);
        context.lineTo(-5, -5);
        context.lineTo(-5, 5);
        context.closePath();
        context.fillStyle = "#e56d4d";
        context.fill();
        context.restore();
      }
    });

    for (const node of nodes) {
      const point = project([node.x, node.y]);
      context.beginPath();
      context.arc(point.x, point.y, 8, 0, Math.PI * 2);
      context.fillStyle = node.reachable ? "#276a58" : "#cb684c";
      context.fill();
      context.lineWidth = 3;
      context.strokeStyle = "#fbfcf8";
      context.stroke();
      context.fillStyle = "#172b2b";
      context.font = "700 12px 'Space Grotesk', sans-serif";
      context.textAlign = "center";
      context.textBaseline = "bottom";
      context.fillText(node.id, point.x, point.y - 12);
    }
  }

  window.addEventListener("resize", drawNetwork);
  drawNetwork();
}

document.addEventListener("DOMContentLoaded", initializeNetworkPage);