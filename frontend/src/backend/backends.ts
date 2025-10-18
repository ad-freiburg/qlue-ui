// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import type { BackendConfig } from '../types/backend';
import type { EditorAndLanguageClient } from '../types/monaco';
import { MonacoLanguageClient } from 'monaco-languageclient';

export async function configure_backends(editorAndLanguageClient: EditorAndLanguageClient) {
  const backendSelector = document.getElementById('backendSelector') as HTMLSelectElement;
  const backends = await fetch(`${import.meta.env.VITE_API_URL}/api/backends/`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Error while fetching backends: \nstatus: ${response.status} \nmessage: ${response.statusText} `
        );
      }
      return response.json();
    })
    .catch((err) => {
      console.error('Error while fetching backends list:', err);
      return [];
    });

  backends.forEach((backend) => {
    backendSelector.add(new Option(backend.name, backend.name));
    fetch(backend.api_url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Error while fetching backend details: \nstatus: ${response.status} \nmessage: ${response.statusText} `
          );
        }
        return response.json();
      })
      .then((sparqlEndpointconfig) => {
        const backend = {
          name: sparqlEndpointconfig.name,
          url: sparqlEndpointconfig.url,
        };
        const prefixMap = sparqlEndpointconfig.prefix_map;
        const queries = {
          subjectCompletion: sparqlEndpointconfig['subject_completion_query'],
          predicateCompletionQueryContextSensitive:
            sparqlEndpointconfig['predicate_completion_query_context_sensitive'],
          predicateCompletionQueryContextInsensitive:
            sparqlEndpointconfig['predicate_completion_query_context_insensitive'],
          objectCompletionQueryContextSensitive:
            sparqlEndpointconfig['object_completion_query_context_sensitive'],
          objectCompletionQueryContextInsensitive:
            sparqlEndpointconfig['object_completion_query_context_insensitive'],
        };
        const config = {
          backend: backend,
          prefixMap: prefixMap,
          queries: queries,
          default: sparqlEndpointconfig.is_default,
        };
        addBackend(editorAndLanguageClient.languageClient, config);
      })
      .catch((err) => {
        console.error('Error while fetching SPARQL endpoint configuration:', err);
      });
  });
  backendSelector.addEventListener('change', () => {
    editorAndLanguageClient.languageClient
      .sendNotification('qlueLs/updateDefaultBackend', {
        backendName: backendSelector.value,
      })
      .catch((err) => {
        console.error(err);
      });
  });
}

function addBackend(languageClient: MonacoLanguageClient, conf: BackendConfig) {
  languageClient.sendNotification('qlueLs/addBackend', conf).catch((err) => {
    console.error(err);
  });
}
