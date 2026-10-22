import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function throwBadRequest(message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = 400;
  throw error;
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  const body = (input ?? {}) as {
    userId?: string;
    teamId?: string;
    type?: string;
    minutes?: number;
  };

  if (!body.userId || !body.teamId || !body.type || body.minutes === undefined || Number.isNaN(Number(body.minutes))) {
    throwBadRequest('Activity requires userId, teamId, type, and minutes.');
  }

  if (!mongoose.Types.ObjectId.isValid(body.userId) || !mongoose.Types.ObjectId.isValid(body.teamId)) {
    throwBadRequest('User and team IDs must be valid Mongo ObjectIds.');
  }

  const [userExists, teamExists] = await Promise.all([
    User.exists({ _id: body.userId }),
    Team.exists({ _id: body.teamId }),
  ]);

  if (!userExists || !teamExists) {
    throwBadRequest('Activity references must match an existing user and team.');
  }

  const minutes = Number(body.minutes);
  const created = await Activity.create({
    user: body.userId,
    team: body.teamId,
    type: body.type,
    minutes,
    points: Math.max(1, minutes),
    occurredAt: new Date(),
  });

  return created.toObject();
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const body = (input ?? {}) as { name?: string; mascot?: string; members?: string[] };

  if (!body.name) {
    throwBadRequest('Team name is required.');
  }

  const created = await Team.create({
    name: body.name,
    mascot: body.mascot,
    members: Array.isArray(body.members) ? body.members : [],
  });

  return created.toObject();
}

export async function getLeaderboard() {
  const rows = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
    {
      $lookup: {
        from: 'teams',
        localField: '_id',
        foreignField: '_id',
        as: 'team',
      },
    },
    { $unwind: '$team' },
  ]);

  return rows.map((row, index) => ({
    teamName: row.team.name,
    totalPoints: row.totalPoints,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    const error = new Error('Unknown user email.');
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  const recentActivities = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean();
  const activityFocuses = recentActivities
    .map((activity) => activity.type?.toLowerCase() ?? '')
    .filter(Boolean);

  const preferredFocuses = [
    ...(user.fitnessGoal ? [String(user.fitnessGoal).toLowerCase()] : []),
    ...activityFocuses,
  ];

  const workoutCandidates = await Workout.find({
    focus: { $in: preferredFocuses.map((focus) => focus) },
  }).lean();

  const fallback = workoutCandidates.length > 0 ? workoutCandidates : await Workout.find().lean();
  const chosen = fallback[0];

  if (!chosen) {
    return [];
  }

  const focus = chosen.focus;
  const matchReason = preferredFocuses.includes(focus)
    ? `Matches your ${focus} goal and recent activity pattern.`
    : `Builds on your recent activity and ${focus} training focus.`;

  return [{
    ...chosen,
    reason: matchReason,
  }];
}

export { User };
