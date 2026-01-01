// Mock indexedDB for server-side rendering
const mockIndexedDB = {
  open: () => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      createObjectStore: () => ({}),
      transaction: () => ({
        objectStore: () => ({
          put: () => ({}),
          get: () => ({}),
          delete: () => ({}),
        }),
      }),
    },
  }),
  deleteDatabase: () => ({}),
};

// Set on global object for server-side
if (typeof global !== 'undefined') {
  global.indexedDB = mockIndexedDB;
}

module.exports = mockIndexedDB;