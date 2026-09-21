import assert from "node:assert/strict";
import test from "node:test";

import {
  communityInviteClaimKey,
  getCommunityInviteRouteParams,
  isCommunityInviteSegments,
  resolveCommunityInviteAction,
  shouldStartCommunityInviteClaim,
} from "./communityInviteFlow";

const invite = { slug: "alpenfreunde", code: "abc123" };

test("waits for Clerk before deciding how to handle an invite", () => {
  assert.deepEqual(
    resolveCommunityInviteAction({
      isLoaded: false,
      isSignedIn: false,
      ...invite,
    }),
    { kind: "wait" },
  );
});

test("sends unauthenticated invite links to sign-in with the original context", () => {
  assert.deepEqual(
    resolveCommunityInviteAction({
      isLoaded: true,
      isSignedIn: false,
      slug: [invite.slug],
      code: [invite.code],
    }),
    { kind: "redirect-to-sign-in", invite },
  );
});

test("continues authenticated invite links directly to the claim", () => {
  assert.deepEqual(
    resolveCommunityInviteAction({
      isLoaded: true,
      isSignedIn: true,
      ...invite,
    }),
    { kind: "claim", invite },
  );
});

test("does not claim an invite twice for the same route", () => {
  const claimKey = communityInviteClaimKey(invite);
  assert.equal(shouldStartCommunityInviteClaim(null, invite), true);
  assert.equal(shouldStartCommunityInviteClaim(claimKey, invite), false);
  assert.equal(
    shouldStartCommunityInviteClaim(claimKey, { ...invite, code: "different" }),
    true,
  );
});

test("rejects an invite when slug or code is missing", () => {
  assert.equal(getCommunityInviteRouteParams({ slug: invite.slug }), null);
  assert.deepEqual(
    resolveCommunityInviteAction({
      isLoaded: true,
      isSignedIn: true,
      slug: invite.slug,
      code: " ",
    }),
    { kind: "error" },
  );
});

test("keeps the invite route outside the normal auth redirect", () => {
  assert.equal(isCommunityInviteSegments(["community", "invite", "[slug]"]), true);
  assert.equal(isCommunityInviteSegments(["(auth)", "sign-in"]), false);
});