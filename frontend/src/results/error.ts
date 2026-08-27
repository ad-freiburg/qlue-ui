import { escapeHtml } from './utils';

const resultError = document.getElementById('resultsError')! as HTMLDivElement;
const errorSubTitle = document.getElementById('queryErrorSubtitle')! as HTMLSpanElement;
const resultsErrorQuery = document.getElementById('queryErrorQuery')! as HTMLPreElement;
const connectionErrorReason = document.getElementById('connectionErrorReason')! as HTMLSpanElement;
const httpErrorStatus = document.getElementById('httpErrorStatus')! as HTMLSpanElement;
const httpErrorBody = document.getElementById('httpErrorBody')! as HTMLPreElement;
const parseErrorMessage = document.getElementById('parseErrorMessage')! as HTMLSpanElement;

export function render_query_error(err: any) {
  errorSubTitle.textContent = '';
  connectionErrorReason.textContent = '';
  httpErrorStatus.textContent = '';
  httpErrorBody.textContent = '';
  parseErrorMessage.textContent = '';
  resultsErrorQuery.innerHTML = '';
  resultError.dataset.error = 'Unknown';
  if (err.data) {
    resultError.dataset.error = err.data.type;
    renderQuery(err);
    switch (err.data.type) {
      case 'QLeverException':
        errorSubTitle.textContent = err.data.exception;
        break;
      case 'Http':
        httpErrorStatus.textContent = err.data.statusText
          ? `${err.data.status} (${err.data.statusText})`
          : String(err.data.status);
        httpErrorBody.textContent = err.data.body;
        break;
      case 'Connection':
        connectionErrorReason.textContent = err.data.message;
        break;
      case 'Canceled':
        break;
      case 'InvalidFormat':
      case 'Deserialization':
        parseErrorMessage.textContent = err.data.message;
        break;
      default:
        // INFO: also catches error types we don't know yet.
        console.log('uncaught error:', err);
        resultError.dataset.error = 'Unknown';
        break;
    }
  }
  const resultsContainer = document.getElementById('results') as HTMLSelectElement;
  resultsContainer.classList.add('hidden');
  resultError.classList.remove('hidden');
  window.scrollTo({
    top: resultError.offsetTop + 10,
    behavior: 'smooth',
  });
  throw new Error('Query processing error');
}

function renderQuery(err: any) {
  if (err.data.query) {
    if (err.data.metadata) {
      resultsErrorQuery.innerHTML =
        escapeHtml(err.data.query.substring(0, err.data.metadata.startIndex)) +
        `<span class="text-red-700 dark:text-red-800 bg-red-200/70 font-bold">${escapeHtml(err.data.query.substring(err.data.metadata.startIndex, err.data.metadata.stopIndex + 1))}</span>` +
        escapeHtml(err.data.query.substring(err.data.metadata.stopIndex + 1));
    } else {
      resultsErrorQuery.innerHTML = escapeHtml(err.data.query);
    }
  }
}
