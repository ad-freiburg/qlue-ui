import * as d3 from 'd3';
import type { EditorAndLanguageClient } from "../types/monaco";
import { type AsyncProcess, exampleProcess, startProcesses } from './utils';

export function setupQueryBenchmark() {

  const executeButton = document.getElementById('ExecuteButton')! as HTMLButtonElement;
  const services = [
    "wikidata-qlever",
    "wikidata-jena",
    "wikidata-blazegraph",
    "wikidata-milleniumdb",
    "wikidata-graphdb",
    "wikidata-virtuoso"
  ];

  executeButton.addEventListener("click", () => {
  });

  let data = [["QLever", 0], ["Jena", 0], ["Blazegraph", 0], ["MilliniumDB", 0], ["GraphDB", 0], ["Virtuoso", 0]];

  // set the dimensions and margins of the graph
  const margin = { top: 20, right: 30, bottom: 40, left: 90 };
  const width = 660 - margin.left - margin.right;
  const height = 40 * data.length - margin.top - margin.bottom;
  const barHeight = height / data.length;

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
  const x = d3.scaleLinear()
    .domain([0, 15])
    .range([0, width]);
  const xAxis = d3.axisBottom(x)
    .ticks(4)
    .tickFormat(d => `${d}s`)
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
    .domain(data.map((d) => d[0]))
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
    .data(data)
    .join("rect")
    .attr("class", "bar")
    .attr("x", x(0) + 1)
    .attr("y", d => y(d[0]))
    .attr("width", d => x(d[1]))
    .attr("height", y.bandwidth())
    .attr("fill", "#6340AC")

  // Values
  svg.selectAll(".value")
    .data(data)
    .join("text")
    .attr("class", "value fill-white")
    .attr("dominant-baseline", "middle")
    .attr("x", d => x(d[1]) + 5)
    .attr("y", d => y(d[0]) + barHeight / 3)
    .text(d => `${d[1].toFixed(2)}s`);


  const n = 5;
  const processes: AsyncProcess<string>[] = Array.from({ length: n }, () => exampleProcess);

  startProcesses(processes, ({ index, result, timeMs, error }) => {
    if (error) {
      console.error(`Process ${index} failed:`, error);
    } else {
      console.log(`Process ${index} finished in ${timeMs?.toFixed(2)} ms: ${result}`);
    }
  });

}

