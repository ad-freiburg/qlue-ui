import * as d3 from 'd3';

import { startQueries } from './utils';
import type { SparqlRequest } from './types';

const fetchAbortControllers: [Promise<void>, AbortController][] = [];

export async function run(query: string) {
  const container = document.getElementById('benchmarkViz')! as HTMLDivElement;
  const services = [
    ['wikidata-qlever', 'QLever'],
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

  const margin = { top: 0, right: 40, bottom: 20, left: 90 };
  const width = container.getBoundingClientRect().width - margin.left - margin.right;
  const height = 40 * requests.length - margin.top - margin.bottom;
  const barHeight = height / requests.length;

  const svg = d3
    .select('#benchmarkViz')
    .append('svg')
    .attr('class', 'text-sm')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  // Add X axis
  const initial_scale = 2_000;
  let x = d3.scaleLinear().domain([0, initial_scale]).range([0, width]);
  const xAxis = d3
    .axisBottom(x)
    .ticks(4)
    .tickFormat((d) => `${d.valueOf() / 1000}s`)
    .tickPadding(6)
    .tickSize(-height)
    .tickSizeOuter(0);
  const xAxisElement = svg
    .append('g')
    .attr('transform', 'translate(0,' + height + ')')
    .call(xAxis);
  xAxisElement.selectAll('line').attr('stroke-width', 0.3);
  xAxisElement.select('.domain').remove();
  xAxisElement.selectAll('text').style('text-anchor', 'center');

  // Y axis
  const y = d3
    .scaleBand()
    .range([0, height])
    .domain(requests.map((d) => d.serviceLabel))
    .padding(0.4);

  const yAxis = d3.axisLeft(y).tickSize(0).tickPadding(10);
  const yAxisElement = svg.append('g').call(yAxis);
  yAxisElement.select('.domain').remove();
  yAxisElement.selectAll('.tick').attr('font-size', 12);

  //Bars
  svg
    .selectAll('.bar')
    .data(requests, (query) => (query as SparqlRequest).serviceLabel)
    .join('rect')
    .attr('class', 'bar')
    .attr('x', x(0))
    .attr('y', (d) => y(d.serviceLabel)!)
    .attr('width', 0)
    .attr('height', y.bandwidth())
    .attr('fill', '#6340AC');

  // Values
  const valueMargin = 3;
  svg
    .selectAll('.value')
    .data(requests, (query) => (query as SparqlRequest).serviceLabel)
    .join('text')
    .attr('class', 'value fill-black dark:fill-white')
    .attr('dominant-baseline', 'middle')
    .attr('x', valueMargin)
    .attr('y', (request) => y(request.serviceLabel)! + barHeight / 3)
    .text('0ms');

  // NOTE: very large times can be clamped
  let clamp = true;
  let clampFactor = 10;
  let fastest_time = Infinity;
  function clampTime(time: number): number {
    return clamp ? Math.min(time, fastest_time * clampFactor) : time;
  }

  const controllers = await startQueries(requests, ({ index, resultSize, timeMs, error }) => {
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

  const timer = d3.timer((elapsed) => {
    requests
      .filter((query) => !query.done)
      .forEach((query) => {
        query.timeMs = elapsed;
      });
    x = d3
      .scaleLinear()
      .domain([0, clampTime(elapsed) + initial_scale])
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
    const xAxis = d3
      .axisBottom(x)
      .ticks(5)
      .tickFormat((d) => `${d.valueOf() / 1000}s`)
      .tickPadding(6)
      .tickSize(-height)
      .tickSizeOuter(0);
    xAxisElement.transition().duration(stepSize).ease(d3.easeLinear).call(xAxis);
    svg
      .selectAll('.bar')
      .data(requests, (request) => (request as SparqlRequest).serviceLabel)
      .transition()
      .duration(stepSize)
      .ease(d3.easeLinear)
      .attr('width', (request) => x(clampTime(request.timeMs)))
      .attr('fill', barColor);
    //
    svg
      .selectAll('.value')
      .data(requests, (request) => (request as SparqlRequest).serviceLabel)
      .transition()
      .duration(stepSize)
      .ease(d3.easeLinear)
      .attr('x', (request) => x(clampTime(request.timeMs)) + valueMargin);
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
    x = d3
      .scaleLinear()
      .domain([0, maxTime * 1.1])
      .range([0, width]);
    const xAxis = d3
      .axisBottom(x)
      .ticks(8)
      .tickFormat((d) => `${d.valueOf() / 1000}s`)
      .tickPadding(6)
      .tickSize(-height)
      .tickSizeOuter(0);
    xAxisElement.transition().delay(delay).duration(duration).ease(easeFn).call(xAxis);
    svg
      .selectAll('.bar')
      .data(requests, (query) => (query as SparqlRequest).serviceLabel)
      .attr('fill', barColor)
      .transition()
      .delay(delay)
      .duration(duration)
      .ease(easeFn)
      .attr('width', (query) => x(query.timeMs));
    svg
      .selectAll('.value')
      .data(requests, (query) => (query as SparqlRequest).serviceLabel)
      .transition()
      .delay(delay)
      .duration(duration)
      .ease(easeFn)
      .attr('x', (query) => x(query.timeMs) + 5);
  }
}

export async function clear() {
  d3.select('#benchmarkViz').select('svg').remove();
  fetchAbortControllers.forEach((controller) => {
    controller[1].abort('canceled');
  });
  await Promise.allSettled(fetchAbortControllers.map(([promise, _controller]) => promise));
  fetchAbortControllers.length = 0;
}
