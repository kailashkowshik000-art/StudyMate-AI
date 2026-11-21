import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const topicSchema = new mongoose.Schema(
  {
    heading: { type: String, default: "" },
    definition: { type: String, default: "" },
    explanation: { type: String, default: "" },
    workingPrinciples: { type: String, default: "" },
    architecture: { type: String, default: "" },
    characteristics: { type: [String], default: [] },
    components: { type: [String], default: [] },
    applications: { type: [String], default: [] },
    advantages: { type: [String], default: [] },
    disadvantages: { type: [String], default: [] },
    examples: { type: [String], default: [] },
    relatedConcepts: { type: [String], default: [] },
    importantObservations: { type: [String], default: [] },
    tables: { type: [String], default: [] }, // Markdown table strings
  },
  { _id: false }
);

const diagramSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    diagramType: { type: String, default: "architecture" }, // flowchart | architecture | sequence | erDiagram | classDiagram | stateDiagram | conceptMap | networkTopology
    mermaidCode: { type: String, default: "" }, // Valid Mermaid diagram code
    svgCode: { type: String, default: "" }, // Fallback vector SVG geometry
    description: { type: String, default: "" },
    components: { type: [String], default: [] },
    workflow: { type: [String], default: [] },
    technicalExplanation: { type: String, default: "" },
  },
  { _id: false }
);

const comparisonTableSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    markdown: { type: String, default: "" },
  },
  { _id: false }
);

const definitionItemSchema = new mongoose.Schema(
  {
    term: { type: String, default: "" },
    definition: { type: String, default: "" },
  },
  { _id: false }
);

const questionAnswerSchema = new mongoose.Schema(
  {
    question: { type: String, default: "" },
    answer: { type: String, default: "" },
  },
  { _id: false }
);

const examPrepSchema = new mongoose.Schema(
  {
    twoMarkQuestions: { type: [String], default: [] },
    fiveMarkQuestions: { type: [String], default: [] },
    tenMarkQuestions: { type: [String], default: [] },
    shortAnswerQuestions: { type: [questionAnswerSchema], default: [] },
    longAnswerQuestions: { type: [questionAnswerSchema], default: [] },
    importantDifferences: { type: [String], default: [] },
  },
  { _id: false }
);

const quickRevisionSchema = new mongoose.Schema(
  {
    keyTakeaways: { type: [String], default: [] },
    formulas: { type: [String], default: [] },
    technicalTerms: { type: [String], default: [] },
    lastMinutePoints: { type: [String], default: [] },
  },
  { _id: false }
);

const formulaVariableSchema = new mongoose.Schema(
  {
    symbol: { type: String, default: "" },
    meaning: { type: String, default: "" },
    unit: { type: String, default: "" },
  },
  { _id: false }
);

const formulaSchema = new mongoose.Schema(
  {
    formulaName: { type: String, default: "" },
    expression: { type: String, default: "" }, // LaTeX / KaTeX math notation
    variables: { type: [formulaVariableSchema], default: [] },
    conditionsAndAssumptions: { type: [String], default: [] },
    explanation: { type: String, default: "" },
    practicalApplication: { type: String, default: "" },
    solvedExample: {
      problem: { type: String, default: "" },
      solutionSteps: { type: [String], default: [] },
      finalAnswer: { type: String, default: "" },
    },
  },
  { _id: false }
);

const calculationStepSchema = new mongoose.Schema(
  {
    stepNumber: { type: Number, default: 1 },
    description: { type: String, default: "" },
    calculation: { type: String, default: "" },
    intermediateResult: { type: String, default: "" },
  },
  { _id: false }
);

const numericalProblemSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    problemStatement: { type: String, default: "" },
    givenData: {
      type: [
        {
          variable: { type: String, default: "" },
          value: { type: String, default: "" },
          unit: { type: String, default: "" },
        },
      ],
      default: [],
    },
    requiredQuantity: { type: String, default: "" },
    relevantFormula: { type: String, default: "" },
    steps: { type: [calculationStepSchema], default: [] },
    finalAnswer: { type: String, default: "" },
    units: { type: String, default: "" },
    interpretation: { type: String, default: "" },
    isSourceDerived: { type: Boolean, default: true },
  },
  { _id: false }
);

const dryRunStepSchema = new mongoose.Schema(
  {
    step: { type: String, default: "" },
    variableStates: { type: mongoose.Schema.Types.Mixed, default: "" },
    output: { type: String, default: "" },
  },
  { _id: false }
);

const algorithmSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    conceptExplanation: { type: String, default: "" },
    language: { type: String, default: "pseudocode" },
    steps: { type: [String], default: [] },
    pseudocode: { type: String, default: "" },
    codeSnippet: { type: String, default: "" },
    codeExplanation: { type: String, default: "" },
    sampleInput: { type: String, default: "" },
    sampleOutput: { type: String, default: "" },
    dryRunTrace: { type: [dryRunStepSchema], default: [] },
    timeComplexity: {
      best: { type: String, default: "" },
      average: { type: String, default: "" },
      worst: { type: String, default: "" },
      explanation: { type: String, default: "" },
    },
    spaceComplexity: {
      complexity: { type: String, default: "" },
      explanation: { type: String, default: "" },
    },
    commonMistakes: { type: [String], default: [] },
    flowchartMermaid: { type: String, default: "" },
  },
  { _id: false }
);

const qualityAuditSchema = new mongoose.Schema(
  {
    auditId: { type: String, default: "" },
    auditedAt: { type: Date, default: Date.now },
    overallQualityScore: { type: Number, default: 100 },
    groundingScore: { type: Number, default: 100 },
    verificationStatus: {
      type: String,
      enum: ["VERIFIED", "PARTIALLY_VERIFIED", "NEEDS_ATTENTION", "UNVERIFIED"],
      default: "VERIFIED",
    },
    coverage: {
      topicCoveragePercentage: { type: Number, default: 100 },
      conceptCoveragePercentage: { type: Number, default: 100 },
      formulaCoveragePercentage: { type: Number, default: 100 },
      totalSourceTopics: { type: Number, default: 0 },
      coveredSourceTopics: { type: Number, default: 0 },
      coveredTopics: { type: [String], default: [] },
      missingTopics: { type: [String], default: [] },
      coveredConcepts: { type: [String], default: [] },
      missingConcepts: { type: [String], default: [] },
      missingFormulas: { type: [String], default: [] },
    },
    formulaVerification: {
      totalFormulas: { type: Number, default: 0 },
      verifiedCount: { type: Number, default: 0 },
      flaggedCount: { type: Number, default: 0 },
      items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    },
    numericalVerification: {
      totalProblems: { type: Number, default: 0 },
      verifiedCount: { type: Number, default: 0 },
      discrepancyCount: { type: Number, default: 0 },
      requiresReviewCount: { type: Number, default: 0 },
      items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    },
    diagramValidation: {
      totalDiagrams: { type: Number, default: 0 },
      validCount: { type: Number, default: 0 },
      flaggedCount: { type: Number, default: 0 },
      items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    },
    algorithmValidation: {
      totalAlgorithms: { type: Number, default: 0 },
      validCount: { type: Number, default: 0 },
      flaggedCount: { type: Number, default: 0 },
      items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    },
    groundingAudit: {
      sourceGroundedCount: { type: Number, default: 0 },
      supplementaryCount: { type: Number, default: 0 },
      unsupportedCount: { type: Number, default: 0 },
      items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    },
    actionableImprovements: {
      type: [
        {
          id: { type: String, default: "" },
          type: { type: String, default: "missing_topic" },
          title: { type: String, default: "" },
          description: { type: String, default: "" },
          targetModuleIndex: { type: Number, default: 0 },
          targetTopic: { type: String, default: "" },
          status: { type: String, default: "pending" },
        },
      ],
      default: [],
    },
  },
  { _id: false }
);

const moduleNotesSchema = new mongoose.Schema(
  {
    moduleNumber: { type: Number, default: 1 },
    title: { type: String, default: "Module Overview" },
    overview: { type: String, default: "" },
    learningObjectives: { type: [String], default: [] },
    importantTopicsCovered: { type: [String], default: [] },
    topics: { type: [topicSchema], default: [] },
    comparisonTables: { type: [comparisonTableSchema], default: [] },
    importantDefinitions: { type: [definitionItemSchema], default: [] },
    diagramsAndProcesses: { type: [diagramSchema], default: [] },
    formulas: { type: [formulaSchema], default: [] },
    formulasAndEquations: { type: [formulaSchema], default: [] },
    numericalProblems: { type: [numericalProblemSchema], default: [] },
    algorithms: { type: [algorithmSchema], default: [] },
    algorithmsAndCode: { type: [algorithmSchema], default: [] },
    examPreparation: { type: examPrepSchema, default: () => ({}) },
    quickRevisionNotes: { type: quickRevisionSchema, default: () => ({}) },
    sourceReferences: { type: [String], default: [] },
  },
  { _id: false }
);

const summarySchema = new mongoose.Schema(
  {
    summaryId: {
      type: String,
      unique: true,
      default: () => `sum_${uuidv4().replace(/-/g, "").slice(0, 12)}`,
    },
    userId: {
      type: String,
      required: [true, "userId is required"],
      index: true,
    },
    documentId: {
      type: String,
      required: [true, "documentId is required"],
      index: true,
    },
    title: {
      type: String,
      default: "Document Summary",
    },
    summaryMode: {
      type: String,
      enum: ["detailed", "comprehensive", "concise", "exam", "revision"],
      default: "detailed",
    },
    domain: {
      type: String,
      default: "Computer Science & Engineering",
    },
    documentType: {
      type: String,
      default: "Academic Course Material",
    },
    coverageAssessment: {
      type: String,
      default: "Comprehensive multi-module syllabus coverage",
    },
    // Top-level executive overview (backward-compatible)
    content: {
      type: String,
      required: [true, "Summary content is required"],
    },
    // Top-level key points (backward-compatible)
    keyPoints: {
      type: [String],
      default: [],
    },
    // Top-level concepts (backward-compatible)
    importantConcepts: {
      type: [
        {
          term: String,
          explanation: String,
        },
      ],
      default: [],
    },
    // Top-level exam tips (backward-compatible)
    examTips: {
      type: [String],
      default: [],
    },
    // Comprehensive module-wise engineering notes
    modules: {
      type: [moduleNotesSchema],
      default: [],
    },
    // Global comparison tables extracted from document
    globalComparisonTables: {
      type: [comparisonTableSchema],
      default: [],
    },
    // Global definitions dictionary
    definitions: {
      type: [definitionItemSchema],
      default: [],
    },
    // Global formulas collection
    globalFormulas: {
      type: [formulaSchema],
      default: [],
    },
    // Global numerical problems collection
    globalNumericalProblems: {
      type: [numericalProblemSchema],
      default: [],
    },
    // Global algorithms collection
    globalAlgorithms: {
      type: [algorithmSchema],
      default: [],
    },
    // Global categorized exam questions
    examQuestions: {
      type: examPrepSchema,
      default: () => ({}),
    },
    // Global quick revision capsule
    quickRevision: {
      type: quickRevisionSchema,
      default: () => ({}),
    },
    sourceReferences: {
      type: [String],
      default: [],
    },
    totalModules: {
      type: Number,
      default: 1,
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    qualityAudit: {
      type: qualityAuditSchema,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast user document summary queries
summarySchema.index({ userId: 1, documentId: 1, createdAt: -1 });

export const Summary = mongoose.model("Summary", summarySchema);
export default Summary;
