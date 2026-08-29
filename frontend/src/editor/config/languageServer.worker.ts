// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ Copyright © 2026 Ioannis Nezis                                     │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// └────────────────────────────────────────────────────────────────────┘ \\

// @ts-expect-error
import init, { init_language_server, listen } from 'qlue-ls?init';

// Signals that the worker script itself has loaded; the wasm binary is fetched
// by init() below. Lets startup timing separate script load from wasm load.
self.postMessage({ type: 'booting' });

init().then(() => {
  // Connection Worker <-> Language Server(WASM)
  const wasmInputStream = new TransformStream();
  const wasmOutputStream = new TransformStream();
  const wasmReader = wasmOutputStream.readable.getReader();
  const wasmWriter = wasmInputStream.writable.getWriter();

  // Initialize & start language server
  const server = init_language_server(wasmOutputStream.writable.getWriter());

  listen(server, wasmInputStream.readable.getReader());

  // Language Client -> Language Server
  self.onmessage = (message) => {
    // console.log(message.data);
    wasmWriter.write(JSON.stringify(message.data));
  };
  // Language Server -> Language Client
  (async () => {
    while (true) {
      const { value, done } = await wasmReader.read();
      if (done) break;
      // console.log(JSON.parse(value));
      self.postMessage(JSON.parse(value));
    }
  })();

  self.postMessage({ type: 'ready' });
});
