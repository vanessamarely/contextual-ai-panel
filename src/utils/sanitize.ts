export function sanitize(text: string) {
  // lightweight sanitization: remove script tags and on* attributes
  return text
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script>/gi, '')
    .replace(/on[a-z]+="[^"]*"/gi, '')
    .replace(/on[a-z]+='[^']*'/gi, '')
}
