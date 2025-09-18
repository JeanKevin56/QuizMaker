export class StorageManager {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    this.isInitialized = true;
  }
}