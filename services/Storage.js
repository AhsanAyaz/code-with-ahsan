export class AppStorage {
  constructor(key) {
    this.key = key
    this.storage =
      typeof window !== 'undefined' ? localStorage : { setItem() {}, getItem() {}, removeItem() {} }
  }
  setItem(value) {
    this.storage.setItem(this.key, JSON.stringify(value))
  }
  getItem() {
    const val = this.storage.getItem(this.key)
    if (!val) {
      return null
    }
    return JSON.parse(val)
  }
  deleteIteM() {
    this.storage.removeItem(this.key)
  }
}
