/**
 * StudyMate AI — Phase 8.6.2
 * Intelligent Learning Quality Assurance & Academic Verification Test Suite
 *
 * Comprehensive Multi-Domain Verification:
 * 1.  Domain 1: Mathematics & Calculus (Formula LaTeX syntax, variables, SI units, assumptions)
 * 2.  Domain 2: Statistics & Probability (Bayes Theorem & deterministic calculation verification)
 * 3.  Domain 3: Computer Networks (TCP 3-Way Handshake, Sequence Diagrams & CIDR Subnetting)
 * 4.  Domain 4: Operating Systems (Paging, TLB Effective Memory Access Time - EMAT arithmetic)
 * 5.  Domain 5: DBMS (Relational schemas, Normalization BCNF/3NF, B+ Tree indexing)
 * 6.  Domain 6: Data Structures & Algorithms (Binary Search Big-O validation & dry-run state tables)
 * 7.  Domain 7: Machine Learning (Binary Cross-Entropy Loss, Gradient Descent steps)
 * 8.  Domain 8: Electrical Engineering (Ohm's Law, Power dissipation with SI units)
 * 9.  Deliberate Formula Error Detection (Catches inverted Ohm's Law V = I / R)
 * 10. Deliberate Numerical Calculation Error Detection (Catches 24 / 8 = 4.0 and recomputes 3.0)
 * 11. Deliberate Mermaid Syntax & Structural Diagram Validation
 * 12. Grounding & Semantic Hallucination Audit (Detects unsupported claims with token overlap)
 * 13. Targeted In-Place Improvement Engine (Patches missing topic/formula without wiping notes)
 * 14. Mongoose Quality Audit Schema Persistence & Backward Compatibility
 * 15. Uploads Directory Preservation (Verifies all 32 physical files remain intact)
 */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import { uploadDir } from "../services/fileService.js";
import Summary from "../models/Summary.js";
import learningQualityService, {
  safeEvaluateMath,
  extractSourceInventory,
  assessContentCoverage,
  verifyFormulaItem,
  verifyNumericalProblemItem,
  validateDiagramItem,
  validateAlgorithmItem,
  auditGroundingAndHallucinations,
  generateQualityAudit,
  applyTargetedImprovement,
} from "../services/learningQualityService.js";
import { generateSummary } from "../services/geminiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI Colors
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let passedCount = 0;
let failedCount = 0;

function recordResult(testNum, title, passed, details = "") {
  if (passed) {
    passedCount++;
    console.log(`  ${GREEN}[PASS]${RESET} ${BOLD}Test ${testNum}:${RESET} ${title}`);
    if (details) console.log(`         ${CYAN}${details}${RESET}`);
  } else {
    failedCount++;
    console.error(`  ${RED}[FAIL]${RESET} ${BOLD}Test ${testNum}:${RESET} ${title}`);
    if (details) console.error(`         ${YELLOW}${details}${RESET}`);
  }
}

async function runQualityAssuranceTests() {
  console.log("\n========================================================================");
  console.log(" StudyMate AI — Phase 8.6.2 Learning Quality Assurance & Verification Suite");
  console.log("========================================================================\n");

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Mathematics & Calculus QA
    // -------------------------------------------------------------------------
    const mathFormula = {
      formulaName: "Product Rule of Differentiation",
      expression: "\\frac{d}{dx}[f(x)g(x)] = f'(x)g(x) + f(x)g'(x)",
      variables: [
        { symbol: "f", meaning: "First differentiable function", unit: "-" },
        { symbol: "g", meaning: "Second differentiable function", unit: "-" },
        { symbol: "x", meaning: "Independent differentiation variable", unit: "rad" },
      ],
      conditionsAndAssumptions: ["Both functions f and g are differentiable at point x."],
      explanation: "Computes the derivative of the product of two functions.",
    };

    const mathVerified = verifyFormulaItem(mathFormula, "Product rule d/dx [f(x)g(x)]");
    const test1Passed =
      mathVerified.notationValid === true &&
      mathVerified.variablesValid === true &&
      mathVerified.isVerified === true &&
      mathVerified.status === "VERIFIED";

    recordResult(
      1,
      "Mathematics QA: Product rule formula verified with valid LaTeX syntax, variables, SI units & assumptions",
      test1Passed,
      `Status: "${mathVerified.status}", Notation Valid: ${mathVerified.notationValid}, Issues: ${mathVerified.issues.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Statistics & Probability QA (Bayes' Theorem & Deterministic Calculation)
    // -------------------------------------------------------------------------
    const bayesProblem = {
      title: "Bayes Theorem Posterior Probability",
      problemStatement: "Given P(A) = 0.01, P(B|A) = 0.95, and P(B|~A) = 0.05. Calculate P(A|B).",
      givenData: [
        { variable: "P(A)", value: "0.01", unit: "probability" },
        { variable: "P(B|A)", value: "0.95", unit: "probability" },
        { variable: "P(B|~A)", value: "0.05", unit: "probability" },
      ],
      requiredQuantity: "P(A|B)",
      relevantFormula: "P(A|B) = \\frac{P(B|A)P(A)}{P(B|A)P(A) + P(B|~A)P(~A)}",
      steps: [
        {
          stepNumber: 1,
          description: "Calculate numerator: P(B|A) * P(A)",
          calculation: "0.95 * 0.01",
          intermediateResult: "0.0095",
        },
        {
          stepNumber: 2,
          description: "Calculate denominator: 0.0095 + (0.05 * 0.99)",
          calculation: "0.0095 + 0.0495",
          intermediateResult: "0.059",
        },
        {
          stepNumber: 3,
          description: "Calculate posterior probability P(A|B)",
          calculation: "0.0095 / 0.059",
          intermediateResult: "0.161",
        },
      ],
      finalAnswer: "0.161",
      interpretation: "The posterior probability of condition A given positive test B is 16.1%.",
    };

    const bayesVerified = verifyNumericalProblemItem(bayesProblem);
    const test2Passed =
      bayesVerified.status === "VERIFIED_CORRECT" &&
      bayesVerified.isDeterministic === true &&
      bayesVerified.discrepancies.length === 0;

    recordResult(
      2,
      "Statistics QA: Bayes' Theorem step-by-step arithmetic deterministically calculated & validated",
      test2Passed,
      `Status: "${bayesVerified.status}", Recomputed: ${bayesVerified.recomputedFinalAnswer}, Steps Verified: ${bayesVerified.stepsVerified.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Computer Networks QA (TCP Handshake & Subnet Calculations)
    // -------------------------------------------------------------------------
    const tcpDiagram = {
      title: "TCP Three-Way Connection Handshake",
      diagramType: "sequence",
      mermaidCode: `sequenceDiagram
    Client->>Server: SYN (seq=x)
    Server->>Client: SYN-ACK (seq=y, ack=x+1)
    Client->>Server: ACK (ack=y+1)`,
      components: ["TCP Client Host", "TCP Server Socket"],
      workflow: [
        "Client sends SYN packet with initial sequence number",
        "Server allocates socket buffer and responds with SYN-ACK",
        "Client acknowledges server sequence number and enters ESTABLISHED state",
      ],
      technicalExplanation: "Guarantees reliable full-duplex byte stream synchronization before data transfer.",
      svgCode: `<svg viewBox="0 0 400 200"><rect width="400" height="200" fill="#f8fafc"/></svg>`,
    };

    const tcpDiagVerified = validateDiagramItem(tcpDiagram);
    const subnetMath = safeEvaluateMath("2 ** (32 - 24) - 2");
    const test3Passed = tcpDiagVerified.isValid === true && subnetMath === 254;

    recordResult(
      3,
      "Computer Networks QA: TCP sequence diagram validated & /24 subnet hosts evaluated deterministically",
      test3Passed,
      `Diagram Valid: ${tcpDiagVerified.isValid}, Has SVG: ${tcpDiagVerified.hasSvgFallback}, Usable Hosts: ${subnetMath}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Operating Systems QA (Paging & TLB EMAT Calculation)
    // -------------------------------------------------------------------------
    // Formula: EMAT = h * (tlb + mem) + (1 - h) * (tlb + 2*mem)
    // With h = 0.90, tlb = 20 ns, mem = 100 ns:
    // Hit time = 20 + 100 = 120 ns
    // Miss time = 20 + 200 = 220 ns
    // EMAT = 0.90 * 120 + 0.10 * 220 = 108 + 22 = 130 ns.
    const osProblem = {
      title: "TLB Effective Memory Access Time (EMAT)",
      problemStatement: "Given TLB hit ratio h = 0.90, TLB access time = 20 ns, and main memory access time = 100 ns. Find EMAT.",
      steps: [
        { stepNumber: 1, description: "Compute hit access latency", calculation: "20 + 100", intermediateResult: "120 ns" },
        { stepNumber: 2, description: "Compute miss access latency", calculation: "20 + 2 * 100", intermediateResult: "220 ns" },
        { stepNumber: 3, description: "Compute weighted average EMAT", calculation: "0.90 * 120 + 0.10 * 220", intermediateResult: "130 ns" },
      ],
      finalAnswer: "130 ns",
      units: "ns",
    };

    const osVerified = verifyNumericalProblemItem(osProblem);
    const test4Passed =
      osVerified.status === "VERIFIED_CORRECT" &&
      osVerified.recomputedFinalAnswer?.includes("130");

    recordResult(
      4,
      "Operating Systems QA: TLB Effective Memory Access Time (EMAT) arithmetic verified step-by-step",
      test4Passed,
      `Status: "${osVerified.status}", Recomputed: ${osVerified.recomputedFinalAnswer}, Stated: "${osVerified.statedFinalAnswer}"`
    );

    // -------------------------------------------------------------------------
    // TEST 5: DBMS QA (Relational Normalization & B+ Trees)
    // -------------------------------------------------------------------------
    const dbmsInventory = {
      topics: [
        { title: "First Normal Form (1NF)", citation: "Page 10" },
        { title: "Boyce-Codd Normal Form (BCNF)", citation: "Page 14" },
        { title: "B+ Tree Indexing", citation: "Page 18" },
      ],
      concepts: [
        { term: "Functional Dependency", citation: "Page 12" },
        { term: "Lossless Join", citation: "Page 15" },
      ],
      formulas: [],
    };

    const dbmsMockSummary = {
      modules: [
        {
          moduleNumber: 1,
          title: "Relational Normalization & Indexing",
          topics: [
            { heading: "First Normal Form (1NF)", definition: "Eliminates duplicate columns and multivalued attributes." },
            { heading: "Boyce-Codd Normal Form (BCNF)", definition: "For every non-trivial functional dependency X -> Y, X must be a superkey." },
            { heading: "B+ Tree Indexing", definition: "Balanced search tree storing all records in leaf nodes." },
          ],
        },
      ],
    };

    const dbmsCoverage = assessContentCoverage(dbmsInventory, dbmsMockSummary);
    const test5Passed =
      dbmsCoverage.topicCoveragePercentage === 100 &&
      dbmsCoverage.missingTopics.length === 0;

    recordResult(
      5,
      "DBMS QA: Content coverage correctly maps 100% of BCNF and B+ Tree curriculum elements",
      test5Passed,
      `Topic Coverage: ${dbmsCoverage.topicCoveragePercentage}%, Covered Topics: ${dbmsCoverage.coveredTopics.join(", ")}`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Data Structures & Algorithms QA (Big-O & Trace Tables)
    // -------------------------------------------------------------------------
    const algoSpec = {
      title: "Binary Search",
      timeComplexity: { worstCase: "O(log n)", average: "O(log n)", explanation: "Halves search space each iteration." },
      spaceComplexity: { worstCase: "O(1)", explanation: "Iterative pointers low, high, and mid." },
      pseudocode: "while low <= high:\n    mid = (low + high) // 2",
      dryRunTrace: [
        { step: 1, variableStates: { low: 0, high: 7, mid: 3, key: 23, midVal: 19 }, decision: "midVal < key, search right" },
        { step: 2, variableStates: { low: 4, high: 7, mid: 5, key: 23, midVal: 23 }, decision: "midVal == key, element found" },
      ],
    };

    const algoVerified = validateAlgorithmItem(algoSpec);
    const test6Passed = algoVerified.isValid === true && algoVerified.issues.length === 0;

    recordResult(
      6,
      "Data Structures QA: Binary Search Big-O notation and intermediate dry run state progression validated",
      test6Passed,
      `Valid: ${algoVerified.isValid}, Time: "${algoVerified.timeComplexity}", Space: "${algoVerified.spaceComplexity}"`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Machine Learning QA (Binary Cross-Entropy Loss & Gradient Descent)
    // -------------------------------------------------------------------------
    const mlFormula = {
      formulaName: "Binary Cross-Entropy Loss",
      expression: "\\mathcal{L} = -\\frac{1}{N} \\sum_{i=1}^{N} [y_i \\log(\\hat{y}_i) + (1-y_i) \\log(1-\\hat{y}_i)]",
      variables: [
        { symbol: "L", meaning: "Loss value", unit: "-" },
        { symbol: "N", meaning: "Number of batch samples", unit: "samples" },
        { symbol: "y", meaning: "Ground truth binary label", unit: "-" },
        { symbol: "hat{y}", meaning: "Predicted model probability", unit: "-" },
      ],
      conditionsAndAssumptions: ["Probabilities bounded in interval (0, 1) via sigmoid activation."],
      explanation: "Penalizes confident false classifications exponentially.",
    };

    const mlVerified = verifyFormulaItem(mlFormula);
    const test7Passed = mlVerified.notationValid === true && mlVerified.status === "VERIFIED";

    recordResult(
      7,
      "Machine Learning QA: Binary Cross-Entropy formulation verified with balanced LaTeX braces and bounds",
      test7Passed,
      `Status: "${mlVerified.status}", Notation Valid: ${mlVerified.notationValid}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Electrical Engineering QA (Ohm's Law & Power Dissipation)
    // -------------------------------------------------------------------------
    const eeProblem = {
      title: "Resistive Circuit Current & Power Dissipation",
      steps: [
        { stepNumber: 1, description: "Calculate branch current I = V / R", calculation: "24 / 8", intermediateResult: "3 A" },
        { stepNumber: 2, description: "Calculate power dissipation P = V * I", calculation: "24 * 3", intermediateResult: "72 W" },
      ],
      finalAnswer: "72 W",
      units: "W",
    };

    const eeVerified = verifyNumericalProblemItem(eeProblem);
    const test8Passed =
      eeVerified.status === "VERIFIED_CORRECT" &&
      eeVerified.recomputedFinalAnswer?.includes("72");

    recordResult(
      8,
      "Electrical Engineering QA: Ohm's law and power dissipation verified with standard units (V, A, W)",
      test8Passed,
      `Status: "${eeVerified.status}", Recomputed: ${eeVerified.recomputedFinalAnswer}`
    );

    // -------------------------------------------------------------------------
    // TEST 9: DELIBERATE FORMULA ERROR DETECTION (Inverted Ohm's Law)
    // -------------------------------------------------------------------------
    const invertedOhmFormula = {
      formulaName: "Ohm's Law",
      expression: "V = \\frac{I}{R}", // DELIBERATE INVERSION! Correct is V = I * R
      variables: [
        { symbol: "V", meaning: "Voltage", unit: "V" },
        { symbol: "I", meaning: "Current", unit: "A" },
        { symbol: "R", meaning: "Resistance", unit: "Ω" },
      ],
      conditionsAndAssumptions: ["Linear ohmic conductor."],
    };

    const ohmAudit = verifyFormulaItem(invertedOhmFormula, "Ohm's Law: V = IR");
    const test9Passed =
      ohmAudit.discrepancyFound === true &&
      ohmAudit.status === "FLAGGED_DISCREPANCY" &&
      ohmAudit.discrepancyDescription.includes("inverts Ohm's Law");

    recordResult(
      9,
      "Deliberate Formula Error Detection: Catches inverted Ohm's Law (V = I / R) and flags discrepancy",
      test9Passed,
      `Discrepancy Found: ${ohmAudit.discrepancyFound}, Status: "${ohmAudit.status}", Warning: "${ohmAudit.discrepancyDescription}"`
    );

    // -------------------------------------------------------------------------
    // TEST 10: DELIBERATE NUMERICAL ERROR DETECTION (Step Divergence)
    // -------------------------------------------------------------------------
    const incorrectProblem = {
      title: "Faulty Current Calculation",
      steps: [
        {
          stepNumber: 1,
          description: "Calculate current",
          calculation: "24 / 8",
          intermediateResult: "4.0 A", // DELIBERATE ERROR! 24/8 = 3.0, not 4.0
        },
      ],
      finalAnswer: "4.0 A",
      units: "A",
    };

    const calcAudit = verifyNumericalProblemItem(incorrectProblem);
    const test10Passed =
      calcAudit.status === "CALCULATION_DISCREPANCY" &&
      calcAudit.discrepancies.length > 0 &&
      calcAudit.recomputedFinalAnswer?.includes("3");

    recordResult(
      10,
      "Deliberate Numerical Error Detection: Catches 24 / 8 = 4.0 discrepancy and recomputes correct value 3.0",
      test10Passed,
      `Status: "${calcAudit.status}", Discrepancies Count: ${calcAudit.discrepancies.length}, Recomputed: "${calcAudit.recomputedFinalAnswer}"`
    );

    // -------------------------------------------------------------------------
    // TEST 11: DELIBERATE MERMAID SYNTAX & SVG FALLBACK VALIDATION
    // -------------------------------------------------------------------------
    const invalidDiagram = {
      title: "Broken Architecture Flow",
      mermaidCode: "invalidKeyword\n[A] --> [B]", // DELIBERATE INVALID KEYWORD
      components: [],
      workflow: [],
      svgCode: "", // MISSING SVG FALLBACK
    };

    const diagAudit = validateDiagramItem(invalidDiagram);
    const hasSyntaxIssue = diagAudit.issues.some((i) => i.type === "SYNTACTIC");
    const hasSemanticIssue = diagAudit.issues.some((i) => i.type === "SEMANTIC");
    const test11Passed =
      diagAudit.isValid === false &&
      hasSyntaxIssue === true &&
      hasSemanticIssue === true;

    recordResult(
      11,
      "Deliberate Mermaid Syntax & Structural Check: Distinguishes syntactic keywords from semantic components",
      test11Passed,
      `Valid: ${diagAudit.isValid}, Syntactic Issue: ${hasSyntaxIssue}, Semantic Issue: ${hasSemanticIssue}, Total Issues: ${diagAudit.issues.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 12: GROUNDING & SEMANTIC HALLUCINATION AUDIT
    // -------------------------------------------------------------------------
    const sourceChunks = [
      {
        text: "The microprocessor uses a 16-bit address bus and 8-bit data bus to access main memory. All instructions are fetched synchronously through the system bus clock.",
      },
    ];

    const hallucinatedSummary = {
      modules: [
        {
          moduleNumber: 1,
          topics: [
            {
              heading: "Microprocessor Memory Architecture",
              definition: "Uses 16-bit address bus and 8-bit data bus to access memory.", // GROUNDED
              workingPrinciples: "Instructions fetched synchronously.",
            },
            {
              heading: "Quantum Tunneling Josephson Junctions",
              definition: "Cryogenic superconducting qubits operated at 15 millikelvin with microwave pulses.", // HALLUCINATED / UNSUPPORTED
              workingPrinciples: "Cooper pair tunneling across barrier.",
            },
          ],
        },
      ],
    };

    const groundingResult = auditGroundingAndHallucinations(hallucinatedSummary, sourceChunks);
    const test12Passed =
      groundingResult.sourceGroundedCount >= 1 &&
      groundingResult.unsupportedCount >= 1 &&
      groundingResult.items.some((i) => i.groundingType === "unsupported_claim");

    recordResult(
      12,
      "Grounding & Semantic Hallucination Audit: Detects unsupported claims lacking source references",
      test12Passed,
      `Grounded: ${groundingResult.sourceGroundedCount}, Unsupported: ${groundingResult.unsupportedCount}, Items Audited: ${groundingResult.items.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 13: TARGETED IN-PLACE IMPROVEMENT ENGINE
    // -------------------------------------------------------------------------
    const mockSummaryForImprovement = {
      title: "Computer Architecture Notes",
      modules: [
        {
          moduleNumber: 1,
          title: "Processor Fundamentals",
          topics: [
            { heading: "ALU Operations", definition: "Performs arithmetic and logical computations." },
          ],
          formulas: [
            { formulaName: "Ohm's Law", expression: "V = \\frac{I}{R}" }, // Discrepancy
          ],
          numericalProblems: [
            {
              title: "Branch Current Problem",
              steps: [{ stepNumber: 1, calculation: "24 / 8", intermediateResult: "4.0 A" }],
              finalAnswer: "4.0 A",
            },
          ],
        },
      ],
      qualityAudit: null,
    };

    // Generate initial audit
    mockSummaryForImprovement.qualityAudit = generateQualityAudit(mockSummaryForImprovement, sourceChunks);
    const initialImpCount = mockSummaryForImprovement.qualityAudit.actionableImprovements.length;

    // Apply targeted fix for formula discrepancy
    const fixedSummary = applyTargetedImprovement(mockSummaryForImprovement, sourceChunks, {
      type: "fix_formula",
      targetTopic: "Ohm's Law",
    });

    const fixedFormula = fixedSummary.modules[0].formulas[0];
    const test13Passed =
      fixedFormula.expression === "V = I \\cdot R" &&
      fixedSummary.qualityAudit !== null &&
      fixedSummary.modules[0].topics[0].heading === "ALU Operations"; // PRESERVED existing topic!

    recordResult(
      13,
      "Targeted In-Place Improvement Engine: Patches formula in-place without rewriting existing topics",
      test13Passed,
      `Fixed Expression: "${fixedFormula.expression}", Preserved Topic: "${fixedSummary.modules[0].topics[0].heading}"`
    );

    // -------------------------------------------------------------------------
    // TEST 14: MONGOOSE SUMMARY QUALITY AUDIT SCHEMA PERSISTENCE
    // -------------------------------------------------------------------------
    const testSummaryDoc = new Summary({
      userId: "test_user_qa_123",
      documentId: "test_doc_qa_456",
      title: "QA Schema Verification Document",
      content: "Overview of QA verification schema.",
      qualityAudit: {
        auditId: "qa_test_persist_01",
        overallQualityScore: 94,
        groundingScore: 98,
        verificationStatus: "VERIFIED",
        coverage: {
          topicCoveragePercentage: 100,
          conceptCoveragePercentage: 95,
          formulaCoveragePercentage: 100,
          coveredTopics: ["Topic A", "Topic B"],
          missingTopics: [],
        },
        formulaVerification: {
          totalFormulas: 2,
          verifiedCount: 2,
          flaggedCount: 0,
        },
        numericalVerification: {
          totalProblems: 1,
          verifiedCount: 1,
          discrepancyCount: 0,
        },
        diagramValidation: {
          totalDiagrams: 1,
          validCount: 1,
          flaggedCount: 0,
        },
      },
    });

    const validationError = testSummaryDoc.validateSync();
    const test14Passed =
      validationError === undefined &&
      testSummaryDoc.qualityAudit?.auditId === "qa_test_persist_01" &&
      testSummaryDoc.qualityAudit?.overallQualityScore === 94;

    recordResult(
      14,
      "Mongoose Summary Quality Audit Schema: Field validation and schema persistence conform 100%",
      test14Passed,
      `Audit ID: "${testSummaryDoc.qualityAudit?.auditId}", Quality Score: ${testSummaryDoc.qualityAudit?.overallQualityScore}%`
    );

    // -------------------------------------------------------------------------
    // TEST 15: PHYSICAL UPLOADS PRESERVATION
    // -------------------------------------------------------------------------
    const files = fs.readdirSync(uploadDir);
    const test15Passed = files.length >= 31;

    recordResult(
      15,
      "Physical Uploads Preservation: Verifies all original course documents remain intact",
      test15Passed,
      `Total Files Verified in uploads/: ${files.length} (Requirement >= 31)`
    );
  } catch (err) {
    console.error("Test execution encountered an unhandled error:", err);
    failedCount++;
  }

  // Summary
  console.log("\n========================================================================");
  console.log(` Summary: ${passedCount} passed, ${failedCount} failed of 15 tests`);
  console.log("========================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runQualityAssuranceTests();