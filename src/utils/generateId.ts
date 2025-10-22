// Simple UUID-like ID generator for React Native
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// Counter-based ID generator for guaranteed uniqueness
let idCounter = 0;
export const generateUniqueId = (prefix: string = ''): string => {
  idCounter += 1;
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 8);
  const performanceNow = performance.now().toString().replace('.', '');
  const additionalRandom = Math.random().toString(36).substr(2, 4);
  return `${prefix}${timestamp}_${idCounter}_${performanceNow}_${randomSuffix}_${additionalRandom}`;
};