export default function isURL(str: string): boolean {
  return /^https?:\/\//.test(str);
}
