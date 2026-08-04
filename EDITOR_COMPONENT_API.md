# Extracting the editor as a reusable component

Analysis and proposed API for factoring `frontend/src/editor/` out into a standalone,
npm/CDN-installable SPARQL editor component (a YASGUI replacement), potentially exposed
as a web component.

Status: **design only** — no code has been changed.

## 1. What "the editor part" actually is today

`src/editor/` is thin (~470 lines): it builds three configs and returns

```ts
interface Editor {
  editorApp: EditorApp;              // monaco-languageclient
  languageClient: MonacoLanguageClient;
  getContent(); setContent(); focus(); getDocumentUri();
}
```

The four convenience methods are *not* the real API. The real API is the two leaked
handles — 25 call sites reach through `editor.editorApp.getEditor()` (raw Monaco) and
20+ speak raw LSP over `editor.languageClient`. Any reusable component must absorb
those into named operations, otherwise consumers still depend on Monaco +
monaco-languageclient + the qlue-ls wire protocol.

### Leak inventory (what the API must cover)

Raw Monaco reached for:

| Use | Sites |
|---|---|
| `.layout()` after panel resize | `templates/init.ts:107`, `parse_tree/init.ts:71` |
| `onDidChangeModelContent` | `tabs/init.ts:95`, `parse_tree/init.ts:79` |
| `onDidChangeCursorPosition` + `getPosition()` | `parse_tree/init.ts:86,127` |
| decorations (parse-tree node highlight) | `parse_tree/highlight.ts` |
| `trigger('editor.action.formatDocument')` | `buttons/format.ts:20` |
| `trigger('editor.action.triggerSuggest')` | `editor/commands.ts` |
| `updateCodeResources({...})` — model swap per tab | `tabs/operations.ts` ×5, `tabs/init.ts:162` |
| `executeEdits` + `setPosition` (jump) | `editor/keys.ts` |
| second standalone `monaco.editor.create` for query templates | `templates/init.ts:112` |

LSP methods the app sends directly: `qlueLs/getBackend` (×11), `addBackend`,
`updateDefaultBackend`, `pingBackend`, `changeSettings`, `executeOperation`,
`cancelQuery`, `identifyOperationType`, `parseTree`, `jump`, and the
`qlueLs/partialResult` notification stream.

Inbound coupling the component currently has on the host app (all must be inverted):

- DOM ids: `#editorArea` (ResizeObserver), `#theme-switch`, `#editor`, plus a
  `document`-level scroll listener to dismiss overflow widgets.
- Module imports: `settings/init` (`settings.editor.jumpWithTab`),
  `settings/utils.openSettings`, `commands/utils.openCommandPrompt`,
  `keybindings.closeAllModals`.
- Events out via untyped globals: `window: 'cancel-or-execute'`, `document: 'toast'`
  (used for the LS-crash message).

**Important scope finding:** query execution is *not* separable from the editor.
`executeOperation`/`cancelQuery`/`partialResult` go through the language server, not
through `fetch`. So a YASGUI replacement built on this stack must include query
execution and endpoint registration in the component — the results *renderer* can stay
separate, consuming the streamed events.

## 2. Proposed API

Three layers, plus a documented escape hatch.

### Lifecycle

```ts
function createSparqlEditor(target: HTMLElement, options?: EditorOptions): Promise<SparqlEditor>

interface EditorOptions {
  value?: string;
  language?: 'sparql';
  readOnly?: boolean;
  theme?: 'light' | 'dark' | 'auto' | CustomThemeName;
  endpoints?: EndpointConfig[];          // registered at the LS before first paint
  defaultEndpoint?: string;              // slug
  serverSettings?: Partial<QlueLsSettings>;
  editorOptions?: MonacoEditorOptions;   // opt-in passthrough, documented as unstable
  keybindings?: KeybindingOverrides;     // see below
  workerUrl?: string | URL;              // for CDN builds; default = bundled worker
}

interface SparqlEditor { dispose(): void; /* ...members below... */ }
```

**Constraint to design around now:** `MonacoVscodeApiWrapper.start()`, theme
registration and `addKeybindingRule` are page-global. Two independent
`createSparqlEditor` calls on one page cannot each own an API wrapper. Decide
explicitly: (a) singleton — second call throws or attaches to a shared runtime; or
(b) a module-level `initRuntime(options)` that instances attach to. Recommendation:
(b), with `initRuntime()` idempotent and awaited by `createSparqlEditor`. The template
editor in `templates/init.ts` is exactly this second-instance case, and it currently
only works because it bypasses the wrapper.

### Layer 1 — text & view (no Monaco types in signatures)

```ts
getValue(): string
setValue(text: string): void
getSelection(): TextRange | null
setSelection(range: TextRange): void
getCursor(): Position                       // {line, character}, 0-based, LSP convention
setCursor(pos: Position): void
applyEdits(edits: TextEdit[]): void
focus(): void
layout(): void                              // replaces the #editorArea ResizeObserver
setTheme(theme: 'light' | 'dark' | string): void
setReadOnly(v: boolean): void
format(): Promise<void>                     // was trigger('formatDocument')
triggerCompletion(): void                   // was trigger('triggerSuggest')
decorate(key: string, ranges: TextRange[], className?: string): void   // parse-tree highlight
clearDecorations(key: string): void
```

Positions/ranges should be LSP-shaped (0-based) everywhere, since the wire protocol is
LSP and the current `toMonacoRange` conversion is an internal detail.

### Layer 2 — documents (tabs)

Tabs are a host-app concern, but *document identity* is LSP-visible, so the component
must own it:

```ts
openDocument(id: string, text: string): Promise<void>   // was updateCodeResources
switchDocument(id: string): Promise<void>
closeDocument(id: string): void
activeDocument(): { id: string; uri: string }
```

This removes `getDocumentUri()` from the public surface — no consumer should be
constructing `textDocument: {uri}` payloads.

### Layer 3 — endpoints, settings, execution

```ts
// endpoints
addEndpoint(config: EndpointConfig): Promise<void>
setActiveEndpoint(slug: string): Promise<void>
getActiveEndpoint(): Promise<EndpointInfo>          // replaces 11× qlueLs/getBackend
pingEndpoint(): Promise<{ available: boolean }>
setQueryTemplates(slug: string, templates: Record<QueryTemplate, string>): Promise<void>

// server-side behaviour (formatting, completion, prefixes, jump)
updateSettings(settings: Partial<QlueLsSettings>): void

// execution
execute(opts: ExecuteOptions): QueryHandle
interface ExecuteOptions {
  lazy?: boolean; pageSize?: number; offset?: number; accessToken?: string | null;
}
interface QueryHandle {
  id: string;
  cancel(): Promise<void>;
  onPartial(cb: (p: PartialResult) => void): Disposable;
  result: Promise<ExecuteOperationResult>;
}

// analysis
identifyOperationType(): Promise<OperationType>
parseTree(): Promise<ParseTree>
jump(direction: 'next' | 'prev'): Promise<void>
```

`QueryHandle` fixes a real leak as a side effect: `results/init.ts:201` adds a `window`
listener per execution and never removes it, and
`onNotification('qlueLs/partialResult')` is re-registered per query.

### Events out (typed emitter, not `window.dispatchEvent`)

```ts
on(event, cb): Disposable

'change'           { value: string, documentId: string }
'cursor'           { position: Position }
'ready'            {}
'error'            { kind: 'server-crash' | 'lsp' | 'execution', message: string }
'diagnostics'      { items: Diagnostic[] }
'endpoint-changed' { slug: string }
'execute-request'  {}              // user hit Ctrl+Enter — host decides what to do
'command'          { id: string }  // for host-owned palettes/settings dialogs
```

The `'error'` channel replaces the `document`-level `toast` dispatch — the component
must not assume a toast system — and `'execute-request'` replaces the
`cancel-or-execute` global.

### Host-provided hooks (inverts the current imports)

```ts
interface KeybindingOverrides {
  // null disables the built-in binding; a function replaces it
  'execute'?:        null | (() => void);
  'format'?:         null | (() => void);
  'commandPalette'?: null | (() => void);   // was commands/utils.openCommandPrompt
  'settings'?:       null | (() => void);   // was settings/utils.openSettings
  'jump'?:           null;                  // disable Tab-jump
}
```

### Escape hatch

```ts
readonly monaco?: monaco.editor.IStandaloneCodeEditor   // "unstable" in docs
readonly languageClient?: MonacoLanguageClient
```

Keep both, mark unstable, and treat every host use of them as a gap in Layers 1–3 to be
closed. That lets the extraction land incrementally instead of as one big-bang rewrite.

## 3. Web-component wrapper

A thin `<sparql-editor>` over the same object:

- **Attributes:** `value`, `endpoint`, `theme`, `readonly`, `lazy`, `page-size`
- **Properties:** `endpoints`, `serverSettings`, `keybindings` (objects — attributes
  can't carry these)
- **DOM events:** `sparql-change`, `sparql-execute-request`, `sparql-partial-result`,
  `sparql-result`, `sparql-error`, `sparql-ready`
- **Methods:** `execute()`, `format()`, `getValue()`, `setValue()`
- **Shadow DOM: don't.** Monaco's overflow widgets, `fixedOverflowWidgets`, and the
  VSCode API's global stylesheet injection all fight shadow boundaries. Use a light-DOM
  custom element with scoped class names.

## 4. Deliberately out of scope

Results table, plots, map view, share links, query-execution-tree, and the `ui-api`
backend (endpoint list, saved examples, template persistence) stay in this app. The
component only emits result streams and accepts endpoint configs. YASGUI parity would
eventually want a sibling `<sparql-results>` component — a second package.

## 5. Open questions

1. **Multi-instance:** commit to the `initRuntime()` + N editors model, or declare one
   editor per page? This changes the API shape and affects the templates panel.
2. **Bundle strategy for CDN:** the qlue-ls WASM worker and Monaco's `editor.worker` are
   currently resolved via Vite `?worker&url` imports. A CDN script build needs those
   either inlined as blob workers or fetched from a configurable `workerUrl` base. Worth
   deciding before extraction, since it constrains how `EditorOptions.workerUrl` is
   specified.
