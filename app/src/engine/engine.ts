// DealSpine pricing engine — PURE module (no imports outside src/engine/).
// Verbatim TypeScript port of compute(), computeTokenEconomics(), makePreset()
// and PRESETS from ../../AI-SAP-Pricing-Calculator.jsx. Every field name is
// kept identical to the JSX so the reference UI copy maps 1:1.

export const ENGINE_VERSION = "1.0.0";

// ————— LLM model tiers (indicative list prices, $ per 1M tokens, July 2026 — reprice quarterly) —————
export const TIERS = {
  frontier: { name: "Frontier — Opus 4.8 / GPT-5.6 class", pin: 5, pout: 25 },
  workhorse: { name: "Workhorse — Sonnet 4.6 / Gemini 3.1 Pro class", pin: 3, pout: 15 },
  efficient: { name: "Efficient — Haiku 4.5 / Flash class", pin: 1, pout: 5 },
  saphub: { name: "SAP GenAI Hub / ABAP-tuned (AI Units)", pin: 3, pout: 15 },
  customRates: { name: "Custom rates", pin: null, pout: null },
} as const;

export const MODELS = [
  { id: "tm", label: "T&M pass-through", note: "AI delivery hours × old rate — the margin trap" },
  { id: "premium", label: "Premium-rate T&M", note: "AI delivery hours × rate + premium — a bridge" },
  { id: "value", label: "Per-unit value price", note: "Validated alternative cost − customer discount" },
  { id: "subscription", label: "Solution subscription", note: "Implementation + recurring fee + overages" },
] as const;

// Policy floor for the platform-IP reinvestment carve-out (fraction of revenue).
// Rework and warranty reserves are project COGS and are never netted against it.
export const MIN_PLATFORM_REINVESTMENT_PCT = 0.03;

const pct = (v: unknown): number => (Number(v) || 0) / 100;
const safe = (v: unknown, fallback = 0): number =>
  Number.isFinite(Number(v)) ? Number(v) : fallback;
const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

// ————— Types (field names identical to the JSX) —————

export type PricingModelId = "tm" | "premium" | "value" | "subscription";

export interface ComplexityTier {
  id: string;
  label: string;
  mixPct: number;
  hrsPerUnit: number;
  aiCoverage: number;
  effortReduction: number;
  reviewCoveragePct: number;
  reviewHours: number;
  reworkRatePct: number;
  tokenFactor: number;
  publishedPrice: number;
}

export interface RoleRate {
  id: string;
  label: string;
  sharePct: number;
  rate: number;
  location: string;
}

export interface ModelRoute {
  id: string;
  label: string;
  sharePct: number;
  pin: number;
  pout: number;
}

/** The base numbers a preset starts from (the argument to makePreset). */
export interface PresetBaseInput {
  name: string;
  tagline: string;
  unit: string;
  unitPlural: string;
  populationLabel: string;
  scopeLabel: string;
  totalUnits: number;
  scopePct: number;
  hrsPerUnit: number;
  billRate: number;
  costRate: number;
  aiCoverage: number;
  effortReduction: number;
  qaAddBack: number;
  platformCost: number;
  teamFtes: number;
  openingBandPct: number;
  llmTier: string;
  priceIn: number;
  priceOut: number;
  tokensInK: number;
  tokensOutK: number;
  agentOverheadPct: number;
  tokenDiscountPct: number;
  pricingModel: PricingModelId;
  premiumPct: number;
  discountPct: number;
}

/** The full engine input parameter set: a base expanded by makePreset. */
export interface PresetInput extends PresetBaseInput {
  // Application and policy floor
  applyRiskAdjustments: boolean;
  quoteStage: string;
  minGrossMarginPct: number;
  profitGrowthPct: number;
  minimumEngagementFee: number;
  generalContingencyPct: number;
  platformReinvestmentPct: number;
  opportunityCost: number;
  customerAlternativeFactorPct: number;
  customerAlternativeValue: number;
  willingnessToPayPct: number;
  costOfDelayValue: number;
  valueCapturePct: number;
  winProbabilityPct: number;
  bidCost: number;

  // Competitive context
  dealContext: string;
  competingBidAmount: number;
  bidEvidence: string;
  gmMinDefensePct: number;
  switchingPremiumPct: number;
  cNextGenPct: number;
  eNextGenPct: number;

  // Baseline evidence and scope
  baselineType: string;
  baselineSource: string;
  baselineConfidence: string;
  baselineAgeMonths: number;
  maxBaselineAgeMonths: number;
  scopeConfidencePct: number;
  scopeImpactPct: number;
  unclassifiedUnitsPct: number;
  unclassifiedPremiumPct: number;
  mixDriftProbabilityPct: number;
  mixDriftPct: number;
  complexityPremiumPct: number;
  complexityMixTolerancePct: number;
  dependencyRiskPct: number;
  tailComplexityPct: number;
  tailPremiumPct: number;
  reuseCreditPct: number;
  customerInputRiskPct: number;
  customerDelayProbabilityPct: number;
  customerDelayWeeks: number;
  weeklyBurnRate: number;
  changeThresholdPct: number;
  minimumCommitmentUnits: number;
  unitAcceptanceDefined: boolean;
  customerResponsibilitiesDefined: boolean;
  scopeEvidenceApproved: boolean;
  standaloneTierQuote: boolean;
  quotedAtTierPrices: boolean;
  trueUpDefined: boolean;

  // Optional class-by-class economics
  complexityModelEnabled: boolean;
  complexityTiers: ComplexityTier[];

  // Labor, QA and capacity realization
  advancedLaborEnabled: boolean;
  roleRates: RoleRate[];
  directQaEnabled: boolean;
  reviewCoveragePct: number;
  reviewHoursPerCoveredUnit: number;
  reviewerRate: number;
  qaExitReworkPct: number;
  qaSamplePct: number;
  pmoHoursPct: number;
  pmoRate: number;
  architectureHoursPct: number;
  architectureRate: number;
  securityReviewHours: number;
  securityReviewRate: number;
  avoidableLaborPct: number;
  redeployProbabilityPct: number;
  redeployLagWeeks: number;
  scarceCapacityPremiumPct: number;

  // One-time and non-production delivery cost
  discoveryCost: number;
  setupCost: number;
  integrationCost: number;
  securityComplianceCost: number;
  evaluationCost: number;
  trainingCost: number;
  shutdownCost: number;

  // Platform allocation
  autoPlatformAllocation: boolean;
  platformInvestment: number;
  platformUsefulLifeYears: number;
  annualPlatformUnits: number;
  platformRecoveryPct: number;

  // Quality, rework and warranty
  reworkRatePct: number;
  reworkHoursPerUnit: number;
  reworkCycles: number;
  reworkLaborRate: number;
  warrantyClaimRatePct: number;
  warrantyHoursPerClaim: number;
  warrantyCycles: number;
  warrantyLaborRate: number;
  warrantyMonths: number;
  warrantyCapPct: number;
  escapedDefectProbabilityPct: number;
  escapedDefectImpact: number;
  escapedDefectUninsuredPct: number;
  firstPassTargetPct: number;
  atcPassTargetPct: number;
  regressionPassTargetPct: number;
  defectEscapeTargetPct: number;

  // Advanced token economics and model routing
  advancedTokenModelEnabled: boolean;
  modelRoutes: ModelRoute[];
  cacheEligiblePct: number;
  cacheHitPct: number;
  cachedInputDiscountPct: number;
  batchSharePct: number;
  batchDiscountPct: number;
  longContextSharePct: number;
  longContextSurchargePct: number;
  loopCap: number;
  modelPriceVolatilityPct: number;
  embeddingVectorCost: number;
  nonTokenAiCost: number;
  privateEndpointCost: number;
  observabilityCost: number;
  modelMigrationReserve: number;
  vendorMinimumCommitment: number;
  exactModelName: string;
  modelVersion: string;
  promptVersion: string;
  agentVersion: string;
  endpointRegion: string;
  modelRateAgeMonths: number;
  maxModelRateAgeMonths: number;

  // Throughput and elapsed time
  productiveHoursPerFteMonth: number;
  parallelizabilityPct: number;
  environmentAvailabilityPct: number;
  rateLimitDelayPct: number;

  // Commercial and financial economics
  salesCommissionPct: number;
  channelFeePct: number;
  paymentDays: number;
  annualWorkingCapitalPct: number;
  withholdingTaxPct: number;
  badDebtProbabilityPct: number;
  lossGivenDefaultPct: number;
  fxExposurePct: number;
  fxVolatilityPct: number;
  hedgedPct: number;
  annualInflationPct: number;
  deliveryYears: number;
  travelCost: number;
  thirdPartyCost: number;
  countryRiskPremiumPct: number;
  cancellationProbabilityPct: number;
  cancellationExposure: number;
  underConsumptionProbabilityPct: number;
  underConsumptionExposure: number;
  quoteValidityDays: number;
  accountSegment: string;
  industryRisk: string;

  // Subscription model
  subscriptionAnnualFee: number;
  subscriptionIncludedUnits: number;
  subscriptionExpectedAnnualUnits: number;
  subscriptionOveragePrice: number;
  subscriptionTermYears: number;
  subscriptionUpliftPct: number;
  subscriptionImplementationFee: number;
  subscriptionSupportCostPct: number;
  subscriptionAnnualPlatformOps: number;
  subscriptionChurnProbabilityPct: number;
  subscriptionCapacityReservePct: number;

  // SLA, legal and regulatory risk
  slaBreachProbabilityPct: number;
  serviceCreditPct: number;
  availabilityTargetPct: number;
  acceptanceDays: number;
  committedUnitsPerWeek: number;
  continuityTermsDefined: boolean;
  liabilityEventProbabilityPct: number;
  liabilityImpact: number;
  liabilityUninsuredPct: number;
  liabilityCapPct: number;
  regulatoryEventProbabilityPct: number;
  regulatoryImpact: number;
  regulatoryUninsuredPct: number;
  dataClassification: string;
  securityApproved: boolean;
  dataResidencyApproved: boolean;
  dataRightsApproved: boolean;
  ipApproved: boolean;
  warrantyDefined: boolean;
  slaDefined: boolean;
  paymentTermsApproved: boolean;
  legalTermsApproved: boolean;
  approvalMatrixDefined: boolean;

  // Evidence and governance
  quoteId: string;
  engagementId: string;
  policyVersion: string;
  parameterSetVersion: string;
  effectiveDate: string;
  quoteOwner: string;
  deliveryOwner: string;
  financeApprover: string;
  sampleUnits: number;
  minimumSampleUnits: number;
  sampleProjects: number;
  minimumProjects: number;
  sampleCustomers: number;
  minimumCustomers: number;
  confidenceLevelPct: number;
  marginOfErrorPct: number;
  dataRecencyMonths: number;
  maxDataRecencyMonths: number;
  weightingMethod: string;
  outlierMethod: string;
  evidenceGrade: string;
  calibrationConfirmed: boolean;
  subscriptionEvidenceConfirmed: boolean;
  policyOverrideApproved: boolean;
  overrideRationale: string;
}

export interface Adjustment {
  label: string;
  category: string;
  amount: number;
  note: string;
  recurring: boolean;
}

export interface TierMetric extends ComplexityTier {
  units: number;
  hours: number;
  covered: number;
  saved: number;
  review: number;
  tokens: number;
  reworkUnits: number;
}

export interface Gate {
  label: string;
  pass: boolean;
  severity: "hard" | "warning";
}

export interface Scenario {
  model: PricingModelId;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
  revPerHour: number;
  pricePerUnit: number;
  customerSavings: number;
  customerReference: number;
  baseReferenceCost: number;
  riskAdjustment: number;
  modeledRiskAdjustment: number;
  riskAdjustmentPct: number;
  modeledRiskAdjustmentPct: number;
  positiveRisk: number;
  mitigation: number;
  riskBreakdown: Adjustment[];
  expectedContribution: number;
  /** Assigned after all four scenarios are built (as in the reference). */
  gpPerTotalHour: number;
}

export interface Governance {
  level: number;
  title: string;
  message: string;
  override: boolean;
  noBid: boolean;
}

export interface TokenEconomics {
  tokenPerUnit: number;
  weightedIn: number;
  weightedOut: number;
  routeTotal: number;
}

export interface EngineResult {
  unitsInScope: number;
  tradHours: number;
  tradRevenue: number;
  tradCost: number;
  tradProfit: number;
  tradMarginPct: number;
  tradPricePerUnit: number;
  coveredUnits: number;
  savedHours: number;
  productionHours: number;
  qaHours: number;
  aiHours: number;
  deliveryHours: number;
  pmoHours: number;
  architectureHours: number;
  securityReviewHours: number;
  weightedProductionRate: number;
  laborCost: number;
  tokenCost: number;
  tokenPerUnit: number;
  weightedTokenInRate: number;
  weightedTokenOutRate: number;
  effectivePlatformCost: number;
  baseAiCost: number;
  baseAiCostPerUnit: number;
  tierMetrics: TierMetric[];
  tierMixTotal: number;
  routeMixTotal: number;
  adjustments: Adjustment[];
  preNet: number;
  projectVariableRate: number;
  validatedAlternative: number;
  willingnessCeiling: number;
  anchorUnvalidated: boolean;
  contested: boolean;
  contestedValid: boolean;
  competitorCeiling: number;
  fixedRiskAdjustedCost: number;
  targetProfit: number;
  marginFloorRevenue: number;
  profitFloorRevenue: number;
  requiredRevenue: number;
  uncontestedFloorRevenue: number;
  defenseFloorRevenue: number;
  reinvestmentFunded: number;
  dStarProjected: number;
  expectedReworkHours: number;
  expectedWarrantyHours: number;
  totalDeliveryHours: number;
  requiredPricePerUnit: number;
  maxSafeDiscount: number;
  riskBreakevenDiscount: number;
  legacyBreakevenDiscount: number;
  tradMonths: number;
  aiMonths: number;
  monthlyCapacity: number;
  tm: Scenario;
  premium: Scenario;
  value: Scenario;
  subscription: Scenario;
  selected: Scenario;
  gates: Gate[];
  hardFailures: Gate[];
  warnings: Gate[];
  statisticalPass: boolean;
  governance: Governance;
  grossProductivitySavings: number;
  riskAbsorption: number;
  customerDiscount: number;
  partnerIncrementalProfit: number;
}

// ————— makePreset —————

export function makePreset(base: PresetBaseInput): PresetInput {
  const scopedUnits = Math.round(base.totalUnits * pct(base.scopePct));
  const tradRevenue = scopedUnits * base.hrsPerUnit * base.billRate;
  const tradUnitPrice = base.hrsPerUnit * base.billRate;
  const seniorRate = Math.round(base.costRate * 1.55);
  const weeklyBurn = Math.round(base.teamFtes * 35 * base.costRate);

  return {
    ...base,

    // Application and policy floor
    applyRiskAdjustments: true,
    quoteStage: "Pilot",
    minGrossMarginPct: 35,
    profitGrowthPct: 0,
    minimumEngagementFee: Math.round(tradRevenue * 0.2),
    generalContingencyPct: 3,
    platformReinvestmentPct: 3,
    opportunityCost: 0,
    customerAlternativeFactorPct: 100,
    customerAlternativeValue: 0,
    willingnessToPayPct: 95,
    costOfDelayValue: 0,
    valueCapturePct: 20,
    winProbabilityPct: 60,
    bidCost: 10000,

    // Competitive context — the anchor is the customer's best validated
    // alternative, not our rate card; a verified rival bid changes the floor.
    dealContext: "Uncontested",
    competingBidAmount: 0,
    bidEvidence: "None",
    gmMinDefensePct: 18,
    switchingPremiumPct: 10,
    // Capability drift: where the naive floor moves when the next model
    // generation lands — the exposure an AI-native rival will price against.
    cNextGenPct: 95,
    eNextGenPct: 85,

    // Baseline evidence and scope
    baselineType: "Historical delivery / rate card",
    baselineSource: "ATC or readiness scan plus historical actuals",
    baselineConfidence: "Medium",
    baselineAgeMonths: 1,
    maxBaselineAgeMonths: 12,
    scopeConfidencePct: 85,
    scopeImpactPct: 30,
    unclassifiedUnitsPct: 5,
    unclassifiedPremiumPct: 75,
    mixDriftProbabilityPct: 20,
    mixDriftPct: 10,
    complexityPremiumPct: 60,
    complexityMixTolerancePct: 10,
    dependencyRiskPct: 2,
    tailComplexityPct: 5,
    tailPremiumPct: 50,
    reuseCreditPct: 1,
    customerInputRiskPct: 1.5,
    customerDelayProbabilityPct: 20,
    customerDelayWeeks: 1,
    weeklyBurnRate: weeklyBurn,
    changeThresholdPct: 10,
    minimumCommitmentUnits: 0,
    // Attestations default to FALSE: a fresh deal must earn its checkmarks.
    // Their gates are warnings at Pilot stage and hard blocks at Production.
    unitAcceptanceDefined: false,
    customerResponsibilitiesDefined: false,
    scopeEvidenceApproved: false,
    standaloneTierQuote: false,
    quotedAtTierPrices: false,
    trueUpDefined: false,

    // Optional class-by-class economics
    complexityModelEnabled: false,
    complexityTiers: [
      {
        id: "simple",
        label: "Simple",
        mixPct: 45,
        hrsPerUnit: Number((base.hrsPerUnit * 0.45).toFixed(2)),
        aiCoverage: clamp(base.aiCoverage + 10, 0, 100),
        effortReduction: clamp(base.effortReduction + 10, 0, 95),
        reviewCoveragePct: 100,
        reviewHours: Number(Math.max(0.05, base.hrsPerUnit * 0.04).toFixed(2)),
        reworkRatePct: 1,
        tokenFactor: 0.55,
        // Published tier prices follow the deck's rate card (case example: $120/$260/$520,
        // i.e. the traditional unit price with the value discount already reflected).
        publishedPrice: Math.round((tradUnitPrice * 0.36) / 5) * 5,
      },
      {
        id: "medium",
        label: "Medium",
        mixPct: 35,
        hrsPerUnit: Number((base.hrsPerUnit * 1.05).toFixed(2)),
        aiCoverage: base.aiCoverage,
        effortReduction: base.effortReduction,
        reviewCoveragePct: 100,
        reviewHours: Number(Math.max(0.1, base.hrsPerUnit * 0.08).toFixed(2)),
        reworkRatePct: 2,
        tokenFactor: 1,
        publishedPrice: Math.round((tradUnitPrice * 0.78) / 5) * 5,
      },
      {
        id: "complex",
        label: "Complex",
        mixPct: 20,
        hrsPerUnit: Number((base.hrsPerUnit * 2.2).toFixed(2)),
        aiCoverage: clamp(base.aiCoverage - 30, 0, 100),
        effortReduction: clamp(base.effortReduction - 25, 0, 90),
        reviewCoveragePct: 100,
        reviewHours: Number(Math.max(0.2, base.hrsPerUnit * 0.18).toFixed(2)),
        reworkRatePct: 4,
        tokenFactor: 1.8,
        publishedPrice: Math.round((tradUnitPrice * 1.56) / 5) * 5,
      },
    ],

    // Labor, QA and capacity realization
    advancedLaborEnabled: false,
    roleRates: [
      { id: "junior", label: "Junior consultant", sharePct: 30, rate: Math.round(base.costRate * 0.75), location: "Offshore" },
      { id: "senior", label: "Senior consultant", sharePct: 32, rate: Math.round(base.costRate * 1.1), location: "Nearshore" },
      { id: "architect", label: "Solution architect", sharePct: 10, rate: Math.round(base.costRate * 1.75), location: "Onshore" },
      { id: "ai", label: "AI / workflow engineer", sharePct: 18, rate: Math.round(base.costRate * 1.45), location: "Mixed" },
      { id: "test", label: "Test engineer", sharePct: 10, rate: Math.round(base.costRate * 0.95), location: "Mixed" },
    ],
    directQaEnabled: false,
    reviewCoveragePct: 100,
    reviewHoursPerCoveredUnit: Number(Math.max(0.1, base.hrsPerUnit * 0.06).toFixed(2)),
    reviewerRate: seniorRate,
    qaExitReworkPct: 2,
    qaSamplePct: 25,
    pmoHoursPct: 0,
    pmoRate: Math.round(base.costRate * 1.35),
    architectureHoursPct: 0,
    architectureRate: Math.round(base.costRate * 1.75),
    securityReviewHours: 0,
    securityReviewRate: Math.round(base.costRate * 1.8),
    avoidableLaborPct: 80,
    redeployProbabilityPct: 70,
    redeployLagWeeks: 4,
    scarceCapacityPremiumPct: 0,

    // One-time and non-production delivery cost
    discoveryCost: 0,
    setupCost: 0,
    integrationCost: 0,
    securityComplianceCost: 5000,
    evaluationCost: 0,
    trainingCost: 0,
    shutdownCost: 0,

    // Platform allocation
    autoPlatformAllocation: false,
    platformInvestment: 300000,
    platformUsefulLifeYears: 3,
    annualPlatformUnits: 50000,
    platformRecoveryPct: 100,

    // Quality, rework and warranty
    reworkRatePct: 2,
    reworkHoursPerUnit: Number(Math.max(0.5, base.hrsPerUnit * 0.4).toFixed(2)),
    reworkCycles: 1,
    reworkLaborRate: seniorRate,
    warrantyClaimRatePct: 1,
    warrantyHoursPerClaim: Number(Math.max(0.5, base.hrsPerUnit * 0.6).toFixed(2)),
    warrantyCycles: 1,
    warrantyLaborRate: seniorRate,
    warrantyMonths: 3,
    warrantyCapPct: 20,
    escapedDefectProbabilityPct: 2,
    escapedDefectImpact: 50000,
    escapedDefectUninsuredPct: 50,
    firstPassTargetPct: 98,
    atcPassTargetPct: 99,
    regressionPassTargetPct: 98,
    defectEscapeTargetPct: 0.5,

    // Advanced token economics and model routing
    advancedTokenModelEnabled: false,
    modelRoutes: [
      { id: "efficient", label: "Efficient", sharePct: 20, pin: 1, pout: 5 },
      { id: "workhorse", label: "Workhorse", sharePct: 65, pin: 3, pout: 15 },
      { id: "frontier", label: "Frontier", sharePct: 10, pin: 5, pout: 25 },
      { id: "saphub", label: "SAP-native", sharePct: 5, pin: 3, pout: 15 },
    ],
    cacheEligiblePct: 60,
    cacheHitPct: 50,
    cachedInputDiscountPct: 90,
    batchSharePct: 50,
    batchDiscountPct: 50,
    longContextSharePct: 10,
    longContextSurchargePct: 25,
    loopCap: 5,
    modelPriceVolatilityPct: 20,
    embeddingVectorCost: 0,
    nonTokenAiCost: 3000,
    privateEndpointCost: 0,
    observabilityCost: 2000,
    modelMigrationReserve: 3000,
    vendorMinimumCommitment: 0,
    exactModelName: "Approved routed model set",
    modelVersion: "Current approved snapshot",
    promptVersion: "v1.0",
    agentVersion: "v1.0",
    endpointRegion: "Customer-approved region",
    modelRateAgeMonths: 0,
    maxModelRateAgeMonths: 3,

    // Throughput and elapsed time
    productiveHoursPerFteMonth: 140,
    parallelizabilityPct: 100,
    environmentAvailabilityPct: 100,
    rateLimitDelayPct: 0,

    // Commercial and financial economics
    salesCommissionPct: 3,
    channelFeePct: 0,
    paymentDays: 60,
    annualWorkingCapitalPct: 8,
    withholdingTaxPct: 0,
    badDebtProbabilityPct: 1,
    lossGivenDefaultPct: 50,
    fxExposurePct: 0,
    fxVolatilityPct: 5,
    hedgedPct: 100,
    annualInflationPct: 4,
    deliveryYears: 0.5,
    travelCost: 0,
    thirdPartyCost: 0,
    countryRiskPremiumPct: 0,
    cancellationProbabilityPct: 5,
    cancellationExposure: 10000,
    underConsumptionProbabilityPct: 0,
    underConsumptionExposure: 0,
    quoteValidityDays: 30,
    accountSegment: "Strategic account",
    industryRisk: "Standard",

    // Subscription model
    subscriptionAnnualFee: Math.round(tradRevenue * 0.35),
    subscriptionIncludedUnits: scopedUnits,
    subscriptionExpectedAnnualUnits: scopedUnits,
    subscriptionOveragePrice: Math.round(tradUnitPrice * 0.75),
    subscriptionTermYears: 3,
    subscriptionUpliftPct: 4,
    subscriptionImplementationFee: base.platformCost + 10000,
    subscriptionSupportCostPct: 18,
    subscriptionAnnualPlatformOps: 25000,
    subscriptionChurnProbabilityPct: 5,
    subscriptionCapacityReservePct: 5,

    // SLA, legal and regulatory risk
    slaBreachProbabilityPct: 5,
    serviceCreditPct: 5,
    availabilityTargetPct: 99.5,
    acceptanceDays: 10,
    committedUnitsPerWeek: 0,
    continuityTermsDefined: false,
    liabilityEventProbabilityPct: 1,
    liabilityImpact: 100000,
    liabilityUninsuredPct: 25,
    liabilityCapPct: 100,
    regulatoryEventProbabilityPct: 0.5,
    regulatoryImpact: 100000,
    regulatoryUninsuredPct: 50,
    dataClassification: "Confidential",
    securityApproved: false,
    dataResidencyApproved: false,
    dataRightsApproved: false,
    ipApproved: false,
    warrantyDefined: false,
    slaDefined: false,
    paymentTermsApproved: false,
    legalTermsApproved: false,
    approvalMatrixDefined: false,

    // Evidence and governance
    quoteId: "DRAFT-001",
    engagementId: "",
    policyVersion: "2.0-risk-adjusted",
    parameterSetVersion: "2026-Q3",
    effectiveDate: "2026-07-01",
    quoteOwner: "",
    deliveryOwner: "",
    financeApprover: "",
    sampleUnits: 12,
    minimumSampleUnits: 500,
    sampleProjects: 1,
    minimumProjects: 3,
    sampleCustomers: 1,
    minimumCustomers: 2,
    confidenceLevelPct: 95,
    marginOfErrorPct: 5,
    dataRecencyMonths: 1,
    maxDataRecencyMonths: 6,
    weightingMethod: "Baseline-hour weighted",
    outlierMethod: "Winsorize and investigate",
    evidenceGrade: "Preset assumption",
    calibrationConfirmed: false,
    subscriptionEvidenceConfirmed: false,
    policyOverrideApproved: false,
    overrideRationale: "",
  };
}

// ————— Offering presets —————

export const PRESETS: Record<string, PresetInput> = {
  remediation: makePreset({
    name: "Custom Code Remediation — ECC → S/4HANA",
    tagline: "Case example from the framework deck",
    unit: "object", unitPlural: "objects",
    populationLabel: "Custom objects in ECC estate", scopeLabel: "Objects needing remediation",
    totalUnits: 12000, scopePct: 30, hrsPerUnit: 3.5, billRate: 95, costRate: 62,
    aiCoverage: 85, effortReduction: 70, qaAddBack: 10, platformCost: 25000,
    teamFtes: 8, openingBandPct: 25,
    llmTier: "workhorse", priceIn: 3, priceOut: 15, tokensInK: 200, tokensOutK: 30,
    agentOverheadPct: 50, tokenDiscountPct: 5,
    pricingModel: "value", premiumPct: 15, discountPct: 25,
  }),
  testAutomation: makePreset({
    name: "Test Script Automation — S/4 Regression Suite",
    tagline: "Manual test cases converted to automated scripts",
    unit: "test case", unitPlural: "test cases",
    populationLabel: "Test cases in regression suite", scopeLabel: "Test cases worth automating",
    totalUnits: 4000, scopePct: 70, hrsPerUnit: 2.5, billRate: 85, costRate: 55,
    aiCoverage: 90, effortReduction: 75, qaAddBack: 8, platformCost: 20000,
    teamFtes: 6, openingBandPct: 25,
    llmTier: "efficient", priceIn: 1, priceOut: 5, tokensInK: 250, tokensOutK: 60,
    agentOverheadPct: 60, tokenDiscountPct: 10,
    pricingModel: "value", premiumPct: 15, discountPct: 25,
  }),
  dataMigration: makePreset({
    name: "Data Migration Objects — ECC → S/4HANA",
    tagline: "Extraction, mapping, cleansing and load per data object",
    unit: "data object", unitPlural: "data objects",
    populationLabel: "Data objects identified", scopeLabel: "Data objects in migration scope",
    totalUnits: 250, scopePct: 80, hrsPerUnit: 40, billRate: 100, costRate: 65,
    aiCoverage: 70, effortReduction: 55, qaAddBack: 15, platformCost: 40000,
    teamFtes: 6, openingBandPct: 20,
    llmTier: "workhorse", priceIn: 3, priceOut: 15, tokensInK: 1500, tokensOutK: 250,
    agentOverheadPct: 60, tokenDiscountPct: 10,
    pricingModel: "value", premiumPct: 15, discountPct: 20,
  }),
  interfaces: makePreset({
    name: "Interface Development — BTP / CPI",
    tagline: "Legacy interfaces rebuilt as clean-core integrations",
    unit: "interface", unitPlural: "interfaces",
    populationLabel: "Interfaces in landscape", scopeLabel: "Interfaces to rebuild",
    totalUnits: 120, scopePct: 100, hrsPerUnit: 60, billRate: 110, costRate: 70,
    aiCoverage: 75, effortReduction: 50, qaAddBack: 12, platformCost: 35000,
    teamFtes: 8, openingBandPct: 20,
    llmTier: "frontier", priceIn: 5, priceOut: 25, tokensInK: 1200, tokensOutK: 300,
    agentOverheadPct: 60, tokenDiscountPct: 7,
    pricingModel: "value", premiumPct: 15, discountPct: 20,
  }),
  custom: makePreset({
    name: "Custom Offering", tagline: "Define your own unit of work and parameters",
    unit: "unit", unitPlural: "units",
    populationLabel: "Units in total population", scopeLabel: "Units in scope",
    totalUnits: 1000, scopePct: 50, hrsPerUnit: 8, billRate: 100, costRate: 65,
    aiCoverage: 70, effortReduction: 60, qaAddBack: 10, platformCost: 25000,
    teamFtes: 5, openingBandPct: 25,
    llmTier: "workhorse", priceIn: 3, priceOut: 15, tokensInK: 600, tokensOutK: 100,
    agentOverheadPct: 60, tokenDiscountPct: 5,
    pricingModel: "value", premiumPct: 15, discountPct: 25,
  }),
};

// ————— Token economics —————

export function computeTokenEconomics(p: PresetInput): TokenEconomics {
  let weightedIn = p.priceIn;
  let weightedOut = p.priceOut;
  const routeTotal = (p.modelRoutes || []).reduce((s, x) => s + safe(x.sharePct), 0);

  if (p.advancedTokenModelEnabled && routeTotal > 0) {
    weightedIn = p.modelRoutes.reduce((s, x) => s + pct(x.sharePct) * safe(x.pin), 0) / (routeTotal / 100);
    weightedOut = p.modelRoutes.reduce((s, x) => s + pct(x.sharePct) * safe(x.pout), 0) / (routeTotal / 100);
  }

  let inputCost = (safe(p.tokensInK) * weightedIn) / 1000;
  let outputCost = (safe(p.tokensOutK) * weightedOut) / 1000;

  if (p.advancedTokenModelEnabled) {
    const cachedInputShare = pct(p.cacheEligiblePct) * pct(p.cacheHitPct);
    inputCost *= 1 - cachedInputShare * pct(p.cachedInputDiscountPct);
    const batchFactor = 1 - pct(p.batchSharePct) * pct(p.batchDiscountPct);
    const contextFactor = 1 + pct(p.longContextSharePct) * pct(p.longContextSurchargePct);
    inputCost *= batchFactor * contextFactor;
    outputCost *= batchFactor * contextFactor;
  } else {
    const simpleDiscount = 1 - pct(p.tokenDiscountPct);
    inputCost *= simpleDiscount;
    outputCost *= simpleDiscount;
  }

  const retryFactor = Math.min(1 + pct(p.agentOverheadPct), Math.max(1, safe(p.loopCap, 1)));
  return {
    tokenPerUnit: (inputCost + outputCost) * retryFactor,
    weightedIn,
    weightedOut,
    routeTotal,
  };
}

// ————— Risk-adjusted economic engine —————
// Base AI cost is calculated first. Expected scope, quality, technology, legal,
// commercial and financing adjustments are then added item by item. The ratio
// of those adjustments to base AI cost is the applied risk-adjustment factor.
export function compute(p: PresetInput): EngineResult {
  const unitsInScope = Math.max(0, Math.round(safe(p.totalUnits) * pct(p.scopePct)));
  const token = computeTokenEconomics(p);
  const tierMixTotal = (p.complexityTiers || []).reduce((s, x) => s + safe(x.mixPct), 0);

  let tradHours = 0;
  let coveredUnits = 0;
  let savedHours = 0;
  let productionHours = 0;
  let qaHours = 0;
  let tokenCost = 0;
  let expectedReworkUnits = 0;
  let tierMetrics: TierMetric[] = [];

  if (p.complexityModelEnabled && tierMixTotal > 0) {
    tierMetrics = p.complexityTiers.map((t) => {
      const units = (unitsInScope * safe(t.mixPct)) / tierMixTotal;
      const hours = units * safe(t.hrsPerUnit);
      const covered = units * pct(t.aiCoverage);
      const saved = hours * pct(t.aiCoverage) * pct(t.effortReduction);
      const review = covered * pct(t.reviewCoveragePct) * safe(t.reviewHours);
      const tokens = covered * token.tokenPerUnit * safe(t.tokenFactor, 1);
      const reworkUnits = covered * pct(t.reworkRatePct);
      return { ...t, units, hours, covered, saved, review, tokens, reworkUnits };
    });
    tradHours = tierMetrics.reduce((s, x) => s + x.hours, 0);
    coveredUnits = tierMetrics.reduce((s, x) => s + x.covered, 0);
    savedHours = tierMetrics.reduce((s, x) => s + x.saved, 0);
    qaHours = tierMetrics.reduce((s, x) => s + x.review, 0);
    tokenCost = tierMetrics.reduce((s, x) => s + x.tokens, 0);
    expectedReworkUnits = tierMetrics.reduce((s, x) => s + x.reworkUnits, 0);
    productionHours = Math.max(0, tradHours - savedHours);
  } else {
    tradHours = unitsInScope * safe(p.hrsPerUnit);
    coveredUnits = unitsInScope * pct(p.aiCoverage);
    savedHours = tradHours * pct(p.aiCoverage) * pct(p.effortReduction);
    productionHours = Math.max(0, tradHours - savedHours);
    const effectiveReviewCoveragePct = safe(p.reworkRatePct) < safe(p.qaExitReworkPct)
      ? safe(p.qaSamplePct)
      : safe(p.reviewCoveragePct);
    qaHours = p.directQaEnabled
      ? coveredUnits * pct(effectiveReviewCoveragePct) * safe(p.reviewHoursPerCoveredUnit)
      : savedHours * pct(p.qaAddBack);
    tokenCost = coveredUnits * token.tokenPerUnit;
    expectedReworkUnits = coveredUnits * pct(p.reworkRatePct);
  }

  const tradRevenue = tradHours * safe(p.billRate);
  const tradCost = tradHours * safe(p.costRate);
  const tradProfit = tradRevenue - tradCost;
  const tradMarginPct = tradRevenue > 0 ? tradProfit / tradRevenue : 0;

  const roleShareTotal = (p.roleRates || []).reduce((s, x) => s + safe(x.sharePct), 0);
  const weightedProductionRate = p.advancedLaborEnabled && roleShareTotal > 0
    ? p.roleRates.reduce((s, x) => s + safe(x.sharePct) * safe(x.rate), 0) / roleShareTotal
    : safe(p.costRate);

  const pmoHours = p.advancedLaborEnabled ? (productionHours + qaHours) * pct(p.pmoHoursPct) : 0;
  const architectureHours = p.advancedLaborEnabled ? productionHours * pct(p.architectureHoursPct) : 0;
  const securityReviewHours = p.advancedLaborEnabled ? safe(p.securityReviewHours) : 0;
  const aiHours = productionHours + qaHours;
  const deliveryHours = aiHours + pmoHours + architectureHours + securityReviewHours;

  const productionLaborCost = productionHours * weightedProductionRate;
  // QA is costed at the senior reviewer rate whenever the review model is
  // explicit — the customer-facing "senior review" claim must not be costed
  // at the blended junior rate. The bare q add-back keeps the deck's Rc basis.
  const qaLaborCost = (p.advancedLaborEnabled || p.directQaEnabled)
    ? qaHours * safe(p.reviewerRate)
    : qaHours * safe(p.costRate);
  const pmoCost = pmoHours * safe(p.pmoRate);
  const architectureCost = architectureHours * safe(p.architectureRate);
  const securityReviewCost = securityReviewHours * safe(p.securityReviewRate);
  const laborCost = productionLaborCost + qaLaborCost + pmoCost + architectureCost + securityReviewCost;

  const effectivePlatformCost = p.autoPlatformAllocation
    ? (safe(p.platformInvestment) / Math.max(safe(p.platformUsefulLifeYears, 1), 0.1)
      / Math.max(safe(p.annualPlatformUnits, 1), 1))
      * unitsInScope * pct(p.platformRecoveryPct)
    : safe(p.platformCost);

  const baseAiCost = laborCost + tokenCost + effectivePlatformCost;
  const baseAiCostPerUnit = unitsInScope > 0 ? baseAiCost / unitsInScope : 0;
  const add = (
    list: Adjustment[],
    label: string,
    category: string,
    amount: unknown,
    note = "",
    recurring = true,
  ) => {
    if (Math.abs(safe(amount)) > 0.005) list.push({ label, category, amount: safe(amount), note, recurring });
  };

  const adjustments: Adjustment[] = [];

  // Direct delivery and platform costs that were previously absent from the cost stack.
  add(adjustments, "Discovery and scoping", "Delivery overhead", p.discoveryCost, "Readiness scan, classification and scope validation", false);
  add(adjustments, "Customer-specific setup", "Delivery overhead", p.setupCost, "Workflow, prompts and guardrails", false);
  add(adjustments, "Systems integration", "Delivery overhead", p.integrationCost, "Repository, SAP and test-tool connectivity", false);
  add(adjustments, "Security and compliance", "Delivery overhead", p.securityComplianceCost, "Security review and data-residency controls", false);
  add(adjustments, "Evaluation and benchmark", "Delivery overhead", p.evaluationCost, "Acceptance calibration and benchmark runs", false);
  add(adjustments, "Training and enablement", "Delivery overhead", p.trainingCost, "Delivery-team and customer enablement", false);
  add(adjustments, "Shutdown and deletion", "Delivery overhead", p.shutdownCost, "Access revocation, data deletion and closure", false);

  // Scope and complexity uncertainty.
  const baselineConfidenceMultiplier = p.baselineConfidence === "Low" ? 1.5 : p.baselineConfidence === "High" ? 0.75 : 1;
  add(
    adjustments,
    "Scope uncertainty",
    "Scope & complexity",
    baseAiCost * (1 - pct(p.scopeConfidencePct)) * pct(p.scopeImpactPct) * baselineConfidenceMultiplier,
    "Scope confidence adjusted for baseline-evidence quality",
  );
  add(
    adjustments,
    "Unclassified-unit premium",
    "Scope & complexity",
    unitsInScope * pct(p.unclassifiedUnitsPct) * baseAiCostPerUnit * pct(p.unclassifiedPremiumPct),
    "Units not yet classifiable may fall into the complex tail",
  );
  add(
    adjustments,
    "Complexity-mix drift",
    "Scope & complexity",
    baseAiCost * pct(p.mixDriftProbabilityPct) * pct(p.mixDriftPct) * pct(p.complexityPremiumPct),
    "Expected adverse selection against the quoted class mix",
  );
  add(adjustments, "Dependency risk", "Scope & complexity", baseAiCost * pct(p.dependencyRiskPct), "Cross-object and cross-system dependency exposure");
  add(
    adjustments,
    "Complex-tail premium",
    "Scope & complexity",
    baseAiCost * pct(p.tailComplexityPct) * pct(p.tailPremiumPct),
    "Disproportionate effort in the final difficult units",
  );
  add(adjustments, "Customer input quality", "Scope & complexity", baseAiCost * pct(p.customerInputRiskPct), "Poor specifications, data or test assets");
  add(
    adjustments,
    "Expected customer delay",
    "Scope & complexity",
    pct(p.customerDelayProbabilityPct) * safe(p.customerDelayWeeks) * safe(p.weeklyBurnRate),
    "Expected burn while access, data or approvals are unavailable",
  );
  add(adjustments, "Reuse / pattern mitigation", "Mitigation credit", -baseAiCost * pct(p.reuseCreditPct), "Reusable patterns reduce marginal effort");

  // Capacity economics and scarce roles.
  const deliveryHorizonWeeks = Math.max(safe(p.deliveryYears, 0.5) * 52, 1);
  const redeployLagFactor = clamp(safe(p.redeployLagWeeks) / deliveryHorizonWeeks, 0, 1);
  const retainedCapacityShare = (1 - pct(p.avoidableLaborPct))
    * ((1 - pct(p.redeployProbabilityPct)) + pct(p.redeployProbabilityPct) * redeployLagFactor);
  const retainedCapacityCost = savedHours * weightedProductionRate * retainedCapacityShare;
  add(adjustments, "Unrealized labor savings", "Labor & capacity", retainedCapacityCost, "Saved hours that remain fixed and are not redeployed");
  add(
    adjustments,
    "Scarce-capacity premium",
    "Labor & capacity",
    (qaLaborCost + architectureCost + securityReviewCost) * pct(p.scarceCapacityPremiumPct),
    "Opportunity cost of constrained senior specialists",
  );
  add(adjustments, "Explicit opportunity cost", "Labor & capacity", p.opportunityCost, "Alternative contribution forgone by accepting the deal");

  // Quality, rework and warranty.
  add(
    adjustments,
    "Expected rework",
    "Quality & warranty",
    expectedReworkUnits * safe(p.reworkHoursPerUnit) * safe(p.reworkCycles, 1) * safe(p.reworkLaborRate),
    "Probability × hours × cycles × loaded rework rate",
  );
  add(
    adjustments,
    "Warranty reserve",
    "Quality & warranty",
    coveredUnits * pct(p.warrantyClaimRatePct) * safe(p.warrantyHoursPerClaim)
      * safe(p.warrantyCycles, 1) * safe(p.warrantyLaborRate)
      * Math.max(safe(p.warrantyMonths, 1), 1) / 3,
    "Expected post-acceptance correction cost",
  );
  add(
    adjustments,
    "Escaped-defect exposure",
    "Quality & warranty",
    pct(p.escapedDefectProbabilityPct) * safe(p.escapedDefectImpact) * pct(p.escapedDefectUninsuredPct),
    "Severity-weighted cost of defects found after acceptance",
  );

  // AI technology and infrastructure.
  const modelFreshnessMultiplier = 1 + safe(p.modelRateAgeMonths) / Math.max(safe(p.maxModelRateAgeMonths, 1), 1);
  add(adjustments, "Model-price volatility", "AI & technology", tokenCost * pct(p.modelPriceVolatilityPct) * modelFreshnessMultiplier, "Reserve for provider repricing, tokenizer change and stale rate cards");
  add(adjustments, "Embedding / vector services", "AI & technology", p.embeddingVectorCost, "Retrieval, embeddings and vector storage");
  add(adjustments, "Non-token AI infrastructure", "AI & technology", p.nonTokenAiCost, "Sandboxes, gateways, tool calls and storage");
  add(adjustments, "Private endpoint / residency", "AI & technology", p.privateEndpointCost, "Private connectivity and approved-region premium");
  add(adjustments, "Observability and evaluation", "AI & technology", p.observabilityCost, "Tracing, logging, guardrails and continuous evaluation");
  add(adjustments, "Model migration reserve", "AI & technology", p.modelMigrationReserve, "Deprecation, prompt migration and rebenchmarking", false);
  add(adjustments, "Vendor minimum commitment", "AI & technology", p.vendorMinimumCommitment, "Unused committed provider capacity");

  // Commercial fixed costs and contractual exposures.
  add(adjustments, "Travel and expenses", "Commercial & financial", p.travelCost, "On-site delivery and reimbursable exposure");
  add(adjustments, "Third-party tools and licences", "Commercial & financial", p.thirdPartyCost, "Customer-mandated or SAP-adjacent technology");
  add(
    adjustments,
    "Inflation exposure",
    "Commercial & financial",
    laborCost * pct(p.annualInflationPct) * Math.max(safe(p.deliveryYears), 0) / 2,
    "Average labor-cost escalation over the delivery period",
  );
  add(
    adjustments,
    "Cancellation exposure",
    "Commercial & financial",
    pct(p.cancellationProbabilityPct) * safe(p.cancellationExposure),
    "Expected unrecovered mobilization and committed capacity",
    false,
  );
  add(
    adjustments,
    "Under-consumption exposure",
    "Commercial & financial",
    pct(p.underConsumptionProbabilityPct) * safe(p.underConsumptionExposure),
    "Expected loss where volume commitments are not take-or-pay",
  );

  const liabilityCapValue = tradRevenue * pct(p.liabilityCapPct);
  add(
    adjustments,
    "Liability exposure",
    "Legal, SLA & regulatory",
    pct(p.liabilityEventProbabilityPct)
      * Math.min(safe(p.liabilityImpact), Math.max(liabilityCapValue, 0))
      * pct(p.liabilityUninsuredPct),
    "Expected uninsured contractual liability",
  );
  add(
    adjustments,
    "Regulatory exposure",
    "Legal, SLA & regulatory",
    pct(p.regulatoryEventProbabilityPct) * safe(p.regulatoryImpact) * pct(p.regulatoryUninsuredPct),
    "Expected uninsured regulatory or data event",
  );
  add(adjustments, "Management contingency", "Management overlay", baseAiCost * pct(p.generalContingencyPct), "Explicit residual-risk overlay");

  const unitEvidence = clamp(safe(p.sampleUnits) / Math.max(safe(p.minimumSampleUnits, 1), 1), 0, 1);
  const projectEvidence = clamp(safe(p.sampleProjects) / Math.max(safe(p.minimumProjects, 1), 1), 0, 1);
  const customerEvidence = clamp(safe(p.sampleCustomers) / Math.max(safe(p.minimumCustomers, 1), 1), 0, 1);
  const recencyEvidence = clamp(1 - safe(p.dataRecencyMonths) / Math.max(safe(p.maxDataRecencyMonths, 1), 1), 0, 1);
  const evidenceCoverage = (unitEvidence + projectEvidence + customerEvidence + recencyEvidence) / 4;
  const confidenceScale = safe(p.confidenceLevelPct, 95) / 95;
  add(
    adjustments,
    "Evidence uncertainty",
    "Evidence & statistics",
    baseAiCost * pct(p.marginOfErrorPct) * (1 - evidenceCoverage) * confidenceScale,
    "Sample size, project diversity, customer diversity and recency shortfall",
  );

  const preNet = adjustments.reduce((s, x) => s + x.amount, 0);

  // Value anchor: the customer's best validated alternative, never the raw rate
  // card dressed up as "market". Without a recorded source, the factor cannot
  // inflate the anchor above the internal baseline, and a dollar override is ignored.
  const anchorSourced = !!String(p.baselineSource || "").trim();
  const altDollar = safe(p.customerAlternativeValue);
  const anchorFactor = anchorSourced
    ? pct(p.customerAlternativeFactorPct)
    : Math.min(pct(p.customerAlternativeFactorPct), 1);
  const validatedAlternative = anchorSourced && altDollar > 0
    ? altDollar
    : tradRevenue * anchorFactor;
  const anchorUnvalidated = !anchorSourced && (altDollar > 0 || safe(p.customerAlternativeFactorPct) !== 100);

  // Contested deals: a verified competing bid caps willingness to pay at the
  // bid plus a switching premium; unverified claims never collapse the floor.
  const contested = p.dealContext === "Contested" && safe(p.competingBidAmount) > 0;
  const bidVerified = p.bidEvidence === "Verified quote";
  const contestedValid = contested && bidVerified;
  const competitorCeiling = contestedValid
    ? safe(p.competingBidAmount) * (1 + pct(p.switchingPremiumPct))
    : Infinity;
  const willingnessCeiling = Math.min(
    validatedAlternative * pct(p.willingnessToPayPct) + safe(p.costOfDelayValue) * pct(p.valueCapturePct),
    competitorCeiling,
  );

  const industryRiskRate = p.industryRisk === "Mission critical" ? 0.02
    : p.industryRisk === "Highly regulated" ? 0.01
      : p.industryRisk === "Regulated" ? 0.005 : 0;
  const projectVariableRate = (
    pct(p.salesCommissionPct)
    + pct(p.channelFeePct)
    + pct(p.withholdingTaxPct)
    + pct(p.badDebtProbabilityPct) * pct(p.lossGivenDefaultPct)
    + pct(p.fxExposurePct) * pct(p.fxVolatilityPct) * (1 - pct(p.hedgedPct))
    + pct(p.slaBreachProbabilityPct) * pct(p.serviceCreditPct)
    + pct(p.platformReinvestmentPct)
    + pct(p.countryRiskPremiumPct)
    + industryRiskRate
    + pct(p.annualWorkingCapitalPct) * safe(p.paymentDays) / 365
  );

  const revenueAdjustments = (revenue: number, model: PricingModelId): Adjustment[] => {
    const list: Adjustment[] = [];
    add(list, "Sales commission", "Commercial & financial", revenue * pct(p.salesCommissionPct), "Commission on booked revenue");
    add(list, "Channel / referral fee", "Commercial & financial", revenue * pct(p.channelFeePct), "Partner, reseller or referral cost");
    add(
      list,
      "Working-capital financing",
      "Commercial & financial",
      revenue * pct(p.annualWorkingCapitalPct) * safe(p.paymentDays) / 365,
      "Cost of payment terms and cash conversion",
    );
    add(list, "Withholding / unrecoverable tax", "Commercial & financial", revenue * pct(p.withholdingTaxPct), "Taxes not recoverable from the customer");
    add(
      list,
      "Credit-loss reserve",
      "Commercial & financial",
      revenue * pct(p.badDebtProbabilityPct) * pct(p.lossGivenDefaultPct),
      "Probability of default × loss given default",
    );
    add(
      list,
      "FX reserve",
      "Commercial & financial",
      revenue * pct(p.fxExposurePct) * pct(p.fxVolatilityPct) * (1 - pct(p.hedgedPct)),
      "Unhedged currency exposure",
    );
    add(
      list,
      "Expected SLA service credits",
      "Legal, SLA & regulatory",
      revenue * pct(p.slaBreachProbabilityPct) * pct(p.serviceCreditPct),
      "Breach probability × service-credit percentage",
    );
    add(list, "Platform reinvestment", "Platform & IP", revenue * pct(p.platformReinvestmentPct), "Required contribution to reusable platform IP");
    add(list, "Country-risk premium", "Legal, SLA & regulatory", revenue * pct(p.countryRiskPremiumPct), "Jurisdiction-specific commercial and legal exposure");
    add(list, "Industry-risk premium", "Legal, SLA & regulatory", revenue * industryRiskRate, "Regulatory and mission-criticality premium derived from industry classification");
    if (model === "subscription") {
      add(list, "Subscription support cost", "Subscription operations", revenue * pct(p.subscriptionSupportCostPct), "Customer success, support and continuous monitoring");
    }
    return list;
  };

  const subscriptionTerm = Math.max(1, Math.round(safe(p.subscriptionTermYears, 1)));
  let subscriptionRecurringRevenue = 0;
  for (let y = 0; y < subscriptionTerm; y += 1) {
    const annualFee = safe(p.subscriptionAnnualFee) * Math.pow(1 + pct(p.subscriptionUpliftPct), y);
    const overageUnits = Math.max(0, safe(p.subscriptionExpectedAnnualUnits) - safe(p.subscriptionIncludedUnits));
    const overage = overageUnits * safe(p.subscriptionOveragePrice) * Math.pow(1 + pct(p.subscriptionUpliftPct), y);
    subscriptionRecurringRevenue += annualFee + overage;
  }
  const subscriptionRevenue = safe(p.subscriptionImplementationFee) + subscriptionRecurringRevenue;

  const revenueFor = (model: PricingModelId): number => {
    if (model === "tm") return deliveryHours * safe(p.billRate);
    if (model === "premium") return deliveryHours * safe(p.billRate) * (1 + pct(p.premiumPct));
    if (model === "subscription") return subscriptionRevenue;
    return validatedAlternative * (1 - pct(p.discountPct));
  };

  const scenario = (model: PricingModelId): Scenario => {
    const revenue = revenueFor(model);
    let baseReferenceCost = baseAiCost;
    let scenarioAdjustments = adjustments.map((x) => ({ ...x }));
    let customerReference = Math.min(tradRevenue, validatedAlternative);
    let scenarioHours = deliveryHours;

    if (model === "subscription") {
      baseReferenceCost = baseAiCost * subscriptionTerm;
      scenarioHours = deliveryHours * subscriptionTerm;
      customerReference = Math.min(tradRevenue, validatedAlternative) * subscriptionTerm;
      scenarioAdjustments = adjustments.map((x) => ({
        ...x,
        amount: x.recurring ? x.amount * subscriptionTerm : x.amount,
      }));
      add(
        scenarioAdjustments,
        "Annual platform operations",
        "Subscription operations",
        safe(p.subscriptionAnnualPlatformOps) * subscriptionTerm,
        "Ongoing platform operations over the contract term",
      );
      add(
        scenarioAdjustments,
        "Reserved subscription capacity",
        "Subscription operations",
        baseAiCost * subscriptionTerm * pct(p.subscriptionCapacityReservePct),
        "Capacity held to meet recurring SLA demand",
      );
      add(
        scenarioAdjustments,
        "Expected churn exposure",
        "Subscription operations",
        subscriptionRecurringRevenue * pct(p.subscriptionChurnProbabilityPct) / 2,
        "Expected half-period revenue exposure from early churn",
      );
    }

    const variable = revenueAdjustments(revenue, model);
    const modeled = [...scenarioAdjustments, ...variable];
    const modeledNet = modeled.reduce((s, x) => s + x.amount, 0);
    const appliedNet = p.applyRiskAdjustments ? modeledNet : 0;
    const cost = baseReferenceCost + appliedNet;
    const profit = revenue - cost;
    const marginPct = revenue > 0 ? profit / revenue : 0;
    const customerSavings = customerReference - revenue;
    const positiveRisk = modeled.reduce((s, x) => s + Math.max(0, x.amount), 0);
    const mitigation = modeled.reduce((s, x) => s + Math.min(0, x.amount), 0);

    return {
      model, revenue, cost, profit, marginPct,
      revPerHour: scenarioHours > 0 ? revenue / scenarioHours : 0,
      pricePerUnit: unitsInScope > 0 ? revenue / (unitsInScope * (model === "subscription" ? subscriptionTerm : 1)) : 0,
      customerSavings,
      customerReference,
      baseReferenceCost,
      riskAdjustment: appliedNet,
      modeledRiskAdjustment: modeledNet,
      riskAdjustmentPct: baseReferenceCost > 0 ? appliedNet / baseReferenceCost : 0,
      modeledRiskAdjustmentPct: baseReferenceCost > 0 ? modeledNet / baseReferenceCost : 0,
      positiveRisk,
      mitigation,
      riskBreakdown: modeled,
      expectedContribution: pct(p.winProbabilityPct) * profit - safe(p.bidCost),
      gpPerTotalHour: 0,
    };
  };

  const tm = scenario("tm");
  const premium = scenario("premium");
  const value = scenario("value");
  const subscription = scenario("subscription");
  const scenarios: Record<PricingModelId, Scenario> = { tm, premium, value, subscription };
  const selected = scenarios[p.pricingModel] || value;

  const appliedVariableRate = p.applyRiskAdjustments ? projectVariableRate : 0;
  const fixedRiskAdjustedCost = baseAiCost + (p.applyRiskAdjustments ? preNet : 0);
  const marginDenominator = Math.max(0.01, 1 - appliedVariableRate - pct(p.minGrossMarginPct));
  const profitDenominator = Math.max(0.01, 1 - appliedVariableRate);
  const targetProfit = tradProfit * (1 + pct(p.profitGrowthPct));
  const marginFloorRevenue = fixedRiskAdjustedCost / marginDenominator;
  const profitFloorRevenue = (fixedRiskAdjustedCost + targetProfit) / profitDenominator;
  const uncontestedFloorRevenue = Math.max(marginFloorRevenue, profitFloorRevenue, safe(p.minimumEngagementFee));
  // Against a verified rival bid, legacy-GP preservation stops binding: the
  // floor drops to a defense margin over risk-adjusted cost. Rate-card
  // nostalgia loses deals; cost-plus-defense-margin keeps the customer.
  const defenseDenominator = Math.max(0.01, 1 - appliedVariableRate - pct(p.gmMinDefensePct));
  const defenseFloorRevenue = Math.max(fixedRiskAdjustedCost / defenseDenominator, safe(p.minimumEngagementFee));
  const requiredRevenue = contestedValid ? defenseFloorRevenue : uncontestedFloorRevenue;
  const breakevenRevenue = (fixedRiskAdjustedCost + tradProfit) / profitDenominator;
  const maxSafeDiscount = validatedAlternative > 0 ? 1 - requiredRevenue / validatedAlternative : -Infinity;
  const riskBreakevenDiscount = validatedAlternative > 0 ? 1 - breakevenRevenue / validatedAlternative : -Infinity;
  const legacyBreakevenDiscount = tradRevenue > 0 ? 1 - (tradProfit + baseAiCost) / tradRevenue : 0;

  // Expected correction effort — kept out of deliveryHours (which drive T&M
  // revenue and duration) but included in the honest productivity denominator.
  const expectedReworkHours = expectedReworkUnits * safe(p.reworkHoursPerUnit) * safe(p.reworkCycles, 1);
  const expectedWarrantyHours = coveredUnits * pct(p.warrantyClaimRatePct)
    * safe(p.warrantyHoursPerClaim) * safe(p.warrantyCycles, 1);
  const totalDeliveryHours = deliveryHours + expectedReworkHours + expectedWarrantyHours;
  [tm, premium, value, subscription].forEach((s) => {
    const term = s.model === "subscription" ? subscriptionTerm : 1;
    const hrs = totalDeliveryHours * term;
    s.gpPerTotalHour = hrs > 0 ? s.profit / hrs : 0;
  });

  // Capability-drift exposure: the naive floor recomputed at next-generation
  // coverage/effort-reduction. The gap to today's discount is the headroom an
  // AI-native rival gets when the next model generation ships.
  const nextHours = tradHours * (1 - pct(p.cNextGenPct) * pct(p.eNextGenPct) * (1 - pct(p.qaAddBack)));
  const nextAiCost = nextHours * safe(p.costRate) + unitsInScope * pct(p.cNextGenPct) * token.tokenPerUnit + effectivePlatformCost;
  const dStarProjected = tradRevenue > 0 ? 1 - (tradProfit + nextAiCost) / tradRevenue : 0;

  const capacityFactor = Math.max(
    0.05,
    pct(p.parallelizabilityPct) * pct(p.environmentAvailabilityPct) * (1 - pct(p.rateLimitDelayPct)),
  );
  const monthlyCapacity = Math.max(safe(p.teamFtes) * safe(p.productiveHoursPerFteMonth, 140) * capacityFactor, 1);
  const expectedWaitWeeks = pct(p.customerDelayProbabilityPct) * safe(p.customerDelayWeeks);
  const tradMonths = tradHours / Math.max(safe(p.teamFtes) * safe(p.productiveHoursPerFteMonth, 140), 1);
  const aiMonths = deliveryHours / monthlyCapacity + expectedWaitWeeks / 4.345;

  const mixPass = !p.complexityModelEnabled || Math.abs(tierMixTotal - 100) < 0.01;
  const mixTolerancePass = safe(p.mixDriftPct) <= safe(p.complexityMixTolerancePct);
  const routePass = !p.advancedTokenModelEnabled || Math.abs(token.routeTotal - 100) < 0.01;
  const quoteRateWindowPass = safe(p.quoteValidityDays) <= Math.max(0, (safe(p.maxModelRateAgeMonths) - safe(p.modelRateAgeMonths)) * 30);
  const statisticalPass = safe(p.sampleUnits) >= safe(p.minimumSampleUnits)
    && safe(p.sampleProjects) >= safe(p.minimumProjects)
    && safe(p.sampleCustomers) >= safe(p.minimumCustomers)
    && safe(p.dataRecencyMonths) <= safe(p.maxDataRecencyMonths);
  const productionStage = p.quoteStage === "Production";

  const attest: "hard" | "warning" = productionStage ? "hard" : "warning";
  const gates: Gate[] = [
    { label: "Unit acceptance criteria defined", pass: !!p.unitAcceptanceDefined, severity: attest },
    { label: "Customer responsibilities and delay relief defined", pass: !!p.customerResponsibilitiesDefined, severity: attest },
    { label: "Scope evidence approved", pass: !!p.scopeEvidenceApproved, severity: attest },
    { label: "Security route approved", pass: !!p.securityApproved, severity: attest },
    { label: "Data residency approved", pass: !!p.dataResidencyApproved, severity: attest },
    { label: "IP and licensing terms approved", pass: !!p.ipApproved, severity: attest },
    { label: "Warranty boundaries defined", pass: !!p.warrantyDefined, severity: attest },
    { label: "SLA and service credits defined", pass: !!p.slaDefined, severity: attest },
    { label: "Payment terms approved", pass: !!p.paymentTermsApproved, severity: attest },
    { label: "Legal and liability terms approved", pass: !!p.legalTermsApproved, severity: attest },
    { label: "Approval matrix and segregation of duties defined", pass: !!p.approvalMatrixDefined, severity: attest },
    { label: "Baseline evidence is current", pass: safe(p.baselineAgeMonths) <= safe(p.maxBaselineAgeMonths), severity: productionStage ? "hard" : "warning" },
    { label: "Model rates are current", pass: safe(p.modelRateAgeMonths) <= safe(p.maxModelRateAgeMonths), severity: productionStage ? "hard" : "warning" },
    { label: "Complexity mix sums to 100%", pass: mixPass, severity: "hard" },
    { label: "Expected mix drift remains inside quote tolerance", pass: mixTolerancePass, severity: productionStage ? "hard" : "warning" },
    { label: "Model-routing mix sums to 100%", pass: routePass, severity: "hard" },
    { label: "Quote validity remains inside model-rate freshness window", pass: quoteRateWindowPass, severity: productionStage ? "hard" : "warning" },
    { label: "Delivery evidence meets sample policy", pass: statisticalPass, severity: productionStage ? "hard" : "warning" },
    { label: "Minimum volume commitment met", pass: unitsInScope >= safe(p.minimumCommitmentUnits), severity: "hard" },
    { label: "Override includes a recorded rationale", pass: !p.policyOverrideApproved || !!String(p.overrideRationale || "").trim(), severity: "hard" },
    { label: "Value anchor has a recorded evidence source", pass: !anchorUnvalidated, severity: productionStage ? "hard" : "warning" },
    { label: "Competing-bid evidence verified before floor relief", pass: !contested || bidVerified, severity: "hard" },
    { label: "Platform reinvestment meets policy floor", pass: pct(p.platformReinvestmentPct) >= MIN_PLATFORM_REINVESTMENT_PCT, severity: "hard" },
    { label: "Data-rights and benchmark-use clause agreed", pass: !!p.dataRightsApproved, severity: attest },
    { label: "Inputs match the workbook evidence block (current config)", pass: !!p.calibrationConfirmed, severity: productionStage ? "hard" : "warning" },
    { label: "Full class mix quoted, or standalone tier rate card used", pass: !p.complexityModelEnabled || (p.complexityTiers || []).every((t) => safe(t.mixPct) > 0) || !!p.standaloneTierQuote, severity: "hard" },
    { label: "Price-review / true-up clause defined for committed deals", pass: (safe(p.minimumCommitmentUnits) === 0 && p.pricingModel !== "subscription") || !!p.trueUpDefined, severity: productionStage ? "hard" : "warning" },
    { label: "Subscription priced from measured cost-to-serve", pass: p.pricingModel !== "subscription" || !!p.subscriptionEvidenceConfirmed, severity: productionStage ? "hard" : "warning" },
    { label: "Measured rework rate at/below the QA-exit threshold", pass: safe(p.reworkRatePct) <= safe(p.qaExitReworkPct), severity: productionStage ? "hard" : "warning" },
    { label: "Published opening band sits at/below the risk-adjusted maximum", pass: p.pricingModel !== "value" || pct(p.openingBandPct) <= maxSafeDiscount, severity: productionStage ? "hard" : "warning" },
    { label: "Committed throughput within modeled weekly capacity", pass: safe(p.committedUnitsPerWeek) <= 0 || safe(p.committedUnitsPerWeek) <= unitsInScope / Math.max(aiMonths * 4.345, 0.1), severity: "hard" },
    { label: "Continuity terms defined (escrow, termination true-up, deprecation reopener)", pass: !!p.continuityTermsDefined, severity: attest },
    { label: "Tier-priced quote uses the complexity-tier engine", pass: !p.quotedAtTierPrices || p.complexityModelEnabled, severity: "hard" },
  ];

  const hardFailures = gates.filter((g) => g.severity === "hard" && !g.pass);
  const warnings = gates.filter((g) => g.severity === "warning" && !g.pass);
  const selectedEconomicPass = contestedValid
    ? selected.revenue >= requiredRevenue && selected.marginPct >= pct(p.gmMinDefensePct)
    : selected.revenue >= requiredRevenue
      && selected.marginPct >= pct(p.minGrossMarginPct)
      && selected.profit >= targetProfit;
  const noBid = requiredRevenue > willingnessCeiling;
  const discountBeyondFloor = p.pricingModel === "value" && pct(p.discountPct) > maxSafeDiscount;
  const override = !!p.policyOverrideApproved && !!String(p.overrideRationale || "").trim();

  let governanceLevel = 0;
  let governanceTitle = "WITHIN POLICY";
  let governanceMessage = "Economics and mandatory policy gates pass. Sales may proceed inside the published band.";

  if ((hardFailures.length > 0 || !selectedEconomicPass || noBid || discountBeyondFloor) && !override) {
    governanceLevel = 2;
    governanceTitle = noBid ? "NO-BID / RE-SCOPE" : "BLOCKED — POLICY OR ECONOMIC FLOOR FAILED";
    governanceMessage = noBid
      ? "The required risk-adjusted price exceeds the willingness-to-pay ceiling (validated alternative or verified competing bid). Argue speed, warranty and total cost of rework, restructure scope or service level, or do not bid — do not discount to match."
      : "At least one mandatory gate or risk-adjusted economic hurdle failed. Do not quote at this price. Route to the deal desk for re-scope, tier restructure or no-bid — do not tune delivery assumptions to pass the check.";
  } else if (contestedValid && selected.revenue < uncontestedFloorRevenue) {
    governanceLevel = 1;
    governanceTitle = "COMPETITIVE DEFENSE — DEAL-DESK SIGN-OFF REQUIRED";
    governanceMessage = `A verified competing bid of ${"$" + Math.round(safe(p.competingBidAmount)).toLocaleString()} caps the price. Defending at ${"$" + Math.round(selected.revenue).toLocaleString()} retains ${"$" + Math.round(selected.profit).toLocaleString()} gross profit versus $0 on a lost deal, sacrificing ${"$" + Math.round(uncontestedFloorRevenue - selected.revenue).toLocaleString()} against the uncontested floor. Time-boxed exception — record the bid evidence; sets no precedent.`;
  } else if (
    warnings.length > 0
    || override
    || (p.pricingModel === "value" && pct(p.discountPct) > Math.min(pct(p.openingBandPct), maxSafeDiscount))
  ) {
    governanceLevel = 1;
    governanceTitle = override ? "APPROVED POLICY OVERRIDE" : "DEAL-DESK REVIEW REQUIRED";
    governanceMessage = override
      ? "An explicit override is recorded. Retain the rationale and approver with the quote record."
      : "The deal remains economically viable but exceeds the normal band or carries unresolved evidence warnings.";
  }

  const grossProductivitySavings = tradCost - baseAiCost;
  const riskAbsorption = value.cost - baseAiCost;
  const customerDiscount = validatedAlternative - value.revenue;
  const partnerIncrementalProfit = value.profit - tradProfit;
  const reinvestmentFunded = selected.revenue * pct(p.platformReinvestmentPct);

  return {
    unitsInScope,
    tradHours, tradRevenue, tradCost, tradProfit, tradMarginPct,
    tradPricePerUnit: unitsInScope > 0 ? tradRevenue / unitsInScope : 0,
    coveredUnits, savedHours, productionHours, qaHours, aiHours, deliveryHours,
    pmoHours, architectureHours, securityReviewHours,
    weightedProductionRate, laborCost, tokenCost, tokenPerUnit: token.tokenPerUnit,
    weightedTokenInRate: token.weightedIn, weightedTokenOutRate: token.weightedOut,
    effectivePlatformCost, baseAiCost, baseAiCostPerUnit,
    tierMetrics, tierMixTotal, routeMixTotal: token.routeTotal,
    adjustments, preNet, projectVariableRate,
    validatedAlternative, willingnessCeiling, anchorUnvalidated,
    contested, contestedValid, competitorCeiling,
    fixedRiskAdjustedCost, targetProfit,
    marginFloorRevenue, profitFloorRevenue, requiredRevenue,
    uncontestedFloorRevenue, defenseFloorRevenue, reinvestmentFunded,
    dStarProjected, expectedReworkHours, expectedWarrantyHours, totalDeliveryHours,
    requiredPricePerUnit: unitsInScope > 0 ? requiredRevenue / unitsInScope : 0,
    maxSafeDiscount, riskBreakevenDiscount, legacyBreakevenDiscount,
    tradMonths, aiMonths, monthlyCapacity,
    tm, premium, value, subscription, selected,
    gates, hardFailures, warnings, statisticalPass,
    governance: { level: governanceLevel, title: governanceTitle, message: governanceMessage, override, noBid },
    grossProductivitySavings, riskAbsorption, customerDiscount, partnerIncrementalProfit,
  };
}
