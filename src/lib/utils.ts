/**
 * Slugifies a string and removes file extensions
 * @param input - The input string to slugify
 * @returns A slugified string without file extensions
 *
 * @example
 * slugifyAndRemoveExtension("giorgi test.pdf") // returns "giorgi-test"
 * slugifyAndRemoveExtension("my file name.txt") // returns "my-file-name"
 * slugifyAndRemoveExtension("simple text") // returns "simple-text"
 */
export function slugifyAndRemoveExtension(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove file extension if present
  const withoutExtension = input.replace(/\.[^.]*$/, '');

  // Slugify the string
  return (
    withoutExtension
      .toLowerCase()
      .trim()
      // Replace spaces and underscores with hyphens
      .replace(/[\s_]+/g, '-')
      // Remove special characters except hyphens and dots (for filenames like file.backup)
      .replace(/[^a-z0-9.-]/g, '')
      // Replace dots with hyphens (for filenames like file.backup)
      .replace(/\./g, '-')
      // Remove multiple consecutive hyphens
      .replace(/-+/g, '-')
      // Remove leading and trailing hyphens
      .replace(/^-+|-+$/g, '')
  );
}
