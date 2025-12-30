import * as d3 from 'd3';

import { startQueries } from './utils';
import type { SparqlRequest } from './types';

const fetchAbortControllers: [Promise<void>, AbortController][] = [];
const initialScale = 2_000;
const margin = { top: 0, right: 40, bottom: 20, left: 90, value: 5 };

export async function run(query: string) {
  const services = [
    ['wikidata-qlever', 'QLever'],
    ['wikidata', 'QLever (full wikidata)'],
    ['wikidata-jena', 'Jena'],
    ['wikidata-blazegraph', 'Blazegraph'],
    ['wikidata-millenniumdb', 'MilliniumDB'],
    ['wikidata-graphdb', 'GraphDB'],
    ['wikidata-virtuoso', 'Virtuoso'],
  ];

  const requests: SparqlRequest[] = [];

  for (const [service, label] of services) {
    requests.push({
      serviceLabel: label,
      url: `https://qlever.dev/api/${service}`,
      query,
      timeMs: 0,
      done: false,
      failed: false,
    });
  }

  const container = document.getElementById('benchmarkViz')! as HTMLDivElement;
  const width = container.getBoundingClientRect().width - margin.left - margin.right;
  const height = 40 * requests.length - margin.top - margin.bottom;

  setupVisualization(width, height, requests);
  const svg = d3.select('#benchmarkViz');

  // NOTE: very large times can be clamped
  let clamp = true;
  let clampFactor = 10;
  let fastest_time = Infinity;
  function clampTime(time: number): number {
    return clamp ? Math.min(time, fastest_time * clampFactor) : time;
  }
  document.getElementById('clampButton')!.addEventListener('click', () => {
    clamp = !clamp;
  });

  const controllers = startQueries(requests, ({ index, resultSize, timeMs, error }) => {
    if (error) {
      console.error(`Process ${index} failed:`, error);
    } else {
      console.log(`Process ${index} finished in ${timeMs?.toFixed(2)} ms: ${resultSize} results`);
      fastest_time = Math.min(fastest_time, timeMs);
    }
    requests[index].done = true;
    requests[index].timeMs = timeMs;
    requests[index].failed = error != undefined;
  });
  fetchAbortControllers.push(...controllers);

  function barColor(query: SparqlRequest): string {
    if (query.done) {
      if (query.failed) {
        return '#dc2626';
      }
      return '#16a34a';
    }
    return '#6340AC';
  }

  let timeScale = d3.scaleLinear().domain([0, initialScale]).range([0, width]);
  let timeAxisSvgElement = svg.select<SVGGElement>('.timeAxis');

  const timer = d3.timer((elapsed) => {
    requests
      .filter((query) => !query.done)
      .forEach((query) => {
        query.timeMs = elapsed;
      });
    timeScale = d3
      .scaleLinear()
      .domain([
        0,
        Math.max(clampTime(elapsed) * 1.1, clampTime(clampTime(elapsed) + initialScale) * 1.1),
      ])
      .range([0, width])
      .clamp(true);
    svg
      .selectAll('.value')
      .data(requests, (query) => (query as SparqlRequest).serviceLabel)
      .text((request) => {
        if (request.timeMs > fastest_time * 10) {
          return `>${((fastest_time * 10) / 1000).toFixed(2)}s (${(request.timeMs / 1000).toFixed(2)}s)`;
        } else {
          return `${(request.timeMs / 1000).toFixed(2)}s`;
        }
      });
  });

  let stepSize = 0;
  function update() {
    timeAxisSvgElement
      .transition()
      .duration(stepSize)
      .ease(d3.easeLinear)
      .call(timeAxis(timeScale, height));
    svg
      .selectAll('.bar')
      .data(requests, (request) => (request as SparqlRequest).serviceLabel)
      .transition()
      .duration(stepSize)
      .ease(d3.easeLinear)
      .attr('width', (request) => timeScale(clampTime(request.timeMs)))
      .attr('fill', barColor);
    //
    svg
      .selectAll('.value')
      .data(requests, (request) => (request as SparqlRequest).serviceLabel)
      .transition()
      .duration(stepSize)
      .ease(d3.easeLinear)
      .attr('x', (request) => timeScale(clampTime(request.timeMs)) + margin.value);
    //
    stepSize = 100;
    setTimeout(() => {
      if (requests.some((request) => !request.done)) {
        update();
      } else {
        finalize();
      }
    }, stepSize);
  }
  update();

  function finalize() {
    const delay = 500;
    const duration = 1_500;
    const easeFn = d3.easeLinear;
    timer.stop();
    let maxTime = Math.max(...requests.map((request) => request.timeMs));
    timeScale = d3
      .scaleLinear()
      .domain([0, clampTime(maxTime) * 1.1])
      .range([0, width]);
    timeAxisSvgElement
      .transition()
      .delay(delay)
      .duration(duration)
      .ease(easeFn)
      .call(timeAxis(timeScale, height));
    svg
      .selectAll('.bar')
      .data(requests, (query) => (query as SparqlRequest).serviceLabel)
      .attr('fill', barColor)
      .transition()
      .delay(delay)
      .duration(duration)
      .ease(easeFn)
      .attr('width', (query) => timeScale(clampTime(query.timeMs)));
    svg
      .selectAll('.value')
      .data(requests, (query) => (query as SparqlRequest).serviceLabel)
      .transition()
      .delay(delay)
      .duration(duration)
      .ease(easeFn)
      .attr('x', (query) => timeScale(clampTime(query.timeMs)) + 5);
  }
}

function setupVisualization(width: number, height: number, requests: SparqlRequest[]) {
  const barHeight = height / requests.length;

  const svg = d3
    .select('#benchmarkViz')
    .append('svg')
    .attr('class', 'text-sm')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
  const timeScale = d3.scaleLinear().domain([0, initialScale]).range([0, width]);
  const timeAxisElement = svg
    .append('g')
    .attr('transform', 'translate(0,' + height + ')')
    .attr('class', 'timeAxis')
    .call(timeAxis(timeScale, height));
  timeAxisElement.selectAll('line').attr('stroke-width', 0.3);
  timeAxisElement.select('.domain').remove();
  timeAxisElement.selectAll('text').style('text-anchor', 'center');

  const y = d3
    .scaleBand()
    .range([0, height])
    .domain(requests.map((d) => d.serviceLabel))
    .padding(0.4);

  const yAxis = d3.axisLeft(y).tickSize(0).tickPadding(10);
  const yAxisElement = svg.append('g').call(yAxis);
  yAxisElement.select('.domain').remove();
  yAxisElement.selectAll('.tick').attr('font-size', 12);

  svg
    .selectAll('.bar')
    .data(requests, (query) => (query as SparqlRequest).serviceLabel)
    .join('rect')
    .attr('class', 'bar')
    .attr('x', timeScale(0))
    .attr('y', (d) => y(d.serviceLabel)!)
    .attr('width', 0)
    .attr('height', y.bandwidth())
    .attr('fill', '#6340AC');

  svg
    .selectAll('.value')
    .data(requests, (query) => (query as SparqlRequest).serviceLabel)
    .join('text')
    .attr('class', 'value fill-black dark:fill-white')
    .attr('dominant-baseline', 'middle')
    .attr('x', margin.value)
    .attr('y', (request) => y(request.serviceLabel)! + barHeight / 3)
    .text('0ms');

  return svg;
}

function timeAxis(timeScale: d3.ScaleLinear<number, number, number>, height: number) {
  return d3
    .axisBottom(timeScale)
    .ticks(5)
    .tickFormat((d) => `${d.valueOf() / 1000}s`)
    .tickPadding(6)
    .tickSize(-height)
    .tickSizeOuter(0);
}

export async function clear() {
  d3.select('#benchmarkViz').select('svg').remove();
  fetchAbortControllers.forEach((controller) => {
    controller[1].abort('canceled');
  });
  await Promise.allSettled(fetchAbortControllers.map(([promise, _controller]) => promise));
  fetchAbortControllers.length = 0;
}
