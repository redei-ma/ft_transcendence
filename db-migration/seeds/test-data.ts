import {
	PrismaClient,
	Provider,
	UserStatus,
	MatchMode,
	MatchType,
	CharacterName,
	EndReason,
	FriendshipStatus,
	InviteStatus,
	NotificationType,
} from "@transcendence/types";
import bcrypt from "bcrypt";

export async function seedTestData(prisma: PrismaClient): Promise<void> {
	console.log("Seeding test data...");

	// Pre-hash password for test users
	const TEST_PASSWORD = "TestPass123!";
	const TEST_PASSWORD_HASH = await bcrypt.hash(TEST_PASSWORD, 10);

	// ─── Users ────────────────────────────────────────────────────

	const alice = await prisma.user.upsert({
		where: { email: "alice@test.com" },
		update: {},
		create: {
			email: "alice@test.com",
			username: "alice",
			isEmailVerified: true,
			avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=alice",
			status: UserStatus.OFFLINE,
			accounts: {
				create: [
					{
						provider: Provider.LOCAL,
						passwordHash: TEST_PASSWORD_HASH,
					},
					{ provider: Provider.GOOGLE, oauthId: "google_alice_123" },
				],
			},
			stats: {
				create: {
					eloCurrent: 1000,
					eloPeak: 1000,
					totalWins: 1,
					totalLosses: 1,
					totalDraws: 1,
					currentWinStreak: 0,
					bestWinStreak: 1,
					currentLoseStreak: 0,
					totalKills: 1,
					totalDeaths: 1,
				},
			},
		},
	});
	console.log("  ✓ alice    (LOCAL + GOOGLE, verified, offline)");

	const bob = await prisma.user.upsert({
		where: { email: "bob@test.com" },
		update: {},
		create: {
			email: "bob@test.com",
			username: "bob",
			isEmailVerified: true,
			avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=bob",
			status: UserStatus.OFFLINE,
			accounts: {
				create: {
					provider: Provider.LOCAL,
					passwordHash: TEST_PASSWORD_HASH,
				},
			},
			stats: {
				create: {
					eloCurrent: 980,
					eloPeak: 1000,
					totalWins: 1,
					totalLosses: 2,
					totalDraws: 0,
					currentWinStreak: 0,
					bestWinStreak: 1,
					currentLoseStreak: 1,
					totalKills: 1,
					totalDeaths: 1,
				},
			},
		},
	});
	console.log("  ✓ bob      (LOCAL, verified, offline)");

	const charlie = await prisma.user.upsert({
		where: { email: "charlie@test.com" },
		update: {},
		create: {
			email: "charlie@test.com",
			username: "charlie",
			isEmailVerified: true,
			avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=charlie",
			status: UserStatus.OFFLINE,
			accounts: {
				create: {
					provider: Provider.LOCAL,
					passwordHash: TEST_PASSWORD_HASH,
				},
			},
			stats: {
				create: {},
			},
		},
	});
	console.log("  ✓ charlie  (LOCAL, verified, offline)");

	const diana = await prisma.user.upsert({
		where: { email: "diana@test.com" },
		update: {},
		create: {
			email: "diana@test.com",
			username: "diana",
			isEmailVerified: true,
			avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=diana",
			status: UserStatus.OFFLINE,
			accounts: {
				create: [
					{
						provider: Provider.LOCAL,
						passwordHash: TEST_PASSWORD_HASH,
					},
					{ provider: Provider.GOOGLE, oauthId: "google_diana_789" },
				],
			},
			stats: {
				create: {
					eloCurrent: 1020,
					eloPeak: 1020,
					totalWins: 1,
					totalLosses: 0,
					totalDraws: 1,
					currentWinStreak: 1,
					bestWinStreak: 1,
					currentLoseStreak: 0,
					totalKills: 0,
					totalDeaths: 0,
				},
			},
		},
	});
	console.log("  ✓ diana    (LOCAL + GOOGLE, verified, offline)");

	const eve = await prisma.user.upsert({
		where: { email: "eve@test.com" },
		update: {},
		create: {
			email: "eve@test.com",
			username: "eve",
			isEmailVerified: true,
			avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=eve",
			status: UserStatus.OFFLINE,
			accounts: {
				create: {
					provider: Provider.LOCAL,
					passwordHash: TEST_PASSWORD_HASH,
				},
			},
			stats: {
				create: {},
			},
		},
	});
	console.log("  ✓ eve      (LOCAL, verified, offline)");

	const frank = await prisma.user.upsert({
		where: { email: "frank@test.com" },
		update: {},
		create: {
			email: "frank@test.com",
			username: "frank",
			isEmailVerified: true,
			avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=frank",
			status: UserStatus.OFFLINE,
			accounts: {
				create: {
					provider: Provider.LOCAL,
					passwordHash: TEST_PASSWORD_HASH,
				},
			},
			stats: {
				create: {},
			},
		},
	});
	console.log("  ✓ frank    (LOCAL, verified, offline)");

	// ─── Character Stats ──────────────────────────────────────────

	await prisma.characterStats.createMany({
		skipDuplicates: true,
		data: [
			// alice: match1(ZEUS WIN, k1/d0), match2(ADE LOSS, k0/d1), match3(ZEUS DRAW, k0/d0)
			{
				userId: alice.id,
				characterName: CharacterName.ZEUS,
				wins: 1,
				losses: 0,
				draws: 1,
				kills: 1,
				deaths: 0,
			},
			{
				userId: alice.id,
				characterName: CharacterName.ADE,
				wins: 0,
				losses: 1,
				draws: 0,
				kills: 0,
				deaths: 1,
			},
			// bob: match1(ADE LOSS, k0/d1), match2(ADE WIN, k1/d0), match6(ADE LOSS resign, k0/d0)
			{
				userId: bob.id,
				characterName: CharacterName.ADE,
				wins: 1,
				losses: 2,
				draws: 0,
				kills: 1,
				deaths: 1,
			},
			// diana: match3(ZEUS DRAW, k0/d0), match6(ZEUS WIN resign, k0/d0)
			{
				userId: diana.id,
				characterName: CharacterName.ZEUS,
				wins: 1,
				losses: 0,
				draws: 1,
				kills: 0,
				deaths: 0,
			},
		],
	});
	console.log("  ✓ Character stats (alice: ZEUS/ADE, bob: ADE, diana: ZEUS)");

	// ─── Matches ──────────────────────────────────────────────────

	// Ranked match: alice beats bob (killout)
	await prisma.match.create({
		data: {
			mode: MatchMode.RANKED,
			type: MatchType.FFA,
			durationSeconds: 120,
			endReason: EndReason.KILLOUT,
			winningTeamId: 1,
			participants: {
				create: [
					{
						userId: alice.id,
						teamId: 1,
						characterName: CharacterName.ZEUS,
						kills: 1,
						deaths: 0,
					},
					{
						userId: bob.id,
						teamId: 2,
						characterName: CharacterName.ADE,
						kills: 0,
						deaths: 1,
					},
				],
			},
		},
	});

	// Ranked match: bob beats alice (killout)
	await prisma.match.create({
		data: {
			mode: MatchMode.RANKED,
			type: MatchType.FFA,
			durationSeconds: 175,
			endReason: EndReason.KILLOUT,
			winningTeamId: 2,
			participants: {
				create: [
					{
						userId: alice.id,
						teamId: 1,
						characterName: CharacterName.ADE,
						kills: 0,
						deaths: 1,
					},
					{
						userId: bob.id,
						teamId: 2,
						characterName: CharacterName.ADE,
						kills: 1,
						deaths: 0,
					},
				],
			},
		},
	});

	// Ranked draw: alice vs diana (timeout, nobody died)
	await prisma.match.create({
		data: {
			mode: MatchMode.RANKED,
			type: MatchType.FFA,
			durationSeconds: 300,
			endReason: EndReason.TIMEOUT,
			winningTeamId: null,
			participants: {
				create: [
					{
						userId: alice.id,
						teamId: 1,
						characterName: CharacterName.ZEUS,
						kills: 0,
						deaths: 0,
					},
					{
						userId: diana.id,
						teamId: 2,
						characterName: CharacterName.ZEUS,
						kills: 0,
						deaths: 0,
					},
				],
			},
		},
	});

	// Unranked: bob resigns against diana (nobody died)
	await prisma.match.create({
		data: {
			mode: MatchMode.UNRANKED,
			type: MatchType.FFA,
			durationSeconds: 45,
			endReason: EndReason.RESIGNATION,
			winningTeamId: 2,
			participants: {
				create: [
					{
						userId: bob.id,
						teamId: 1,
						characterName: CharacterName.ADE,
						kills: 0,
						deaths: 0,
					},
					{
						userId: diana.id,
						teamId: 2,
						characterName: CharacterName.ZEUS,
						kills: 0,
						deaths: 0,
					},
				],
			},
		},
	});

	console.log("  ✓ 4 matches (2 ranked killout, 1 ranked draw, 1 unranked resignation)");

	// ─── Friendships ──────────────────────────────────────────────

	await prisma.friendship.createMany({
		skipDuplicates: true,
		data: [
			{
				senderId: alice.id,
				receiverId: bob.id,
				status: FriendshipStatus.ACCEPTED,
			},
			{
				senderId: alice.id,
				receiverId: diana.id,
				status: FriendshipStatus.ACCEPTED,
			},
			{
				senderId: charlie.id,
				receiverId: alice.id,
				status: FriendshipStatus.PENDING,
			},
			{
				senderId: bob.id,
				receiverId: diana.id,
				status: FriendshipStatus.REJECTED,
			},
			{
				senderId: charlie.id,
				receiverId: eve.id,
				status: FriendshipStatus.ACCEPTED,
			},
			{
				senderId: frank.id,
				receiverId: bob.id,
				status: FriendshipStatus.PENDING,
			},
		],
	});
	console.log("  ✓ Friendships (alice-bob accepted, alice-diana accepted, charlie-eve accepted, charlie→alice pending, frank→bob pending, bob→diana rejected)");

	// ─── Game Invites ─────────────────────────────────────────────

	const now = new Date();
	const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
	const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

	await prisma.gameInvite.createMany({
		skipDuplicates: true,
		data: [
			{
				senderId: alice.id,
				receiverId: bob.id,
				status: InviteStatus.EXPIRED,
				expiresAt: oneHourAgo,
			},
			{
				senderId: diana.id,
				receiverId: alice.id,
				status: InviteStatus.ACCEPTED,
				expiresAt: oneHourFromNow,
			},
			{
				senderId: charlie.id,
				receiverId: alice.id,
				status: InviteStatus.EXPIRED,
				expiresAt: oneHourAgo,
			},
		],
	});
	console.log("  ✓ Game invites (alice→bob expired, diana→alice accepted, charlie→alice expired)");

	// ─── Achievements ─────────────────────────────────────────────

	const firstBlood = await prisma.achievement.findUniqueOrThrow({
		where: { name: "First Blood" },
	});
	const perfectlyBalanced = await prisma.achievement.findUniqueOrThrow({
		where: { name: "Perfectly Balanced" },
	});
	const conqueror = await prisma.achievement.findUniqueOrThrow({
		where: { name: "Conqueror" },
	});
	const tacticalRetreat = await prisma.achievement.findUniqueOrThrow({
		where: { name: "Tactical Retreat" },
	});

	await prisma.userAchievement.createMany({
		skipDuplicates: true,
		data: [
			// Alice: First Blood (match1, first ever) + Perfectly Balanced (match3, draw)
			{ userId: alice.id, achievementId: firstBlood.id },
			{ userId: alice.id, achievementId: perfectlyBalanced.id },
			// Bob: First Blood (match1) + Tactical Retreat (match6, resigned)
			{ userId: bob.id, achievementId: firstBlood.id },
			{ userId: bob.id, achievementId: tacticalRetreat.id },
			// Diana: First Blood (match3) + Perfectly Balanced (match3) + Conqueror (match6, won by resignation)
			{ userId: diana.id, achievementId: firstBlood.id },
			{ userId: diana.id, achievementId: perfectlyBalanced.id },
			{ userId: diana.id, achievementId: conqueror.id },
		],
	});
	console.log("  ✓ Achievements (alice: 2, bob: 2, diana: 3, charlie: 0)");

	// ─── Notifications ────────────────────────────────────────────

	await prisma.notification.createMany({
		data: [
			// Alice sent friend requests to bob and diana — both accepted
			// → alice receives FRIEND_ACCEPTED from both
			{
				userId: alice.id,
				type: NotificationType.FRIEND_ACCEPTED,
				message: "bob accepted your friend request.",
				isRead: true,
			},
			{
				userId: alice.id,
				type: NotificationType.FRIEND_ACCEPTED,
				message: "diana accepted your friend request.",
				isRead: true,
			},
			// charlie sent alice a friend request → alice receives FRIEND_REQ
			{
				userId: alice.id,
				type: NotificationType.FRIEND_REQ,
				message: "charlie sent you a friend request.",
				isRead: false,
			},
			// Alice: First Blood (match1) + Perfectly Balanced (match3)
			{
				userId: alice.id,
				type: NotificationType.ACHV_UNLOCKED,
				message: 'Congratulations! You\'ve earned the "First Blood" achievement.',
				isRead: true,
			},
			{
				userId: alice.id,
				type: NotificationType.ACHV_UNLOCKED,
				message: 'Congratulations! You\'ve earned the "Perfectly Balanced" achievement.',
				isRead: false,
			},
			// Bob: received friend request from alice (accepted, so read), First Blood, Tactical Retreat, pending request from frank
			{
				userId: bob.id,
				type: NotificationType.FRIEND_REQ,
				message: "alice sent you a friend request.",
				isRead: true,
			},
			{
				userId: bob.id,
				type: NotificationType.ACHV_UNLOCKED,
				message: 'Congratulations! You\'ve earned the "First Blood" achievement.',
				isRead: true,
			},
			{
				userId: bob.id,
				type: NotificationType.ACHV_UNLOCKED,
				message: 'Congratulations! You\'ve earned the "Tactical Retreat" achievement.',
				isRead: false,
			},
			{
				userId: bob.id,
				type: NotificationType.FRIEND_REQ,
				message: "frank sent you a friend request.",
				isRead: false,
			},
			// Diana: received friend requests from alice (accepted) and bob (rejected), First Blood, Perfectly Balanced, Conqueror
			{
				userId: diana.id,
				type: NotificationType.FRIEND_REQ,
				message: "alice sent you a friend request.",
				isRead: true,
			},
			{
				userId: diana.id,
				type: NotificationType.FRIEND_REQ,
				message: "bob sent you a friend request.",
				isRead: true,
			},
			{
				userId: diana.id,
				type: NotificationType.ACHV_UNLOCKED,
				message: 'Congratulations! You\'ve earned the "First Blood" achievement.',
				isRead: true,
			},
			{
				userId: diana.id,
				type: NotificationType.ACHV_UNLOCKED,
				message: 'Congratulations! You\'ve earned the "Perfectly Balanced" achievement.',
				isRead: true,
			},
			{
				userId: diana.id,
				type: NotificationType.ACHV_UNLOCKED,
				message: 'Congratulations! You\'ve earned the "Conqueror" achievement.',
				isRead: false,
			},
			// Charlie: eve accepted the friend request charlie sent
			{
				userId: charlie.id,
				type: NotificationType.FRIEND_ACCEPTED,
				message: "eve accepted your friend request.",
				isRead: true,
			},
		],
	});
	console.log("  ✓ Notifications (alice: 5, bob: 4, diana: 5, charlie: 1)");

	console.log("Test data seeding complete!");
}
