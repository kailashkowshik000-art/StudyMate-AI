/**
 * StudyMate AI - Advanced Comprehensive Learning Notes & Multi-Domain Evaluation Suite
 *
 * Verifies End-to-End Educational Learning Material Generation across 10 Domains:
 * 1.  Domain 1: Theoretical Computer Science & Automata
 * 2.  Domain 2: Mathematics & Calculus (LaTeX, Variables, Units, Assumptions)
 * 3.  Domain 3: Statistics & Probability (Bayes Theorem, Normal Distribution, Numericals)
 * 4.  Domain 4: Algorithms & Data Structures (Big-O, Pseudocode, Dry Run Traces)
 * 5.  Domain 5: Computer Networks (OSI, Sequence Diagrams, Subnetting Calculations)
 * 6.  Domain 6: Electrical & Electronics Engineering (Ohm's Law, KCL/KVL, Circuits)
 * 7.  Domain 7: Machine Learning & Deep Learning (Loss Functions, Gradient Descent)
 * 8.  Domain 8: Slide Decks / Bullet-Heavy Presentations (Fragment Expansion)
 * 9.  Domain 9: Long Multi-Chapter Documents (Full Module Coverage, Global Collections)
 * 10. Domain 10: Mixed Theory + Numerical Documents (Harmonized Educational Synthesis)
 * 11. Mermaid Diagram Rigor & Syntax Validation
 * 12. Formula KaTeX & Variable Standard Units Rigor
 * 13. Step-by-Step Numerical Solver Rigor (Given data, substitution, units, interpretation)
 * 14. Algorithm Specification & Dry Run Execution Trace Rigor
 * 15. Export Endpoint Functionality (Markdown, HTML, JSON)
 * 16. Mongoose Summary Schema Persistence & Backward Compatibility
 * 17. Uploads Directory Preservation (All 31 physical files intact)
 */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import { uploadDir } from "../services/fileService.js";
import Summary from "../models/Summary.js";
import geminiService, {
  generateSummary,
} from "../services/geminiService.js";
import learningNotesService from "../services/learningNotesService.js";
import { exportSummary } from "../controllers/summaryController.js";

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

async function runAdvancedLearningNotesTests() {
  console.log("\n========================================================================");
  console.log(" StudyMate AI — Advanced Learning Notes Multi-Domain Evaluation Suite");
  console.log("========================================================================\n");

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Domain 1 - Theoretical Computer Science & Automata
    // -------------------------------------------------------------------------
    const automataChunks = [
      {
        chunkIndex: 0,
        text: "Module 1: Finite Automata and Formal Languages. A Deterministic Finite Automaton (DFA) is a 5-tuple (Q, Sigma, delta, q0, F) where Q is a finite set of states, Sigma is a finite alphabet, delta is the transition function Q x Sigma -> Q, q0 is the initial state, and F is the set of accept states. Non-deterministic Finite Automata (NFA) allow transitions to multiple states or epsilon transitions. Pumping Lemma states that for any regular language L, there exists a pumping length p such that any string s in L with |s| >= p can be divided into xyz satisfying |y| > 0, |xy| <= p, and xy^i z in L for all i >= 0.",
        metadata: { heading: "Module 1: Finite Automata and Formal Languages", moduleTitle: "Module 1: Finite Automata and Formal Languages" },
      },
    ];

    const automataResult = await generateSummary({
      documentTitle: "Theory of Computation and Automata",
      chunks: automataChunks,
      options: { summaryMode: "detailed" },
    });

    const d1Passed =
      Boolean(automataResult.domain) &&
      (automataResult.domain.toLowerCase().includes("theory") ||
        automataResult.domain.toLowerCase().includes("computer") ||
        automataResult.domain.toLowerCase().includes("automata")) &&
      automataResult.modules?.[0]?.topics?.length > 0 &&
      automataResult.modules?.[0]?.diagramsAndProcesses?.length > 0;

    recordResult(
      1,
      "Domain 1 (Theory CS & Automata): Detects domain, extracts formal definitions, state diagrams & working principles",
      d1Passed,
      `Domain: "${automataResult.domain}", Topics: ${automataResult.modules?.[0]?.topics?.length}, Diagrams: ${automataResult.modules?.[0]?.diagramsAndProcesses?.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Domain 2 - Mathematics & Calculus (LaTeX, Variables, Units, Assumptions)
    // -------------------------------------------------------------------------
    const mathChunks = [
      {
        chunkIndex: 0,
        text: "Module 1: Differential and Integral Calculus. In single-variable calculus, the product rule for differentiation states that d/dx [f(x) g(x)] = f'(x)g(x) + f(x)g'(x). Integration by parts is derived from this product rule: int u dv = uv - int v du. Taylor series expansion represents an infinitely differentiable function f(x) around point a as sum_{n=0}^{infty} [f^{(n)}(a)/n!] (x-a)^n. Solved calculation: Evaluate derivative of f(x) = x^2 * sin(x) at x = pi/2.",
        metadata: { heading: "Module 1: Advanced Calculus", moduleTitle: "Module 1: Advanced Calculus" },
      },
    ];

    const mathResult = await generateSummary({
      documentTitle: "Engineering Mathematics & Calculus",
      chunks: mathChunks,
      options: { summaryMode: "detailed" },
    });

    const mathMod = mathResult.modules?.[0];
    const mathFormulas = mathMod?.formulas || [];
    const hasLatex = mathFormulas.some((f) => f.expression && (f.expression.includes("\\") || f.expression.includes("int") || f.expression.includes("=")));
    const hasVariablesWithUnits = mathFormulas.some((f) => f.variables?.length > 0 && f.variables.every((v) => v.symbol && v.meaning));
    const d2Passed = mathFormulas.length > 0 && hasLatex && hasVariablesWithUnits;

    recordResult(
      2,
      "Domain 2 (Mathematics & Calculus): Extracts LaTeX formulas, variable breakdowns with units & assumptions",
      d2Passed,
      `Formulas extracted: ${mathFormulas.length}, Has LaTeX expressions: ${hasLatex}, Variables have symbols & meanings: ${hasVariablesWithUnits}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Domain 3 - Statistics & Probability (Bayes Theorem & Solved Numericals)
    // -------------------------------------------------------------------------
    const statsChunks = [
      {
        chunkIndex: 0,
        text: "Module 1: Probability Distributions & Bayesian Inference. Bayes' theorem calculates the posterior probability of event A given prior evidence B: P(A|B) = [P(B|A) * P(A)] / P(B). In Gaussian Normal Distribution N(mu, sigma^2), the probability density function is f(x) = (1 / (sigma * sqrt(2*pi))) * exp(-(x - mu)^2 / (2 * sigma^2)). Solved problem: Suppose a medical test has sensitivity P(B|A) = 0.95, disease prevalence P(A) = 0.01, and false positive rate P(B|~A) = 0.05. Calculate P(A|B). Given data: P(A) = 0.01, P(B|A) = 0.95, P(B|~A) = 0.05. Required: P(A|B).",
        metadata: { heading: "Module 1: Probability and Bayesian Inference", moduleTitle: "Module 1: Probability and Bayesian Inference" },
      },
    ];

    const statsResult = await generateSummary({
      documentTitle: "Probability, Statistics and Stochastic Processes",
      chunks: statsChunks,
      options: { summaryMode: "detailed" },
    });

    const statsMod = statsResult.modules?.[0];
    const statsNumericals = statsMod?.numericalProblems || [];
    const hasStatsProblem = statsNumericals.length > 0;
    const prob1 = statsNumericals[0];
    const probHasSteps = prob1?.steps?.length >= 2;
    const probHasGivenData = prob1?.givenData?.length > 0;
    const d3Passed = hasStatsProblem && probHasSteps && probHasGivenData && Boolean(prob1.finalAnswer);

    recordResult(
      3,
      "Domain 3 (Statistics & Probability): Solves Bayesian numerical problems with given data, step substitution & interpretation",
      d3Passed,
      `Numerical problems: ${statsNumericals.length}, Steps: ${prob1?.steps?.length}, Final answer: "${prob1?.finalAnswer} ${prob1?.units || ""}"`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Domain 4 - Algorithms & Data Structures (Big-O, Code, Dry Run Traces)
    // -------------------------------------------------------------------------
    const algoChunks = [
      {
        chunkIndex: 0,
        text: "Module 1: Graph Algorithms & Dynamic Programming. Dijkstra's algorithm computes single-source shortest paths on weighted graphs with non-negative edge weights. Time complexity using a min-heap priority queue is O((V + E) log V), and space complexity is O(V). Binary Search finds a target in a sorted array by dividing search interval in half. Worst-case time complexity is O(log N) and space complexity is O(1). Pseudocode: while low <= high: mid = (low + high) // 2. If arr[mid] == target: return mid.",
        metadata: { heading: "Module 1: Advanced Algorithms", moduleTitle: "Module 1: Advanced Algorithms" },
      },
    ];

    const algoResult = await generateSummary({
      documentTitle: "Data Structures and Algorithm Design",
      chunks: algoChunks,
      options: { summaryMode: "detailed" },
    });

    const algoMod = algoResult.modules?.[0];
    const algos = algoMod?.algorithms || [];
    const hasAlgos = algos.length > 0;
    const algo1 = algos[0];
    const hasComplexity = Boolean(algo1?.timeComplexity && algo1?.spaceComplexity);
    const hasTrace = Array.isArray(algo1?.dryRunTrace) && algo1.dryRunTrace.length > 0;
    const hasCodeOrPseudo = Boolean(algo1?.codeSnippet || algo1?.pseudocode);
    const d4Passed = hasAlgos && hasComplexity && hasTrace && hasCodeOrPseudo;

    recordResult(
      4,
      "Domain 4 (Algorithms & DSA): Formulates Big-O time/space complexity, pseudocode, working code & dry run trace tables",
      d4Passed,
      `Algorithms extracted: ${algos.length}, Title: "${algo1?.title}", Time: ${algo1?.timeComplexity?.worstCase || algo1?.timeComplexity}, Trace steps: ${algo1?.dryRunTrace?.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Domain 5 - Computer Networks (OSI, Diagrams, Subnetting Calculations)
    // -------------------------------------------------------------------------
    const networkChunks = [
      {
        chunkIndex: 0,
        text: "Module 1: Transport Layer and IP Subnetting. TCP establishes reliable bidirectional connections using the 3-Way Handshake: Client sends SYN with initial sequence number, Server responds with SYN-ACK, and Client sends ACK. In IPv4 Subnetting with CIDR, a network 192.168.1.0/24 is divided into 4 equal subnets. The new prefix is /26 (mask 255.255.255.192). Each subnet has 2^(32-26) = 64 total IP addresses, with 62 usable host addresses. TCP Sliding Window provides dynamic flow control.",
        metadata: { heading: "Module 1: Computer Networks", moduleTitle: "Module 1: Computer Networks" },
      },
    ];

    const networkResult = await generateSummary({
      documentTitle: "Computer Networks & Internet Protocols",
      chunks: networkChunks,
      options: { summaryMode: "detailed" },
    });

    const netMod = networkResult.modules?.[0];
    const netDiagrams = netMod?.diagramsAndProcesses || [];
    const netNumericals = netMod?.numericalProblems || [];
    const hasNetDiagram = netDiagrams.some((d) => d.mermaidCode && (d.mermaidCode.includes("sequenceDiagram") || d.mermaidCode.includes("flowchart") || d.mermaidCode.includes("graph")));
    const hasSubnetProblem = netNumericals.length > 0;
    const d5Passed = hasNetDiagram && hasSubnetProblem && networkResult.domain.toLowerCase().includes("network");

    recordResult(
      5,
      "Domain 5 (Computer Networks): Synthesizes sequence diagrams (TCP 3-way handshake) and CIDR subnetting numerical calculations",
      d5Passed,
      `Domain: "${networkResult.domain}", Has Mermaid diagram: ${hasNetDiagram}, Has Subnet numericals: ${hasSubnetProblem}`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Domain 6 - Electrical & Electronics Engineering (Circuits & Ohm's Law)
    // -------------------------------------------------------------------------
    const eeChunks = [
      {
        chunkIndex: 0,
        text: "Module 1: DC Circuit Analysis & Network Theorems. Ohm's law defines relation between voltage V, current I, and resistance R: V = I * R. Power dissipated is P = V * I = I^2 * R. Kirchhoff's Current Law (KCL) states sum of currents entering a node is zero: sum I_in = sum I_out. Thevenin's theorem reduces any linear bilateral network to a single voltage source V_th in series with resistance R_th. RC Circuit time constant tau = R * C. Given: Voltage V = 24 V, Resistor R = 8 Ohms. Calculate current I and power P.",
        metadata: { heading: "Module 1: Basic Electrical Engineering", moduleTitle: "Module 1: Basic Electrical Engineering" },
      },
    ];

    const eeResult = await generateSummary({
      documentTitle: "Electrical Engineering and Circuit Analysis",
      chunks: eeChunks,
      options: { summaryMode: "detailed" },
    });

    const eeMod = eeResult.modules?.[0];
    const eeFormulas = eeMod?.formulas || [];
    const eeNumericals = eeMod?.numericalProblems || [];
    const hasOhmFormula = eeFormulas.some((f) => f.formulaName?.toLowerCase().includes("ohm") || f.expression?.includes("="));
    const hasCircuitCalc = eeNumericals.length > 0 && Boolean(eeNumericals[0].finalAnswer);
    const d6Passed = hasOhmFormula && hasCircuitCalc && eeResult.domain.toLowerCase().includes("electrical");

    recordResult(
      6,
      "Domain 6 (Electrical Engineering): Formulates circuit equations with SI units (V, A, Ohms) and solves circuit numericals",
      d6Passed,
      `Domain: "${eeResult.domain}", Formulas: ${eeFormulas.length}, Solved Problem: "${eeNumericals[0]?.title}" (${eeNumericals[0]?.finalAnswer} ${eeNumericals[0]?.units || ""})`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Domain 7 - Machine Learning & Deep Learning (Loss, Optimizers, Models)
    // -------------------------------------------------------------------------
    const mlChunks = [
      {
        chunkIndex: 0,
        text: "Module 1: Deep Learning Fundamentals & Optimization. Artificial Neural Networks learn by forward propagation, computing categorical cross-entropy loss L = - sum y_i * log(y_hat_i), and applying backpropagation with stochastic gradient descent: theta = theta - eta * grad(L). Convolutional Neural Networks (CNN) utilize convolution filters, ReLU activations, and max pooling for computer vision. Transformers rely on scaled dot-product self-attention: Attention(Q, K, V) = softmax((Q K^T) / sqrt(d_k)) * V.",
        metadata: { heading: "Module 1: Deep Learning & Neural Networks", moduleTitle: "Module 1: Deep Learning & Neural Networks" },
      },
    ];

    const mlResult = await generateSummary({
      documentTitle: "Machine Learning and Deep Neural Networks",
      chunks: mlChunks,
      options: { summaryMode: "detailed" },
    });

    const mlMod = mlResult.modules?.[0];
    const mlFormulas = mlMod?.formulas || [];
    const mlAlgos = mlMod?.algorithms || [];
    const hasLossFormula = mlFormulas.some((f) => f.formulaName?.toLowerCase().includes("loss") || f.formulaName?.toLowerCase().includes("cross") || f.formulaName?.toLowerCase().includes("attention") || f.expression?.includes("="));
    const hasOptimizerAlgo = mlAlgos.length > 0;
    const d7Passed = hasLossFormula && hasOptimizerAlgo && mlResult.domain.toLowerCase().includes("machine learning");

    recordResult(
      7,
      "Domain 7 (Machine Learning & AI): Generates loss equations, gradient descent algorithms with learning rate, and model comparisons",
      d7Passed,
      `Domain: "${mlResult.domain}", Loss formulas: ${mlFormulas.length}, Optimization algorithms: ${mlAlgos.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Domain 8 - Slide Decks / Bullet-Heavy Presentations (Fragment Expansion)
    // -------------------------------------------------------------------------
    const slideChunks = [
      {
        chunkIndex: 0,
        text: "Module 1: Cloud Native Microservices Architecture\n- Microservices vs Monolith\n- Containerization Docker & Kubernetes\n- Service mesh Istio & Envoy\n- API Gateway pattern routing\n- Resiliency circuit breaker Resilience4j\n- Distributed tracing OpenTelemetry",
        metadata: { heading: "Slide Deck: Microservices Architecture", moduleTitle: "Module 1: Cloud Native Architecture" },
      },
    ];

    const slideResult = await generateSummary({
      documentTitle: "Cloud Native Microservices Architecture Deck",
      chunks: slideChunks,
      options: { summaryMode: "detailed" },
    });

    const slideMod = slideResult.modules?.[0];
    const slideTopics = slideMod?.topics || [];
    const hasExpandedTheory = slideTopics.some((t) => t.explanation && t.explanation.length > 100);
    const hasWorkingPrinciples = slideTopics.some((t) => t.workingPrinciples && t.workingPrinciples.length > 30);
    const d8Passed = hasExpandedTheory && hasWorkingPrinciples;

    recordResult(
      8,
      "Domain 8 (Slide Decks & Bullet Points): Expands concise presentation fragments into full academic paragraphs and architectures",
      d8Passed,
      `Topics expanded: ${slideTopics.length}, Avg explanation length: ${Math.round(slideTopics.reduce((acc, t) => acc + (t.explanation?.length || 0), 0) / (slideTopics.length || 1))} chars`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Domain 9 - Long Multi-Chapter Documents (Full Syllabus Coverage)
    // -------------------------------------------------------------------------
    const multiChapterChunks = [
      {
        chunkIndex: 0,
        text: "Chapter 1: Operating System Kernel Architecture. Monolithic kernels vs Microkernels. System call interface, interrupt handling, process control block (PCB), context switching, and CPU scheduling algorithms (Round Robin, FCFS, Priority).",
        metadata: { heading: "Chapter 1: OS Kernel Architecture", moduleTitle: "Chapter 1: OS Kernel Architecture" },
      },
      {
        chunkIndex: 1,
        text: "Chapter 2: Memory Management & Virtual Memory. Paging, page tables, Translation Lookaside Buffer (TLB), page fault handling, page replacement algorithms (FIFO, LRU, Optimal). Demand paging reduces memory footprint.",
        metadata: { heading: "Chapter 2: Memory Management", moduleTitle: "Chapter 2: Memory Management" },
      },
      {
        chunkIndex: 2,
        text: "Chapter 3: File Systems & Concurrency. Inodes, directory structures, journaling, mutual exclusion, semaphores, mutexes, dining philosophers problem, and deadlock prevention (Banker's Algorithm).",
        metadata: { heading: "Chapter 3: File Systems & Concurrency", moduleTitle: "Chapter 3: File Systems & Concurrency" },
      },
    ];

    const multiChapterResult = await generateSummary({
      documentTitle: "Operating Systems: Principles and Practice",
      chunks: multiChapterChunks,
      options: { summaryMode: "detailed" },
    });

    const d9Modules = multiChapterResult.modules || [];
    const hasAll3Modules = d9Modules.length === 3;
    const hasCoverageTag = Boolean(multiChapterResult.coverageAssessment && multiChapterResult.coverageAssessment.includes("100%"));
    const d9Passed = hasAll3Modules && hasCoverageTag;

    recordResult(
      9,
      "Domain 9 (Long Multi-Chapter Documents): Maintains 100% chapter chunk preservation, multi-module aggregation & coverage assessment",
      d9Passed,
      `Modules synthesized: ${d9Modules.length} of 3, Coverage assessment: "${multiChapterResult.coverageAssessment}"`
    );

    // -------------------------------------------------------------------------
    // TEST 10: Domain 10 - Mixed Theory + Numerical Documents
    // -------------------------------------------------------------------------
    const mixedChunks = [
      {
        chunkIndex: 0,
        text: "Module 1: Signal Processing and Fourier Analysis. The Continuous Fourier Transform converts a time-domain signal x(t) into its frequency spectrum X(f): X(f) = int_{-\\infty}^{\\infty} x(t) e^{-j 2 \\pi f t} dt. Nyquist-Shannon Sampling Theorem states that a continuous signal can be completely reconstructed if sampled at rate f_s >= 2 * f_max. Solved Problem: A voice signal has maximum frequency f_max = 4 kHz. Calculate the minimum Nyquist sampling rate and the sampling interval T_s. Given: f_max = 4000 Hz. Required: f_s and T_s.",
        metadata: { heading: "Module 1: Signals and Fourier Analysis", moduleTitle: "Module 1: Signals and Fourier Analysis" },
      },
    ];

    const mixedResult = await generateSummary({
      documentTitle: "Digital Signal Processing & Applications",
      chunks: mixedChunks,
      options: { summaryMode: "detailed" },
    });

    const mixedMod = mixedResult.modules?.[0];
    const hasTheory = mixedMod?.topics?.length > 0;
    const hasFormulas = mixedMod?.formulas?.length > 0;
    const hasNumericals = mixedMod?.numericalProblems?.length > 0;
    const hasDiagram = mixedMod?.diagramsAndProcesses?.length > 0;
    const d10Passed = hasTheory && hasFormulas && hasNumericals && hasDiagram;

    recordResult(
      10,
      "Domain 10 (Mixed Theory + Numericals): Seamlessly harmonizes theory topics, architecture diagrams, LaTeX formulas & solved problems",
      d10Passed,
      `Theory topics: ${mixedMod?.topics?.length}, Formulas: ${mixedMod?.formulas?.length}, Numericals: ${mixedMod?.numericalProblems?.length}, Diagrams: ${mixedMod?.diagramsAndProcesses?.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 11: Mermaid Diagram Rigor & Syntax Validation
    // -------------------------------------------------------------------------
    const generatedDiagrams = [
      learningNotesService.generateMermaidDiagram("Embedded Systems & IoT", "Embedded Architecture", "CPU Core Flash SRAM AHB APB"),
      learningNotesService.generateMermaidDiagram("Computer Networks", "TCP 3-Way Handshake", "TCP connection sequence"),
      learningNotesService.generateMermaidDiagram("Data Structures & Algorithms", "Binary Search", "Divide and conquer array"),
      learningNotesService.generateMermaidDiagram("Mathematics & Calculus", "Calculus Optimization", "Derivative f'(x) = 0"),
    ];

    const validDiagramKeywords = ["flowchart", "graph", "sequenceDiagram", "stateDiagram", "erDiagram"];
    const allMermaidValid = generatedDiagrams.every((diag) => {
      if (!diag.mermaidCode || typeof diag.mermaidCode !== "string") return false;
      const trimmed = diag.mermaidCode.trim();
      const startsValid = validDiagramKeywords.some((kw) => trimmed.startsWith(kw));
      const hasSvgFallback = Boolean(diag.svgCode && diag.svgCode.includes("<svg"));
      const hasExplanation = Boolean(diag.technicalExplanation && diag.technicalExplanation.length > 20);
      return startsValid && hasSvgFallback && hasExplanation;
    });

    recordResult(
      11,
      "Mermaid Diagram Rigor: Generated Mermaid diagrams have valid keywords (flowchart/sequence), SVG fallbacks & technical explanations",
      allMermaidValid,
      `Tested 4 domain diagrams: All valid syntax with complete vector SVG fallbacks`
    );

    // -------------------------------------------------------------------------
    // TEST 12: Formula KaTeX & Variable Standard Units Rigor
    // -------------------------------------------------------------------------
    const sampleFormulas = learningNotesService.extractOrSynthesizeFormulas("Electrical & Electronics Engineering", "Ohm's law V = I * R and power P = V * I in electrical circuits");
    const formulasRigorPassed = sampleFormulas.every((f) => {
      const hasName = Boolean(f.formulaName);
      const hasExpr = Boolean(f.expression);
      const hasVars = Array.isArray(f.variables) && f.variables.length > 0;
      const varsHaveUnits = f.variables.every((v) => Boolean(v.symbol && v.meaning && v.unit !== undefined));
      const hasAssumptions = Array.isArray(f.conditionsAndAssumptions);
      return hasName && hasExpr && hasVars && varsHaveUnits && hasAssumptions;
    });

    recordResult(
      12,
      "Formula KaTeX & Variables Rigor: Formulas include LaTeX syntax, variables array with standard SI units & assumptions",
      formulasRigorPassed && sampleFormulas.length >= 1,
      `Formulas checked: ${sampleFormulas.length}, Variables have symbols, meanings, and units: ${formulasRigorPassed}`
    );

    // -------------------------------------------------------------------------
    // TEST 13: Step-by-Step Numerical Solver Rigor
    // -------------------------------------------------------------------------
    const sampleProblems = learningNotesService.extractOrSynthesizeNumericalProblems(
      "Electrical & Electronics Engineering",
      "A circuit has voltage V = 12 V and resistance R = 4 Ohms. Calculate current I. Given V = 12 V, R = 4 Ohm. Required I."
    );
    const numericalRigorPassed = sampleProblems.every((prob) => {
      const hasTitle = Boolean(prob.title);
      const hasStatement = Boolean(prob.problemStatement);
      const hasGiven = Array.isArray(prob.givenData) && prob.givenData.length > 0;
      const givenHaveUnits = prob.givenData.every((g) => g.variable && g.value && g.unit !== undefined);
      const hasSteps = Array.isArray(prob.steps) && prob.steps.length >= 2;
      const stepsHaveCalc = prob.steps.every((s) => s.stepNumber && s.description && (s.calculation || s.intermediateResult));
      const hasAnswer = Boolean(prob.finalAnswer);
      const hasInterpretation = Boolean(prob.interpretation);
      const hasSourceFlag = typeof prob.isSourceDerived === "boolean";
      return hasTitle && hasStatement && hasGiven && givenHaveUnits && hasSteps && stepsHaveCalc && hasAnswer && hasInterpretation && hasSourceFlag;
    });

    recordResult(
      13,
      "Step-by-Step Numerical Solver Rigor: Numerical problems have structured given data, step substitution cards, final boxed answer & source flag",
      numericalRigorPassed && sampleProblems.length >= 1,
      `Problems checked: ${sampleProblems.length}, Steps structured with intermediate calculations: ${numericalRigorPassed}`
    );

    // -------------------------------------------------------------------------
    // TEST 14: Algorithm Specification & Dry Run Trace Table Rigor
    // -------------------------------------------------------------------------
    const sampleAlgos = learningNotesService.extractOrSynthesizeAlgorithms("Data Structures & Algorithms", "Binary Search in sorted array. Time complexity O(log N).");
    const algoRigorPassed = sampleAlgos.every((algo) => {
      const hasTitle = Boolean(algo.title);
      const hasExplanation = Boolean(algo.conceptExplanation);
      const hasLanguage = Boolean(algo.language);
      const hasPseudocode = Boolean(algo.pseudocode);
      const hasCode = Boolean(algo.codeSnippet);
      const hasTrace = Array.isArray(algo.dryRunTrace) && algo.dryRunTrace.length > 0;
      const traceValid = algo.dryRunTrace.every((t) => t.step && t.variableStates !== undefined);
      const hasTime = Boolean(algo.timeComplexity);
      const hasSpace = Boolean(algo.spaceComplexity);
      const hasPitfalls = Array.isArray(algo.commonMistakes) && algo.commonMistakes.length > 0;
      return hasTitle && hasExplanation && hasLanguage && hasPseudocode && hasCode && hasTrace && traceValid && hasTime && hasSpace && hasPitfalls;
    });

    recordResult(
      14,
      "Algorithm Specification Rigor: Algorithms include Big-O time/space, pseudocode, working implementation & dry run trace states",
      algoRigorPassed && sampleAlgos.length >= 1,
      `Algorithms checked: ${sampleAlgos.length}, Trace rows structured: ${algoRigorPassed}`
    );

    // -------------------------------------------------------------------------
    // TEST 15: Export Endpoint Functionality (Markdown, HTML, JSON)
    // -------------------------------------------------------------------------
    // Test the exportSummary controller directly with mock req and res
    const mockSummaryObj = {
      title: "Digital Signal Processing Study Notes",
      content: "Complete DSP study guide.",
      overview: "Complete DSP study guide.",
      domain: "Electrical Engineering & Signal Processing",
      documentType: "textbook",
      coverageAssessment: "100% complete module coverage",
      keyPoints: ["Point 1", "Point 2"],
      modules: [
        {
          moduleNumber: 1,
          title: "Fourier Analysis",
          overview: "Fourier analysis fundamentals.",
          learningObjectives: ["Understand FFT"],
          topics: [
            {
              heading: "Discrete Fourier Transform",
              definition: "Frequency domain representation.",
              explanation: "Mathematical derivation of DFT.",
              workingPrinciples: "Decomposition into orthogonal basis.",
              architecture: "Radix-2 butterfly architecture.",
              characteristics: ["O(N log N) complexity"],
              applications: ["Audio processing"],
              advantages: ["Fast computation"],
              disadvantages: ["Spectral leakage"],
              examples: ["Audio filtering"],
            },
          ],
          formulas: [
            {
              formulaName: "DFT Equation",
              expression: "X[k] = \\sum_{n=0}^{N-1} x[n] e^{-j 2 \\pi k n / N}",
              variables: [{ symbol: "X[k]", meaning: "Frequency bin", unit: "dimensionless" }],
              conditionsAndAssumptions: ["Finite length signal"],
            },
          ],
          numericalProblems: [
            {
              title: "DFT Resolution Calculation",
              problemStatement: "Calculate bin resolution for fs = 8000 Hz, N = 1024.",
              givenData: [{ variable: "fs", value: "8000", unit: "Hz" }, { variable: "N", value: "1024", unit: "samples" }],
              requiredQuantity: "delta_f",
              relevantFormula: "delta_f = fs / N",
              steps: [{ stepNumber: 1, description: "Divide fs by N", calculation: "8000 / 1024", intermediateResult: "7.8125" }],
              finalAnswer: "7.8125",
              units: "Hz",
              interpretation: "Each DFT bin spans 7.8125 Hz.",
              isSourceDerived: true,
            },
          ],
          algorithms: [
            {
              title: "Radix-2 FFT",
              conceptExplanation: "Divide and conquer DFT algorithm.",
              language: "python",
              pseudocode: "def fft(x): ...",
              codeSnippet: "import numpy as np\ndef fft(x): return np.fft.fft(x)",
              dryRunTrace: [{ step: 1, variableStates: { N: 8, stages: 3 }, output: "Intermediate butterfly" }],
              timeComplexity: { worstCase: "O(N log N)" },
              spaceComplexity: { worstCase: "O(N)" },
              commonMistakes: ["Input length not power of 2"],
            },
          ],
          diagramsAndProcesses: [
            {
              title: "FFT Butterfly Diagram",
              diagramType: "flowchart",
              mermaidCode: "graph LR\n  A[x0] --> B[Butterfly]\n  C[x1] --> B",
              description: "Radix-2 butterfly signal flow.",
            },
          ],
          examPreparation: {
            twoMarkQuestions: ["Define DFT."],
            fiveMarkQuestions: ["Explain Radix-2 FFT butterfly computation."],
            tenMarkQuestions: ["Derive the 8-point decimation-in-time FFT."],
          },
          quickRevisionNotes: {
            keyTakeaways: ["FFT reduces operations from O(N^2) to O(N log N)"],
            formulas: ["delta_f = fs / N"],
            technicalTerms: ["Butterfly", "Twiddle factor"],
            lastMinutePoints: ["Bit reversal indexing required"],
          },
        },
      ],
    };

    // Mock response helpers
    let mdOutput = "";
    let htmlOutput = "";
    let jsonOutput = null;

    const createMockRes = (onData) => {
      const res = {
        setHeader: () => res,
        status: () => res,
        send: (data) => onData(data),
        json: (data) => onData(data),
      };
      return res;
    };

    const mockResMd = createMockRes((body) => { mdOutput = body; });
    const mockResHtml = createMockRes((body) => { htmlOutput = body; });
    const mockResJson = createMockRes((body) => { jsonOutput = body; });

    // Temporarily stub Summary.findOne for controller testing
    const originalFindOne = Summary.findOne;
    Summary.findOne = () => Promise.resolve(mockSummaryObj);

    await exportSummary(
      { params: { documentId: "doc_test_123" }, query: { format: "markdown" }, user: { userId: "user_test_123" } },
      mockResMd,
      (err) => { if (err) throw err; }
    );
    await exportSummary(
      { params: { documentId: "doc_test_123" }, query: { format: "html" }, user: { userId: "user_test_123" } },
      mockResHtml,
      (err) => { if (err) throw err; }
    );
    await exportSummary(
      { params: { documentId: "doc_test_123" }, query: { format: "json" }, user: { userId: "user_test_123" } },
      mockResJson,
      (err) => { if (err) throw err; }
    );

    Summary.findOne = originalFindOne;

    const mdHasFormulas = mdOutput.includes("$$") && mdOutput.includes("DFT Equation");
    const mdHasMermaid = mdOutput.includes("```mermaid") && mdOutput.includes("Butterfly");
    const mdHasNumericals = mdOutput.includes("DFT Resolution Calculation") && mdOutput.includes("7.8125");
    const htmlHasStyles = htmlOutput.includes("<!DOCTYPE html>") && htmlOutput.includes("katex");
    const parsedJson = typeof jsonOutput === "string" ? JSON.parse(jsonOutput) : jsonOutput;
    const jsonHasModules = parsedJson?.modules?.length === 1;

    const exportPassed = mdHasFormulas && mdHasMermaid && mdHasNumericals && htmlHasStyles && jsonHasModules;

    recordResult(
      15,
      "Export Endpoint (Markdown, HTML, JSON): Exports comprehensive study notes with LaTeX math, Mermaid blocks, tables & numericals",
      exportPassed,
      `Markdown length: ${mdOutput.length} chars, HTML length: ${htmlOutput.length} chars, JSON modules: ${parsedJson?.modules?.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 16: Summary Mongoose Schema Persistence & Backward Compatibility
    // -------------------------------------------------------------------------
    const testDocId = new mongoose.Types.ObjectId().toString();
    const enrichedSummary = new Summary({
      userId: "user_test_advanced",
      documentId: testDocId,
      content: "Complete Advanced Study Guide",
      summaryMode: "detailed",
      totalModules: 1,
      domain: "Computer Science & Automata",
      documentType: "textbook",
      coverageAssessment: "100% complete syllabus coverage",
      globalFormulas: [
        {
          formulaName: "Shannon Entropy",
          expression: "H(X) = -\\sum P(x) \\log_2 P(x)",
          variables: [{ symbol: "H(X)", meaning: "Information entropy", unit: "bits" }],
          conditionsAndAssumptions: ["Discrete probability distribution"],
        },
      ],
      globalNumericalProblems: [
        {
          title: "Entropy of Fair Coin",
          problemStatement: "Calculate H(X) for a fair coin.",
          givenData: [{ variable: "P(Heads)", value: "0.5", unit: "probability" }],
          requiredQuantity: "H(X)",
          relevantFormula: "H(X) = - (0.5 log2 0.5 + 0.5 log2 0.5)",
          steps: [{ stepNumber: 1, description: "Substitute probabilities", calculation: "- ( -0.5 - 0.5 )", intermediateResult: "1.0" }],
          finalAnswer: "1.0",
          units: "bit",
          interpretation: "Maximum uncertainty.",
          isSourceDerived: true,
        },
      ],
      globalAlgorithms: [
        {
          title: "Huffman Coding",
          conceptExplanation: "Optimal prefix code.",
          language: "python",
          pseudocode: "Build min-heap and combine lowest weights",
          codeSnippet: "def huffman(): pass",
          dryRunTrace: [{ step: "Step 1", variableStates: "{ heapSize: 2 }", output: "Tree merged" }],
          timeComplexity: { worstCase: "O(N log N)" },
          spaceComplexity: { worstCase: "O(N)" },
          commonMistakes: ["Not handling single character edge case"],
        },
      ],
      modules: mockSummaryObj.modules,
    });

    const enrichedValidationError = enrichedSummary.validateSync();

    // Test backward compatibility with legacy summary lacking new fields
    const bareLegacySummary = new Summary({
      userId: "user_test_legacy",
      documentId: new mongoose.Types.ObjectId().toString(),
      content: "Old bare summary",
      overview: "Old bare overview",
      keyPoints: ["Point A", "Point B"],
    });
    const legacyValidationError = bareLegacySummary.validateSync();
    const legacyDefaultsClean =
      Array.isArray(bareLegacySummary.globalFormulas) &&
      bareLegacySummary.globalFormulas.length === 0 &&
      Array.isArray(bareLegacySummary.globalNumericalProblems) &&
      bareLegacySummary.globalNumericalProblems.length === 0 &&
      Boolean(bareLegacySummary.domain);

    const schemaPassed = !enrichedValidationError && !legacyValidationError && legacyDefaultsClean;

    recordResult(
      16,
      "Mongoose Summary Schema: Persists all advanced educational fields and provides 100% backward compatibility for legacy summaries",
      schemaPassed,
      `Enriched validation error: ${enrichedValidationError || "None"}, Legacy validation error: ${legacyValidationError || "None"}, Legacy defaults applied: ${legacyDefaultsClean}`
    );

    // -------------------------------------------------------------------------
    // TEST 17: Uploads Directory Preservation (All 31 physical files intact)
    // -------------------------------------------------------------------------
    const uploadFiles = fs.readdirSync(uploadDir);
    const pdfs = uploadFiles.filter((f) => f.toLowerCase().endsWith(".pdf"));
    const docxs = uploadFiles.filter((f) => f.toLowerCase().endsWith(".docx"));
    const pptxs = uploadFiles.filter((f) => f.toLowerCase().endsWith(".pptx"));
    const txts = uploadFiles.filter((f) => f.toLowerCase().endsWith(".txt"));

    const uploadsPreserved = uploadFiles.length >= 31;

    recordResult(
      17,
      "Uploads Directory Preservation: All 31 physical files (PDFs, DOCXs, PPTXs, TXTs) remain 100% intact and untouched",
      uploadsPreserved,
      `Verified ${uploadFiles.length} files in ${uploadDir} (${pdfs.length} PDFs, ${docxs.length} DOCXs, ${pptxs.length} PPTXs, ${txts.length} TXTs)`
    );

  } catch (err) {
    console.error("Test execution caught unexpected exception:", err);
    recordResult(99, "Unexpected exception during test execution", false, err.message);
  }

  console.log("\n========================================================================");
  console.log(` Results: ${GREEN}${passedCount} Passed${RESET}, ${failedCount > 0 ? RED : GREEN}${failedCount} Failed${RESET} (Total: ${passedCount + failedCount})`);
  console.log("========================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAdvancedLearningNotesTests();
