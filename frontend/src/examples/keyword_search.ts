// ┌──────────────────────────────────────┐ \\
// │ Copyright © 2024-2025 Ioannis Nezis  │ \\
// ├──────────────────────────────────────┤ \\
// │ Licensed under the MIT license.      │ \\
// └──────────────────────────────────────┘ \\

import { debounce } from '../utils';

export function setupKeywordSearch() {
  const examplesModal = document.getElementById('examplesModal')!;
  const examplesList = document.getElementById('examplesList')! as HTMLUListElement;
  const keywordSearchInput = document.getElementById(
    'examplesKeywordSearchInput'
  )! as HTMLInputElement;

  const hoverClasses: string[] = ['bg-neutral-500', 'dark:bg-neutral-700', 'text-white'];
  const highlightClasses: string[] = ['text-green-600', 'dark:text-green-500', 'underline'];

  // This variable contains the actual example spans that match the query.
  let examples: HTMLLIElement[] = [];
  let examplesFiltered: HTMLLIElement[] = [];
  // This variable keeps track of the selected example.
  let selectedExample = -1;

  // NOTE: Keyboard navigation:
  keywordSearchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      examplesModal.classList.add('hidden');
      cleanup();
    }
    if (examplesFiltered.length > 0) {
      if (event.key === 'ArrowDown') {
        if (selectedExample >= 0) {
          examplesFiltered[selectedExample].classList.remove(...hoverClasses);
        }
        selectedExample = (selectedExample + 1) % examplesFiltered.length;
        examplesFiltered[selectedExample].classList.add(...hoverClasses);
        examplesFiltered[selectedExample].scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      } else if (event.key === 'ArrowUp') {
        examplesFiltered[selectedExample].classList.remove(...hoverClasses);
        selectedExample = selectedExample - 1;
        if (selectedExample == -1) {
          selectedExample = examplesFiltered.length - 1;
        }
        examplesFiltered[selectedExample].classList.add(...hoverClasses);
        examplesFiltered[selectedExample].scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      } else if (event.key === 'Enter' && selectedExample >= 0) {
        examplesFiltered[selectedExample].click();
        event.stopPropagation();
      }
    }
  });

  document.addEventListener('examples-loaded', () => {
    examples = Array.from(examplesList.children) as HTMLLIElement[];
    examplesFiltered = [...examples];
  });

  function filterExamples(query: string) {
    cleanup();
    const keywords = query
      .trim()
      .split(' ')
      .filter((keyword) => {
        if (keyword === '') {
          return false;
        }
        try {
          new RegExp(keyword);
        } catch (error) {
          if (error instanceof SyntaxError) {
            return false;
          }
          throw error;
        }
        return true;
      })
      .map((word) => new RegExp(word, 'gi'));

    let hits = 0;
    examplesFiltered = examples.filter((example) => {
      const exampleName = example.innerText.trim();
      if (keywords.every((keyword) => exampleName.match(keyword) != null)) {
        example.classList.add('keyword-search-match');
        example.innerHTML = highlightWords(exampleName, keywords);
        hits++;
        return true;
      } else {
        example.classList.add('hidden');
        return false;
      }
    });
    if (hits === 0) {
      console.log('no matches :(');
      // TODO: show no hits explanation
    } else {
      // TODO: hide no hits explanation
    }
  }

  const filterExamplesDebounced = debounce(filterExamples, 200);
  function cleanup() {
    examplesFiltered = [...examples];
    // Reset the selected example to nothing.
    selectedExample = -1;
    // Remove artifacts from previous usage.
    examplesFiltered.forEach((element) => {
      element.classList.remove('keyword-search-match');
      element.classList.remove('hidden');
      element.classList.remove(...hoverClasses);
      // NOTE: This removes inner styling.
      element.innerText = element.innerText;
    });
  }

  // This highlights specified words or patterns within an input string
  // by wrapping them with a <span> element
  // with the class `keyword-search-highlight`.
  //
  // Algorithm:
  // 1. Remove any existing highlighting.
  // 2. Iterate over each `regex` in the list of `regexes`
  //    to find matching sections in the input string.
  // 3. Consolidate overlapping sections if any.
  // 4. Replace the matching sections with HTML <span> tags for highlighting.
  // 5. Return the modified string with highlighted words.
  function highlightWords(input_str: string, regexps: RegExp[]) {
    let return_str = input_str;
    // find matching sections
    let matching_sections: number[][] = [];
    for (const regexp of regexps) {
      const matches = input_str.matchAll(regexp);
      for (const match of matches) {
        matching_sections.push([match.index, match.index + match[0].length]);
      }
    }
    if (matching_sections.length === 0) {
      return return_str;
    }
    // consolidate overlapping sections
    matching_sections.sort((a, b) => a[0] - b[0]);
    matching_sections = matching_sections.reduce(
      (accu, elem) => {
        const [last, ...rest] = accu;
        if (elem[0] <= last[1]) {
          return [[last[0], Math.max(elem[1], last[1])], ...rest];
        }
        return [elem].concat(accu);
      },
      [matching_sections[0]]
    );
    // replace matching sections with highlighting span
    matching_sections.forEach(([from, to]) => {
      return_str = `${return_str.substring(0, from)}\
<span class="${highlightClasses.join(' ')}">${return_str.substring(from, to)}\
</span>${return_str.substring(to)}`;
    });
    return return_str;
  }

  keywordSearchInput.addEventListener('input', () => {
    filterExamplesDebounced(keywordSearchInput.value);
  });

  document.addEventListener('example-selected', cleanup);

  document.addEventListener('examples-closed', cleanup);
}
