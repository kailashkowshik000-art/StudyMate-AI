import { GoogleGenerativeAI } from "@google/generative-ai";
import Document from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import LearningProfile from "../models/LearningProfile.js";
import { calculateStudyStats } from "./learningAnalyticsService.js";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

/**
 * Generate personalized study recommendations based strictly on actual user data
 */
export async function generateRecommendations(userId) {
  if (!userId) throw new Error("userId required for recommendations");

  console.log(`[RECOMMENDATIONS] Generating recommendations for user: ${userId}`);

  const [stats, profile, documents, dueFlashcards] = await Promise.all([
    calculateStudyStats(userId),
    LearningProfile.findOne({ userId }).lean(),
    Document.find({ userId }).select("documentId fileName subject status").lean(),
    Flashcard.countDocuments({
      userId,
      nextReview: { $lte: new Date() },
    }),
  ]);

  const hasActivity = stats.totalQuizzes > 0 || documents.length > 0;

  // Case 1: Insufficient data (< 1 quiz and 0 docs)
  if (!hasActivity) {
    return {
      hasEnoughData: false,
      summary: "Not enough study data yet.",
      overviewMessage:
        "Upload course documents or take a diagnostic quiz so StudyMate AI can analyze your learning patterns.",
      recommendations: [
        {
          id: "rec_upload_1",
          type: "action",
          priority: "high",
          title: "Upload Your Course Material",
          description:
            "Upload your first PDF lecture notes or textbook chapters in My Documents to enable AI chat, summaries, and quizzes.",
          actionText: "Upload PDF",
          link: "/documents",
        },
        {
          id: "rec_quiz_1",
          type: "quiz",
          priority: "medium",
          title: "Take a Diagnostic Quiz",
          description:
            "Complete a quick 5-question test to establish your baseline strengths and weak areas.",
          actionText: "Start Quiz",
          link: "/quiz",
        },
      ],
      weakTopics: [],
      dueFlashcardsCount: 0,
    };
  }

  // Case 2: User has real data — build targeted recommendations
  const recommendations = [];

  // 1. Weak topics revisions (Priority 1)
  if (stats.weakTopics && stats.weakTopics.length > 0) {
    stats.weakTopics.forEach((wt, idx) => {
      recommendations.push({
        id: `rec_weak_${idx}`,
        type: "revision",
        priority: "urgent",
        topic: wt.topic,
        title: `Priority Revision: ${wt.topic}`,
        description: `Your quiz accuracy on ${wt.topic} is currently ${wt.averageScore}%. Review the core concepts and retry practice problems.`,
        actionSteps: [
          `1. Re-read the ${wt.topic} sections in your uploaded documents.`,
          `2. Ask StudyMate AI: "Explain ${wt.topic} in step-by-step detail with an example."`,
          `3. Take a 5-question targeted quiz on ${wt.topic}.`,
          `4. Review your incorrect answers and explanations.`,
        ],
        actionText: `Revise ${wt.topic}`,
        link: `/chat?q=Explain+${encodeURIComponent(wt.topic)}+step-by-step`,
      });
    });
  }

  // 2. Flashcards due for spaced repetition review
  if (dueFlashcards > 0) {
    recommendations.push({
      id: "rec_flashcards_due",
      type: "flashcards",
      priority: "high",
      title: `${dueFlashcards} Flashcard${dueFlashcards === 1 ? "" : "s"} Due for Review`,
      description:
        "Spaced repetition intervals are ready. Complete today's flashcard deck to solidify long-term memory retention.",
      actionText: "Review Flashcards",
      link: "/flashcards",
    });
  }

  // 3. Document summaries / quizzes
  const readyDocs = documents.filter((d) => d.status === "Ready" || d.status === "ready");
  if (readyDocs.length > 0 && stats.totalQuizzes < 3) {
    const firstDoc = readyDocs[0];
    recommendations.push({
      id: "rec_quiz_doc",
      type: "quiz",
      priority: "medium",
      title: `Take Quiz for ${firstDoc.fileName.replace(/\.pdf$/i, "")}`,
      description:
        "Reinforce retention by taking an adaptive practice quiz generated from your uploaded document.",
      actionText: "Start Practice Quiz",
      link: `/quiz?doc=${firstDoc.documentId}`,
    });
  }

  // 4. Study streak encouragement
  if (stats.streakDays > 0) {
    recommendations.push({
      id: "rec_streak",
      type: "habit",
      priority: "low",
      title: `Keep up your ${stats.currentStreak} Streak!`,
      description: `You've studied ${stats.totalStudyTime} so far. Reach today's target of ${
        profile?.dailyStudyTarget || 60
      } minutes.`,
      actionText: "View Study Plan",
      link: "/dashboard",
    });
  }

  // AI Advisor synthesis (Gemini or grounded fallback)
  let advisorSummary = "";
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim() && apiKey !== "your_gemini_api_key_here") {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const prompt = `You are StudyMate AI, an academic study coach.
Write a concise, 2-sentence encouraging study guidance statement based ONLY on these real student stats:
- Current Streak: ${stats.currentStreak}
- Average Quiz Score: ${stats.quizAverage} (${stats.totalQuizzes} quizzes taken)
- Weak Topics identified: ${stats.weakTopics.map((w) => `${w.topic} (${w.averageScore}%)`).join(", ") || "None"}
- Documents studied: ${stats.documentsStudied}
- Flashcards due: ${dueFlashcards}

Do NOT invent fake scores or metrics. Be motivating, specific, and direct.`;

      const res = await model.generateContent(prompt);
      advisorSummary = res.response.text().trim();
    } catch (err) {
      console.warn(`[RECOMMENDATIONS] Gemini advisor summary fallback: ${err.message}`);
    }
  }

  if (!advisorSummary) {
    const firstWeak = stats.weakTopics && stats.weakTopics.length > 0
      ? (typeof stats.weakTopics[0] === "string" ? stats.weakTopics[0] : stats.weakTopics[0].topic)
      : null;

    if (firstWeak) {
      advisorSummary = `Your recent performance shows that ${firstWeak} needs dedicated revision. Review the source material and take a targeted practice quiz today.`;
    } else {
      advisorSummary = `Great consistency! Your average quiz score is ${stats.quizAverage} across ${stats.totalQuizzes} quizzes. Continue your ${stats.currentStreak} streak with today's scheduled tasks.`;
    }
  }

  const weakTopicStrings = (stats.weakTopics || []).map((w) =>
    typeof w === "string" ? w : w.topic
  );

  return {
    hasEnoughData: true,
    summary: advisorSummary,
    advisorSummary,
    recommendations,
    weakTopics: weakTopicStrings,
    strongTopics: stats.strongTopics || [],
    dueFlashcardsCount: dueFlashcards,
    stats: {
      averageScore: stats.quizAverage,
      streak: stats.currentStreak,
      totalStudyTime: stats.totalStudyTime,
    },
  };
}

export default {
  generateRecommendations,
};
