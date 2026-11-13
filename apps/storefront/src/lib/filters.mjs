// Canonical content routes; indexes and practice homes are navigation.
export function isContentUrl(url) {
 const pathname=String(url).split(/[?#]/)[0].replace(/\.html$/,'').replace(/\/index$/,'');
 return /^\/practices\/[^/]+\/(offerings|plays|library)\/[^/]+\/?$/.test(pathname);
}
export function matches(item, {q='', kinds=[], offerings=[], tags=[]}) {
 return (!q || item.text.toLowerCase().includes(q.toLowerCase())) && (!kinds.length || kinds.includes(item.kind)) && (!offerings.length || offerings.some(x=>item.offerings.includes(x))) && (!tags.length || tags.some(x=>item.tags.includes(x)));
}
