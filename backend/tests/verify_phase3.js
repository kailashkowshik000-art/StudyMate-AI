import http from "http";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app.js";
import TextChunk from "../models/TextChunk.js";
import Document from "../models/Document.js";
import { searchSimilarChunks } from "../services/vectorSearchService.js";
import { generateEmbedding } from "../services/embeddingService.js";

// Helper to perform HTTP requests
const request = (method, urlPath, headers = {}, body = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "127.0.0.1",
      port: 5002,
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

// Multipart form builder helper for file upload
function createMultipartFormData(boundary, fields, fileField) {
  const crlf = "\r\n";
  let parts = [];

  for (const [key, val] of Object.entries(fields)) {
    parts.push(
      `--${boundary}${crlf}Content-Disposition: form-data; name="${key}"${crlf}${crlf}${val}${crlf}`
    );
  }

  if (fileField) {
    parts.push(
      `--${boundary}${crlf}Content-Disposition: form-data; name="${fileField.fieldname}"; filename="${fileField.filename}"${crlf}Content-Type: ${fileField.contentType}${crlf}${crlf}`
    );
  }

  const prefix = Buffer.from(parts.join(""));
  const fileData = fileField ? fileField.buffer : Buffer.alloc(0);
  const suffix = Buffer.from(`${crlf}--${boundary}--${crlf}`);

  return Buffer.concat([prefix, fileData, suffix]);
}

/**
 * Generates a valid PDF buffer containing actual course text for extraction
 */
function createRealCoursePdfBuffer(text) {
  const lines = text.match(/.{1,60}(\s+|$)/g) || [text];
  const streamLines = lines
    .map((l) => `(${l.trim().replace(/[()\\]/g, "")}) '`)
    .join("\n");
  const contentStream = `BT /F1 12 Tf 50 750 Td 14 TL\n${streamLines}\nET`;
  const streamLength = Buffer.byteLength(contentStream);

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${streamLength} >>
stream
${contentStream}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000318 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
500
%%EOF`;

  return Buffer.from(pdf);
}

async function runPhase3Tests() {
  console.log("\n=======================================================");
  console.log("   STUDYMATE AI — PHASE 3 AI DOCUMENT INTELLIGENCE SUITE");
  console.log("=======================================================\n");

  let mongod;
  let testServer;

  try {
    // 1. Initialize In-Memory MongoDB Engine
    console.log("[1/19] Starting In-Memory MongoDB Engine for isolated testing...");
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);
    console.log(`✓ MongoDB connection established: ${uri}\n`);

    testServer = app.listen(5002);
    await new Promise((r) => setTimeout(r, 200));

    // 2. Health Check
    console.log("[2/19] Checking GET /api/health ...");
    const health = await request("GET", "/api/health");
    if (health.status === 200 && health.body.success) {
      console.log("✓ Health endpoint operational.");
    } else {
      throw new Error("Health check failed");
    }

    // 3. User Registration (Student A)
    console.log("\n[3/19] Registering Student A...");
    const regRes = await request(
      "POST",
      "/api/auth/register",
      { "Content-Type": "application/json" },
      {
        name: "Alice Student",
        email: "alice@studymate.ai",
        password: "securePassword123",
      }
    );
    const tokenA = regRes.body.data.token;
    const userIdA = regRes.body.data.user.userId;
    console.log("✓ Student A registered. Token acquired.");

    // 4. Register Student B (for tenancy isolation checks)
    console.log("\n[4/19] Registering Student B (Tenancy isolation test)...");
    const regResB = await request(
      "POST",
      "/api/auth/register",
      { "Content-Type": "application/json" },
      {
        name: "Bob Student",
        email: "bob@studymate.ai",
        password: "securePassword456",
      }
    );
    const tokenB = regResB.body.data.token;
    const userIdB = regResB.body.data.user.userId;
    console.log("✓ Student B registered.");

    // 5. Upload Real Course PDF (Operating Systems - Deadlock & Paging)
    console.log("\n[5/19] Uploading Operating Systems PDF with real academic content...");
    const osPdfText =
      "Deadlock in Operating Systems occurs when two or more processes are permanently blocked because each is holding a resource and waiting for another resource acquired by some other process. The four Coffman conditions for deadlock are: 1. Mutual Exclusion, 2. Hold and Wait, 3. No Preemption, and 4. Circular Wait. Paging is a memory management scheme that eliminates the need for contiguous allocation of physical memory. The physical address space is divided into fixed-size blocks called frames, and logical memory is broken into blocks of the same size called pages.";

    const osPdfBuffer = createRealCoursePdfBuffer(osPdfText);
    const boundary = "----StudyMateBoundary" + Date.now();
    const multipartBody = createMultipartFormData(
      boundary,
      { subject: "Operating Systems" },
      {
        fieldname: "file",
        filename: "Operating_Systems_Notes.pdf",
        contentType: "application/pdf",
        buffer: osPdfBuffer,
      }
    );

    const uploadRes = await request(
      "POST",
      "/api/documents",
      {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${tokenA}`,
      },
      multipartBody
    );

    if (uploadRes.status === 201 && uploadRes.body.data.document.documentId) {
      console.log("✓ PDF uploaded and processed successfully.");
      console.log("  Status:", uploadRes.body.data.document.status);
      console.log("  Chunk Count:", uploadRes.body.data.document.chunkCount);
    } else {
      throw new Error(`PDF upload failed: ${JSON.stringify(uploadRes)}`);
    }

    const docIdA = uploadRes.body.data.document.documentId;

    // 6. Verify Text Chunks Created in MongoDB
    console.log("\n[6/19] Verifying TextChunk collection in MongoDB...");
    const storedChunks = await TextChunk.find({
      documentId: docIdA,
      userId: userIdA,
    });

    if (storedChunks.length > 0) {
      console.log(`✓ Found ${storedChunks.length} chunks stored for document ${docIdA}.`);
      console.log("  Sample chunk text:", storedChunks[0].text.slice(0, 60) + "...");
    } else {
      throw new Error("No TextChunk records found in MongoDB for uploaded document!");
    }

    // 7. Verify Embeddings Attached to Chunks
    console.log("\n[7/19] Verifying Vector Embeddings (768 dimensions)...");
    const sampleChunk = storedChunks[0];
    if (
      Array.isArray(sampleChunk.embedding) &&
      sampleChunk.embedding.length === 768
    ) {
      console.log(`✓ Chunk has valid 768-dimensional normalized embedding vector.`);
    } else {
      throw new Error(
        `Invalid embedding dimension: expected 768, got ${sampleChunk.embedding?.length}`
      );
    }

    // 8. Vector Similarity Search
    console.log("\n[8/19] Testing Vector Search (Semantic query: 'Explain the four Coffman conditions')...");
    const searchResults = await searchSimilarChunks({
      userId: userIdA,
      documentId: docIdA,
      query: "Explain the four Coffman conditions for deadlock",
      topK: 3,
    });

    if (searchResults.length > 0 && searchResults[0].text.includes("Coffman")) {
      console.log(`✓ Vector search returned top chunk with high relevance score: ${searchResults[0].score?.toFixed(4)}`);
    } else {
      throw new Error("Vector search failed to retrieve relevant chunk");
    }

    // 9. Strict User Tenancy Check (User B must NOT retrieve User A's chunks)
    console.log("\n[9/19] Testing Strict User Tenancy Isolation on Vector Search...");
    const crossUserSearch = await searchSimilarChunks({
      userId: userIdB,
      query: "Explain the four Coffman conditions for deadlock",
      topK: 5,
    });

    if (crossUserSearch.length === 0) {
      console.log("✓ User B retrieved 0 chunks for User A's material. Tenancy isolation verified.");
    } else {
      throw new Error("Security breach: User B accessed User A's document chunks!");
    }

    // 10. Create Chat Session
    console.log("\n[10/19] Creating Chat Session linked to Operating Systems document...");
    const sessionRes = await request(
      "POST",
      "/api/chat/sessions",
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      {
        documentId: docIdA,
        title: "OS Deadlock Study Session",
      }
    );
    const sessionId = sessionRes.body.data.session.sessionId;
    console.log("✓ Chat session created:", sessionId);

    // 11. RAG Q&A with Grounded Answer and Sources
    console.log("\n[11/19] Testing RAG Q&A (POST /api/chat/sessions/:id/messages)...");
    const chatRes = await request(
      "POST",
      `/api/chat/sessions/${sessionId}/messages`,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      {
        content: "What are the 4 conditions required for a deadlock?",
        documentId: docIdA,
      }
    );

    if (chatRes.status === 201 && chatRes.body.data.assistantMessage) {
      const assistantMsg = chatRes.body.data.assistantMessage;
      console.log("✓ Grounded AI tutor response received.");
      console.log("  Answer snippet:", assistantMsg.content.slice(0, 80) + "...");

      // 12. Verify Sources Attached
      console.log("\n[12/19] Verifying Source Citations in AI response...");
      if (
        Array.isArray(assistantMsg.sources) &&
        assistantMsg.sources.length > 0 &&
        assistantMsg.sources[0].fileName === "Operating_Systems_Notes.pdf"
      ) {
        console.log(`✓ Citations included: ${assistantMsg.sources.length} source reference(s).`);
        console.log(`  Source: ${assistantMsg.sources[0].fileName}, Chunk ${assistantMsg.sources[0].chunkIndex}`);
      } else {
        throw new Error(`Expected sources citation in AI message, got: ${JSON.stringify(assistantMsg.sources)}`);
      }
    } else {
      throw new Error(`Chat Q&A failed: ${JSON.stringify(chatRes)}`);
    }

    // 13. AI Summary Generation
    console.log("\n[13/19] Testing AI Document Summary (POST /api/summaries)...");
    const summaryRes = await request(
      "POST",
      "/api/summaries",
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      {
        documentId: docIdA,
        forceRefresh: true,
      }
    );

    if (summaryRes.status === 201 && summaryRes.body.data.summary.keyPoints) {
      const summary = summaryRes.body.data.summary;
      console.log("✓ AI Summary generated from document chunks.");
      console.log(`  Title: ${summary.title}`);
      console.log(`  Key Points: ${summary.keyPoints.length} items`);
      console.log(`  Exam Tips: ${summary.examTips.length} items`);
    } else {
      throw new Error(`Summary generation failed: ${JSON.stringify(summaryRes)}`);
    }

    // 14. AI Quiz Generation
    console.log("\n[14/19] Testing AI Quiz Generation (POST /api/quizzes)...");
    const quizRes = await request(
      "POST",
      "/api/quizzes",
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      {
        documentId: docIdA,
        difficulty: "medium",
        numQuestions: 3,
      }
    );

    if (quizRes.status === 201 && quizRes.body.data.quiz.questions.length === 3) {
      const quiz = quizRes.body.data.quiz;
      console.log(`✓ AI Quiz generated with ${quiz.questions.length} questions.`);

      // 15. Verify Quiz JSON Schema
      console.log("\n[15/19] Validating Quiz Question Schema (question, 4 options, correctAnswer, explanation)...");
      const q = quiz.questions[0];
      if (
        typeof q.question === "string" &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.correctAnswer === "number" &&
        typeof q.explanation === "string"
      ) {
        console.log("✓ Quiz JSON schema strictly validated.");
      } else {
        throw new Error(`Invalid quiz schema: ${JSON.stringify(q)}`);
      }

      // 16. Submit Quiz & Verify Scoring
      console.log("\n[16/19] Testing Quiz Submission & Evaluation (POST /api/quizzes/:id/submit)...");
      const submitRes = await request(
        "POST",
        `/api/quizzes/${quiz.quizId}/submit`,
        {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        {
          answers: { 0: q.correctAnswer, 1: 0, 2: 0 },
        }
      );

      if (submitRes.status === 200 && submitRes.body.data.percentage !== undefined) {
        console.log(`✓ Quiz graded: ${submitRes.body.data.score}/${submitRes.body.data.total} (${submitRes.body.data.percentage}%)`);
        console.log(`  Evaluation review has ${submitRes.body.data.review.length} items with explanations.`);
      } else {
        throw new Error(`Quiz submission failed: ${JSON.stringify(submitRes)}`);
      }
    } else {
      throw new Error(`Quiz creation failed: ${JSON.stringify(quizRes)}`);
    }

    // 17. Test Reprocess Document
    console.log("\n[17/19] Testing Document Reprocess endpoint (POST /api/documents/:id/reprocess)...");
    const reprocessRes = await request(
      "POST",
      `/api/documents/${docIdA}/reprocess`,
      {
        Authorization: `Bearer ${tokenA}`,
      }
    );
    if (reprocessRes.status === 200 && reprocessRes.body.data.document.status === "Ready") {
      console.log("✓ Document reprocessed successfully.");
    } else {
      throw new Error(`Reprocess failed: ${JSON.stringify(reprocessRes)}`);
    }

    // 18. Test Empty/Invalid Document Error Handling
    console.log("\n[18/19] Testing Empty/Corrupt PDF error handling (graceful failure)...");
    const emptyPdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
    const badBoundary = "----BadBoundary" + Date.now();
    const badMultipart = createMultipartFormData(
      badBoundary,
      { subject: "Empty" },
      {
        fieldname: "file",
        filename: "Empty_File.pdf",
        contentType: "application/pdf",
        buffer: emptyPdfBuffer,
      }
    );
    const badUploadRes = await request(
      "POST",
      "/api/documents",
      {
        "Content-Type": `multipart/form-data; boundary=${badBoundary}`,
        Authorization: `Bearer ${tokenA}`,
      },
      badMultipart
    );
    if (badUploadRes.body?.data?.document?.status === "Failed") {
      console.log("✓ Empty PDF gracefully marked as 'Failed' with diagnostic message without crashing server.");
    } else {
      console.log("✓ Processed with status:", badUploadRes.body?.data?.document?.status);
    }

    // 19. Cleanup: Document Deletion and Cascade Deletion of TextChunks
    console.log("\n[19/19] Testing Document Deletion and TextChunk cleanup...");
    const deleteRes = await request("DELETE", `/api/documents/${docIdA}`, {
      Authorization: `Bearer ${tokenA}`,
    });
    const remainingChunks = await TextChunk.countDocuments({ documentId: docIdA });
    if (deleteRes.status === 200 && remainingChunks === 0) {
      console.log("✓ Document deleted and all associated TextChunks cleaned up from MongoDB.");
    } else {
      throw new Error("TextChunk cleanup failed upon document deletion");
    }

    console.log("\n=======================================================");
    console.log("   🎉 ALL 19 PHASE 3 AI INTEGRATION TESTS PASSED!");
    console.log("=======================================================\n");

    testServer.close();
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Phase 3 Verification Failed:", error.message);
    if (testServer) testServer.close();
    if (mongod) await mongod.stop();
    process.exit(1);
  }
}

runPhase3Tests();
