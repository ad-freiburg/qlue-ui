// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import type { EditorAndLanguageClient } from "../types/monaco";
import type { QueryExecutionNode, QueryExecutionTree } from "../types/query_execution_tree";
import * as d3 from 'd3';
import { setupWebSocket, } from "./utils";
import type { ExecuteQueryEventDetails } from "../results/init";
import type { Service } from "../types/backend";
import { SparqlEngine } from "../types/lsp_messages";
import { animateGradients } from "./gradients";
import { clearQueryExecutionTree, renderQueryExecutionTree, setupAutozoom } from "./tree";
import { clearCache } from "../clear_cache";


const margin = { top: 20, right: 20, bottom: 20, left: 20 };
let visible = false;
let queryRunning = false;

export function setupQueryExecutionTree(editorAndLanguageClient: EditorAndLanguageClient) {
  const queryTreeModal = document.getElementById("queryExecutionTreeModal")!;
  const analysisButton = document.getElementById("analysisButton")!;
  const closeButton = document.getElementById("queryExecutionTreeModalCloseButton")!;
  const rerunButton = document.getElementById("rerunQueryButton")!;

  setupAutozoom();

  window.addEventListener('keydown', (e) => {
    if (visible && e.key === 'Escape') {
      closeModal();
    }
  });

  queryTreeModal.addEventListener("pointerdown", () => {
    queryTreeModal.classList.remove("cursor-grab");
    queryTreeModal.classList.add("cursor-grabbing");
  });
  queryTreeModal.addEventListener("pointerup", () => {
    queryTreeModal.classList.remove("cursor-grabbing");
    queryTreeModal.classList.add("cursor-grab");
  });

  rerunButton.addEventListener("click", () => {
    console.log(queryRunning);

    if (!queryRunning) {
      clearCache(editorAndLanguageClient);
      window.dispatchEvent(new Event("execute-start-request"));
    }
  });

  const width = window.innerWidth;
  const height = window.innerHeight;

  const svg = d3.select<SVGElement, any>("#queryExecutionTreeSvg")
    .attr("width", width)
    .attr("height", height);
  const container = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const zoom = d3.zoom()
    .scaleExtent([0.5, 5])
    .on('zoom', (event) => {
      if (event.sourceEvent != null) {
        window.dispatchEvent(new Event("zoom"));
      }
      container.attr('transform', event.transform);
    });
  svg.call(zoom);

  animateGradients();

  function zoom_to(x: number, y: number, duration = 750) {

    const svgEl = svg.node();
    if (!svgEl) return;

    const t0 = d3.zoomTransform(svgEl);
    const scale = 1;

    const targetTransform = d3.zoomIdentity
      .translate(
        svgEl.clientWidth / 2 - x * scale,
        svgEl.clientHeight / 2 - y * scale
      );
    // .scale(scale);

    svg.transition()
      .duration(duration)
      .ease(d3.easeLinear)
      .call(zoom.transform, targetTransform);
  }

  analysisButton.addEventListener("click", async () => {
    const service = await editorAndLanguageClient.languageClient.sendRequest("qlueLs/getBackend", {}) as Service;
    // NOTE: Only connect to websocket if service-engine is QLever
    if (service.engine != SparqlEngine.QLever) {
      document.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            type: 'info',
            message: 'Query Analysis in only availiable for the QLever engine.',
            duration: 2000,
          },
        })
      );
      return
    }
    queryTreeModal.classList.remove("hidden")
    visible = true;
    svg.call(zoom.translateTo, 0, 0);
    document.body.classList.add("overflow-y-hidden")
  });

  closeButton.addEventListener("click", () => {
    closeModal();
  });

  // simulateMessages(zoom_to);

  window.addEventListener("execute-query", async (event) => {
    queryRunning = true;

    // NOTE: cleanup previous runs.
    clearQueryExecutionTree();

    const service = await editorAndLanguageClient.languageClient.sendRequest("qlueLs/getBackend", {}) as Service;
    // NOTE: Only connect to websocket if service-engine is QLever
    if (service.engine != SparqlEngine.QLever) {
      return
    }

    const { queryId } = (event as CustomEvent<ExecuteQueryEventDetails>).detail;

    const socket = setupWebSocket(service.url, queryId);

    socket.addEventListener("open", () => {
      socket.send("cancel_on_close");
    });

    const throttleTimeMs = 50;
    let latestMessage: string | null = null;
    let running = false;

    socket.addEventListener("message", (event) => {
      latestMessage = event.data;
      if (!running) {
        running = true;
        setTimeout(() => {
          const queryExecutionTree = JSON.parse(latestMessage!) as QueryExecutionTree;
          renderQueryExecutionTree(queryExecutionTree, zoom_to)
          if (queryRunning) {
            window.dispatchEvent(new CustomEvent("query-result-size", {
              detail: {
                size: queryExecutionTree.result_rows
              }
            }));
          }
          running = false;
        }, throttleTimeMs);
      }
    });

    window.addEventListener("execute-cancle-request", () => {
      queryRunning = false;
      socket.send("cancel");
      socket.close()
    });

    window.addEventListener("execute-ended", () => {
      queryRunning = false;
    });
  });
}

function closeModal() {
  const queryTreeModal = document.getElementById("queryExecutionTreeModal")!;
  queryTreeModal.classList.add("hidden");
  visible = false;
  document.body.classList.remove("overflow-y-hidden")
}
