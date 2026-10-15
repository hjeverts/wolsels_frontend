/** Alleen interne paden zijn een geldige terugkeer-URL (voorkomt doorsturen naar andere sites). */
export function safeReturnUrl(url: string | null | undefined): string {
  return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\') ? url : '/';
}
