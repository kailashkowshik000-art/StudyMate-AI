import Quiz from "../models/Quiz.js";
import Document from "../models/Document.js";
import StudyActivity from "../models/StudyActivity.js";
import LearningProfile from "../models/LearningProfile.js";
import Message from "../models/Message.js";
import ChatSession from "../models/ChatSession.js";

// Configurable performance thresholds
export const THRESHOLD_STRONG =
  parseInt(process.env.SCORE_THRESHOLD_STRONG, 10) || 80;
export const THRESHOLD_MODERATE =
  parseInt(process.env.SCORE_THRESHOLD_MODERATE, 10) || 60;

/**
 * Record a student learning action into StudyActivity
 */
export async function recordActivity({
  userId,
  documentId = null,
  activityType,
  topic = "General Studies",
  duration = 5,
  metadata = {},
}) {
  if (!userId || !activityType) return null;

  try {
    const activity = await StudyActivity.create({
      userId,
      documentId,
      activityType,
      topic,
      duration: Math.max(1, Math.round(duration)),
      metadata,
    });
    return activity;
  } catch (err) {
    console.warn(`[ACTIVITY] Failed to record activity: ${err.message}`);
    return null;
  }
}

/**
 * Calculate detailed user quiz performance metrics
 */
export async function calculateUserPerformance(userId) {
  if (!userId) throw new Error("userId required for performance calculation");

  const quizzes = await Quiz.find({ userId, isSubmitted: true })
    .sort({ createdAt: -1 })
    .lean();

  if (!quizzes || quizzes.length === 0) {
    return {
      totalQuizzes: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      totalQuestionsAnswered: 0,
      totalCorrect: 0,
      topicPerformance: {},
      frequentlyMissedConcepts: [],
    };
  }

  let totalQuestionsAnswered = 0;
  let totalCorrect = 0;
  let highestScore = 0;
  let lowestScore = 100;
  const topicStats = {};
  const missedConceptsMap = {};

  for (const q of quizzes) {
    const total = q.totalQuestions || q.questions?.length || 1;
    const score = q.score || 0;
    const pct = Math.round((score / total) * 100);

    totalQuestionsAnswered += total;
    totalCorrect += score;
    if (pct > highestScore) highestScore = pct;
    if (pct < lowestScore) lowestScore = pct;

    // Normalize topic name from subject or title
    const rawTopic = q.subject && q.subject !== "General Studies"
      ? q.subject
      : (q.title
        ? q.title.replace(/\s+(Quiz|Drill|Practice|Assessment|Test|Exam).*$/i, "").replace(/\.pdf$/i, "").trim()
        : "General Studies");
    const topic = rawTopic || "General Studies";

    if (!topicStats[topic]) {
      topicStats[topic] = { total: 0, correct: 0, attempts: 0 };
    }
    topicStats[topic].total += total;
    topicStats[topic].correct += score;
    topicStats[topic].attempts += 1;

    // Track missed questions / concepts
    if (Array.isArray(q.questions)) {
      q.questions.forEach((questionItem) => {
        if (
          questionItem.selectedAnswer !== null &&
          questionItem.selectedAnswer !== questionItem.correctAnswer
        ) {
          const conceptSnippet = questionItem.question.slice(0, 60);
          missedConceptsMap[conceptSnippet] =
            (missedConceptsMap[conceptSnippet] || 0) + 1;
        }
      });
    }
  }

  const averageScore = Math.round((totalCorrect / totalQuestionsAnswered) * 100);

  // Format topic percentages
  const topicPerformance = {};
  for (const [topic, data] of Object.entries(topicStats)) {
    topicPerformance[topic] = {
      percentage: Math.round((data.correct / data.total) * 100),
      totalQuestions: data.total,
      quizzesTaken: data.attempts,
    };
  }

  // Top frequently missed concepts
  const frequentlyMissedConcepts = Object.entries(missedConceptsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([concept, count]) => ({ concept, occurrences: count }));

  return {
    totalQuizzes: quizzes.length,
    averageScore,
    highestScore,
    lowestScore: quizzes.length > 0 ? lowestScore : 0,
    totalQuestionsAnswered,
    totalCorrect,
    topicPerformance,
    frequentlyMissedConcepts,
  };
}

/**
 * Identify weak topics (< 60% accuracy)
 */
export async function identifyWeakTopics(
  userId,
  moderateThreshold = THRESHOLD_MODERATE
) {
  const perf = await calculateUserPerformance(userId);
  const weak = [];

  for (const [topic, stats] of Object.entries(perf.topicPerformance)) {
    if (stats.percentage < moderateThreshold) {
      weak.push({
        topic,
        averageScore: stats.percentage,
        quizzesTaken: stats.quizzesTaken,
      });
    }
  }

  // Also check if any recent quiz had low score
  return weak;
}

/**
 * Identify strong topics (>= 80% accuracy)
 */
export async function identifyStrongTopics(
  userId,
  strongThreshold = THRESHOLD_STRONG
) {
  const perf = await calculateUserPerformance(userId);
  const strong = [];

  for (const [topic, stats] of Object.entries(perf.topicPerformance)) {
    if (stats.percentage >= strongThreshold) {
      strong.push(topic);
    }
  }

  return strong;
}

/**
 * Calculate overall learning and study statistics
 */
export async function calculateStudyStats(userId) {
  if (!userId) throw new Error("userId required for study stats");

  const [activities, documents, chatSessions, perf] = await Promise.all([
    StudyActivity.find({ userId }).sort({ createdAt: -1 }).lean(),
    Document.find({ userId }).lean(),
    ChatSession.find({ userId }).select("sessionId").lean(),
    calculateUserPerformance(userId),
  ]);

  // Questions asked count
  const sessionIds = chatSessions.map((s) => s.sessionId);
  const questionsAsked =
    sessionIds.length > 0
      ? await Message.countDocuments({
          sessionId: { $in: sessionIds },
          role: "user",
        })
      : 0;

  // Total study duration in minutes
  const totalStudyMinutes = activities.reduce(
    (sum, act) => sum + (act.duration || 0),
    0
  );

  // Weekly study time (last 7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weeklyActivities = activities.filter(
    (act) => new Date(act.createdAt) >= oneWeekAgo
  );
  const weeklyStudyMinutes = weeklyActivities.reduce(
    (sum, act) => sum + (act.duration || 0),
    0
  );

  // Current Streak Calculation (consecutive days with activity)
  const uniqueDates = [
    ...new Set(
      activities.map((a) =>
        new Date(a.createdAt).toISOString().split("T")[0]
      )
    ),
  ].sort((a, b) => b.localeCompare(a));

  let streak = 0;
  if (uniqueDates.length > 0) {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    let checkDate = uniqueDates[0] === today ? today : yesterday;
    let expected = new Date(checkDate);

    for (const d of uniqueDates) {
      const expStr = expected.toISOString().split("T")[0];
      if (d === expStr) {
        streak++;
        expected.setDate(expected.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Identify weak & strong topics
  const weakTopics = await identifyWeakTopics(userId);
  const strongTopics = await identifyStrongTopics(userId);

  // Sync to user's LearningProfile
  try {
    await LearningProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          weakTopics: weakTopics.map((w) => ({
            topic: w.topic,
            averageScore: w.averageScore,
            lastAttemptDate: new Date(),
          })),
          strongTopics,
        },
      },
      { upsert: true, new: true }
    );
  } catch (syncErr) {
    console.warn(`[ANALYTICS] Profile sync note: ${syncErr.message}`);
  }

  const weakTopicNames = weakTopics.map((w) => (typeof w === "string" ? w : w.topic));

  const performance = {
    ...perf,
    weakTopics: weakTopicNames,
    strongTopics,
  };

  const stats = {
    totalDocuments: documents.length,
    studyStreakDays: streak,
    totalStudyHours: parseFloat((totalStudyMinutes / 60).toFixed(1)),
    totalStudyMinutes,
    weeklyStudyMinutes,
    totalQuestionsAnswered: perf.totalQuestionsAnswered,
  };

  return {
    performance,
    stats,
    totalStudyTime: `${Math.round(totalStudyMinutes)} mins`,
    totalStudyMinutes,
    weeklyStudyTime: `${Math.round(weeklyStudyMinutes)} mins`,
    weeklyStudyMinutes,
    currentStreak: `${streak} Day${streak === 1 ? "" : "s"}`,
    streakDays: streak,
    quizAverage: `${perf.averageScore}%`,
    totalQuizzes: perf.totalQuizzes,
    documentsStudied: documents.length,
    questionsAsked,
    topicsMastered: strongTopics.length,
    strongTopics,
    weakTopics: weakTopicNames,
    frequentlyMissedConcepts: perf.frequentlyMissedConcepts,
    recentActivities: activities.slice(0, 10),
  };
}

export default {
  recordActivity,
  calculateUserPerformance,
  identifyWeakTopics,
  identifyStrongTopics,
  calculateStudyStats,
  THRESHOLD_STRONG,
  THRESHOLD_MODERATE,
};
