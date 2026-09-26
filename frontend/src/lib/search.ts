/**
 * Case-insensitive "does any of these fields contain the search term" check, shared by the
 * admin list pages that filter in the browser (Team, Applications, Reviews). An empty term
 * matches everything.
 */
export function matchesSearch(term: string, ...fields: (string | null | undefined)[]): boolean {
    const needle = term.trim().toLowerCase();
    if (!needle) return true;

    return fields.some((field) => field?.toLowerCase().includes(needle));
}
