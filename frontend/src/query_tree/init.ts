import type { EditorAndLanguageClient } from "../types/monaco";
import type { QueryExecutionNode, QueryExecutionTree } from "../types/query_execution_tree";
import * as d3 from 'd3';
import { replaceIRIs, truncateText } from "./utils";
import type { ExecuteQueryDetails } from "../results";
import type { Backend } from "../types/backend";
import { Position } from "vscode";

const boxWidth = 300;
const boxHeight = 90;
const boxMargin = 30
const boxPadding = 20;
const margin = { top: 20, right: 20, bottom: 20, left: 20 };
const cellSize = 100;

export function setupQueryExecutionTree(editorAndLanguageClient: EditorAndLanguageClient) {
  const queryTreeModal = document.getElementById("queryExecutionTreeModal")!;
  const queryTreeSvg = document.getElementById("queryExecutionTreeSvg")!;
  const analysisButton = document.getElementById("analysisButton")!;
  const closeButton = document.getElementById("queryExecutionTreeModalCloseButton")!;

  const width = screen.width;
  const height = screen.height;

  const svg = d3.select<SVGElement, any>("#queryExecutionTreeSvg")
    .attr("width", width)
    .attr("height", height);
  const container = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const zoom = d3.zoom()
    .scaleExtent([0.5, 5])
    .on('zoom', (event) => {
      container.attr('transform', event.transform);
    });

  svg.call(zoom);

  animateGradients();




  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      queryTreeModal.classList.add('hidden'); // or remove 'open'
    }
  });

  analysisButton.addEventListener("click", () => {
    queryTreeModal.classList.remove("hidden")
    svg.call(zoom.translateTo, 0, height / 2 - boxHeight / 2 - boxMargin - 40);
  });



  closeButton.addEventListener("click", () => {
    queryTreeModal.classList.add("hidden");
  });

  document.addEventListener("execute-query", async (event: Event) => {
    // NOTE: clean previous data
    root = null;
    svg.select("#treeContainer").remove();

    const { queryId } = (event as CustomEvent<ExecuteQueryDetails>).detail;
    console.log(queryId);

    const backend = await editorAndLanguageClient.languageClient.sendRequest("qlueLs/getBackend", {}) as Backend;
    console.log(backend.url, queryId);

    const url = new URL(backend.url);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = url.pathname.replace(/\/$/, "") + `/watch/${queryId}`;
    const socket = new WebSocket(url);

    socket.addEventListener("open", (event) => {
      socket.send("cancel_on_close");
    });

    socket.addEventListener("message", (event) => {
      const queryExecutionTree = JSON.parse(event.data) as QueryExecutionTree;
      renderQueryExecutionTree(queryExecutionTree)

    });

  })

}

let root: d3.HierarchyNode<QueryExecutionNode> | null = null;
function renderQueryExecutionTree(queryExectionTree: QueryExecutionTree) {
  if (!root) {
    initializeTree(queryExectionTree);
  }
  //TODO: Debounce

}

function initializeTree(queryExectionTree: QueryExecutionNode) {
  root = d3.hierarchy<QueryExecutionTree>(queryExectionTree);
  const nodes = root.descendants();
  nodes.forEach((node, i) => node.data.id = i);

  const container = d3.select("#queryExecutionTreeSvg").select<SVGGElement>("g").append("g").attr("id", "treeContainer");

  const positions = treeLayout(root)

  const line = d3
    .line()
    .x(d => d[0])
    .y(d => d[1])
    .curve(d3.curveBasis);

  // NOTE: draw links between nodes
  const nodesWithParents = nodes.filter(node => node.data.id != root!.data.id);
  container
    .selectAll<SVGPathElement, d3.HierarchyNode<QueryExecutionTree>>("path.link")
    .data(nodesWithParents, d => d.data.id!)
    .join("path")
    .attr("class", "link stroke-neutral-400 dark:stroke-neutral-500 stroke-2 fill-none")
    .attr("d", d => {
      const [px, py] = positions[d.parent!.data.id!];
      const [cx, cy] = positions[d.data.id!];

      return line([
        [px, py + boxHeight / 2],
        [px, py + boxHeight / 2 + boxMargin / 2],
        [cx, cy - boxHeight / 2 - boxMargin],
        [cx, cy - boxHeight / 2]
      ])!;
    });

  // NOTE: link glow
  container
    .selectAll<SVGPathElement, d3.HierarchyNode<QueryExecutionTree>>("path.glow")
    .data(nodesWithParents, d => d.data.id!)
    .join("path")
    .attr("class", "glow stroke-2 fill-none")
    .attr("stroke", "url(#glowGradientLine)")
    .attr("filter", "url(#glow)")
    .attr("d", d => {
      const [px, py] = positions[d.parent!.data.id!];
      const [cx, cy] = positions[d.data.id!];

      return line([
        [px, py + boxHeight / 2],
        [px, py + boxHeight / 2 + boxMargin / 2],
        [cx, cy - boxHeight / 2 - boxMargin],
        [cx, cy - boxHeight / 2]
      ])!;
    });

  // NOTE: bind data to dom nodes
  const node_selection = container.selectAll<SVGGElement, d3.HierarchyNode<QueryExecutionTree>>(".node")
    .data(nodes, d => d.data.id!)
    .join("g")
    .attr("class", "node")
    .attr("transform", d => {
      const [x, y] = positions[d.data.id!];
      return `translate(${x},${y})`;
    });


  // NOTE: draw a rectangle for each node
  node_selection.selectAll<SVGRectElement, unknown>("rect.main")
    .data(d => [d])
    .join("rect")
    .attr("class", "main")
    .attr("x", -boxWidth / 2)
    .attr("y", -boxHeight / 2)
    .attr("rx", 8)
    .attr("ry", 8)
    .attr("width", boxWidth)
    .attr("height", boxHeight)
    .attr("class", "fill-white dark:fill-neutral-700 stroke-neutral-400 dark:stroke-neutral-500 stroke-2");

  // NOTE: draw a rectangle for the glow effect
  node_selection.selectAll<SVGRectElement, unknown>("rect.glow")
    .data(d => [d])
    .join("rect")
    .attr("class", "glow")
    .attr("x", -boxWidth / 2)
    .attr("y", -boxHeight / 2)
    .attr("width", boxWidth)
    .attr("height", boxHeight)
    .attr('rx', 8)
    .attr('fill', 'none')
    .attr('stroke', 'url(#glowGradientRect)')
    .attr('stroke-width', 2)
    .attr('filter', 'url(#glow)');

  // NOTE: Title
  node_selection.selectAll<SVGTextElement, d3.HierarchyNode<QueryExecutionTree>>("text.title")
    .data(d => [d])
    .join("text")
    .attr("class", "title fill-neutral-500 dark:fill-neutral-300 font-bold text-xs")
    .attr("x", 0)
    .attr("y", -boxHeight / 2 + boxPadding)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .text(d => truncateText(replaceIRIs(d.data.description), 40))

  // NOTE:Columns
  node_selection.selectAll<SVGTextElement, d3.HierarchyNode<QueryExecutionTree>>("text.cols")
    .data(d => [d])
    .join("text")
    .attr("class", "cols fill-neutral-700 dark:fill-neutral-300 text-xs")
    .attr("x", -boxWidth / 2 + 10)
    .attr("y", -boxHeight / 2 + boxPadding + 25)
    .attr("text-anchor", "start")
    .attr("dominant-baseline", "middle")
    .text(d => truncateText(`Cols: ${d.data.column_names.join(", ")}`, 40))

  // NOTE: Size
  node_selection.selectAll<SVGTextElement, d3.HierarchyNode<QueryExecutionTree>>("text.size")
    .data(d => [d])
    .join("text")
    .attr("class", "size fill-neutral-700 dark:fill-neutral-300 text-xs")
    .attr("x", -boxWidth / 2 + 10)
    .attr("y", -boxHeight / 2 + boxPadding + 40)
    .attr("text-anchor", "start")
    .attr("dominant-baseline", "middle")
    .text(d => `Size: ${d.data.result_rows} x ${d.data.result_cols}`);

  // NOTE: Time
  node_selection.selectAll<SVGTextElement, d3.HierarchyNode<QueryExecutionTree>>("text.time")
    .data(d => [d])
    .join("text")
    .attr("class", "time fill-neutral-700 dark:fill-neutral-300 text-xs")
    .attr("x", -boxWidth / 2 + 10)
    .attr("y", -boxHeight / 2 + boxPadding + 55)
    .attr("text-anchor", "start")
    .attr("dominant-baseline", "middle")
    .text(d => `Time: ${d.data.total_time}`);

}

function treeLayout(root: d3.HierarchyNode<QueryExecutionTree>): Record<number, [number, number]> {
  const layouts: Record<number, Layout> = {};

  root.eachAfter((node) => {
    if (!node.children) {
      layouts[node.data.id!] = [[0, boxWidth + boxMargin * 2]]
    } else {
      const merged = node.children.map(node => layouts[node.data.id!]).reduce(mergeLayout, []);
      const center = (merged[0][0] + merged[0][1]) / 2;
      layouts[node.data.id!] = [[center - (boxWidth / 2 + boxMargin), center + boxWidth / 2 + boxMargin], ...merged];
    }
  })

  const positions: Record<number, [number, number]> = {};

  positions[root.data.id!] = [0, 0];
  root.eachBefore((node) => {
    const position = positions[node.data.id!];
    if (node.children) {
      const spanWidth = layouts[node.data.id!][1][1] - layouts[node.data.id!][1][0];

      if (node.children.length >= 1) {
        positions[node.children[0].data.id!] = [position[0] - spanWidth / 2 + boxWidth / 2 + boxMargin, position[1] + boxHeight + boxMargin * 2]
      }
      if (node.children.length == 2) {
        positions[node.children[1].data.id!] = [position[0] + spanWidth / 2 - (boxWidth / 2 + boxMargin), position[1] + boxHeight + boxMargin * 2]
      }
    }
  })
  return positions;
}

type Layout = [number, number][];

function mergeLayout(layoutLeft: Layout, layoutRight: Layout): Layout {

  if (layoutLeft.length == 0 && layoutRight.length == 0) {
    return [[0, 1]]
  }
  else if (layoutRight.length == 0) {
    return layoutLeft;
  } else if (layoutLeft.length == 0) {
    return layoutRight;
  }
  const pushRight = Math.max(...d3.zip(layoutLeft, layoutRight).map(([left, right]) => left[1] - right[0]));

  layoutRight = layoutRight.map(([left, right]) => [left + pushRight, right + pushRight]);

  const mergedLayout: Layout = [];
  for (let i = 0; i < Math.max(layoutRight.length, layoutLeft.length); i++) {
    if (layoutLeft[i] && layoutRight[i]) {
      mergedLayout.push([layoutLeft[i][0], layoutRight[i][1]]);
    }
    else if (layoutLeft[i]) {
      mergedLayout.push(layoutLeft[i]);
    }
    else if (layoutRight[i]) {
      mergedLayout.push([layoutRight[i][0], layoutRight[i][1]]);
    }

  }

  return mergedLayout
}

function animateGradients() {
  const defs = d3.select<SVGElement, any>("#queryExecutionTreeSvg").append("defs")
  const filter = defs.append('filter').attr('id', 'glow');
  filter.append('feGaussianBlur')
    .attr('stdDeviation', 5)
    .attr('result', 'coloredBlur');

  const feMerge = filter.append('feMerge');
  feMerge.append('feMergeNode').attr('in', 'coloredBlur');
  feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

  // Gradient
  const color = "oklch(66.7% 0.295 322.15)"
  const rectGradient = defs.append('linearGradient').attr('id', 'glowGradientRect');
  rectGradient.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.1);
  rectGradient.append('stop').attr('offset', '30%').attr('stop-color', color).attr('stop-opacity', 0.4);
  rectGradient.append('stop').attr('offset', '50%').attr('stop-color', color).attr('stop-opacity', 1);
  rectGradient.append('stop').attr('offset', '70%').attr('stop-color', color).attr('stop-opacity', 0.4);
  rectGradient.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0.1);

  const linearGradient = defs.append("linearGradient")
    .attr("id", "glowGradientLine")
    .attr("x1", "0%")
    .attr("y1", "100%")
    .attr("x2", "0%")
    .attr("y2", "0%");

  const linkGradiantStop1 = linearGradient.append("stop").attr("stop-color", color).attr("stop-opacity", 0);
  const linkGradiantStop2 = linearGradient.append("stop").attr("stop-color", color).attr("stop-opacity", 1);
  const linkGradiantStop3 = linearGradient.append("stop").attr("stop-color", color).attr("stop-opacity", 0);
  const linkGradiantStop4 = linearGradient.append("stop").attr("stop-color", color).attr("stop-opacity", 0);
  const linkGradiantStop5 = linearGradient.append("stop").attr("stop-color", color).attr("stop-opacity", 1);
  const linkGradiantStop6 = linearGradient.append("stop").attr("stop-color", color).attr("offset", "100%").attr("stop-opacity", 0);

  const speed = 0.1;

  function updateGradientRect(t: number) {
    const angle = (t * speed) % 360;
    const rad = angle * Math.PI / 180;
    const x2 = 50 + 50 * Math.cos(rad);
    const y2 = 50 + 50 * Math.sin(rad);
    rectGradient
      .attr('x1', `${50 - 50 * Math.cos(rad)}%`)
      .attr('y1', `${50 - 50 * Math.sin(rad)}%`)
      .attr('x2', `${x2}%`)
      .attr('y2', `${y2}%`);
  }

  function updateGradientLine(t: number) {
    const p = (t * speed * 10 / 18 + 50) % 100 - 50;

    const a = Math.min(Math.max(p - 10, 0), 100);
    const b = Math.min(Math.max(p, 0), 100);
    const c = Math.min(p + 10, 100);
    const d = Math.min(p + 100 - 10, 100);
    const e = Math.min(p + 100, 100);
    const f = Math.min(p + 100 + 10, 100);

    linkGradiantStop1.attr("offset", `${a}%`);
    linkGradiantStop2.attr("offset", `${b}%`);
    linkGradiantStop3.attr("offset", `${c}%`);
    linkGradiantStop4.attr("offset", `${d}%`);
    linkGradiantStop5.attr("offset", `${e}%`);
    linkGradiantStop6.attr("offset", `${f}%`);
  }

  d3.timer((elapsed) => {
    updateGradientRect(elapsed);
    updateGradientLine(elapsed);
  });
}
