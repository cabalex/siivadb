export default function getWikilink(name: string) {
  name = name.replace("#", "").replace("[", "(").replace("]", ")");
  return `https://siivagunner.wiki/wiki/${encodeURIComponent(name)}`;
}
