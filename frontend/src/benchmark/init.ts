import * as d3 from 'd3';
import { type AsyncProcess, exampleProcess, startProcesses } from './utils';

interface Query {
  label: string,
  url: string,
  timeMs: number,
  done: boolean
}

export function setupQueryBenchmark() {

  const executeButton = document.getElementById('ExecuteButton')! as HTMLButtonElement;
  const container = document.getElementById('benchmarkViz')! as HTMLDivElement;

  const services = [
    ["wikidata-qlever", "QLever"],
    ["wikidata-jena", "Jena"],
    ["wikidata-blazegraph", "Blazegraph"],
    ["wikidata-milleniumdb", "MilliniumDB"],
    ["wikidata-graphdb", "GraphDB"],
    ["wikidata-virtuoso", "Virtuoso"]
  ];
  executeButton.addEventListener("click", () => {
  });


  const queries: Query[] = [];

  for (const [service, label] of services) {
    queries.push({
      label,
      url: `https://qlever.dev/api/${service}`,
      timeMs: 0,
      done: false
    })
  }

  // set the dimensions and margins of the graph
  const margin = { top: 0, right: 20, bottom: 20, left: 90 };
  const width = container.getBoundingClientRect().width - margin.left - margin.right;
  const height = 40 * queries.length - margin.top - margin.bottom;
  const barHeight = height / queries.length;

  // append the svg object to the body of the page
  const svg = d3.select("#benchmarkViz")
    .append("svg")
    .attr("class", "text-sm")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");

  // Parse the Data

  // Add X axis
  const initial_scale = 2_000;
  let x = d3.scaleLinear()
    .domain([0, initial_scale])
    .range([0, width]);
  const xAxis = d3.axisBottom(x)
    .ticks(4)
    .tickFormat(d => `${d / 1000}s`)
    .tickPadding(6)
    .tickSize(-height)
    .tickSizeOuter(0);
  const xAxisElement = svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);
  xAxisElement
    .selectAll("line")
    .attr("stroke-width", 0.3);
  xAxisElement
    .select(".domain").remove();
  xAxisElement
    .selectAll("text")
    .style("text-anchor", "center");

  // Y axis
  const y = d3.scaleBand()
    .range([0, height])
    .domain(queries.map((d) => d.label))
    .padding(.4);

  const yAxis =
    d3.axisLeft(y)
      .tickSize(0)
      .tickPadding(10);
  const yAxisElement = svg.append("g")
    .call(yAxis);
  yAxisElement
    .select(".domain")
    .remove();
  yAxisElement
    .selectAll(".tick")
    .attr("font-size", 12);

  //Bars
  svg.selectAll(".bar")
    .data(queries, query => (query as Query).label)
    .join("rect")
    .attr("class", "bar")
    .attr("x", x(0))
    .attr("y", d => y(d.label)!)
    .attr("width", d => x(d.timeMs))
    .attr("height", y.bandwidth())
    .attr("fill", "#6340AC")

  // Values
  svg.selectAll(".value")
    .data(queries, query => (query as Query).label)
    .join("text")
    .attr("class", "value fill-black dark:fill-white")
    .attr("dominant-baseline", "middle")
    .attr("x", d => x(d.timeMs) + 3)
    .attr("y", d => y(d.label)! + barHeight / 3)
    .text(d => `${d.timeMs.toFixed(2)}s`);


  const n = queries.length;
  const processes: AsyncProcess<string>[] = Array.from({ length: n }, () => exampleProcess);

  startProcesses(processes, ({ index, result, timeMs, error }) => {
    if (error) {
      console.error(`Process ${index} failed:`, error);
    } else {
      console.log(`Process ${index} finished in ${timeMs?.toFixed(2)} ms: ${result}`);
    }
    queries[index].done = true;
    queries[index].timeMs = timeMs;
  });

  const timer = d3.timer((elapsed) => {
    queries.filter(query => !query.done).forEach(query => {
      query.timeMs = elapsed;
    });
    x = d3.scaleLinear()
      .domain([0, elapsed + initial_scale])
      .range([0, width]);
    svg.selectAll(".value")
      .data(queries, query => (query as Query).label)
      .text(d => `${(d.timeMs / 1000).toFixed(2)}s`);
  });

  let stepSize = 0;
  const scaleAnimation = x => 1.2 * x;
  const animationWindow = (f, t, x) => (f(t - stepSize + x * stepSize) - f(t - stepSize)) / (f(t) - f(t - stepSize));
  let t = 0;

  function update() {
    //   const t_old = t;
    //   t += stepSize;
    //   x = d3.scaleLinear()
    //     .domain([0, scaleAnimation(t)])
    //     .range([0, width]);
    //   console.log(x.domain());
    //
    const xAxis = d3.axisBottom(x)
      .ticks(5)
      .tickFormat(d => `${d.valueOf() / 1000}s`)
      .tickPadding(6)
      .tickSize(-height)
      .tickSizeOuter(0);
    xAxisElement.transition()
      .duration(stepSize)
      .ease(x => animationWindow(scaleAnimation, t, x))
      .call(xAxis);
    svg.selectAll(".bar")
      .data(queries, query => (query as Query).label)
      .transition()
      .duration(stepSize)
      .ease(d3.easeLinear)
      // .ease(x => animationWindow(barAnimation, t_old, x))
      .attr("width", query => x(query.timeMs));
    //
    svg.selectAll(".value")
      .data(queries, query => (query as Query).label)
      .transition()
      .duration(stepSize)
      .ease(d3.easeLinear)
      .attr("x", query => x(query.timeMs) + 3);
    //
    stepSize = 100;
    setTimeout(() => {
      if (queries.some(query => !query.done)) {
        update();
      }
      else {
        finialize();
      }
    },
      stepSize
    )
  }
  update()

  function finialize() {
    const delay = 500;
    const duration = 1_500;
    const easeFn = d3.easeLinear;
    timer.stop();
    let maxTime = Math.max(...queries.map(query => query.timeMs));
    x = d3.scaleLinear()
      .domain([0, maxTime * 1.1])
      .range([0, width]);
    const xAxis = d3.axisBottom(x)
      .ticks(8)
      .tickFormat(d => `${d.valueOf() / 1000}s`)
      .tickPadding(6)
      .tickSize(-height)
      .tickSizeOuter(0);
    xAxisElement
      .transition()
      .delay(delay)
      .duration(duration)
      .ease(easeFn)
      .call(xAxis);
    svg.selectAll(".bar")
      .data(queries, query => (query as Query).label)
      .transition()
      .delay(delay)
      .duration(duration)
      .ease(easeFn)
      .attr("width", query => x(query.timeMs));
    svg.selectAll(".value")
      .data(queries, query => (query as Query).label)
      .transition()
      .delay(delay)
      .duration(duration)
      .ease(easeFn)
      .attr("x", query => x(query.timeMs) + 5);
  }
}

