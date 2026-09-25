export function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function collectGames(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectGames(item, output);
    return output;
  }
  if (!value || typeof value !== "object") return output;

  const title = value.title || value.name || value.gameName || value.displayName;
  if (typeof title === "string" && title.length >= 2) {
    const steamUrl = value.steamUrl || value.steamURL || "";
    output.push({
      id: value.id || value.gameId || undefined,
      title,
      aliases: [],
      platforms: ["pc"],
      stores: [value.store || value.appStore].filter(Boolean),
      status: !value.status || value.status === "AVAILABLE" ? "available" : "unknown",
      metadata: {
        normalizedTitle: normalizeTitle(title),
        steamAppId: steamUrl.match(/\/app\/(\d+)/)?.[1] || undefined,
        gfnGameId: value.id || value.gameId || undefined
      }
    });
  }
  for (const child of Object.values(value)) collectGames(child, output);
  return output;
}

export function dedupeGames(games) {
  return [...new Map(games
    .filter((game) => game.title && game.status === "available")
    .map((game) => [`${game.stores.join(",")}:${normalizeTitle(game.title)}`, game])).values()];
}
