// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import type { ServiceConfig } from '../types/backend';
import type { EditorAndLanguageClient } from '../types/monaco';
import { MonacoLanguageClient } from 'monaco-languageclient';
import { executeQueryAndShowResults } from '../results';
import { getPathParameters } from '../utils';

export interface BackendManager {
  getActiveBackendSlug: () => string | null;
  setActiveBackendSlug: (slug: string) => void;
  getActiveBackend: () => ServiceConfig | null;
  getAllBackends: () => Record<string, ServiceConfig>;
}

export async function configureBackends(editorAndLanguageClient: EditorAndLanguageClient) {
  const backendSelector = document.getElementById('backendSelector') as HTMLSelectElement;

  const services = await fetch(`${import.meta.env.VITE_API_URL}/api/backends/`)
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

  for (let serviceDescription of services) {
    const sparqlEndpointconfig = await fetch(serviceDescription.api_url)
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
      serviceDescription.name,
      serviceDescription.slug,
      false,
      sparqlEndpointconfig.is_default
    );
    backendSelector.add(option);

    const service = {
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
      service: service,
      prefixMap: prefixMap,
      queries: queries,
      default: sparqlEndpointconfig.is_default,
    };

    await addBackend(editorAndLanguageClient.languageClient, config);
  }

  const [path_slug, _] = getPathParameters();
  const service = services.find((service) => service.slug === path_slug);
  if (service) {
    await editorAndLanguageClient.languageClient
      .sendNotification('qlueLs/updateDefaultBackend', {
        backendName: service.slug,
      })
      .then(() => {
        backendSelector.value = service.slug;
      })
      .catch((err) => {
        console.error(err);
      });
  }

  document.dispatchEvent(new Event('backend-selected'));

  // NOTE: execute query if parameter `exec` is `true`.
  const params = new URLSearchParams(window.location.search);
  const exec = params.get("exec");
  if (exec) {
    executeQueryAndShowResults(editorAndLanguageClient);
  }

  backendSelector.addEventListener('change', () => {
    editorAndLanguageClient.editorApp.getEditor()!.setValue('');
    editorAndLanguageClient.languageClient
      .sendNotification('qlueLs/updateDefaultBackend', {
        backendName: backendSelector.value,
      })
      .then(() => {
        history.replaceState({}, '', backendSelector.value);
        document.dispatchEvent(new Event('backend-selected'));
      })
      .catch((err) => {
        console.error(err);
      });
  });
}

async function addBackend(languageClient: MonacoLanguageClient, conf: ServiceConfig) {
  await languageClient.sendNotification('qlueLs/addBackend', conf).catch((err) => {
    console.error(err);
  });
}
