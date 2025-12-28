// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import type { ServiceConfig } from '../types/backend';
import type { EditorAndLanguageClient } from '../types/monaco';
import { MonacoLanguageClient } from 'monaco-languageclient';
import { getPathParameters, setEditorContent } from '../utils';

interface ServiceDescription {
  name: string;
  slug: string,
  is_default: boolean;
  api_url: string
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
    }) as ServiceDescription[];

  const [path_slug, _] = getPathParameters();
  let default_found = false;

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

    const is_default = (path_slug == serviceDescription.slug) || (path_slug == undefined && sparqlEndpointconfig.is_default);

    default_found = default_found || is_default;

    const option = new Option(
      serviceDescription.name,
      serviceDescription.slug,
      false,
      is_default
    );
    backendSelector.add(option);

    const service = {
      name: sparqlEndpointconfig.slug,
      url: sparqlEndpointconfig.url,
      engine: sparqlEndpointconfig.engine
    };
    const prefixMap = sparqlEndpointconfig.prefix_map;
    const queries = {
      subjectCompletion: sparqlEndpointconfig['subject_completion'],
      predicateCompletionContextSensitive:
        sparqlEndpointconfig['predicate_completion_context_sensitive'],
      predicateCompletionContextInsensitive:
        sparqlEndpointconfig['predicate_completion_context_insensitive'],
      objectCompletionContextSensitive:
        sparqlEndpointconfig['object_completion_context_sensitive'],
      objectCompletionContextInsensitive:
        sparqlEndpointconfig['object_completion_context_insensitive'],
    };
    const config = {
      service: service,
      prefixMap: prefixMap,
      queries: queries,
      default: is_default,
    };

    await addBackend(editorAndLanguageClient.languageClient, config);
  }

  if (!default_found) {
    const service = services.find((service) => service.is_default);
    if (service) {
      updateDefaultService(editorAndLanguageClient, service);
    }
    else if (services.length > 0) {
      // NOTE: the path did not match any service and there is no default service.
      updateDefaultService(editorAndLanguageClient, services[0]);
    } else {
      throw new Error("No SPARQL backend provided");
    }
  }

  document.dispatchEvent(new Event('backend-selected'));

  backendSelector.addEventListener('change', () => {
    setEditorContent(editorAndLanguageClient, "");
    editorAndLanguageClient.languageClient
      .sendNotification('qlueLs/updateDefaultBackend', {
        backendName: backendSelector.value,
      })
      .then(() => {
        history.pushState({}, '', `/${backendSelector.value}`);
        document.dispatchEvent(new Event('backend-selected'));
      })
      .catch((err) => {
        console.error(err);
      });
  });
}

async function updateDefaultService(editorAndLanguageClient: EditorAndLanguageClient, service: ServiceDescription) {
  const backendSelector = document.getElementById('backendSelector') as HTMLSelectElement;
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

async function addBackend(languageClient: MonacoLanguageClient, conf: ServiceConfig) {
  await languageClient.sendNotification('qlueLs/addBackend', conf).catch((err) => {
    console.error(err);
  });
}
