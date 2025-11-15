import * as d3 from 'd3';

export function replaceIRIs(text: string): string {
  const iriPattern = /<([^>]+)>/g;

  return text.replace(iriPattern, (_match, iri) => {
    return shortenIRI(iri);
  });
}

function shortenIRI(iri: string): string {
  const fragmentIndex = iri.indexOf('#');
  if (fragmentIndex !== -1) {
    return `<${iri.substring(fragmentIndex + 1)}>`;
  }

  const queryIndex = iri.indexOf('?');
  const pathPart = queryIndex !== -1 ? iri.substring(0, queryIndex) : iri;

  const segments = pathPart.split('/').filter(s => s.length > 0);

  return `<${segments.length > 0 ? segments[segments.length - 1] : ''}>`;
}

export function truncateText(text: string, width: number) {
  if (text.length > width) {
    return text.substring(0, width) + "…";
  }
  return text
}

export const line = d3
  .line()
  .x(d => d[0])
  .y(d => d[1])
  .curve(d3.curveBasis);
