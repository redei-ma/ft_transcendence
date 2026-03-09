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
} from "@prisma/client";
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
			status: UserStatus.ONLINE,
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
					eloCurrent: 1250,
					eloPeak: 1300,
					totalWins: 15,
					totalLosses: 8,
					totalDraws: 2,
					currentWinStreak: 3,
					bestWinStreak: 5,
					currentLoseStreak: 0,
					totalKills: 52,
					totalDeaths: 31,
				},
			},
		},
	});
	console.log("  ✓ alice (LOCAL + GOOGLE, verified, online)");

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
					provider: Provider.GOOGLE,
					oauthId: "google_bob_456",
				},
			},
			stats: {
				create: {
					eloCurrent: 980,
					eloPeak: 1050,
					totalWins: 5,
					totalLosses: 10,
					totalDraws: 1,
					currentWinStreak: 0,
					bestWinStreak: 2,
					currentLoseStreak: 3,
					totalKills: 18,
					totalDeaths: 35,
				},
			},
		},
	});
	console.log("  ✓ bob (GOOGLE only, verified, offline)");

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
	console.log("  ✓ charlie (LOCAL only, verified, no matches)");

	const diana = await prisma.user.upsert({
		where: { email: "diana@test.com" },
		update: {},
		create: {
			email: "diana@test.com",
			username: "diana",
			isEmailVerified: true,
			avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=diana",
			status: UserStatus.IN_GAME,
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
					eloCurrent: 1100,
					eloPeak: 1150,
					totalWins: 10,
					totalLosses: 10,
					totalDraws: 5,
					currentWinStreak: 0,
					bestWinStreak: 3,
					currentLoseStreak: 0,
					totalKills: 40,
					totalDeaths: 40,
				},
			},
		},
	});
	console.log("  ✓ diana (LOCAL + GOOGLE, verified, in_game)");

	const eve = await prisma.user.upsert({
		where: { email: "eve@test.com" },
		update: {},
		create: {
			email: "eve@test.com",
			username: "eve",
			isEmailVerified: true,
			avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=eve",
			status: UserStatus.ONLINE,
			accounts: {
				create: {
					provider: Provider.LOCAL,
					passwordHash: TEST_PASSWORD_HASH,
				},
			},
			stats: {
				create: {
					eloCurrent: 1100,
					eloPeak: 1100,
					totalWins: 8,
					totalLosses: 8,
					totalDraws: 0,
					currentWinStreak: 1,
					bestWinStreak: 3,
					currentLoseStreak: 0,
					totalKills: 30,
					totalDeaths: 28,
				},
			},
		},
	});
	console.log("  ✓ eve (LOCAL only, verified, online, elo 1100)");

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
				create: {
					eloCurrent: 1100,
					eloPeak: 1150,
					totalWins: 7,
					totalLosses: 9,
					totalDraws: 1,
					currentWinStreak: 0,
					bestWinStreak: 4,
					currentLoseStreak: 2,
					totalKills: 27,
					totalDeaths: 32,
				},
			},
		},
	});
	console.log("  ✓ frank (LOCAL only, verified, offline, elo 1100)");

	// ─── Character Stats ──────────────────────────────────────────

	await prisma.characterStats.createMany({
		skipDuplicates: true,
		data: [
			{
				userId: alice.id,
				characterName: CharacterName.ZEUS,
				wins: 10,
				losses: 3,
				draws: 1,
				kills: 35,
				deaths: 15,
			},
			{
				userId: alice.id,
				characterName: CharacterName.ADE,
				wins: 5,
				losses: 5,
				draws: 1,
				kills: 17,
				deaths: 16,
			},
			{
				userId: bob.id,
				characterName: CharacterName.ADE,
				wins: 5,
				losses: 10,
				draws: 1,
				kills: 18,
				deaths: 35,
			},
			{
				userId: diana.id,
				characterName: CharacterName.ZEUS,
				wins: 6,
				losses: 4,
				draws: 3,
				kills: 22,
				deaths: 18,
			},
			{
				userId: diana.id,
				characterName: CharacterName.ADE,
				wins: 4,
				losses: 6,
				draws: 2,
				kills: 18,
				deaths: 22,
			},
		],
	});
	console.log("  ✓ Character stats");

	// ─── Matches ──────────────────────────────────────────────────

	// Ranked match: alice beats bob
	const match1 = await prisma.match.create({
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
						kills: 3,
						deaths: 1,
					},
					{
						userId: bob.id,
						teamId: 2,
						characterName: CharacterName.ADE,
						kills: 1,
						deaths: 3,
					},
				],
			},
		},
	});

	// Ranked match: bob beats alice
	const match2 = await prisma.match.create({
		data: {
			mode: MatchMode.RANKED,
			type: MatchType.FFA,
			durationSeconds: 175,
			endReason: EndReason.TIMEOUT,
			winningTeamId: 2,
			participants: {
				create: [
					{
						userId: alice.id,
						teamId: 1,
						characterName: CharacterName.ADE,
						kills: 2,
						deaths: 2,
					},
					{
						userId: bob.id,
						teamId: 2,
						characterName: CharacterName.ADE,
						kills: 2,
						deaths: 1,
					},
				],
			},
		},
	});

	// Draw match: alice vs diana
	const match3 = await prisma.match.create({
		data: {
			mode: MatchMode.RANKED,
			type: MatchType.FFA,
			durationSeconds: 180,
			endReason: EndReason.TIMEOUT,
			winningTeamId: null,
			participants: {
				create: [
					{
						userId: alice.id,
						teamId: 1,
						characterName: CharacterName.ZEUS,
						kills: 2,
						deaths: 2,
					},
					{
						userId: diana.id,
						teamId: 2,
						characterName: CharacterName.ZEUS,
						kills: 2,
						deaths: 2,
					},
				],
			},
		},
	});

	// AI match: alice vs bot
	const match4 = await prisma.match.create({
		data: {
			mode: MatchMode.AI,
			type: MatchType.FFA,
			durationSeconds: 90,
			endReason: EndReason.KILLOUT,
			winningTeamId: 1,
			participants: {
				create: [
					{
						userId: alice.id,
						teamId: 1,
						characterName: CharacterName.ZEUS,
						kills: 3,
						deaths: 0,
					},
					{
						userId: null, // Bot
						teamId: 2,
						characterName: CharacterName.ADE,
						kills: 0,
						deaths: 3,
					},
				],
			},
		},
	});

	// Local match: diana vs guest
	const match5 = await prisma.match.create({
		data: {
			mode: MatchMode.LOCAL,
			type: MatchType.FFA,
			durationSeconds: 150,
			endReason: EndReason.KILLOUT,
			winningTeamId: 1,
			participants: {
				create: [
					{
						userId: diana.id,
						teamId: 1,
						characterName: CharacterName.ADE,
						kills: 3,
						deaths: 2,
					},
					{
						userId: null, // Guest
						teamId: 2,
						characterName: CharacterName.ZEUS,
						kills: 2,
						deaths: 3,
					},
				],
			},
		},
	});

	// Resignation match: bob resigns against diana
	const match6 = await prisma.match.create({
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
						deaths: 2,
					},
					{
						userId: diana.id,
						teamId: 2,
						characterName: CharacterName.ZEUS,
						kills: 2,
						deaths: 0,
					},
				],
			},
		},
	});

	console.log("  ✓ 6 matches (ranked, ai, local, draw, resignation)");

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
		],
	});
	console.log("  ✓ Friendships (accepted, pending, rejected)");

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
				status: InviteStatus.PENDING,
				expiresAt: oneHourFromNow,
			},
			{
				senderId: diana.id,
				receiverId: alice.id,
				status: InviteStatus.ACCEPTED,
				expiresAt: oneHourFromNow,
			},
			{
				senderId: bob.id,
				receiverId: diana.id,
				status: InviteStatus.EXPIRED,
				expiresAt: oneHourAgo,
			},
		],
	});
	console.log("  ✓ Game invites (pending, accepted, expired)");

	// ─── Achievements ─────────────────────────────────────────────

	const firstBlood = await prisma.achievement.findUniqueOrThrow({
		where: { name: "First Blood" },
	});
	const flawless = await prisma.achievement.findUniqueOrThrow({
		where: { name: "Flawless Victory" },
	});
	const killMachine = await prisma.achievement.findUniqueOrThrow({
		where: { name: "Kill Machine" },
	});

	await prisma.userAchievement.createMany({
		skipDuplicates: true,
		data: [
			// Alice: 3 achievements
			{ userId: alice.id, achievementId: firstBlood.id },
			{ userId: alice.id, achievementId: flawless.id },
			{ userId: alice.id, achievementId: killMachine.id },
			// Bob: 1 achievement
			{ userId: bob.id, achievementId: firstBlood.id },
			// Diana: 2 achievements
			{ userId: diana.id, achievementId: firstBlood.id },
			{ userId: diana.id, achievementId: flawless.id },
		],
	});
	console.log(
		"  ✓ Achievements unlocked (alice: 3, bob: 1, diana: 2, charlie: 0)",
	);

	// ─── Notifications ────────────────────────────────────────────

	await prisma.notification.createMany({
		data: [
			// Alice: mix of read and unread
			{
				userId: alice.id,
				type: NotificationType.FRIEND_REQ,
				message: "charlie sent you a friend request.",
				isRead: false,
			},
			{
				userId: alice.id,
				type: NotificationType.ACHV_UNLOCKED,
				message:
					'Congratulations! You\'ve earned the "Kill Machine" achievement.',
				isRead: false,
			},
			{
				userId: alice.id,
				type: NotificationType.GAME_INVITE,
				message: "diana invited you to play a match.",
				isRead: true,
			},
			// Bob: unread notifications
			{
				userId: bob.id,
				type: NotificationType.FRIEND_ACCEPTED,
				message: "alice accepted your friend request.",
				isRead: true,
			},
			{
				userId: bob.id,
				type: NotificationType.GAME_INVITE,
				message: "alice invited you to play a match.",
				isRead: false,
			},
			// Diana: all read
			{
				userId: diana.id,
				type: NotificationType.FRIEND_ACCEPTED,
				message: "alice accepted your friend request.",
				isRead: true,
			},
		],
	});
	console.log("  ✓ Notifications (read and unread)");

	console.log("Test data seeding complete!");
}
