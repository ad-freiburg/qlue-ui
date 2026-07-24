import { apiFetch } from '../api';
import type { Editor } from '../editor/init';
import type { QlueLsServiceConfig } from '../types/backend';
import { Err, Ok, Result } from '../types/result';
import {
  ACTION_PARAM,
  type AppLinkOptions,
  type CurlCommandOptions,
  MEDIA_TYPE,
  type RawApiRequestOptions,
  type ShareOptions,
} from './types';

type ShareResult = Result<string, string>;

export async function buildShareResult(
  options: ShareOptions,
  editor: Editor
): Promise<ShareResult> {
  const serviceResult = await getBackend(editor);
  if (!serviceResult.ok) {
    return serviceResult;
  }
  const query = editor.getContent();
  switch (options.mode) {
    case 'app-link':
      return buildAppShareLink(query, serviceResult.value.name, options);
    case 'raw-api-request':
      return buildRawRequestLink(query, serviceResult.value.url, options);
    case 'curl-command':
      return buildCurlCommand(query, serviceResult.value.url, options);
  }
}

function buildCurlCommand(
  query: string,
  serviceUrl: string,
  options: CurlCommandOptions
): ShareResult {
  const normalized = query.replace(/\s+/g, ' ').trim();
  const escaped = normalized.replace(/"/g, '\\"');
  const accept = MEDIA_TYPE[options.outputFormat];
  switch (options.method) {
    case 'GET':
      return Ok(
        `curl -s -G ${serviceUrl} -H "Accept: ${accept}" --data-urlencode "query=${escaped}"`
      );
    case 'POST':
      return Ok(
        `curl -s ${serviceUrl} -H "Accept: ${accept}" -H "Content-type: application/sparql-query" --data "${escaped}"`
      );
  }
}

function buildRawRequestLink(
  query: string,
  serviceUrl: string,
  options: RawApiRequestOptions
): ShareResult {
  const url = new URL(serviceUrl);
  url.searchParams.set('query', query);
  url.searchParams.set('action', ACTION_PARAM[options.outputFormat]);
  return Ok(url.toString());
}

async function buildAppShareLink(
  query: string,
  serviceSlug: string,
  options: AppLinkOptions
): Promise<ShareResult> {
  let url: URL;
  if (options.idType === 'short') {
    const shortId = await getShortShareLinkId(query);
    if (!shortId.ok) {
      return shortId;
    }
    url = new URL(`${serviceSlug}/${shortId.value}`, document.baseURI);
  } else {
    url = new URL(serviceSlug!, document.baseURI);
    url.searchParams.set('query', encodeURIComponent(query));
  }
  if (options.runAutomatically) {
    url.searchParams.set('exec', 'true');
  }
  return Ok(url.toString());
}

/** Posts the query to the share API and returns the generated short ID. */
async function getShortShareLinkId(query: string): Promise<Result<string, string>> {
  const response = await apiFetch('shared-query/', {
    method: 'POST',
    body: query,
  });
  if (!response.ok) {
    if (response.status === 413) {
      return Err('Query is too large to share via short link.');
    }
    return Err('Could not acquire share link');
  }
  const json = await response.json();
  return Ok(json.id);
}

async function getBackend(editor: Editor): Promise<Result<QlueLsServiceConfig, string>> {
  return editor.languageClient
    .sendRequest('qlueLs/getBackend', {})
    .then((result) => {
      const typedResult = result as QlueLsServiceConfig;
      return Ok(typedResult);
    })
    .catch((err) => {
      return Err(err);
    });
}
