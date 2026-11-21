import http from "http";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app.js";
import LearningProfile from "../models/LearningProfile.js";
import StudyActivity from "../models/StudyActivity.js";
import StudyPlan from "../models/StudyPlan.js";
import Flashcard from "../models/Flashcard.js";
import Exam from "../models/Exam.js";
import Quiz from "../models/Quiz.js";
import Document from "../models/Document.js";
import TextChunk from "../models/TextChunk.js";

// Helper to perform HTTP requests
const request = (method, urlPath, headers = {}, body = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "127.0.0.1",
      port: 5003,
      path: urlPath,
      method,
      headers: {
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on("error", reject);

    if (body) {
      if (typeof body === "string" || Buffer.isBuffer(body)) {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
};

async function runPhase4Tests() {
  console.log("\n=======================================================");
  console.log("   STUDYMATE AI — PHASE 4 PERSONALIZED INTELLIGENCE SUITE");
  console.log("=======================================================\n");

  let mongod;
  let testServer;

  try {
    // 1. Initialize In-Memory MongoDB Engine
    console.log("[1/10] Starting In-Memory MongoDB Engine for isolated Phase 4 test...");
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);
    console.log(`✓ MongoDB connection established: ${uri}\n`);

    testServer = app.listen(5003);
    await new Promise((r) => setTimeout(r, 200));

    // 2. Register Students for tenancy testing
    console.log("[2/10] Registering Student A and Student B (Multi-tenant isolation)...");
    const regResA = await request(
      "POST",
      "/api/auth/register",
      { "Content-Type": "application/json" },
      {
        name: "Alice Intelligence",
        email: "alice@intelligence.ai",
        password: "password123",
      }
    );
    const tokenA = regResA.body.data.token;
    const userIdA = regResA.body.data.user.userId;

    const regResB = await request(
      "POST",
      "/api/auth/register",
      { "Content-Type": "application/json" },
      {
        name: "Bob Isolation",
        email: "bob@intelligence.ai",
        password: "password123",
      }
    );
    const tokenB = regResB.body.data.token;
    const userIdB = regResB.body.data.user.userId;
    console.log("✓ Both students registered with isolated authentication tokens.\n");

    // 3. LearningProfile CRUD & Tenancy
    console.log("[3/10] Testing Student Learning Profile (GET /api/profile & PUT /api/profile)...");
    const getProfileA1 = await request("GET", "/api/profile", {
      Authorization: `Bearer ${tokenA}`,
    });
    if (getProfileA1.status !== 200 || !getProfileA1.body.success) {
      throw new Error("Failed to get initial default profile for Student A");
    }
    console.log("✓ Initial default LearningProfile auto-provisioned.");

    const updateProfileA = await request(
      "PUT",
      "/api/profile",
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      {
        studyGoals: "Score > 90% on Algorithms and Distributed Systems",
        dailyStudyTarget: 60,
        preferredStudyTime: "evening",
        currentSubjects: ["Algorithms", "Distributed Systems"],
        learningPreferences: {
          aiTone: "balanced",
          aiDifficulty: "college",
        },
      }
    );
    if (updateProfileA.status !== 200 || updateProfileA.body.data.dailyStudyTarget !== 60) {
      throw new Error("Failed to update profile for Student A");
    }
    console.log("✓ Profile successfully updated for Student A.");

    // Tenancy check: Student B should have independent profile
    const getProfileB = await request("GET", "/api/profile", {
      Authorization: `Bearer ${tokenB}`,
    });
    const bGoals = getProfileB.body.data.studyGoals || [];
    if (bGoals.includes("Score > 90% on Algorithms and Distributed Systems")) {
      throw new Error("Tenancy breach: Student B saw Student A's profile!");
    }
    console.log("✓ Tenancy isolation verified: Student B has independent profile.\n");

    // 4. Study Activity Logging & Retrieval
    console.log("[4/10] Testing Study Activity Tracking (POST /api/analytics/log & GET /api/analytics/activities)...");
    const logRes = await request(
      "POST",
      "/api/analytics/log",
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      {
        activityType: "flashcard_review",
        topic: "Graph Traversal",
        duration: 15,
        metadata: { score: "easy" },
      }
    );
    if (logRes.status !== 201 && logRes.status !== 200) {
      throw new Error("Failed to log study activity");
    }

    const activitiesA = await request("GET", "/api/analytics/activities", {
      Authorization: `Bearer ${tokenA}`,
    });
    if (
      activitiesA.status !== 200 ||
      activitiesA.body.data.length === 0 ||
      activitiesA.body.data[0].topic !== "Graph Traversal"
    ) {
      throw new Error("Failed to retrieve logged study activities for Student A");
    }

    // Tenancy check: Student B should see 0 activities
    const activitiesB = await request("GET", "/api/analytics/activities", {
      Authorization: `Bearer ${tokenB}`,
    });
    if (activitiesB.body.data.length !== 0) {
      throw new Error("Tenancy breach: Student B saw Student A's activity log!");
    }
    console.log("✓ Study activity logging and tenancy verified.\n");

    // 5. Quiz Performance Analysis & Weak/Strong Topics Identification
    console.log("[5/10] Testing Quiz Performance & Weak/Strong Topics Analysis...");
    // Seed real quiz results for Student A:
    // Quiz 1: High accuracy (100%) on "Binary Trees" -> Strong topic
    await Quiz.create({
      quizId: "quiz-strong-1",
      userId: userIdA,
      title: "Binary Trees Practice",
      subject: "Binary Trees",
      difficulty: "medium",
      score: 5,
      totalQuestions: 5,
      percentage: 100,
      isSubmitted: true,
      completedAt: new Date(),
      questions: [
        {
          questionIndex: 0,
          question: "What is the max children of a binary tree node?",
          options: ["1", "2", "3", "Unlimited"],
          correctAnswer: 1,
          selectedAnswer: 1,
          isCorrect: true,
          explanation: "At most 2 children.",
        },
      ],
    });

    // Quiz 2: Low accuracy (20%) on "Dynamic Programming" -> Weak topic (<60%)
    await Quiz.create({
      quizId: "quiz-weak-1",
      userId: userIdA,
      title: "Dynamic Programming Drill",
      subject: "Dynamic Programming",
      difficulty: "hard",
      score: 1,
      totalQuestions: 5,
      percentage: 20,
      isSubmitted: true,
      completedAt: new Date(),
      questions: [
        {
          questionIndex: 0,
          question: "What is memoization?",
          options: ["Cache results", "Delete memory", "Garbage collection", "Threading"],
          correctAnswer: 0,
          selectedAnswer: 1,
          isCorrect: false,
          explanation: "Caching subproblems.",
        },
      ],
    });

    // Fetch analytics
    const analyticsRes = await request("GET", "/api/analytics", {
      Authorization: `Bearer ${tokenA}`,
    });
    if (analyticsRes.status !== 200 || !analyticsRes.body.success) {
      throw new Error("Failed to fetch analytics for Student A");
    }

    const { performance, stats } = analyticsRes.body.data;
    console.log(`- Total Quizzes: ${performance.totalQuizzes}`);
    console.log(`- Average Score: ${performance.averageScore}%`);
    console.log(`- Weak Topics: ${JSON.stringify(performance.weakTopics)}`);
    console.log(`- Strong Topics: ${JSON.stringify(performance.strongTopics)}`);

    if (!performance.weakTopics.includes("Dynamic Programming")) {
      throw new Error("Expected 'Dynamic Programming' to be identified as weak topic (<60%)");
    }
    if (!performance.strongTopics.includes("Binary Trees")) {
      throw new Error("Expected 'Binary Trees' to be identified as strong topic (>=80%)");
    }
    console.log("✓ Weak (<60%) and Strong (>=80%) topics correctly detected.\n");

    // 6. Recommendations API
    console.log("[6/10] Testing Recommendations API (GET /api/analytics/recommendations)...");
    const recRes = await request("GET", "/api/analytics/recommendations", {
      Authorization: `Bearer ${tokenA}`,
    });
    if (recRes.status !== 200 || !recRes.body.success) {
      throw new Error("Failed to fetch recommendations");
    }
    const recData = recRes.body.data;
    if (!recData.weakTopics.includes("Dynamic Programming")) {
      throw new Error("Recommendations must prioritize weak topics");
    }
    if (!recData.advisorSummary) {
      throw new Error("Recommendations must provide advisorSummary");
    }
    console.log(`✓ AI Advisor Summary: "${recData.advisorSummary}"`);
    console.log("✓ Revision recommendations successfully generated.\n");

    // 7. Study Plan Generation, Retrieval, and Task Completion
    console.log("[7/10] Testing Study Plans (POST /api/study-plans/generate & PATCH tasks)...");
    const planRes = await request(
      "POST",
      "/api/study-plans/generate",
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      {
        durationDays: 7,
        focusTopics: ["Dynamic Programming"],
      }
    );
    if (planRes.status !== 201 && planRes.status !== 200) {
      throw new Error("Failed to generate study plan: " + JSON.stringify(planRes.body));
    }
    const generatedPlan = planRes.body.data;
    const planId = generatedPlan._id || generatedPlan.planId;
    const taskId = generatedPlan.tasks[0].taskId;

    console.log(`✓ 7-day study plan generated with ${generatedPlan.tasks.length} structured tasks.`);

    // Toggle task completion
    const toggleRes = await request(
      "PATCH",
      `/api/study-plans/${planId}/tasks/${taskId}`,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      { completed: true }
    );
    if (toggleRes.status !== 200) {
      throw new Error("Failed to toggle study plan task completion");
    }
    const updatedTask = toggleRes.body.data.tasks.find((t) => t.taskId === taskId);
    if (!updatedTask.completed) {
      throw new Error("Task was not marked as completed");
    }
    console.log("✓ Task completion toggle verified.");

    // Tenancy check on study plans: Student B cannot see Student A's plan
    const plansB = await request("GET", "/api/study-plans", {
      Authorization: `Bearer ${tokenB}`,
    });
    if (plansB.body.data.length !== 0) {
      throw new Error("Tenancy breach: Student B saw Student A's study plan!");
    }
    console.log("✓ Study plan multi-tenant isolation verified.\n");

    // 8. Flashcards & Spaced Repetition Logic
    console.log("[8/10] Testing Flashcards & Spaced Repetition System...");
    const createCardRes = await request(
      "POST",
      "/api/flashcards",
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      {
        topic: "Dynamic Programming",
        question: "What is optimal substructure?",
        answer: "An optimal solution to the problem contains optimal solutions to subproblems.",
        difficulty: "medium",
      }
    );
    if (createCardRes.status !== 201 && createCardRes.status !== 200) {
      throw new Error("Failed to create flashcard: " + JSON.stringify(createCardRes.body));
    }
    const cardId = createCardRes.body.data._id || createCardRes.body.data.flashcardId;

    // Review flashcard with "easy" rating
    const reviewEasy = await request(
      "POST",
      `/api/flashcards/${cardId}/review`,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      { quality: "easy" }
    );
    if (reviewEasy.status !== 200) {
      throw new Error("Failed to record flashcard review");
    }
    const reviewedCard = reviewEasy.body.data;
    if (reviewedCard.reviewCount !== 1) {
      throw new Error("Review count should have incremented to 1");
    }
    const nextReview = new Date(reviewedCard.nextReview);
    const now = new Date();
    if (nextReview <= now) {
      throw new Error("Next review date for 'easy' must be in the future");
    }
    console.log(`✓ Spaced repetition calculated next review: ${nextReview.toISOString()} (Interval expanded).`);

    // Tenancy check: Student B cannot see Student A's flashcard
    const cardsB = await request("GET", "/api/flashcards", {
      Authorization: `Bearer ${tokenB}`,
    });
    if (cardsB.body.data.length !== 0) {
      throw new Error("Tenancy breach: Student B saw Student A's flashcard!");
    }
    console.log("✓ Flashcard tenancy isolation verified.\n");

    // 9. Timed Exam Assessment Generation & Submission
    console.log("[9/10] Testing Timed Exam Assessment (POST /api/exams/generate & submit)...");
    const examGenRes = await request(
      "POST",
      "/api/exams/generate",
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      {
        subject: "Algorithms Midterm Exam",
        difficulty: "medium",
        timeLimit: 15,
        count: 3,
      }
    );
    if (examGenRes.status !== 201 && examGenRes.status !== 200) {
      throw new Error("Failed to generate timed exam: " + JSON.stringify(examGenRes.body));
    }
    const examData = examGenRes.body.data;
    const examId = examData._id || examData.examId;
    console.log(`✓ Timed exam generated with ${examData.questions.length} questions, time limit: ${examData.timeLimit} mins.`);

    // Submit exam answers
    const submitExamRes = await request(
      "POST",
      `/api/exams/${examId}/submit`,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      {
        answers: [
          { questionIndex: 0, selectedOption: 0 },
          { questionIndex: 1, selectedOption: 99 }, // Intentional incorrect option to trigger weak areas
          { questionIndex: 2, selectedOption: 0 },
        ],
      }
    );
    if (submitExamRes.status !== 200) {
      throw new Error("Failed to submit exam: " + JSON.stringify(submitExamRes.body));
    }
    const examResult = submitExamRes.body.data;
    console.log(`✓ Exam graded: Score ${examResult.score}/${examResult.totalQuestions} (${examResult.percentage}%)`);
    if (examResult.weakAreas && examResult.weakAreas.length > 0) {
      console.log(`✓ Weak areas detected from exam: ${JSON.stringify(examResult.weakAreas)}`);
    }

    // Tenancy check: Student B cannot submit Student A's exam
    const unauthorizedSubmit = await request(
      "POST",
      `/api/exams/${examId}/submit`,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`,
      },
      { answers: [] }
    );
    if (unauthorizedSubmit.status !== 404 && unauthorizedSubmit.status !== 403) {
      throw new Error("Tenancy breach: Student B accessed Student A's exam!");
    }
    console.log("✓ Exam tenancy isolation verified.\n");

    // 10. Summary & Completion
    console.log("[10/10] All Phase 4 Personalized Intelligence features verified!");
    console.log("=======================================================");
    console.log("   PHASE 4 VERIFICATION: ALL 10 TEST SUITES PASSED!   ");
    console.log("=======================================================\n");

    return true;
  } catch (err) {
    console.error("\n❌ PHASE 4 VERIFICATION FAILED:", err);
    return false;
  } finally {
    if (testServer) {
      await new Promise((r) => testServer.close(r));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
    }
  }
}

// Execute test suite
runPhase4Tests().then((success) => {
  process.exit(success ? 0 : 1);
});
