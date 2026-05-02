let _words: Set<string> | null = null;

export function loadWords(words: string[]): void {
  _words = new Set(words.map(w => w.toUpperCase()));
}

export function isValidWord(word: string): boolean {
  if (!_words) return false;
  if (word.length < 2) return false;
  return _words.has(word.toUpperCase());
}

export function isDictionaryLoaded(): boolean {
  return _words !== null;
}

// Clears the dictionary — intended for test teardown only
export function _clearDictionaryForTesting(): void {
  _words = null;
}
