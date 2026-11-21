import http from "http";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app.js";

// Helper to perform HTTP requests
const request = (method, urlPath, headers = {}, body = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "127.0.0.1",
      port: 5001,
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
        } catch (e) {
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

async function runTests() {
  console.log("\n=======================================================");
  console.log("     STUDYMATE AI — PHASE 2 BACKEND TEST RUNNER");
  console.log("=======================================================\n");

  let mongod;
  let testServer;

  try {
    console.log("[1/18] Starting In-Memory MongoDB Engine for isolated verification...");
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);
    console.log(`✓ Connected to verified test MongoDB instance: ${uri}\n`);

    // Start Express app on port 5001 for testing
    testServer = app.listen(5001);
    await new Promise((r) => setTimeout(r, 200));

    // 1. Health check
    console.log("[2/18] Testing GET /api/health ...");
    const healthRes = await request("GET", "/api/health");
    if (healthRes.status === 200 && healthRes.body.success) {
      console.log("✓ Health check succeeded:", healthRes.body.message);
    } else {
      throw new Error(`Health check failed: ${JSON.stringify(healthRes)}`);
    }

    // 2. Register
    console.log("\n[3/18] Testing POST /api/auth/register ...");
    const regRes = await request(
      "POST",
      "/api/auth/register",
      { "Content-Type": "application/json" },
      {
        name: "Test Student",
        email: "student.test@studymate.ai",
        password: "securePassword123",
      }
    );
    if (regRes.status === 201 && regRes.body.data.token) {
      console.log("✓ User registration succeeded. Token received.");
    } else {
      throw new Error(`Registration failed: ${JSON.stringify(regRes)}`);
    }

    const token = regRes.body.data.token;
    const userId = regRes.body.data.user.userId;

    // 3. Duplicate register rejection
    console.log("\n[4/18] Testing duplicate email rejection ...");
    const dupRes = await request(
      "POST",
      "/api/auth/register",
      { "Content-Type": "application/json" },
      {
        name: "Another Student",
        email: "student.test@studymate.ai",
        password: "anotherPassword",
      }
    );
    if (dupRes.status === 400) {
      console.log("✓ Correctly rejected duplicate email registration (Status 400).");
    } else {
      throw new Error(`Duplicate registration should fail: ${JSON.stringify(dupRes)}`);
    }

    // 4. Login
    console.log("\n[5/18] Testing POST /api/auth/login ...");
    const loginRes = await request(
      "POST",
      "/api/auth/login",
      { "Content-Type": "application/json" },
      {
        email: "student.test@studymate.ai",
        password: "securePassword123",
      }
    );
    if (loginRes.status === 200 && loginRes.body.data.token) {
      console.log("✓ Login succeeded. Auth token validated.");
    } else {
      throw new Error(`Login failed: ${JSON.stringify(loginRes)}`);
    }

    // 5. Bad password rejection
    console.log("\n[6/18] Testing login with invalid password ...");
    const badLogin = await request(
      "POST",
      "/api/auth/login",
      { "Content-Type": "application/json" },
      {
        email: "student.test@studymate.ai",
        password: "wrongPassword",
      }
    );
    if (badLogin.status === 401) {
      console.log("✓ Correctly rejected invalid password (Status 401).");
    } else {
      throw new Error(`Invalid login should fail: ${JSON.stringify(badLogin)}`);
    }

    // 6. JWT Protection & GET /api/auth/me
    console.log("\n[7/18] Testing Protected GET /api/auth/me ...");
    const unauthMe = await request("GET", "/api/auth/me");
    if (unauthMe.status === 401) {
      console.log("✓ Correctly rejected request without token (Status 401).");
    } else {
      throw new Error(`Unauthenticated request should fail: ${JSON.stringify(unauthMe)}`);
    }

    const authMe = await request("GET", "/api/auth/me", {
      Authorization: `Bearer ${token}`,
    });
    if (authMe.status === 200 && authMe.body.data.user.email === "student.test@studymate.ai") {
      console.log("✓ Protected route accessible with JWT Bearer token.");
    } else {
      throw new Error(`Protected route failed: ${JSON.stringify(authMe)}`);
    }

    // 7. Document Upload (PDF)
    console.log("\n[8/18] Testing POST /api/documents (PDF Upload) ...");
    const boundary = "----StudyMateBoundary" + Date.now();
    const pdfText = "Database Normalization in DBMS. First Normal Form requires atomic values. Second Normal Form eliminates partial dependencies. Third Normal Form eliminates transitive dependencies. Boyce-Codd Normal Form requires all determinants to be superkeys.";
    const lines = pdfText.match(/.{1,60}(\s+|$)/g) || [pdfText];
    const streamLines = lines.map((l) => `(${l.trim().replace(/[()\\]/g, "")}) '`).join("\n");
    const contentStream = `BT /F1 12 Tf 50 750 Td 14 TL\n${streamLines}\nET`;
    const streamLength = Buffer.byteLength(contentStream);
    const fakePdfContent = Buffer.from(`%PDF-1.4
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
%%EOF`);
    const multipartBody = createMultipartFormData(
      boundary,
      { subject: "Database Systems" },
      {
        fieldname: "file",
        filename: "DBMS_Unit_3.pdf",
        contentType: "application/pdf",
        buffer: fakePdfContent,
      }
    );

    const uploadRes = await request(
      "POST",
      "/api/documents",
      {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${token}`,
      },
      multipartBody
    );

    if (uploadRes.status === 201 && uploadRes.body.data.document.documentId) {
      console.log("✓ PDF upload succeeded. Saved with documentId:", uploadRes.body.data.document.documentId);
    } else {
      throw new Error(`Upload failed: ${JSON.stringify(uploadRes)}`);
    }

    const docId = uploadRes.body.data.document.documentId;

    // 8. Document Listing
    console.log("\n[9/18] Testing GET /api/documents ...");
    const docsRes = await request("GET", "/api/documents", {
      Authorization: `Bearer ${token}`,
    });
    if (docsRes.status === 200 && docsRes.body.data.documents.length >= 1) {
      console.log(`✓ Document listing returned ${docsRes.body.data.documents.length} document(s).`);
    } else {
      throw new Error(`Document listing failed: ${JSON.stringify(docsRes)}`);
    }

    // 9. Document Details
    console.log("\n[10/18] Testing GET /api/documents/:id ...");
    const singleDocRes = await request("GET", `/api/documents/${docId}`, {
      Authorization: `Bearer ${token}`,
    });
    if (singleDocRes.status === 200 && singleDocRes.body.data.document.fileName === "DBMS_Unit_3.pdf") {
      console.log("✓ Single document retrieval succeeded.");
    } else {
      throw new Error(`Single doc fetch failed: ${JSON.stringify(singleDocRes)}`);
    }

    // 10. Chat Session Creation
    console.log("\n[11/18] Testing POST /api/chat/sessions ...");
    const sessionRes = await request(
      "POST",
      "/api/chat/sessions",
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      {
        documentId: docId,
        title: "DBMS Discussion",
      }
    );
    if (sessionRes.status === 201 && sessionRes.body.data.session.sessionId) {
      console.log("✓ Chat session created:", sessionRes.body.data.session.sessionId);
    } else {
      throw new Error(`Session creation failed: ${JSON.stringify(sessionRes)}`);
    }

    const sessionId = sessionRes.body.data.session.sessionId;

    // 11. Send Message in Session
    console.log("\n[12/18] Testing POST /api/chat/sessions/:id/messages ...");
    const msgRes = await request(
      "POST",
      `/api/chat/sessions/${sessionId}/messages`,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      {
        content: "Explain normalization in DBMS and the difference between 3NF and BCNF.",
      }
    );
    if (msgRes.status === 201 && msgRes.body.data.assistantMessage) {
      console.log("✓ User message saved and Assistant response generated successfully.");
      console.log("  Assistant snippet:", msgRes.body.data.assistantMessage.content.slice(0, 70) + "...");
    } else {
      throw new Error(`Chat message failed: ${JSON.stringify(msgRes)}`);
    }

    // 12. Retrieve Chat History
    console.log("\n[13/18] Testing GET /api/chat/sessions/:id/messages ...");
    const historyRes = await request("GET", `/api/chat/sessions/${sessionId}/messages`, {
      Authorization: `Bearer ${token}`,
    });
    if (historyRes.status === 200 && historyRes.body.data.messages.length >= 2) {
      console.log(`✓ Retrieved ${historyRes.body.data.messages.length} messages in conversation history.`);
    } else {
      throw new Error(`History fetch failed: ${JSON.stringify(historyRes)}`);
    }

    // 13. Summary Generation
    console.log("\n[14/18] Testing POST /api/summaries ...");
    const summaryGenRes = await request(
      "POST",
      "/api/summaries",
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      { documentId: docId }
    );
    if (summaryGenRes.status === 201 && summaryGenRes.body.data.summary.keyPoints) {
      console.log("✓ Summary generated and saved in MongoDB.");
    } else {
      throw new Error(`Summary generation failed: ${JSON.stringify(summaryGenRes)}`);
    }

    // 14. Summary Retrieval
    console.log("\n[15/18] Testing GET /api/summaries/:documentId ...");
    const summaryGetRes = await request("GET", `/api/summaries/${docId}`, {
      Authorization: `Bearer ${token}`,
    });
    if (summaryGetRes.status === 200 && summaryGetRes.body.data.summary.title) {
      console.log("✓ Document summary retrieved successfully.");
    } else {
      throw new Error(`Summary get failed: ${JSON.stringify(summaryGetRes)}`);
    }

    // 15. Quiz Generation
    console.log("\n[16/18] Testing POST /api/quizzes ...");
    const quizCreateRes = await request(
      "POST",
      "/api/quizzes",
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      {
        documentId: docId,
        difficulty: "easy",
        numQuestions: 5,
      }
    );
    if (quizCreateRes.status === 201 && quizCreateRes.body.data.quiz.questions.length === 5) {
      console.log("✓ Quiz created with 5 questions in MongoDB.");
    } else {
      throw new Error(`Quiz creation failed: ${JSON.stringify(quizCreateRes)}`);
    }

    const quizId = quizCreateRes.body.data.quiz.quizId;

    // 16. Quiz Submission & Grading
    console.log("\n[17/18] Testing POST /api/quizzes/:id/submit ...");
    const submitRes = await request(
      "POST",
      `/api/quizzes/${quizId}/submit`,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      {
        answers: { 0: 0, 1: 2, 2: 1, 3: 1, 4: 1 }, // Provide answers matching question pool
      }
    );
    if (submitRes.status === 200 && submitRes.body.data.score !== undefined) {
      console.log(`✓ Quiz graded: ${submitRes.body.data.score}/${submitRes.body.data.total} (${submitRes.body.data.percentage}%)`);
    } else {
      throw new Error(`Quiz submit failed: ${JSON.stringify(submitRes)}`);
    }

    // 17. Document Deletion
    console.log("\n[18/18] Testing DELETE /api/documents/:id ...");
    const deleteDocRes = await request("DELETE", `/api/documents/${docId}`, {
      Authorization: `Bearer ${token}`,
    });
    if (deleteDocRes.status === 200 && deleteDocRes.body.success) {
      console.log("✓ Document deleted from database and filesystem.");
    } else {
      throw new Error(`Document deletion failed: ${JSON.stringify(deleteDocRes)}`);
    }

    console.log("\n=======================================================");
    console.log("   🎉 ALL 18 VERIFICATION CHECKS PASSED WITH ZERO ERRORS!");
    console.log("=======================================================\n");

    testServer.close();
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Verification Failed:", error.message);
    if (testServer) testServer.close();
    if (mongod) await mongod.stop();
    process.exit(1);
  }
}

runTests();
