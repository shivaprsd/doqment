export class Preferences {
  #defaults = {};
  #storeKey = "";

  constructor(storeKey) {
    this.#storeKey = storeKey;
    this.store = {};
    this.stash = {};
  }
  init(properties) {
    for (let key in properties) {
      this.#defaults[key] = properties[key].default;
    }
    Object.freeze(this.#defaults);
    this.store = JSON.parse(localStorage.getItem(this.#storeKey)) ?? this.store;
  }
  get(key) {
    return this.store[key] ?? this.#defaults[key];
  }
  set(key, value) {
    this.store[key] = value;
    localStorage.setItem(this.#storeKey, JSON.stringify(this.store));
  }
  reset() {
    this.store = {};
    localStorage.setItem(this.#storeKey, JSON.stringify(this.store));
  }
}

export const ExtensionStore = {
  name: "extensionStore",
  store: "localPdfCache",
  index: "cachedTime",
  version: 1,
  maxCount: 10,
  database: null,

  _promiseFromRequest(request, upgrade) {
    return new Promise((resolve, reject) => {
      if (upgrade)
        request.onupgradeneeded = () => upgrade(request.result);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  _getStore(name, mode = "readonly") {
    return this.database.transaction(name, mode).objectStore(name);
  },

  _getWriteStore(name) {
    return this._getStore(name, "readwrite");
  },

  async init() {
    if (!this.database) {
      const createStore = db => {
        db.createObjectStore(this.store).createIndex(this.index, this.index);
      };
      const database = indexedDB.open(this.name, this.version);
      this.database = await this._promiseFromRequest(database, createStore);
    }
    return this;
  },

  get(key) {
    const getEntry = this._getStore(this.store).get(key);
    return this._promiseFromRequest(getEntry).then(entry => entry?.value);
  },

  put(key, value) {
    const entry = { value, cachedTime: Date.now() };
    const putEntry = this._getWriteStore(this.store).put(entry, key);
    return this._promiseFromRequest(putEntry).then(this._evict.bind(this));
  },

  delete(key) {
    return this._promiseFromRequest(this._getWriteStore(this.store).delete(key));
  },

  _evict() {
    const store = this._getWriteStore(this.store);
    this._promiseFromRequest(store.count()).then(count => {
      if (count > this.maxCount) {
        const openCursor = store.index(this.index).openCursor();
        this._promiseFromRequest(openCursor).then(cursor => cursor?.delete());
      }
    });
  }
}
