import type { Href } from "expo-router";

export function withCommunityId(path: string, communityId?: string | null): Href {
  if (!communityId) return path as Href;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}communityId=${encodeURIComponent(communityId)}` as Href;
}

export function routePathWithCommunity(
  routeId: string,
  communityId?: string | null,
): Href {
  return withCommunityId(`/route/${encodeURIComponent(routeId)}`, communityId);
}

export function meetupCreatePath(
  routeId: string,
  routeName: string,
  canton: string,
  communityId?: string | null,
): Href {
  const query = [
    `routeId=${encodeURIComponent(routeId)}`,
    `routeName=${encodeURIComponent(routeName)}`,
    `canton=${encodeURIComponent(canton)}`,
  ].join("&");
  return withCommunityId(`/treffpunkte/neu?${query}`, communityId);
}