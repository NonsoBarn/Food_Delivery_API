export function slugify(text: string): string {
  if (!text) return '';

  return (
    text
      // Step 1: Normalize Unicode characters
      // This converts accented characters to their base form
      // Example: "café" → "cafe", "naïve" → "naive"
      // NFD = Canonical Decomposition (separates base char from accent)
      .normalize('NFD')

      // Step 2: Remove accent marks (diacritics)
      // \u0300-\u036f is the Unicode range for combining diacritical marks
      // Example: é (e + ´) → e
      .replace(/[\u0300-\u036f]/g, '')

      // Step 3: Convert to lowercase
      // URL slugs are conventionally lowercase
      .toLowerCase()

      // Step 4: Remove invalid characters
      // Keep only: letters (a-z), numbers (0-9), spaces, hyphens
      // Everything else is removed
      // Example: "Hello & World!" → "Hello  World"
      .replace(/[^a-z0-9\s-]/g, '')

      // Step 5: Trim whitespace from both ends
      // Remove leading/trailing spaces
      .trim()

      // Step 6: Replace spaces and consecutive hyphens with single hyphen
      // \s+ matches one or more spaces
      // -+ matches one or more hyphens
      // Example: "hello  world" → "hello-world"
      // Example: "hello---world" → "hello-world"
      .replace(/[\s-]+/g, '-')

      // Step 7: Remove hyphens from start and end (edge case cleanup)
      // Example: "-hello-world-" → "hello-world"
      .replace(/^-+|-+$/g, '')
  );
}
