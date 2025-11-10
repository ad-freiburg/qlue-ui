import type { EditorAndLanguageClient } from "../types/monaco";
import type { QueryExecutionTree } from "../types/query_execution_tree";
import queryExecutionTree from "./tree.json"
import * as d3 from 'd3';
import { replaceIRIs, truncateText } from "./utils";

export function setupQueryExecutionTree(editorAndLanguageClient: EditorAndLanguageClient) {
  const queryTreeModal = document.getElementById("queryExecutionTreeModal")!;
  const queryTreeContainer = document.getElementById("queryExecutionTree")!;
  const queryTreeSvg = document.getElementById("queryExecutionTreeSvg")!;
  const analysisButton = document.getElementById("analysisButton")!;

  queryTreeModal.addEventListener("click", () => {
    queryTreeModal.classList.add("hidden");
  });

  analysisButton.addEventListener("click", () => {
    queryTreeModal.classList.remove("hidden")
  });

  queryTreeContainer.addEventListener("click", (e) => {
    e.stopPropagation();
  });


  const width = queryTreeSvg.clientWidth;
  const height = queryTreeSvg.clientHeight;
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const cellSize = 100;

  const tree = queryExecutionTree as QueryExecutionTree;
  const svg = d3.select("#queryExecutionTreeSvg")
    .attr("width", width)
    .attr("height", height);
  const container = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);


  const defs = svg.append('defs');

  const filter = defs.append('filter').attr('id', 'glow');
  filter.append('feGaussianBlur')
    .attr('stdDeviation', 4)
    .attr('result', 'coloredBlur');

  const feMerge = filter.append('feMerge');
  feMerge.append('feMergeNode').attr('in', 'coloredBlur');
  feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

  // Gradient
  const rectGradient = defs.append('linearGradient').attr('id', 'glowGradient');
  rectGradient.append('stop').attr('offset', '0%').attr('stop-color', '#00ff00').attr('stop-opacity', 0.2);
  rectGradient.append('stop').attr('offset', '30%').attr('stop-color', '#00ff00').attr('stop-opacity', 0.4);
  rectGradient.append('stop').attr('offset', '50%').attr('stop-color', '#00ff00').attr('stop-opacity', 1);
  rectGradient.append('stop').attr('offset', '70%').attr('stop-color', '#00ff00').attr('stop-opacity', 0.4);
  rectGradient.append('stop').attr('offset', '100%').attr('stop-color', '#00ff00').attr('stop-opacity', 0.2);

  // svg.selectAll('line.vertical')
  //   .data(d3.range(0, width, cellSize / 2))
  //   .enter()
  //   .append('line')
  //   .attr('stroke', '#ffffff')
  //   .attr('x1', d => d)
  //   .attr('y1', 0)
  //   .attr('x2', d => d)
  //   .attr('y2', height);
  //
  // svg.selectAll('line.horizontal')
  //   .data(d3.range(0, height, cellSize / 2))
  //   .enter()
  //   .append('line')
  //   .attr('stroke', '#ffffff')
  //   .attr('x1', 0)
  //   .attr('y1', d => d)
  //   .attr('x2', width)
  //   .attr('y2', d => d);

  const boxWidth = 300;
  const boxHeight = 90;
  const boxMargin = 30
  const boxPadding = 20;

  const root = d3.hierarchy(queryExecutionTree);

  const nodes = root.descendants();
  let i = 0;
  const node = svg.selectAll(".node").data(nodes, d => d.id || (d.id = i++))
  const layouts: Record<number, Layout> = {};

  root.eachAfter((node) => {
    if (!node.children) {
      layouts[node.id] = [[0, boxWidth + boxMargin * 2]]
    } else {
      const merged = node.children.map(node => layouts[node.id]).reduce(mergeLayout, []);
      const center = (merged[0][0] + merged[0][1]) / 2;
      layouts[node.id] = [[center - (boxWidth / 2 + boxMargin), center + boxWidth / 2 + boxMargin]].concat(merged);
    }
  })

  const positions: Record<number, [number, number]> = {};
  positions[root.id] = [0, 0];
  root.eachBefore((node) => {
    const position = positions[node.id];
    if (node.children) {
      const spanWidth = layouts[node.id][1][1] - layouts[node.id][1][0];

      if (node.children.length >= 1) {
        positions[node.children[0].id] = [position[0] - spanWidth / 2 + boxWidth / 2 + boxMargin, position[1] + boxHeight + boxMargin * 2]
      }
      if (node.children.length == 2) {
        positions[node.children[1].id] = [position[0] + spanWidth / 2 - (boxWidth / 2 + boxMargin), position[1] + boxHeight + boxMargin * 2]

      }
    }
  })

  const line = d3.line()
    .x(d => d.x)
    .y(d => d.y)
    .curve(d3.curveBasis); // or curveNatural, curveBundle, etc.



  nodes.forEach((node) => {
    const x = positions[node.id][0];
    const y = positions[node.id][1];

    node.children?.forEach(child => {
      const childX = positions[child.id][0];
      const childY = positions[child.id][1];
      container.append('path')
        .attr('d', line([
          { x: x, y: y + boxHeight / 2 },
          { x: x, y: y + boxHeight / 2 + boxMargin / 2 },
          { x: childX, y: childY - boxHeight / 2 - boxMargin },
          { x: childX, y: childY - boxHeight / 2 }
        ]))
        .attr('class', 'stroke-neutral-800 dark:stroke-neutral-500 stroke-2 fill-none');
    });

    container.append("rect")
      .attr("x", x - boxWidth / 2)
      .attr("y", y - boxHeight / 2)
      .attr("rx", 8)
      .attr("ry", 8)
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .attr("class", "fill-neutral-400 dark:fill-neutral-700 stroke-neutral-500 stroke-2");

    container.append('rect')
      .attr("x", x - boxWidth / 2)
      .attr("y", y - boxHeight / 2)
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .attr('rx', 8)
      .attr('fill', 'none')
      .attr('stroke', 'url(#glowGradient)')
      .attr('stroke-width', 2)
      .attr('filter', 'url(#glow)');

    // Animation with d3.timer
    function updateGradient(angle) {
      const rad = angle * Math.PI / 180;
      const x2 = 50 + 50 * Math.cos(rad);
      const y2 = 50 + 50 * Math.sin(rad);
      rectGradient
        .attr('x1', `${50 - 50 * Math.cos(rad)}%`)
        .attr('y1', `${50 - 50 * Math.sin(rad)}%`)
        .attr('x2', `${x2}%`)
        .attr('y2', `${y2}%`);
    }

    d3.timer((elapsed) => {
      const angle = (elapsed / 10) % 360;
      updateGradient(angle);
    });

    const titleText = container.append('text')
      .attr('x', x)
      .attr('y', y - boxHeight / 2 + boxPadding)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr("class", "fill-neutral-700 dark:fill-neutral-300 font-bold text-xs")
      .text(replaceIRIs(node.data.description));

    truncateText(titleText, boxWidth - boxPadding);

    const colsText = container.append('text')
      .attr('x', x - boxWidth / 2 + 10)
      .attr('y', y - boxHeight / 2 + boxPadding + 25)
      .attr('text-anchor', 'left')
      .attr('dominant-baseline', 'middle')
      .attr("class", "fill-neutral-700 dark:fill-neutral-300 text-xs")
      .text(`Cols: ${node.data.column_names.join(", ")}`);
    truncateText(colsText, boxWidth - boxPadding);

    container.append('text')
      .attr('x', x - boxWidth / 2 + 10)
      .attr('y', y - boxHeight / 2 + boxPadding + 40)
      .attr('text-anchor', 'left')
      .attr('dominant-baseline', 'middle')
      .attr("class", "fill-neutral-700 dark:fill-neutral-300 text-xs")
      .text(`Size: ${node.data.result_rows} x ${node.data.result_cols}`);

    container.append('text')
      .attr('x', x - boxWidth / 2 + 10)
      .attr('y', y - boxHeight / 2 + boxPadding + 55)
      .attr('text-anchor', 'left')
      .attr('dominant-baseline', 'middle')
      .attr("class", "fill-neutral-700 dark:fill-neutral-300 text-xs")
      .text(`Time: ${node.data.total_time}`);

  });

  const zoom = d3.zoom()
    .scaleExtent([0.5, 5])
    .on('zoom', (event) => {
      container.attr('transform', event.transform);
    });

  svg.call(zoom);

  svg.call(zoom.translateTo, 0, height / 2 - boxHeight / 2 - boxMargin); // 
}

type Layout = [number, number][];

function mergeLayout(layoutLeft: Layout, layoutRight: Layout) {

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

