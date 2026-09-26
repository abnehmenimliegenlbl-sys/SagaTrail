export type CommunityInviteParam = string | string[] | undefined;

export interface CommunityInviteRouteParams {
  slug: string;
  code: string;
}

export type CommunityInviteAction =
  | { kind: "wait" }
  | { kind: "redirect-to-sign-in"; invite: CommunityInviteRouteParams }
  | { kind: "claim"; invite: CommunityInviteRouteParams }
  | { kind: "error" };

function firstParam(value: CommunityInviteParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function getCommunityInviteRouteParams(params: {
  slug?: CommunityInviteParam;
  code?: CommunityInviteParam;
}): CommunityInviteRouteParams | null {
  const slug = firstParam(params.slug)?.trim();
  const code = firstParam(params.code)?.trim();
  if (!slug || !code) return null;
  return { slug, code };
}

export function resolveCommunityInviteAction(input: {
  isLoaded: boolean;
  isSignedIn: boolean;
  slug?: CommunityInviteParam;
  code?: CommunityInviteParam;
}): CommunityInviteAction {
  const invite = getCommunityInviteRouteParams(input);
  if (!input.isLoaded) return { kind: "wait" };
  if (!invite) return { kind: "error" };
  if (!input.isSignedIn) return { kind: "redirect-to-sign-in", invite };
  return { kind: "claim", invite };
}

export function communityInviteClaimKey(invite: CommunityInviteRouteParams): string {
  return `${invite.slug}\u0000${invite.code.toUpperCase()}`;
}

export function shouldStartCommunityInviteClaim(
  previousClaimKey: string | null,
  invite: CommunityInviteRouteParams,
): boolean {
  return previousClaimKey !== communityInviteClaimKey(invite);
}

export function releaseCommunityInviteClaim(
  activeClaimKey: string | null,
  invite: CommunityInviteRouteParams,
): string | null {
  return activeClaimKey === communityInviteClaimKey(invite) ? null : activeClaimKey;
}

export function isCommunityInviteSegments(segments: readonly string[]): boolean {
  return segments[0] === "community" && segments[1] === "invite";
}