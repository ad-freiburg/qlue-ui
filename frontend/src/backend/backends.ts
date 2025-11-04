// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import type { BackendConfig } from '../types/backend';
import type { EditorAndLanguageClient } from '../types/monaco';
import { MonacoLanguageClient } from 'monaco-languageclient';

export interface BackendManager {
  getActiveBackendSlug: () => string | null;
  setActiveBackendSlug: (slug: string) => void;
  getActiveBackend: () => BackendConfig | null;
  getAllBackends: () => Record<string, BackendConfig>;
}

export async function configureBackends(editorAndLanguageClient: EditorAndLanguageClient) {
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

  for (let backendDescription of backends) {
    const sparqlEndpointconfig = await fetch(backendDescription.api_url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Error while fetching backend details: \nstatus: ${response.status} \nmessage: ${response.statusText} `
          );
        }
        return response.json();
      })
      .catch((err) => {
        console.error('Error while fetching SPARQL endpoint configuration:', err);
      });

    const option = new Option(
      backendDescription.name,
      backendDescription.slug,
      false,
      sparqlEndpointconfig.is_default
    );
    backendSelector.add(option);

    const backend = {
      name: sparqlEndpointconfig.slug,
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
  }
  backendSelector.addEventListener('change', () => {
    document.dispatchEvent(new Event('backend-selected'))
    editorAndLanguageClient.editorApp.getEditor()!.setValue("");
    editorAndLanguageClient.languageClient
      .sendNotification('qlueLs/updateDefaultBackend', {
        backendName: backendSelector.value,
      })
      .catch((err) => {
        console.error(err);
      });
  });
  document.dispatchEvent(new Event('backend-selected'))
}

function addBackend(languageClient: MonacoLanguageClient, conf: BackendConfig) {
  languageClient.sendNotification('qlueLs/addBackend', conf).catch((err) => {
    console.error(err);
  });
}
