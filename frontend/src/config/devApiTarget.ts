export const DEFAULT_DEV_API_TARGET = 'http://localhost:3000';

export const resolveDevApiTarget = (rawValue?: string): string => {
  const normalizedValue = rawValue?.trim();

  if (!normalizedValue) {
    return DEFAULT_DEV_API_TARGET;
  }

  return normalizedValue;
};
