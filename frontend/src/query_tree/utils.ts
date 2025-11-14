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

export function truncateText(textElement, width: number) {
  let text = textElement.text();
  if (text.length > width) {
    textElement.text(text.substring(0, width) + "…");
  }
}
