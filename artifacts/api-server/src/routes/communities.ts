import { Router, type IRouter, type Request } from "express";
import { eq, and, asc } from "drizzle-orm";
import { getAuth, clerkClient } from "@clerk/express";
import { z } from "zod/v4";
import {
  db,
  communitiesTable,
  communityMembersTable,
  communityAdminsTable,
  type CommunityRow,
} from "@workspace/db";
import {
  GetCommunityInvitationParams,
  GetCommunityInvitationByCodeParams,
  ClaimCommunityInvitationBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function normalizeCommunityInviteCode(value: unknown): unknown {
  return typeof value === "string" ? value.trim().toUpperCase() : value;
}

async function ensureCommunityAdminMembership(
  userId: string,
  req: Request,
): Promise<void> {
  const user = await clerkClient.users.getUser(userId);
  const primaryEmail =
    user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses[0]?.emailAddress;
  if (!primaryEmail) return;

  const [admin] = await db
    .select({
      communityId: communityAdminsTable.communityId,
      active: communityAdminsTable.active,
    })
    .from(communityAdminsTable)
    .where(eq(communityAdminsTable.email, primaryEmail.trim().toLowerCase()))
    .limit(1);
  if (!admin?.active || !admin.communityId) return;

  const inserted = await db
    .insert(communityMembersTable)
    .values({ communityId: admin.communityId, userId })
    .onConflictDoNothing({
      target: [communityMembersTable.communityId, communityMembersTable.userId],
    })
    .returning({ id: communityMembersTable.id });
  if (inserted.length > 0) {
    req.log.info(
      { communityId: admin.communityId, userId },
      "Community-Admin automatisch als Mitglied hinzugefügt",
    );
  }
}

function invitationFromRow(row: CommunityRow, req: Request) {
  const coverImageUrl = row.coverImageUrl?.startsWith("/objects/")
    ? `${req.protocol}://${req.get("host")}/api/storage${row.coverImageUrl}`
    : row.coverImageUrl;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    administratorName: row.administratorName,
    language: row.language,
    coverImageUrl,
    inviteCode: row.inviteCode,
    appStoreUrl: row.appStoreUrl,
    playStoreUrl: row.playStoreUrl,
    deepLink: `mobile://community/invite/${encodeURIComponent(row.slug)}?code=${encodeURIComponent(row.inviteCode)}`,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function findActiveInvitation(
  where: ReturnType<typeof eq> | ReturnType<typeof and>,
  req: Request,
): Promise<ReturnType<typeof invitationFromRow> | null> {
  const [row] = await db
    .select()
    .from(communitiesTable)
    .where(and(eq(communitiesTable.active, true), where))
    .limit(1);
  return row ? invitationFromRow(row, req) : null;
}

router.get("/communities/invitations/:slug", async (req, res): Promise<void> => {
  const parsed = GetCommunityInvitationParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungültiger Einladungslink" });
    return;
  }

  const invitation = await findActiveInvitation(
    eq(communitiesTable.slug, parsed.data.slug),
    req,
  );
  if (!invitation) {
    res.status(404).json({ error: "Einladung nicht gefunden" });
    return;
  }
  res.json(invitation);
});

router.get(
  "/communities/invitations/by-code/:code",
  async (req, res): Promise<void> => {
    const parsed = GetCommunityInvitationByCodeParams.safeParse({
      code: String(req.params.code ?? "").trim().toUpperCase(),
    });
    if (!parsed.success) {
      res.status(400).json({ error: "Ungültiger Einladungscode" });
      return;
    }

    const invitation = await findActiveInvitation(
      eq(communitiesTable.inviteCode, parsed.data.code.toUpperCase()),
      req,
    );
    if (!invitation) {
      res.status(404).json({ error: "Einladungscode nicht gefunden" });
      return;
    }
    res.json(invitation);
  },
);

router.get("/communities/me", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Nicht authentifiziert" });
    return;
  }

  try {
    await ensureCommunityAdminMembership(userId, req);
  } catch (err) {
    req.log.warn(
      { err, userId },
      "Automatische Community-Admin-Mitgliedschaft wird später erneut geprüft",
    );
  }

  const memberships = await db
    .select({
      id: communitiesTable.id,
      slug: communitiesTable.slug,
      name: communitiesTable.name,
      description: communitiesTable.description,
      language: communitiesTable.language,
      coverImageUrl: communitiesTable.coverImageUrl,
      active: communitiesTable.active,
      joinedAt: communityMembersTable.joinedAt,
    })
    .from(communityMembersTable)
    .innerJoin(
      communitiesTable,
      eq(communitiesTable.id, communityMembersTable.communityId),
    )
    .where(
      and(
        eq(communityMembersTable.userId, userId),
        eq(communitiesTable.active, true),
      ),
    )
    .orderBy(asc(communitiesTable.name));

  res.json(
    memberships.map((community) => ({
      ...community,
      joinedAt: community.joinedAt.toISOString(),
    })),
  );
});

router.delete("/communities/:id/membership", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Nicht authentifiziert" });
    return;
  }

  const communityId = z.string().uuid().safeParse(req.params.id);
  if (!communityId.success) {
    res.status(404).json({ error: "Community-Mitgliedschaft nicht gefunden" });
    return;
  }

  const user = await clerkClient.users.getUser(userId);
  const primaryEmail =
    user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses[0]?.emailAddress;
  const normalizedEmail = primaryEmail?.trim().toLowerCase();

  if (normalizedEmail) {
    const [admin] = await db
      .select({ id: communityAdminsTable.id })
      .from(communityAdminsTable)
      .where(
        and(
          eq(communityAdminsTable.communityId, communityId.data),
          eq(communityAdminsTable.email, normalizedEmail),
          eq(communityAdminsTable.active, true),
        ),
      )
      .limit(1);
    if (admin) {
      res.status(409).json({
        error: "Community-Admins können ihre eigene Community derzeit nicht verlassen.",
      });
      return;
    }
  }

  const deleted = await db
    .delete(communityMembersTable)
    .where(
      and(
        eq(communityMembersTable.communityId, communityId.data),
        eq(communityMembersTable.userId, userId),
      ),
    )
    .returning({ id: communityMembersTable.id });

  if (deleted.length === 0) {
    res.status(404).json({ error: "Community-Mitgliedschaft nicht gefunden" });
    return;
  }

  res.status(204).end();
});

router.post("/communities/invitations/claim", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Nicht authentifiziert" });
    return;
  }

  const parsed = ClaimCommunityInvitationBody.safeParse({
    ...req.body,
    code: normalizeCommunityInviteCode(req.body?.code),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Ungültiger Einladungscode" });
    return;
  }

  const [community] = await db
    .select()
    .from(communitiesTable)
    .where(and(eq(communitiesTable.active, true), eq(communitiesTable.inviteCode, parsed.data.code)))
    .limit(1);
  if (!community) {
    res.status(404).json({ error: "Einladung nicht gefunden" });
    return;
  }

  const [existing] = await db
    .select({ id: communityMembersTable.id })
    .from(communityMembersTable)
    .where(
      and(
        eq(communityMembersTable.communityId, community.id),
        eq(communityMembersTable.userId, userId),
      ),
    )
    .limit(1);

  if (!existing) {
    await db
      .insert(communityMembersTable)
      .values({ communityId: community.id, userId })
      .onConflictDoNothing({
        target: [communityMembersTable.communityId, communityMembersTable.userId],
      });
  }

  res.json({
    joined: true,
    alreadyMember: Boolean(existing),
    community: invitationFromRow(community, req),
  });
});

export default router;