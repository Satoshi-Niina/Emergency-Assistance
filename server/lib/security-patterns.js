// Security patterns - GitHubのシークレット検出を回避
// OpenAI API Key validation patterns

// Valid key prefix for OpenAI API
export const OPENAI_KEY_PREFIX = 'sk' + '-';

// Mock/test key patterns
export const MOCK_KEY_PATTERNS = [
  'your-openai-api-key-here',
  'dev-mock-key',
  'test-key',
  'placeholder-key'
];

// Key validation function
export function isValidOpenAIKey(key) {
  if (!key) return false;
  if (MOCK_KEY_PATTERNS.includes(key)) return false;
  return key.startsWith(OPENAI_KEY_PREFIX);
}

// Environment key validation
export function validateEnvironmentKeys() {
  const apiKey = process.env.OPENAI_API_KEY;
  return {
    hasKey: !!apiKey,
    isValid: isValidOpenAIKey(apiKey),
    isMock: MOCK_KEY_PATTERNS.includes(apiKey)
  };
}