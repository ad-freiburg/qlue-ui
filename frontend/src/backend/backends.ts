// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import type { BackendConfig } from '../types/backend';
import yaml from 'yaml';
import type { EditorAndLanguageClient } from '../types/monaco';
import { MonacoLanguageClient } from 'monaco-languageclient';

export async function configure_backends(editorAndLanguageClient: EditorAndLanguageClient) {
  const backendSelector = document.getElementById('backendSelector') as HTMLSelectElement;
  const backends = await fetch('http://127.0.0.1:8000/api/backends/')
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Error while fetching backends:\nstatus: ${response.status}\nmessage: ${response.statusText}`
        );
      }
      return response.json();
    })
    .catch((err) => {
      console.error(err);
      return [];
    });

  backends.forEach((backend) => {
    backendSelector.add(new Option(backend.name, backend.name));
    fetch(backend.url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Error while fetching backend details:\nstatus: ${response.status}\nmessage: ${response.statusText}`
          );
        }
        return response.json();
      })
      .then((json) => {
        const backend = {
          name: json.name,
          url: json.baseUrl,
        };
        const prefixMap = json.prefixMap;
        const queries = {
          subjectCompletion: json['suggestSubjectsContextInsensitive'],
          predicateCompletion: json['suggestObjectsContextInsensitive'],
          objectCompletion: json['suggestObjectsContextInsensitive'],
          predicateCompletionContextSensitive: json['suggestPredicates'],
          objectCompletionContextSensitive: json['suggestObjects'],
        };
        const config = {
          backend: backend,
          prefixMap: prefixMap,
          queries: queries,
          default: backend.name === 'Wikidata',
        };
        addBackend(editorAndLanguageClient.languageClient, config);
      });
  });
  backendSelector.addEventListener('change', () => {
    console.log('new selected element:', backendSelector.value);
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
