import { useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ReferenceLine, CartesianGrid, ResponsiveContainer, Cell,
} from "recharts";

// ————— Palette (matches the framework deck) —————
const NAVY = "#16243D";
const NAVY2 = "#24385C";
const ICE = "#D9E6F7";
const ICE2 = "#EEF4FC";
const GOLD = "#E8A33D";
const GOLDD = "#C77F1A";
const SLATE = "#3C4C66";
const MUTED = "#6B7A93";
const RED = "#C0504D";
const GREEN = "#4E8A5A";

const TIERS = {
  frontier: { name: "Frontier — complex / long-horizon", pin: 5, pout: 25 },
  workhorse: { name: "Workhorse — default bulk delivery", pin: 3, pout: 15 },
  efficient: { name: "Efficient — triage / simple work", pin: 1, pout: 5 },
  saphub: { name: "SAP GenAI Hub / ABAP-tuned", pin: 3, pout: 15 },
  customRates: { name: "Custom rates", pin: null, pout: null },
};

const pct = (v) => (Number(v) || 0) / 100;
const safe = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const deepClone = (v) => JSON.parse(JSON.stringify(v));

function makePreset(base) {
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
    willingnessToPayPct: 95,
    costOfDelayValue: 0,
    valueCapturePct: 20,
    winProbabilityPct: 60,
    bidCost: 10000,

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
    unitAcceptanceDefined: true,
    customerResponsibilitiesDefined: true,
    scopeEvidenceApproved: true,

    // Optional class-by-class economics
    complexityModelEnabled: false,
    complexityTiers: [
      {
        id: "simple", label: "Simple", mixPct: 45,
        hrsPerUnit: Number((base.hrsPerUnit * 0.45).toFixed(2)),
        aiCoverage: clamp(base.aiCoverage + 10, 0, 100),
        effortReduction: clamp(base.effortReduction + 10, 0, 95),
        reviewCoveragePct: 100,
        reviewHours: Number(Math.max(0.05, base.hrsPerUnit * 0.04).toFixed(2)),
        reworkRatePct: 1,
        tokenFactor: 0.55,
        publishedPrice: Math.round(tradUnitPrice * 0.48),
      },
      {
        id: "medium", label: "Medium", mixPct: 35,
        hrsPerUnit: Number((base.hrsPerUnit * 1.05).toFixed(2)),
        aiCoverage: base.aiCoverage,
        effortReduction: base.effortReduction,
        reviewCoveragePct: 100,
        reviewHours: Number(Math.max(0.1, base.hrsPerUnit * 0.08).toFixed(2)),
        reworkRatePct: 2,
        tokenFactor: 1,
        publishedPrice: Math.round(tradUnitPrice * 1.04),
      },
      {
        id: "complex", label: "Complex", mixPct: 20,
        hrsPerUnit: Number((base.hrsPerUnit * 2.2).toFixed(2)),
        aiCoverage: clamp(base.aiCoverage - 30, 0, 100),
        effortReduction: clamp(base.effortReduction - 25, 0, 90),
        reviewCoveragePct: 100,
        reviewHours: Number(Math.max(0.2, base.hrsPerUnit * 0.18).toFixed(2)),
        reworkRatePct: 4,
        tokenFactor: 1.8,
        publishedPrice: Math.round(tradUnitPrice * 2.08),
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
    liabilityEventProbabilityPct: 1,
    liabilityImpact: 100000,
    liabilityUninsuredPct: 25,
    liabilityCapPct: 100,
    regulatoryEventProbabilityPct: 0.5,
    regulatoryImpact: 100000,
    regulatoryUninsuredPct: 50,
    dataClassification: "Confidential",
    securityApproved: true,
    dataResidencyApproved: true,
    ipApproved: true,
    warrantyDefined: true,
    slaDefined: true,
    paymentTermsApproved: true,
    legalTermsApproved: true,
    approvalMatrixDefined: true,

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
    policyOverrideApproved: false,
    overrideRationale: "",
  };
}

// ————— Offering presets —————
const PRESETS = {
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

const fmt$ = (v) => {
  const x = safe(v);
  const sign = x < 0 ? "−" : "";
  const a = Math.abs(x);
  return a >= 1_000_000
    ? sign + "$" + (a / 1_000_000).toFixed(2) + "M"
    : sign + "$" + Math.round(a / 1000).toLocaleString() + "K";
};
const fmt$full = (v) => {
  const x = safe(v);
  return (x < 0 ? "−$" : "$") + Math.round(Math.abs(x)).toLocaleString();
};
const fmtPct = (v) => Number.isFinite(v) ? (v * 100).toFixed(1) + "%" : "—";

function computeTokenEconomics(p) {
  let weightedIn = p.priceIn;
  let weightedOut = p.priceOut;
  const routeTotal = (p.modelRoutes || []).reduce((s, x) => s + safe(x.sharePct), 0);

  if (p.advancedTokenModelEnabled && routeTotal > 0) {
    weightedIn = p.modelRoutes.reduce((s, x) => s + pct(x.sharePct) * safe(x.pin), 0) / (routeTotal / 100);
    weightedOut = p.modelRoutes.reduce((s, x) => s + pct(x.sharePct) * safe(x.pout), 0) / (routeTotal / 100);
  }

  let inputCost = safe(p.tokensInK) * weightedIn / 1000;
  let outputCost = safe(p.tokensOutK) * weightedOut / 1000;

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

  const retryFactor = 1 + pct(p.agentOverheadPct);
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
export function compute(p) {
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
  let tierMetrics = [];

  if (p.complexityModelEnabled && tierMixTotal > 0) {
    tierMetrics = p.complexityTiers.map((t) => {
      const units = unitsInScope * safe(t.mixPct) / tierMixTotal;
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
  const qaLaborCost = p.advancedLaborEnabled ? qaHours * safe(p.reviewerRate) : qaHours * safe(p.costRate);
  const pmoCost = pmoHours * safe(p.pmoRate);
  const architectureCost = architectureHours * safe(p.architectureRate);
  const securityReviewCost = securityReviewHours * safe(p.securityReviewRate);
  const laborCost = productionLaborCost + qaLaborCost + pmoCost + architectureCost + securityReviewCost;

  const effectivePlatformCost = p.autoPlatformAllocation
    ? safe(p.platformInvestment) / Math.max(safe(p.platformUsefulLifeYears, 1), 0.1)
      / Math.max(safe(p.annualPlatformUnits, 1), 1)
      * unitsInScope * pct(p.platformRecoveryPct)
    : safe(p.platformCost);

  const baseAiCost = laborCost + tokenCost + effectivePlatformCost;
  const baseAiCostPerUnit = unitsInScope > 0 ? baseAiCost / unitsInScope : 0;
  const add = (list, label, category, amount, note = "", recurring = true) => {
    if (Math.abs(safe(amount)) > 0.005) list.push({ label, category, amount: safe(amount), note, recurring });
  };

  const adjustments = [];

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
    "Scope confidence adjusted for baseline-evidence quality"
  );
  add(
    adjustments,
    "Unclassified-unit premium",
    "Scope & complexity",
    unitsInScope * pct(p.unclassifiedUnitsPct) * baseAiCostPerUnit * pct(p.unclassifiedPremiumPct),
    "Units not yet classifiable may fall into the complex tail"
  );
  add(
    adjustments,
    "Complexity-mix drift",
    "Scope & complexity",
    baseAiCost * pct(p.mixDriftProbabilityPct) * pct(p.mixDriftPct) * pct(p.complexityPremiumPct),
    "Expected adverse selection against the quoted class mix"
  );
  add(adjustments, "Dependency risk", "Scope & complexity", baseAiCost * pct(p.dependencyRiskPct), "Cross-object and cross-system dependency exposure");
  add(
    adjustments,
    "Complex-tail premium",
    "Scope & complexity",
    baseAiCost * pct(p.tailComplexityPct) * pct(p.tailPremiumPct),
    "Disproportionate effort in the final difficult units"
  );
  add(adjustments, "Customer input quality", "Scope & complexity", baseAiCost * pct(p.customerInputRiskPct), "Poor specifications, data or test assets");
  add(
    adjustments,
    "Expected customer delay",
    "Scope & complexity",
    pct(p.customerDelayProbabilityPct) * safe(p.customerDelayWeeks) * safe(p.weeklyBurnRate),
    "Expected burn while access, data or approvals are unavailable"
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
    "Opportunity cost of constrained senior specialists"
  );
  add(adjustments, "Explicit opportunity cost", "Labor & capacity", p.opportunityCost, "Alternative contribution forgone by accepting the deal");

  // Quality, rework and warranty.
  add(
    adjustments,
    "Expected rework",
    "Quality & warranty",
    expectedReworkUnits * safe(p.reworkHoursPerUnit) * safe(p.reworkCycles, 1) * safe(p.reworkLaborRate),
    "Probability × hours × cycles × loaded rework rate"
  );
  add(
    adjustments,
    "Warranty reserve",
    "Quality & warranty",
    coveredUnits * pct(p.warrantyClaimRatePct) * safe(p.warrantyHoursPerClaim)
      * safe(p.warrantyCycles, 1) * safe(p.warrantyLaborRate)
      * Math.max(safe(p.warrantyMonths, 1), 1) / 3,
    "Expected post-acceptance correction cost"
  );
  add(
    adjustments,
    "Escaped-defect exposure",
    "Quality & warranty",
    pct(p.escapedDefectProbabilityPct) * safe(p.escapedDefectImpact) * pct(p.escapedDefectUninsuredPct),
    "Severity-weighted cost of defects found after acceptance"
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
    "Average labor-cost escalation over the delivery period"
  );
  add(
    adjustments,
    "Cancellation exposure",
    "Commercial & financial",
    pct(p.cancellationProbabilityPct) * safe(p.cancellationExposure),
    "Expected unrecovered mobilization and committed capacity",
    false
  );
  add(
    adjustments,
    "Under-consumption exposure",
    "Commercial & financial",
    pct(p.underConsumptionProbabilityPct) * safe(p.underConsumptionExposure),
    "Expected loss where volume commitments are not take-or-pay"
  );

  const liabilityCapValue = tradRevenue * pct(p.liabilityCapPct);
  add(
    adjustments,
    "Liability exposure",
    "Legal, SLA & regulatory",
    pct(p.liabilityEventProbabilityPct)
      * Math.min(safe(p.liabilityImpact), Math.max(liabilityCapValue, 0))
      * pct(p.liabilityUninsuredPct),
    "Expected uninsured contractual liability"
  );
  add(
    adjustments,
    "Regulatory exposure",
    "Legal, SLA & regulatory",
    pct(p.regulatoryEventProbabilityPct) * safe(p.regulatoryImpact) * pct(p.regulatoryUninsuredPct),
    "Expected uninsured regulatory or data event"
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
    "Sample size, project diversity, customer diversity and recency shortfall"
  );

  const preNet = adjustments.reduce((s, x) => s + x.amount, 0);
  const validatedAlternative = tradRevenue * pct(p.customerAlternativeFactorPct);
  const willingnessCeiling = validatedAlternative * pct(p.willingnessToPayPct)
    + safe(p.costOfDelayValue) * pct(p.valueCapturePct);

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

  const revenueAdjustments = (revenue, model) => {
    const list = [];
    add(list, "Sales commission", "Commercial & financial", revenue * pct(p.salesCommissionPct), "Commission on booked revenue");
    add(list, "Channel / referral fee", "Commercial & financial", revenue * pct(p.channelFeePct), "Partner, reseller or referral cost");
    add(
      list,
      "Working-capital financing",
      "Commercial & financial",
      revenue * pct(p.annualWorkingCapitalPct) * safe(p.paymentDays) / 365,
      "Cost of payment terms and cash conversion"
    );
    add(list, "Withholding / unrecoverable tax", "Commercial & financial", revenue * pct(p.withholdingTaxPct), "Taxes not recoverable from the customer");
    add(
      list,
      "Credit-loss reserve",
      "Commercial & financial",
      revenue * pct(p.badDebtProbabilityPct) * pct(p.lossGivenDefaultPct),
      "Probability of default × loss given default"
    );
    add(
      list,
      "FX reserve",
      "Commercial & financial",
      revenue * pct(p.fxExposurePct) * pct(p.fxVolatilityPct) * (1 - pct(p.hedgedPct)),
      "Unhedged currency exposure"
    );
    add(
      list,
      "Expected SLA service credits",
      "Legal, SLA & regulatory",
      revenue * pct(p.slaBreachProbabilityPct) * pct(p.serviceCreditPct),
      "Breach probability × service-credit percentage"
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

  const revenueFor = (model) => {
    if (model === "tm") return deliveryHours * safe(p.billRate);
    if (model === "premium") return deliveryHours * safe(p.billRate) * (1 + pct(p.premiumPct));
    if (model === "subscription") return subscriptionRevenue;
    return validatedAlternative * (1 - pct(p.discountPct));
  };

  const scenario = (model) => {
    const revenue = revenueFor(model);
    let baseReferenceCost = baseAiCost;
    let scenarioAdjustments = adjustments.map((x) => ({ ...x }));
    let customerReference = validatedAlternative;
    let scenarioHours = deliveryHours;

    if (model === "subscription") {
      baseReferenceCost = baseAiCost * subscriptionTerm;
      scenarioHours = deliveryHours * subscriptionTerm;
      customerReference = validatedAlternative * subscriptionTerm;
      scenarioAdjustments = adjustments.map((x) => ({
        ...x,
        amount: x.recurring ? x.amount * subscriptionTerm : x.amount,
      }));
      add(
        scenarioAdjustments,
        "Annual platform operations",
        "Subscription operations",
        safe(p.subscriptionAnnualPlatformOps) * subscriptionTerm,
        "Ongoing platform operations over the contract term"
      );
      add(
        scenarioAdjustments,
        "Reserved subscription capacity",
        "Subscription operations",
        baseAiCost * subscriptionTerm * pct(p.subscriptionCapacityReservePct),
        "Capacity held to meet recurring SLA demand"
      );
      add(
        scenarioAdjustments,
        "Expected churn exposure",
        "Subscription operations",
        subscriptionRecurringRevenue * pct(p.subscriptionChurnProbabilityPct) / 2,
        "Expected half-period revenue exposure from early churn"
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
    };
  };

  const tm = scenario("tm");
  const premium = scenario("premium");
  const value = scenario("value");
  const subscription = scenario("subscription");
  const selected = { tm, premium, value, subscription }[p.pricingModel] || value;

  const appliedVariableRate = p.applyRiskAdjustments ? projectVariableRate : 0;
  const fixedRiskAdjustedCost = baseAiCost + (p.applyRiskAdjustments ? preNet : 0);
  const marginDenominator = Math.max(0.01, 1 - appliedVariableRate - pct(p.minGrossMarginPct));
  const profitDenominator = Math.max(0.01, 1 - appliedVariableRate);
  const targetProfit = tradProfit * (1 + pct(p.profitGrowthPct));
  const marginFloorRevenue = fixedRiskAdjustedCost / marginDenominator;
  const profitFloorRevenue = (fixedRiskAdjustedCost + targetProfit) / profitDenominator;
  const requiredRevenue = Math.max(marginFloorRevenue, profitFloorRevenue, safe(p.minimumEngagementFee));
  const breakevenRevenue = (fixedRiskAdjustedCost + tradProfit) / profitDenominator;
  const maxSafeDiscount = validatedAlternative > 0 ? 1 - requiredRevenue / validatedAlternative : -Infinity;
  const riskBreakevenDiscount = validatedAlternative > 0 ? 1 - breakevenRevenue / validatedAlternative : -Infinity;
  const legacyBreakevenDiscount = tradRevenue > 0 ? 1 - (tradProfit + baseAiCost) / tradRevenue : 0;

  const capacityFactor = Math.max(
    0.05,
    pct(p.parallelizabilityPct) * pct(p.environmentAvailabilityPct) * (1 - pct(p.rateLimitDelayPct))
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

  const gates = [
    { label: "Unit acceptance criteria defined", pass: !!p.unitAcceptanceDefined, severity: "hard" },
    { label: "Customer responsibilities and delay relief defined", pass: !!p.customerResponsibilitiesDefined, severity: "hard" },
    { label: "Scope evidence approved", pass: !!p.scopeEvidenceApproved, severity: "hard" },
    { label: "Security route approved", pass: !!p.securityApproved, severity: "hard" },
    { label: "Data residency approved", pass: !!p.dataResidencyApproved, severity: "hard" },
    { label: "IP and licensing terms approved", pass: !!p.ipApproved, severity: "hard" },
    { label: "Warranty boundaries defined", pass: !!p.warrantyDefined, severity: "hard" },
    { label: "SLA and service credits defined", pass: !!p.slaDefined, severity: "hard" },
    { label: "Payment terms approved", pass: !!p.paymentTermsApproved, severity: "hard" },
    { label: "Legal and liability terms approved", pass: !!p.legalTermsApproved, severity: "hard" },
    { label: "Approval matrix and segregation of duties defined", pass: !!p.approvalMatrixDefined, severity: "hard" },
    { label: "Baseline evidence is current", pass: safe(p.baselineAgeMonths) <= safe(p.maxBaselineAgeMonths), severity: productionStage ? "hard" : "warning" },
    { label: "Model rates are current", pass: safe(p.modelRateAgeMonths) <= safe(p.maxModelRateAgeMonths), severity: productionStage ? "hard" : "warning" },
    { label: "Complexity mix sums to 100%", pass: mixPass, severity: "hard" },
    { label: "Expected mix drift remains inside quote tolerance", pass: mixTolerancePass, severity: productionStage ? "hard" : "warning" },
    { label: "Model-routing mix sums to 100%", pass: routePass, severity: "hard" },
    { label: "Quote validity remains inside model-rate freshness window", pass: quoteRateWindowPass, severity: productionStage ? "hard" : "warning" },
    { label: "Delivery evidence meets sample policy", pass: statisticalPass, severity: productionStage ? "hard" : "warning" },
    { label: "Minimum volume commitment met", pass: unitsInScope >= safe(p.minimumCommitmentUnits), severity: "hard" },
  ];

  const hardFailures = gates.filter((g) => g.severity === "hard" && !g.pass);
  const warnings = gates.filter((g) => g.severity === "warning" && !g.pass);
  const selectedEconomicPass = selected.revenue >= requiredRevenue
    && selected.marginPct >= pct(p.minGrossMarginPct)
    && selected.profit >= targetProfit;
  const noBid = requiredRevenue > willingnessCeiling;
  const discountBeyondFloor = p.pricingModel === "value" && pct(p.discountPct) > maxSafeDiscount;
  const override = !!p.policyOverrideApproved;

  let governanceLevel = 0;
  let governanceTitle = "WITHIN POLICY";
  let governanceMessage = "Economics and mandatory policy gates pass. Sales may proceed inside the published band.";

  if (((hardFailures.length > 0 || !selectedEconomicPass || noBid || discountBeyondFloor) && !override)) {
    governanceLevel = 2;
    governanceTitle = noBid ? "NO-BID / RE-SCOPE" : "BLOCKED — POLICY OR ECONOMIC FLOOR FAILED";
    governanceMessage = noBid
      ? "The required risk-adjusted price exceeds the estimated willingness-to-pay ceiling. Re-scope, alter the service level or do not bid."
      : "At least one mandatory gate or risk-adjusted economic hurdle failed. The quote must not leave the business without an approved override.";
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
    validatedAlternative, willingnessCeiling,
    fixedRiskAdjustedCost, targetProfit,
    marginFloorRevenue, profitFloorRevenue, requiredRevenue,
    requiredPricePerUnit: unitsInScope > 0 ? requiredRevenue / unitsInScope : 0,
    maxSafeDiscount, riskBreakevenDiscount, legacyBreakevenDiscount,
    tradMonths, aiMonths, monthlyCapacity,
    tm, premium, value, subscription, selected,
    gates, hardFailures, warnings, statisticalPass,
    governance: { level: governanceLevel, title: governanceTitle, message: governanceMessage, override, noBid },
    grossProductivitySavings, riskAbsorption, customerDiscount, partnerIncrementalProfit,
  };
}

// ————— UI pieces —————
function Section({ title, children, note }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="text-xs font-bold tracking-widest" style={{ color: GOLDD }}>{title.toUpperCase()}</div>
        {note && <div className="max-w-xs text-right text-[11px]" style={{ color: MUTED }}>{note}</div>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SliderRow({ label, value, setValue, min, max, step = 1, suffix = "", hint }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-medium" style={{ color: SLATE }}>{label}</label>
        <span className="text-sm font-bold tabular-nums" style={{ color: NAVY }}>{safe(value).toLocaleString()}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={safe(value)}
        onChange={(e) => setValue(Number(e.target.value))}
        className="mt-1 w-full accent-amber-500" aria-label={label}
      />
      {hint && <div className="text-xs" style={{ color: MUTED }}>{hint}</div>}
    </div>
  );
}

function NumRow({ label, value, setValue, step = 1, prefix = "", suffix = "", hint, min }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium" style={{ color: SLATE }}>{label}</label>
        <div className="flex items-center gap-1">
          {prefix && <span className="text-sm" style={{ color: MUTED }}>{prefix}</span>}
          <input
            type="number" value={safe(value)} step={step} min={min}
            onChange={(e) => setValue(Number(e.target.value) || 0)}
            className="w-28 rounded-md border border-slate-300 px-2 py-1 text-right text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={{ color: NAVY }} aria-label={label}
          />
          {suffix && <span className="text-sm" style={{ color: MUTED }}>{suffix}</span>}
        </div>
      </div>
      {hint && <div className="mt-1 text-xs" style={{ color: MUTED }}>{hint}</div>}
    </div>
  );
}

function TextRow({ label, value, setValue, type = "text", placeholder = "" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm font-medium" style={{ color: SLATE }}>{label}</label>
      <input
        type={type} value={value || ""} placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        className="w-52 rounded-md border border-slate-300 px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
        style={{ color: NAVY }} aria-label={label}
      />
    </div>
  );
}

function SelectRow({ label, value, setValue, options, hint }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium" style={{ color: SLATE }}>{label}</label>
        <select
          value={value} onChange={(e) => setValue(e.target.value)}
          className="w-52 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
          style={{ color: NAVY }} aria-label={label}
        >
          {options.map((x) => {
            const v = typeof x === "string" ? x : x.value;
            const l = typeof x === "string" ? x : x.label;
            return <option key={v} value={v}>{l}</option>;
          })}
        </select>
      </div>
      {hint && <div className="mt-1 text-xs" style={{ color: MUTED }}>{hint}</div>}
    </div>
  );
}

function ToggleRow({ label, checked, setChecked, hint, danger = false }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg px-3 py-2" style={{ background: danger ? "#FDF1F0" : ICE2 }}>
      <span>
        <span className="block text-sm font-bold" style={{ color: danger ? RED : NAVY }}>{label}</span>
        {hint && <span className="mt-0.5 block text-xs" style={{ color: MUTED }}>{hint}</span>}
      </span>
      <input type="checkbox" checked={!!checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 h-4 w-4 accent-amber-500" />
    </label>
  );
}

function CheckRow({ label, checked, setChecked, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm" style={{ color: SLATE }}>
      <input type="checkbox" checked={!!checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-500" />
      <span>{label}{hint && <span className="block text-xs" style={{ color: MUTED }}>{hint}</span>}</span>
    </label>
  );
}

function CompactNum({ value, setValue, step = 1, width = "w-20" }) {
  return (
    <input
      type="number" value={safe(value)} step={step}
      onChange={(e) => setValue(Number(e.target.value) || 0)}
      className={`${width} rounded border border-slate-300 px-1.5 py-1 text-right text-xs font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-400`}
      style={{ color: NAVY }}
    />
  );
}

function Kpi({ label, value, sub, tone = "light", accent = false }) {
  const dark = tone === "dark";
  return (
    <div className="rounded-xl p-4" style={{ background: dark ? NAVY : ICE2, border: dark ? "none" : `1px solid ${ICE}` }}>
      <div className="text-xs font-bold tracking-wider" style={{ color: dark ? GOLD : GOLDD }}>{label.toUpperCase()}</div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums" style={{ color: accent ? GOLD : dark ? "#fff" : NAVY }}>{value}</div>
      {sub && <div className="mt-1 text-xs" style={{ color: dark ? ICE : MUTED }}>{sub}</div>}
    </div>
  );
}

function GatePill({ pass, severity }) {
  const warning = severity === "warning";
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-extrabold"
      style={{
        background: pass ? "#E6F1E9" : warning ? "#FBF3E4" : "#F9E7E6",
        color: pass ? GREEN : warning ? GOLDD : RED,
      }}
    >
      {pass ? "PASS" : warning ? "WARNING" : "FAIL"}
    </span>
  );
}

const MODELS = [
  { id: "tm", label: "T&M pass-through", note: "AI delivery hours × old rate" },
  { id: "premium", label: "Premium-rate T&M", note: "AI delivery hours × rate + premium" },
  { id: "value", label: "Per-unit value price", note: "Validated alternative cost − customer discount" },
  { id: "subscription", label: "Solution subscription", note: "Implementation + recurring fee + overages" },
];

function RiskAdjustmentsView({ st, setSt, r }) {
  const set = (k) => (v) => setSt((s) => ({ ...s, [k]: v }));
  const setTier = (i, k) => (v) => setSt((s) => ({
    ...s,
    complexityTiers: s.complexityTiers.map((x, j) => j === i ? { ...x, [k]: v } : x),
  }));
  const setRole = (i, k) => (v) => setSt((s) => ({
    ...s,
    roleRates: s.roleRates.map((x, j) => j === i ? { ...x, [k]: v } : x),
  }));
  const setRoute = (i, k) => (v) => setSt((s) => ({
    ...s,
    modelRoutes: s.modelRoutes.map((x, j) => j === i ? { ...x, [k]: v } : x),
  }));

  const sel = r.selected;
  const positiveTotal = Math.max(sel.positiveRisk, 0.0001);
  const riskRows = [...sel.riskBreakdown]
    .filter((x) => Math.abs(x.amount) >= 1)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .map((x) => ({
      ...x,
      contributionPct: x.amount > 0 ? x.amount / positiveTotal : 0,
      adjustedCostPct: sel.cost > 0 ? x.amount / sel.cost : 0,
      perUnit: r.unitsInScope > 0 ? x.amount / r.unitsInScope : 0,
    }));

  const categoryMap = new Map();
  riskRows.forEach((x) => categoryMap.set(x.category, (categoryMap.get(x.category) || 0) + x.amount));
  const categoryData = [...categoryMap.entries()]
    .map(([name, amount]) => ({ name, amount, contribution: amount > 0 ? amount / positiveTotal : 0 }))
    .filter((x) => Math.abs(x.amount) >= 1)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  const topRisk = riskRows.find((x) => x.amount > 0);
  const appliedStatus = st.applyRiskAdjustments ? "Applied to economics" : "Modeled only — not applied";
  const safeDiscount = Number.isFinite(r.maxSafeDiscount) ? r.maxSafeDiscount : 0;

  const bridgeData = [
    { name: "Base AI cost", value: sel.baseReferenceCost },
    { name: "Risk / policy adjustments", value: Math.max(0, sel.riskAdjustment) },
    { name: "Risk-adjusted cost", value: sel.cost },
    { name: "Required project revenue", value: r.requiredRevenue },
    { name: "Selected price", value: sel.revenue },
    { name: "Willingness-to-pay ceiling", value: r.willingnessCeiling },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi label="Applied risk factor" value={`+${fmtPct(sel.riskAdjustmentPct)}`} sub={appliedStatus} tone="dark" accent />
        <Kpi label="Modeled adjustment" value={fmt$(sel.modeledRiskAdjustment)} sub={`+${fmtPct(sel.modeledRiskAdjustmentPct)} of base cost`} />
        <Kpi label="Risk-adjusted cost" value={fmt$(sel.cost)} sub={`${fmt$full(sel.cost / Math.max(r.unitsInScope, 1))} per ${st.unit}`} />
        <Kpi label="Required revenue" value={fmt$(r.requiredRevenue)} sub={`${fmt$full(r.requiredPricePerUnit)} per ${st.unit}`} />
        <Kpi label="Max safe discount" value={fmtPct(safeDiscount)} sub={`Legacy floor was ${fmtPct(r.legacyBreakevenDiscount)}`} />
        <Kpi label="Policy gates" value={`${r.gates.length - r.hardFailures.length}/${r.gates.length}`} sub={`${r.hardFailures.length} hard failures · ${r.warnings.length} warnings`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[430px_1fr]">
        <div className="space-y-4">
          <Section title="Application and price-floor policy" note="Controls the economic hurdle, not just the delivery estimate">
            <ToggleRow
              label="Apply quantified risk and policy adjustments"
              checked={st.applyRiskAdjustments} setChecked={set("applyRiskAdjustments")}
              hint="When enabled, every quantified item below changes cost, profit, margin and the discount floor."
            />
            <SelectRow label="Quote stage" value={st.quoteStage} setValue={set("quoteStage")} options={["Pilot", "Production"]} hint="Production makes evidence recency and sample policy hard gates." />
            <SliderRow label="Minimum gross margin" value={st.minGrossMarginPct} setValue={set("minGrossMarginPct")} min={0} max={80} step={0.5} suffix="%" />
            <SliderRow label="Required gross-profit growth" value={st.profitGrowthPct} setValue={set("profitGrowthPct")} min={0} max={50} step={0.5} suffix="%" />
            <NumRow label="Minimum engagement fee" value={st.minimumEngagementFee} setValue={set("minimumEngagementFee")} step={5000} prefix="$" />
            <SliderRow label="Management contingency" value={st.generalContingencyPct} setValue={set("generalContingencyPct")} min={0} max={25} step={0.5} suffix="%" />
            <SliderRow label="Platform reinvestment" value={st.platformReinvestmentPct} setValue={set("platformReinvestmentPct")} min={0} max={20} step={0.5} suffix="% of revenue" />
            <NumRow label="Explicit opportunity cost" value={st.opportunityCost} setValue={set("opportunityCost")} step={1000} prefix="$" />
            <SliderRow label="Validated alternative-cost factor" value={st.customerAlternativeFactorPct} setValue={set("customerAlternativeFactorPct")} min={50} max={150} step={1} suffix="%" hint="Adjusts the internal traditional baseline to the customer's evidenced alternative." />
            <SliderRow label="Willingness to pay vs. validated alternative" value={st.willingnessToPayPct} setValue={set("willingnessToPayPct")} min={25} max={150} step={1} suffix="%" />
            <NumRow label="Customer cost-of-delay value" value={st.costOfDelayValue} setValue={set("costOfDelayValue")} step={5000} prefix="$" />
            <SliderRow label="Provider capture of cost-of-delay value" value={st.valueCapturePct} setValue={set("valueCapturePct")} min={0} max={100} step={1} suffix="%" />
            <SliderRow label="Win probability" value={st.winProbabilityPct} setValue={set("winProbabilityPct")} min={0} max={100} step={1} suffix="%" />
            <NumRow label="Bid / pursuit cost" value={st.bidCost} setValue={set("bidCost")} step={1000} prefix="$" />
          </Section>

          <Section title="Baseline, scope and complexity" note="Makes the value anchor and unit population auditable">
            <SelectRow label="Baseline type" value={st.baselineType} setValue={set("baselineType")} options={["Historical delivery / rate card", "Incumbent supplier benchmark", "Customer internal team", "Market benchmark", "Custom evidence"]} />
            <TextRow label="Baseline source" value={st.baselineSource} setValue={set("baselineSource")} />
            <SelectRow label="Baseline confidence" value={st.baselineConfidence} setValue={set("baselineConfidence")} options={["Low", "Medium", "High"]} />
            <NumRow label="Baseline age" value={st.baselineAgeMonths} setValue={set("baselineAgeMonths")} suffix="months" />
            <NumRow label="Maximum baseline age" value={st.maxBaselineAgeMonths} setValue={set("maxBaselineAgeMonths")} suffix="months" />
            <SliderRow label="Scope confidence" value={st.scopeConfidencePct} setValue={set("scopeConfidencePct")} min={0} max={100} step={1} suffix="%" />
            <SliderRow label="Cost impact if scope estimate misses" value={st.scopeImpactPct} setValue={set("scopeImpactPct")} min={0} max={200} step={1} suffix="%" />
            <SliderRow label="Unclassified units" value={st.unclassifiedUnitsPct} setValue={set("unclassifiedUnitsPct")} min={0} max={50} step={0.5} suffix="%" />
            <SliderRow label="Unclassified-unit complexity premium" value={st.unclassifiedPremiumPct} setValue={set("unclassifiedPremiumPct")} min={0} max={300} step={5} suffix="%" />
            <SliderRow label="Probability of class-mix drift" value={st.mixDriftProbabilityPct} setValue={set("mixDriftProbabilityPct")} min={0} max={100} suffix="%" />
            <SliderRow label="Expected mix drift" value={st.mixDriftPct} setValue={set("mixDriftPct")} min={0} max={50} step={0.5} suffix="%" />
            <SliderRow label="Cost premium on drifted units" value={st.complexityPremiumPct} setValue={set("complexityPremiumPct")} min={0} max={300} step={5} suffix="%" />
            <SliderRow label="Quoted mix tolerance" value={st.complexityMixTolerancePct} setValue={set("complexityMixTolerancePct")} min={0} max={50} step={0.5} suffix="%" />
            <SliderRow label="Dependency exposure" value={st.dependencyRiskPct} setValue={set("dependencyRiskPct")} min={0} max={25} step={0.5} suffix="% of base AI cost" />
            <SliderRow label="Complex-tail share" value={st.tailComplexityPct} setValue={set("tailComplexityPct")} min={0} max={50} step={0.5} suffix="%" />
            <SliderRow label="Complex-tail cost premium" value={st.tailPremiumPct} setValue={set("tailPremiumPct")} min={0} max={300} step={5} suffix="%" />
            <SliderRow label="Reuse / common-pattern credit" value={st.reuseCreditPct} setValue={set("reuseCreditPct")} min={0} max={25} step={0.5} suffix="% of base AI cost" />
            <SliderRow label="Customer input-quality exposure" value={st.customerInputRiskPct} setValue={set("customerInputRiskPct")} min={0} max={25} step={0.5} suffix="% of base AI cost" />
            <SliderRow label="Customer delay probability" value={st.customerDelayProbabilityPct} setValue={set("customerDelayProbabilityPct")} min={0} max={100} suffix="%" />
            <NumRow label="Delay if event occurs" value={st.customerDelayWeeks} setValue={set("customerDelayWeeks")} step={0.5} suffix="weeks" />
            <NumRow label="Weekly team burn" value={st.weeklyBurnRate} setValue={set("weeklyBurnRate")} step={1000} prefix="$" />
            <SliderRow label="Change-order threshold" value={st.changeThresholdPct} setValue={set("changeThresholdPct")} min={0} max={50} step={0.5} suffix="%" />
            <NumRow label="Minimum committed units" value={st.minimumCommitmentUnits} setValue={set("minimumCommitmentUnits")} />
            <CheckRow label="Unit acceptance criteria are defined" checked={st.unitAcceptanceDefined} setChecked={set("unitAcceptanceDefined")} />
            <CheckRow label="Customer responsibilities and delay relief are defined" checked={st.customerResponsibilitiesDefined} setChecked={set("customerResponsibilitiesDefined")} />
            <CheckRow label="Scope evidence is approved" checked={st.scopeEvidenceApproved} setChecked={set("scopeEvidenceApproved")} />
          </Section>

          <Section title="Complexity-class economics" note={`Optional replacement for the blended h, c, e and q model · mix total ${r.tierMixTotal.toFixed(1)}%`}>
            <ToggleRow
              label="Use simple / medium / complex calculations"
              checked={st.complexityModelEnabled} setChecked={set("complexityModelEnabled")}
              hint="When enabled, class-level hours, coverage, reduction, review, rework and token multipliers replace the blended assumptions."
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-xs">
                <thead>
                  <tr className="text-left" style={{ color: MUTED }}>
                    <th className="pb-2">Class</th><th>Mix %</th><th>Hours</th><th>AI c%</th><th>e%</th><th>Review %</th><th>Review hrs</th><th>Rework %</th><th>Token ×</th><th>Published $</th>
                  </tr>
                </thead>
                <tbody>
                  {st.complexityTiers.map((t, i) => (
                    <tr key={t.id} className="border-t border-slate-100">
                      <td className="py-2 font-bold" style={{ color: NAVY }}>{t.label}</td>
                      <td><CompactNum value={t.mixPct} setValue={setTier(i, "mixPct")} step={1} /></td>
                      <td><CompactNum value={t.hrsPerUnit} setValue={setTier(i, "hrsPerUnit")} step={0.1} /></td>
                      <td><CompactNum value={t.aiCoverage} setValue={setTier(i, "aiCoverage")} /></td>
                      <td><CompactNum value={t.effortReduction} setValue={setTier(i, "effortReduction")} /></td>
                      <td><CompactNum value={t.reviewCoveragePct} setValue={setTier(i, "reviewCoveragePct")} /></td>
                      <td><CompactNum value={t.reviewHours} setValue={setTier(i, "reviewHours")} step={0.05} /></td>
                      <td><CompactNum value={t.reworkRatePct} setValue={setTier(i, "reworkRatePct")} step={0.1} /></td>
                      <td><CompactNum value={t.tokenFactor} setValue={setTier(i, "tokenFactor")} step={0.05} /></td>
                      <td><CompactNum value={t.publishedPrice} setValue={setTier(i, "publishedPrice")} step={5} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Labor, review and capacity" note="Separates production roles, senior QA and realizable savings">
            <ToggleRow label="Use role-level labor rates" checked={st.advancedLaborEnabled} setChecked={set("advancedLaborEnabled")} hint="Replaces one blended AI labor rate with a role/location mix and adds PMO, architecture and security hours." />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-xs">
                <thead><tr className="text-left" style={{ color: MUTED }}><th className="pb-2">Role</th><th>Share %</th><th>Rate / hr</th><th>Location</th></tr></thead>
                <tbody>
                  {st.roleRates.map((x, i) => (
                    <tr key={x.id} className="border-t border-slate-100">
                      <td className="py-2 font-bold" style={{ color: NAVY }}>{x.label}</td>
                      <td><CompactNum value={x.sharePct} setValue={setRole(i, "sharePct")} /></td>
                      <td><CompactNum value={x.rate} setValue={setRole(i, "rate")} /></td>
                      <td>
                        <select value={x.location} onChange={(e) => setRole(i, "location")(e.target.value)} className="rounded border border-slate-300 px-1 py-1 text-xs">
                          {['Offshore', 'Nearshore', 'Onshore', 'Mixed'].map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ToggleRow label="Use direct QA coverage and hours" checked={st.directQaEnabled} setChecked={set("directQaEnabled")} hint="Otherwise the original q add-back formula remains active in blended mode." />
            <SliderRow label="AI units reviewed" value={st.reviewCoveragePct} setValue={set("reviewCoveragePct")} min={0} max={100} suffix="%" />
            <NumRow label={`Review hours / covered ${st.unit}`} value={st.reviewHoursPerCoveredUnit} setValue={set("reviewHoursPerCoveredUnit")} step={0.05} suffix="hrs" />
            <NumRow label="Senior reviewer loaded rate" value={st.reviewerRate} setValue={set("reviewerRate")} prefix="$" suffix="/hr" />
            <SliderRow label="QA exit threshold — rework" value={st.qaExitReworkPct} setValue={set("qaExitReworkPct")} min={0} max={20} step={0.1} suffix="%" />
            <SliderRow label="QA sampling after exit" value={st.qaSamplePct} setValue={set("qaSamplePct")} min={0} max={100} suffix="%" />
            <SliderRow label="PMO hours" value={st.pmoHoursPct} setValue={set("pmoHoursPct")} min={0} max={40} step={0.5} suffix="% of direct AI hours" />
            <NumRow label="PMO loaded rate" value={st.pmoRate} setValue={set("pmoRate")} prefix="$" suffix="/hr" />
            <SliderRow label="Architecture hours" value={st.architectureHoursPct} setValue={set("architectureHoursPct")} min={0} max={40} step={0.5} suffix="% of production hours" />
            <NumRow label="Architect loaded rate" value={st.architectureRate} setValue={set("architectureRate")} prefix="$" suffix="/hr" />
            <NumRow label="Security review hours" value={st.securityReviewHours} setValue={set("securityReviewHours")} suffix="hrs" />
            <NumRow label="Security reviewer rate" value={st.securityReviewRate} setValue={set("securityReviewRate")} prefix="$" suffix="/hr" />
            <SliderRow label="Saved labor immediately avoidable" value={st.avoidableLaborPct} setValue={set("avoidableLaborPct")} min={0} max={100} suffix="%" />
            <SliderRow label="Freed capacity redeployed" value={st.redeployProbabilityPct} setValue={set("redeployProbabilityPct")} min={0} max={100} suffix="%" />
            <NumRow label="Redeployment lag" value={st.redeployLagWeeks} setValue={set("redeployLagWeeks")} step={0.5} suffix="weeks" />
            <SliderRow label="Scarce specialist premium" value={st.scarceCapacityPremiumPct} setValue={set("scarceCapacityPremiumPct")} min={0} max={100} suffix="%" />
          </Section>

          <Section title="Setup, platform and non-production work">
            <NumRow label="Discovery and scoping" value={st.discoveryCost} setValue={set("discoveryCost")} step={1000} prefix="$" />
            <NumRow label="Customer-specific setup" value={st.setupCost} setValue={set("setupCost")} step={1000} prefix="$" />
            <NumRow label="Systems integration" value={st.integrationCost} setValue={set("integrationCost")} step={1000} prefix="$" />
            <NumRow label="Security and compliance" value={st.securityComplianceCost} setValue={set("securityComplianceCost")} step={1000} prefix="$" />
            <NumRow label="Evaluation and benchmark" value={st.evaluationCost} setValue={set("evaluationCost")} step={1000} prefix="$" />
            <NumRow label="Training and enablement" value={st.trainingCost} setValue={set("trainingCost")} step={1000} prefix="$" />
            <NumRow label="Shutdown and data deletion" value={st.shutdownCost} setValue={set("shutdownCost")} step={1000} prefix="$" />
            <ToggleRow label="Allocate shared platform investment automatically" checked={st.autoPlatformAllocation} setChecked={set("autoPlatformAllocation")} hint="Uses investment ÷ useful life ÷ expected units × recovery percentage instead of manual P." />
            <NumRow label="Shared platform investment" value={st.platformInvestment} setValue={set("platformInvestment")} step={10000} prefix="$" />
            <NumRow label="Useful life" value={st.platformUsefulLifeYears} setValue={set("platformUsefulLifeYears")} step={0.5} suffix="years" />
            <NumRow label="Expected annual platform units" value={st.annualPlatformUnits} setValue={set("annualPlatformUnits")} step={1000} />
            <SliderRow label="Platform recovery target" value={st.platformRecoveryPct} setValue={set("platformRecoveryPct")} min={0} max={200} suffix="%" />
          </Section>

          <Section title="Quality, rework and warranty">
            <SliderRow label="Rework rate" value={st.reworkRatePct} setValue={set("reworkRatePct")} min={0} max={30} step={0.1} suffix="%" hint="Used in blended mode; class rates apply when complexity economics are enabled." />
            <NumRow label="Hours per reworked unit" value={st.reworkHoursPerUnit} setValue={set("reworkHoursPerUnit")} step={0.1} suffix="hrs" />
            <NumRow label="Average rework cycles" value={st.reworkCycles} setValue={set("reworkCycles")} step={0.1} />
            <NumRow label="Rework loaded rate" value={st.reworkLaborRate} setValue={set("reworkLaborRate")} prefix="$" suffix="/hr" />
            <SliderRow label="Warranty claim rate" value={st.warrantyClaimRatePct} setValue={set("warrantyClaimRatePct")} min={0} max={30} step={0.1} suffix="%" />
            <NumRow label="Hours per warranty claim" value={st.warrantyHoursPerClaim} setValue={set("warrantyHoursPerClaim")} step={0.1} suffix="hrs" />
            <NumRow label="Average warranty cycles" value={st.warrantyCycles} setValue={set("warrantyCycles")} step={0.1} />
            <NumRow label="Warranty loaded rate" value={st.warrantyLaborRate} setValue={set("warrantyLaborRate")} prefix="$" suffix="/hr" />
            <NumRow label="Warranty duration" value={st.warrantyMonths} setValue={set("warrantyMonths")} suffix="months" />
            <SliderRow label="Escaped-defect probability" value={st.escapedDefectProbabilityPct} setValue={set("escapedDefectProbabilityPct")} min={0} max={30} step={0.1} suffix="%" />
            <NumRow label="Escaped-defect impact" value={st.escapedDefectImpact} setValue={set("escapedDefectImpact")} step={5000} prefix="$" />
            <SliderRow label="Uninsured escaped-defect share" value={st.escapedDefectUninsuredPct} setValue={set("escapedDefectUninsuredPct")} min={0} max={100} suffix="%" />
            <SliderRow label="First-pass acceptance target" value={st.firstPassTargetPct} setValue={set("firstPassTargetPct")} min={0} max={100} step={0.1} suffix="%" />
            <SliderRow label="ATC pass target" value={st.atcPassTargetPct} setValue={set("atcPassTargetPct")} min={0} max={100} step={0.1} suffix="%" />
            <SliderRow label="Regression pass target" value={st.regressionPassTargetPct} setValue={set("regressionPassTargetPct")} min={0} max={100} step={0.1} suffix="%" />
            <SliderRow label="Maximum defect escape rate" value={st.defectEscapeTargetPct} setValue={set("defectEscapeTargetPct")} min={0} max={10} step={0.1} suffix="%" />
          </Section>

          <Section title="AI routing, token mechanics and infrastructure" note={`Effective input / output rates ${fmt$full(r.weightedTokenInRate)} / ${fmt$full(r.weightedTokenOutRate)} per 1M`}>
            <ToggleRow label="Use routed multi-model token economics" checked={st.advancedTokenModelEnabled} setChecked={set("advancedTokenModelEnabled")} hint="Separates route mix, cache eligibility, cache hits, batch share and long-context surcharge." />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-xs">
                <thead><tr className="text-left" style={{ color: MUTED }}><th className="pb-2">Route</th><th>Share %</th><th>$ in / 1M</th><th>$ out / 1M</th></tr></thead>
                <tbody>
                  {st.modelRoutes.map((x, i) => (
                    <tr key={x.id} className="border-t border-slate-100">
                      <td className="py-2 font-bold" style={{ color: NAVY }}>{x.label}</td>
                      <td><CompactNum value={x.sharePct} setValue={setRoute(i, "sharePct")} /></td>
                      <td><CompactNum value={x.pin} setValue={setRoute(i, "pin")} step={0.25} /></td>
                      <td><CompactNum value={x.pout} setValue={setRoute(i, "pout")} step={0.5} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <SliderRow label="Cache-eligible input" value={st.cacheEligiblePct} setValue={set("cacheEligiblePct")} min={0} max={100} suffix="%" />
            <SliderRow label="Cache hit rate" value={st.cacheHitPct} setValue={set("cacheHitPct")} min={0} max={100} suffix="%" />
            <SliderRow label="Cached-input discount" value={st.cachedInputDiscountPct} setValue={set("cachedInputDiscountPct")} min={0} max={100} suffix="%" />
            <SliderRow label="Batch-eligible share" value={st.batchSharePct} setValue={set("batchSharePct")} min={0} max={100} suffix="%" />
            <SliderRow label="Batch discount" value={st.batchDiscountPct} setValue={set("batchDiscountPct")} min={0} max={100} suffix="%" />
            <SliderRow label="Long-context share" value={st.longContextSharePct} setValue={set("longContextSharePct")} min={0} max={100} suffix="%" />
            <SliderRow label="Long-context surcharge" value={st.longContextSurchargePct} setValue={set("longContextSurchargePct")} min={0} max={200} suffix="%" />
            <NumRow label="Maximum agent loop depth" value={st.loopCap} setValue={set("loopCap")} />
            <SliderRow label="Model-price volatility reserve" value={st.modelPriceVolatilityPct} setValue={set("modelPriceVolatilityPct")} min={0} max={200} suffix="% of token cost" />
            <NumRow label="Embedding / vector services" value={st.embeddingVectorCost} setValue={set("embeddingVectorCost")} step={1000} prefix="$" />
            <NumRow label="Non-token AI infrastructure" value={st.nonTokenAiCost} setValue={set("nonTokenAiCost")} step={1000} prefix="$" />
            <NumRow label="Private endpoint / residency" value={st.privateEndpointCost} setValue={set("privateEndpointCost")} step={1000} prefix="$" />
            <NumRow label="Observability and evaluation" value={st.observabilityCost} setValue={set("observabilityCost")} step={1000} prefix="$" />
            <NumRow label="Model migration reserve" value={st.modelMigrationReserve} setValue={set("modelMigrationReserve")} step={1000} prefix="$" />
            <NumRow label="Vendor minimum commitment" value={st.vendorMinimumCommitment} setValue={set("vendorMinimumCommitment")} step={1000} prefix="$" />
            <TextRow label="Exact model / route set" value={st.exactModelName} setValue={set("exactModelName")} />
            <TextRow label="Model snapshot / version" value={st.modelVersion} setValue={set("modelVersion")} />
            <TextRow label="Prompt version" value={st.promptVersion} setValue={set("promptVersion")} />
            <TextRow label="Agent version" value={st.agentVersion} setValue={set("agentVersion")} />
            <TextRow label="Endpoint region" value={st.endpointRegion} setValue={set("endpointRegion")} />
            <NumRow label="Model-rate age" value={st.modelRateAgeMonths} setValue={set("modelRateAgeMonths")} suffix="months" />
            <NumRow label="Maximum model-rate age" value={st.maxModelRateAgeMonths} setValue={set("maxModelRateAgeMonths")} suffix="months" />
          </Section>

          <Section title="Throughput and schedule">
            <NumRow label="Productive hours / FTE-month" value={st.productiveHoursPerFteMonth} setValue={set("productiveHoursPerFteMonth")} suffix="hrs" />
            <SliderRow label="Parallelizable work" value={st.parallelizabilityPct} setValue={set("parallelizabilityPct")} min={0} max={100} suffix="%" />
            <SliderRow label="Environment availability" value={st.environmentAvailabilityPct} setValue={set("environmentAvailabilityPct")} min={0} max={100} suffix="%" />
            <SliderRow label="Rate-limit / queue delay" value={st.rateLimitDelayPct} setValue={set("rateLimitDelayPct")} min={0} max={90} suffix="% of capacity" />
          </Section>

          <Section title="Commercial and financial adjustments">
            <SliderRow label="Sales commission" value={st.salesCommissionPct} setValue={set("salesCommissionPct")} min={0} max={25} step={0.25} suffix="% of revenue" />
            <SliderRow label="Channel / referral fee" value={st.channelFeePct} setValue={set("channelFeePct")} min={0} max={25} step={0.25} suffix="%" />
            <NumRow label="Payment terms" value={st.paymentDays} setValue={set("paymentDays")} suffix="days" />
            <SliderRow label="Annual working-capital rate" value={st.annualWorkingCapitalPct} setValue={set("annualWorkingCapitalPct")} min={0} max={30} step={0.25} suffix="%" />
            <SliderRow label="Unrecoverable withholding / tax" value={st.withholdingTaxPct} setValue={set("withholdingTaxPct")} min={0} max={30} step={0.25} suffix="%" />
            <SliderRow label="Probability of default" value={st.badDebtProbabilityPct} setValue={set("badDebtProbabilityPct")} min={0} max={30} step={0.1} suffix="%" />
            <SliderRow label="Loss given default" value={st.lossGivenDefaultPct} setValue={set("lossGivenDefaultPct")} min={0} max={100} suffix="%" />
            <SliderRow label="FX-exposed revenue" value={st.fxExposurePct} setValue={set("fxExposurePct")} min={0} max={100} suffix="%" />
            <SliderRow label="Expected FX volatility" value={st.fxVolatilityPct} setValue={set("fxVolatilityPct")} min={0} max={50} step={0.25} suffix="%" />
            <SliderRow label="FX exposure hedged" value={st.hedgedPct} setValue={set("hedgedPct")} min={0} max={100} suffix="%" />
            <SliderRow label="Annual labor inflation" value={st.annualInflationPct} setValue={set("annualInflationPct")} min={0} max={30} step={0.25} suffix="%" />
            <NumRow label="Delivery period" value={st.deliveryYears} setValue={set("deliveryYears")} step={0.1} suffix="years" />
            <NumRow label="Travel and expenses" value={st.travelCost} setValue={set("travelCost")} step={1000} prefix="$" />
            <NumRow label="Third-party tools / licences" value={st.thirdPartyCost} setValue={set("thirdPartyCost")} step={1000} prefix="$" />
            <SliderRow label="Country-risk premium" value={st.countryRiskPremiumPct} setValue={set("countryRiskPremiumPct")} min={0} max={25} step={0.25} suffix="% of revenue" />
            <SliderRow label="Cancellation probability" value={st.cancellationProbabilityPct} setValue={set("cancellationProbabilityPct")} min={0} max={100} suffix="%" />
            <NumRow label="Unrecovered cancellation exposure" value={st.cancellationExposure} setValue={set("cancellationExposure")} step={1000} prefix="$" />
            <SliderRow label="Under-consumption probability" value={st.underConsumptionProbabilityPct} setValue={set("underConsumptionProbabilityPct")} min={0} max={100} suffix="%" />
            <NumRow label="Under-consumption exposure" value={st.underConsumptionExposure} setValue={set("underConsumptionExposure")} step={1000} prefix="$" />
            <NumRow label="Quote validity" value={st.quoteValidityDays} setValue={set("quoteValidityDays")} suffix="days" />
            <SelectRow label="Account segment" value={st.accountSegment} setValue={set("accountSegment")} options={["Strategic account", "Existing account", "New logo", "Public sector", "Channel-led"]} />
            <SelectRow label="Industry risk" value={st.industryRisk} setValue={set("industryRisk")} options={["Standard", "Regulated", "Highly regulated", "Mission critical"]} />
          </Section>

          <Section title="Solution subscription parameters" note="Used when the subscription pricing model is selected">
            <NumRow label="Annual base fee" value={st.subscriptionAnnualFee} setValue={set("subscriptionAnnualFee")} step={5000} prefix="$" />
            <NumRow label="Included annual units" value={st.subscriptionIncludedUnits} setValue={set("subscriptionIncludedUnits")} />
            <NumRow label="Expected annual units" value={st.subscriptionExpectedAnnualUnits} setValue={set("subscriptionExpectedAnnualUnits")} />
            <NumRow label="Overage price / unit" value={st.subscriptionOveragePrice} setValue={set("subscriptionOveragePrice")} step={5} prefix="$" />
            <NumRow label="Initial contract term" value={st.subscriptionTermYears} setValue={set("subscriptionTermYears")} suffix="years" />
            <SliderRow label="Annual price uplift" value={st.subscriptionUpliftPct} setValue={set("subscriptionUpliftPct")} min={0} max={20} step={0.25} suffix="%" />
            <NumRow label="Implementation fee" value={st.subscriptionImplementationFee} setValue={set("subscriptionImplementationFee")} step={5000} prefix="$" />
            <SliderRow label="Support and customer-success cost" value={st.subscriptionSupportCostPct} setValue={set("subscriptionSupportCostPct")} min={0} max={60} step={0.5} suffix="% of revenue" />
            <NumRow label="Annual platform operations" value={st.subscriptionAnnualPlatformOps} setValue={set("subscriptionAnnualPlatformOps")} step={5000} prefix="$" />
            <SliderRow label="Early-churn probability" value={st.subscriptionChurnProbabilityPct} setValue={set("subscriptionChurnProbabilityPct")} min={0} max={50} step={0.5} suffix="%" />
            <SliderRow label="Reserved capacity" value={st.subscriptionCapacityReservePct} setValue={set("subscriptionCapacityReservePct")} min={0} max={50} step={0.5} suffix="% of annual base cost" />
          </Section>

          <Section title="SLA, legal, security and regulatory">
            <SliderRow label="SLA breach probability" value={st.slaBreachProbabilityPct} setValue={set("slaBreachProbabilityPct")} min={0} max={50} step={0.1} suffix="%" />
            <SliderRow label="Service credit if breach occurs" value={st.serviceCreditPct} setValue={set("serviceCreditPct")} min={0} max={100} step={0.5} suffix="% of revenue" />
            <SliderRow label="Availability target" value={st.availabilityTargetPct} setValue={set("availabilityTargetPct")} min={90} max={100} step={0.1} suffix="%" />
            <NumRow label="Customer acceptance window" value={st.acceptanceDays} setValue={set("acceptanceDays")} suffix="days" />
            <SliderRow label="Liability event probability" value={st.liabilityEventProbabilityPct} setValue={set("liabilityEventProbabilityPct")} min={0} max={20} step={0.1} suffix="%" />
            <NumRow label="Liability event impact" value={st.liabilityImpact} setValue={set("liabilityImpact")} step={10000} prefix="$" />
            <SliderRow label="Uninsured liability share" value={st.liabilityUninsuredPct} setValue={set("liabilityUninsuredPct")} min={0} max={100} suffix="%" />
            <SliderRow label="Contractual liability cap" value={st.liabilityCapPct} setValue={set("liabilityCapPct")} min={0} max={500} step={5} suffix="% of traditional revenue" />
            <SliderRow label="Regulatory event probability" value={st.regulatoryEventProbabilityPct} setValue={set("regulatoryEventProbabilityPct")} min={0} max={20} step={0.1} suffix="%" />
            <NumRow label="Regulatory event impact" value={st.regulatoryImpact} setValue={set("regulatoryImpact")} step={10000} prefix="$" />
            <SliderRow label="Uninsured regulatory share" value={st.regulatoryUninsuredPct} setValue={set("regulatoryUninsuredPct")} min={0} max={100} suffix="%" />
            <SelectRow label="Data classification" value={st.dataClassification} setValue={set("dataClassification")} options={["Public", "Internal", "Confidential", "Restricted / regulated"]} />
            <CheckRow label="Security route approved" checked={st.securityApproved} setChecked={set("securityApproved")} />
            <CheckRow label="Data residency and retention approved" checked={st.dataResidencyApproved} setChecked={set("dataResidencyApproved")} />
            <CheckRow label="IP, open-source and licensing terms approved" checked={st.ipApproved} setChecked={set("ipApproved")} />
            <CheckRow label="Warranty duration, exclusions and cap defined" checked={st.warrantyDefined} setChecked={set("warrantyDefined")} />
            <CheckRow label="SLA metrics and service-credit cap defined" checked={st.slaDefined} setChecked={set("slaDefined")} />
            <CheckRow label="Payment, tax, FX and termination terms approved" checked={st.paymentTermsApproved} setChecked={set("paymentTermsApproved")} />
            <CheckRow label="Liability, indemnity and insurance terms approved" checked={st.legalTermsApproved} setChecked={set("legalTermsApproved")} />
          </Section>

          <Section title="Evidence, statistics and governance">
            <TextRow label="Quote ID" value={st.quoteId} setValue={set("quoteId")} />
            <TextRow label="Engagement ID" value={st.engagementId} setValue={set("engagementId")} />
            <TextRow label="Policy version" value={st.policyVersion} setValue={set("policyVersion")} />
            <TextRow label="Parameter-set version" value={st.parameterSetVersion} setValue={set("parameterSetVersion")} />
            <TextRow label="Policy effective date" value={st.effectiveDate} setValue={set("effectiveDate")} type="date" />
            <TextRow label="Quote owner" value={st.quoteOwner} setValue={set("quoteOwner")} />
            <TextRow label="Delivery owner" value={st.deliveryOwner} setValue={set("deliveryOwner")} />
            <TextRow label="Finance approver" value={st.financeApprover} setValue={set("financeApprover")} />
            <NumRow label="Observed units" value={st.sampleUnits} setValue={set("sampleUnits")} />
            <NumRow label="Minimum observed units" value={st.minimumSampleUnits} setValue={set("minimumSampleUnits")} />
            <NumRow label="Observed projects" value={st.sampleProjects} setValue={set("sampleProjects")} />
            <NumRow label="Minimum projects" value={st.minimumProjects} setValue={set("minimumProjects")} />
            <NumRow label="Observed customers" value={st.sampleCustomers} setValue={set("sampleCustomers")} />
            <NumRow label="Minimum customers" value={st.minimumCustomers} setValue={set("minimumCustomers")} />
            <SliderRow label="Required confidence level" value={st.confidenceLevelPct} setValue={set("confidenceLevelPct")} min={50} max={99.9} step={0.1} suffix="%" />
            <SliderRow label="Maximum margin of error" value={st.marginOfErrorPct} setValue={set("marginOfErrorPct")} min={0} max={30} step={0.1} suffix="%" />
            <NumRow label="Data recency" value={st.dataRecencyMonths} setValue={set("dataRecencyMonths")} suffix="months" />
            <NumRow label="Maximum data age" value={st.maxDataRecencyMonths} setValue={set("maxDataRecencyMonths")} suffix="months" />
            <SelectRow label="Blended-metric weighting" value={st.weightingMethod} setValue={set("weightingMethod")} options={["Baseline-hour weighted", "Cost weighted", "Revenue weighted", "Unit-count weighted", "Actual-hour weighted"]} />
            <SelectRow label="Outlier treatment" value={st.outlierMethod} setValue={set("outlierMethod")} options={["Winsorize and investigate", "Exclude with approval", "Robust median", "No automatic exclusion"]} />
            <CheckRow label="Approval matrix and segregation of duties defined" checked={st.approvalMatrixDefined} setChecked={set("approvalMatrixDefined")} />
            <ToggleRow label="Policy override approved" checked={st.policyOverrideApproved} setChecked={set("policyOverrideApproved")} danger hint="An override should name the approver, rationale, expiry and mitigation. It does not remove the modeled cost." />
            <TextRow label="Override rationale" value={st.overrideRationale} setValue={set("overrideRationale")} placeholder="Required when override is enabled" />
          </Section>
        </div>

        <div className="space-y-5 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm font-extrabold" style={{ color: NAVY }}>Risk-adjusted economics bridge</div>
            <div className="mb-3 text-xs" style={{ color: MUTED }}>The selected scenario uses the itemized adjustment factor; it is not a separate markup applied after the calculation.</div>
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={bridgeData} layout="vertical" margin={{ top: 0, right: 35, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E9F2" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => "$" + Math.round(v / 1000) + "K"} tick={{ fontSize: 11, fill: MUTED }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fill: SLATE }} />
                <Tooltip formatter={(v) => fmt$full(v)} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {bridgeData.map((x, i) => <Cell key={x.name} fill={i === 1 ? RED : i === 4 ? GOLD : i === 5 ? "#7A93B8" : NAVY2} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm font-extrabold" style={{ color: NAVY }}>Contribution by risk category</div>
            <div className="mb-3 text-xs" style={{ color: MUTED }}>
              Positive contributions use total positive modeled adjustment as the denominator. Mitigation credits remain visible as negative values.
            </div>
            <ResponsiveContainer width="100%" height={Math.max(260, categoryData.length * 38)}>
              <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 40, left: 35, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E9F2" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => "$" + Math.round(v / 1000) + "K"} tick={{ fontSize: 11, fill: MUTED }} />
                <YAxis type="category" dataKey="name" width={155} tick={{ fontSize: 11, fill: SLATE }} />
                <Tooltip formatter={(v, name, item) => [fmt$full(v), `${name} · ${fmtPct(item.payload.contribution)}`]} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {categoryData.map((x) => <Cell key={x.name} fill={x.amount < 0 ? GREEN : GOLD} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {topRisk && (
              <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: ICE2, color: SLATE }}>
                <span className="font-bold" style={{ color: NAVY }}>Largest risk: </span>
                {topRisk.label} contributes {fmt$(topRisk.amount)} or {fmtPct(topRisk.contributionPct)} of positive modeled adjustments.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <div className="text-sm font-extrabold" style={{ color: NAVY }}>Detailed risk contribution</div>
                <div className="text-xs" style={{ color: MUTED }}>Every row is included in the selected scenario when adjustments are enabled.</div>
              </div>
              <div className="text-right text-xs" style={{ color: MUTED }}>
                Positive risk {fmt$(sel.positiveRisk)} · mitigation {fmt$(sel.mitigation)}
              </div>
            </div>
            <div className="max-h-[520px] overflow-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[760px] text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left" style={{ color: MUTED }}>
                    <th className="px-3 py-2">Adjustment</th><th>Category</th><th className="text-right">Amount</th><th className="text-right">% of positive risk</th><th className="text-right">% of adjusted cost</th><th className="pr-3 text-right">Per unit</th>
                  </tr>
                </thead>
                <tbody>
                  {riskRows.map((x) => (
                    <tr key={`${x.category}-${x.label}`} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <div className="font-bold" style={{ color: NAVY }}>{x.label}</div>
                        <div className="text-[10px]" style={{ color: MUTED }}>{x.note}</div>
                      </td>
                      <td style={{ color: SLATE }}>{x.category}</td>
                      <td className="text-right font-bold tabular-nums" style={{ color: x.amount < 0 ? GREEN : NAVY }}>{fmt$full(x.amount)}</td>
                      <td className="text-right tabular-nums" style={{ color: SLATE }}>{x.amount > 0 ? fmtPct(x.contributionPct) : "credit"}</td>
                      <td className="text-right tabular-nums" style={{ color: SLATE }}>{fmtPct(x.adjustedCostPct)}</td>
                      <td className="pr-3 text-right tabular-nums" style={{ color: SLATE }}>{fmt$full(x.perUnit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 text-sm font-extrabold" style={{ color: NAVY }}>Price-floor tests</div>
            <div className="grid grid-cols-2 gap-3">
              <Kpi label="Margin floor" value={fmt$(r.marginFloorRevenue)} sub={`${st.minGrossMarginPct}% minimum GM`} />
              <Kpi label="Profit floor" value={fmt$(r.profitFloorRevenue)} sub={`${st.profitGrowthPct}% growth over baseline GP`} />
              <Kpi label="Minimum fee" value={fmt$(st.minimumEngagementFee)} sub="Fixed engagement hurdle" />
              <Kpi label="Binding floor" value={fmt$(r.requiredRevenue)} sub={`Maximum discount ${fmtPct(r.maxSafeDiscount)}`} tone="dark" accent />
            </div>
            <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: r.governance.noBid ? "#F9E7E6" : ICE2, color: SLATE }}>
              Required price {fmt$(r.requiredRevenue)} vs. willingness-to-pay ceiling {fmt$(r.willingnessCeiling)}. {r.governance.noBid ? "The current configuration is a no-bid or re-scope case." : "The external price ceiling remains above the internal floor."}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-extrabold" style={{ color: NAVY }}>Mandatory gates and evidence warnings</div>
              <GatePill pass={r.governance.level === 0} severity={r.governance.level === 1 ? "warning" : "hard"} />
            </div>
            <div className="space-y-2">
              {r.gates.map((g) => (
                <div key={g.label} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: ICE2 }}>
                  <span className="text-xs" style={{ color: SLATE }}>{g.label}</span>
                  <GatePill pass={g.pass} severity={g.severity} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ background: r.governance.level === 2 ? "#F9E7E6" : r.governance.level === 1 ? "#FBF3E4" : "#E6F1E9" }}>
            <div className="text-xs font-extrabold tracking-wider" style={{ color: r.governance.level === 2 ? RED : r.governance.level === 1 ? GOLDD : GREEN }}>
              DEAL GOVERNANCE · {r.governance.title}
            </div>
            <div className="mt-1 text-sm" style={{ color: SLATE }}>{r.governance.message}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [presetId, setPresetId] = useState("remediation");
  const [view, setView] = useState("internal"); // internal | risk | customer
  const [st, setSt] = useState(() => deepClone(PRESETS.remediation));
  const set = (k) => (v) => setSt((s) => ({ ...s, [k]: v }));
  const loadPreset = (id) => {
    setPresetId(id);
    setSt(deepClone(PRESETS[id]));
  };

  const r = useMemo(() => compute(st), [st]);
  const sel = r.selected;
  const profitDelta = sel.profit - r.tradProfit;
  const U = st.unit;
  const Up = st.unitPlural;
  const cap = (w) => w ? w.charAt(0).toUpperCase() + w.slice(1) : w;

  const compareData = [
    { name: "Traditional", Revenue: r.tradRevenue, "Cost of delivery": r.tradCost, "Gross profit": r.tradProfit },
    { name: "AI + T&M", Revenue: r.tm.revenue, "Cost of delivery": r.tm.cost, "Gross profit": r.tm.profit },
    { name: "AI + Premium", Revenue: r.premium.revenue, "Cost of delivery": r.premium.cost, "Gross profit": r.premium.profit },
    { name: `AI + Value (−${st.discountPct}%)`, Revenue: r.value.revenue, "Cost of delivery": r.value.cost, "Gross profit": r.value.profit },
    { name: `Subscription (${st.subscriptionTermYears}y)`, Revenue: r.subscription.revenue, "Cost of delivery": r.subscription.cost, "Gross profit": r.subscription.profit },
  ];

  const discountCurve = useMemo(() => {
    const pts = [];
    const appliedRate = st.applyRiskAdjustments ? r.projectVariableRate : 0;
    for (let d = 0; d <= 60; d += 2.5) {
      const revenue = r.validatedAlternative * (1 - d / 100);
      const cost = r.fixedRiskAdjustedCost + revenue * appliedRate;
      pts.push({
        discount: d,
        "Risk-adjusted gross profit": Math.round(revenue - cost),
        "Required profit": Math.round(r.targetProfit),
      });
    }
    return pts;
  }, [r.validatedAlternative, r.fixedRiskAdjustedCost, r.projectVariableRate, r.targetProfit, st.applyRiskAdjustments]);

  const allocationData = [
    { name: "Gross productivity savings", value: r.grossProductivitySavings },
    { name: "Risk / policy absorption", value: r.riskAbsorption },
    { name: "Customer discount", value: r.customerDiscount },
    { name: "Incremental partner profit", value: r.partnerIncrementalProfit },
  ];

  const governanceStyle = [
    { bg: "#E6F1E9", fg: GREEN },
    { bg: "#FBF3E4", fg: GOLDD },
    { bg: "#F9E7E6", fg: RED },
  ][r.governance.level];

  return (
    <div className="min-h-screen" style={{ background: "#F5F8FC", fontFamily: "ui-sans-serif, system-ui" }}>
      <div style={{ background: NAVY }} className="px-6 py-5">
        <div className="mx-auto max-w-7xl">
          <div className="text-xs font-bold tracking-[0.25em]" style={{ color: GOLD }}>
            AI-POWERED SAP OFFERINGS · RISK-ADJUSTED PRICING CALCULATOR
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-white">{st.name}</h1>
              <p className="mt-1 max-w-4xl text-sm" style={{ color: ICE }}>
                Base delivery economics, itemized risk contribution, policy price floors, value sharing and subscription economics in one model.
              </p>
            </div>
            <button onClick={() => loadPreset(presetId)} className="rounded-lg px-4 py-2 text-sm font-bold shadow" style={{ background: GOLD, color: NAVY }}>
              Reset this offering
            </button>
          </div>

          <div className="mt-4 inline-flex flex-wrap rounded-lg p-1" style={{ background: NAVY2 }}>
            {[
              ["internal", "Internal deal view"],
              ["risk", "Risk adjustments & policy"],
              ["customer", "Customer value view"],
            ].map(([id, label]) => (
              <button
                key={id} onClick={() => setView(id)}
                className="rounded-md px-4 py-1.5 text-xs font-bold transition"
                style={{ background: view === id ? GOLD : "transparent", color: view === id ? NAVY : ICE }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([id, p]) => (
              <button
                key={id} onClick={() => loadPreset(id)}
                className="rounded-full px-3 py-1.5 text-xs font-bold transition"
                style={{ background: presetId === id ? GOLD : NAVY2, color: presetId === id ? NAVY : ICE }}
              >
                {id === "remediation" ? "★ Code Remediation (case example)" : p.name.split(" — ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "risk" ? (
        <RiskAdjustmentsView st={st} setSt={setSt} r={r} />
      ) : view === "customer" ? (
        <div className="mx-auto max-w-4xl space-y-5 p-5">
          <div className="rounded-2xl p-6 shadow-sm" style={{ background: NAVY }}>
            <div className="text-xs font-bold tracking-widest" style={{ color: GOLD }}>
              YOUR PROPOSAL · {MODELS.find((m) => m.id === st.pricingModel)?.label.toUpperCase()}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-5 sm:grid-cols-4">
              <div>
                <div className="text-2xl font-extrabold text-white tabular-nums">{fmt$(sel.revenue)}</div>
                <div className="mt-1 text-xs" style={{ color: ICE }}>
                  Your investment · {st.pricingModel === "subscription" ? `${st.subscriptionTermYears}-year contract` : `${r.unitsInScope.toLocaleString()} ${Up} at ${fmt$full(sel.pricePerUnit)} each`}
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold tabular-nums" style={{ color: GOLD }}>{sel.customerSavings > 0 ? fmt$(sel.customerSavings) : "$0"}</div>
                <div className="mt-1 text-xs" style={{ color: ICE }}>
                  {sel.customerSavings > 0 ? `You save ${fmtPct(sel.customerSavings / Math.max(sel.customerReference, 1))} vs. the validated alternative` : "Price is at or above the comparison alternative"}
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white tabular-nums">
                  {st.pricingModel === "subscription" ? `${st.subscriptionTermYears} yrs` : `${r.aiMonths.toFixed(1)} mo`}
                </div>
                <div className="mt-1 text-xs" style={{ color: ICE }}>
                  {st.pricingModel === "subscription" ? "Initial contract term" : `Expected delivery timeline vs. ${r.tradMonths.toFixed(1)} months traditionally`}
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white tabular-nums">{st.reviewCoveragePct}%</div>
                <div className="mt-1 text-xs" style={{ color: ICE }}>AI-output review policy with a {st.warrantyMonths}-month warranty</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 text-sm font-extrabold" style={{ color: NAVY }}>Validated alternative vs. this offer</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[
                { name: "Validated alternative", Cost: sel.customerReference },
                { name: "This offer", Cost: sel.revenue },
              ]} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E9F2" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => "$" + Math.round(v / 1000) + "K"} tick={{ fontSize: 11, fill: MUTED }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12, fill: SLATE }} />
                <Tooltip formatter={(v) => fmt$full(v)} />
                <Bar dataKey="Cost" radius={[0, 4, 4, 0]}>
                  <Cell fill="#7A93B8" /><Cell fill={GOLD} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 text-sm font-extrabold" style={{ color: NAVY }}>What is included</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Fixed scope, counted openly", `Scope is classified by ${U}, complexity and acceptance criteria; material mix or scope changes are repriced transparently.`],
                ["Senior quality gate", `AI-assisted ${Up} follow the agreed review policy, ATC / test gates and first-pass acceptance targets.`],
                ["Defined rework warranty", `Warranty duration, claim boundaries, correction cycles and exclusions are agreed before delivery begins.`],
                ["Predictable commercial model", st.pricingModel === "subscription" ? "The recurring fee, included usage, overages, uplift and service levels are defined for the contract term." : `You pay under the selected outcome model rather than absorbing internal AI or token volatility.`],
                ["Security and residency controls", `Model routes, endpoint region, data classification and retention controls are approved for the engagement.`],
                ["Service-level accountability", `Availability, acceptance windows and service credits are defined rather than left as open-ended delivery risk.`],
              ].map(([t, d]) => (
                <div key={t} className="rounded-lg p-3" style={{ background: ICE2 }}>
                  <div className="text-sm font-bold" style={{ color: NAVY }}>{t}</div>
                  <div className="mt-1 text-xs" style={{ color: SLATE }}>{d}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-4 text-xs" style={{ background: ICE, color: SLATE }}>
            Comparison baseline: {st.baselineType.toLowerCase()} supported by {st.baselineSource}. Figures remain subject to final scope, acceptance criteria, security approval and the agreed change-control threshold.
          </div>
        </div>
      ) : (
        <div className="mx-auto grid max-w-7xl gap-5 p-5 lg:grid-cols-[350px_1fr]">
          <div className="space-y-4">
            <Section title={`Step 1 · Baseline (unit: ${U})`}>
              {presetId === "custom" && (
                <TextRow
                  label="Unit of work"
                  value={st.unit}
                  setValue={(v) => setSt((s) => ({ ...s, unit: v || "unit", unitPlural: `${v || "unit"}s` }))}
                />
              )}
              <NumRow label={st.populationLabel} value={st.totalUnits} setValue={set("totalUnits")} step={100} />
              <SliderRow label={st.scopeLabel} value={st.scopePct} setValue={set("scopePct")} min={0} max={100} suffix="%" hint={`U = ${r.unitsInScope.toLocaleString()} ${Up} in scope`} />
              <NumRow label={`Traditional effort per ${U} (h)`} value={st.hrsPerUnit} setValue={set("hrsPerUnit")} step={0.5} suffix="hrs" />
              <NumRow label="Blended bill rate (Rb)" value={st.billRate} setValue={set("billRate")} prefix="$" suffix="/hr" />
              <NumRow label="Loaded delivery cost (Rc)" value={st.costRate} setValue={set("costRate")} prefix="$" suffix="/hr" />
              <NumRow label="Delivery team size" value={st.teamFtes} setValue={set("teamFtes")} suffix="FTE" />
              <div className="rounded-lg px-3 py-2 text-xs" style={{ background: st.complexityModelEnabled ? "#FBF3E4" : ICE2, color: SLATE }}>
                {st.complexityModelEnabled
                  ? "Class-level economics are active. The risk-policy page now determines baseline hours, coverage, effort reduction, QA and token mix by class."
                  : "Blended economics are active. Enable class-level economics on the risk-policy page when the scope mix is known."}
              </div>
            </Section>

            <Section title="Step 2 · AI cost of delivery">
              <SliderRow label={`AI coverage of ${Up} (c)`} value={st.aiCoverage} setValue={set("aiCoverage")} min={0} max={100} suffix="%" />
              <SliderRow label="Effort reduction on covered units (e)" value={st.effortReduction} setValue={set("effortReduction")} min={0} max={95} suffix="%" />
              <SliderRow label="Human QA add-back (q)" value={st.qaAddBack} setValue={set("qaAddBack")} min={0} max={60} suffix="%" hint="Used unless direct QA or class-level review is enabled." />

              <div className="rounded-lg p-3" style={{ background: ICE2 }}>
                <div className="mb-2 text-xs font-bold tracking-widest" style={{ color: GOLDD }}>CORE LLM ASSUMPTIONS</div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium" style={{ color: SLATE }}>Default model tier</label>
                    <select
                      value={st.llmTier}
                      onChange={(e) => {
                        const id = e.target.value;
                        const t = TIERS[id];
                        setSt((s) => ({ ...s, llmTier: id, priceIn: t.pin ?? s.priceIn, priceOut: t.pout ?? s.priceOut }));
                      }}
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                      style={{ color: NAVY }}
                    >
                      {Object.entries(TIERS).map(([id, t]) => <option key={id} value={id}>{t.name}</option>)}
                    </select>
                  </div>
                  <NumRow label="Price / 1M input tokens" value={st.priceIn} setValue={(v) => setSt((s) => ({ ...s, priceIn: v, llmTier: "customRates" }))} step={0.25} prefix="$" />
                  <NumRow label="Price / 1M output tokens" value={st.priceOut} setValue={(v) => setSt((s) => ({ ...s, priceOut: v, llmTier: "customRates" }))} step={0.5} prefix="$" />
                  <NumRow label={`K input tokens / covered ${U}`} value={st.tokensInK} setValue={set("tokensInK")} step={10} />
                  <NumRow label={`K output tokens / covered ${U}`} value={st.tokensOutK} setValue={set("tokensOutK")} step={5} />
                  <SliderRow label="Agentic retry overhead" value={st.agentOverheadPct} setValue={set("agentOverheadPct")} min={0} max={500} suffix="%" />
                  <SliderRow label="Simple cache + batch discount" value={st.tokenDiscountPct} setValue={set("tokenDiscountPct")} min={0} max={90} suffix="%" hint="Ignored when advanced routed token economics are enabled." />
                  <div className="flex items-center justify-between rounded-md px-3 py-2" style={{ background: NAVY }}>
                    <span className="text-xs font-bold" style={{ color: GOLD }}>TOKEN COST / COVERED {U.toUpperCase()}</span>
                    <span className="text-sm font-extrabold tabular-nums text-white">${r.tokenPerUnit.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <NumRow label="Manual platform & tooling (P)" value={st.platformCost} setValue={set("platformCost")} step={5000} prefix="$" hint={`Effective platform allocation in economics: ${fmt$full(r.effectivePlatformCost)}`} />
              <ToggleRow label="Risk and policy adjustment is active" checked={st.applyRiskAdjustments} setChecked={set("applyRiskAdjustments")} hint={`Current applied factor: +${fmtPct(sel.riskAdjustmentPct)}. Configure the full stack on the risk-policy page.`} />
            </Section>

            <Section title="Step 3 · Pricing model">
              <div className="space-y-2">
                {MODELS.map((m) => (
                  <button
                    key={m.id} onClick={() => set("pricingModel")(m.id)}
                    className="w-full rounded-lg border px-3 py-2 text-left transition"
                    style={{ borderColor: st.pricingModel === m.id ? GOLD : "#DCE4F0", background: st.pricingModel === m.id ? "#FBF3E4" : "#fff" }}
                  >
                    <div className="text-sm font-bold" style={{ color: NAVY }}>{m.label}</div>
                    <div className="text-xs" style={{ color: MUTED }}>{m.note}</div>
                  </button>
                ))}
              </div>
              {st.pricingModel === "premium" && <SliderRow label="Rate premium" value={st.premiumPct} setValue={set("premiumPct")} min={0} max={100} suffix="%" />}
              {st.pricingModel === "value" && (
                <>
                  <SliderRow
                    label="Customer discount vs. validated alternative"
                    value={st.discountPct} setValue={set("discountPct")} min={0} max={60} step={0.5} suffix="%"
                    hint={`Risk-adjusted maximum discount = ${fmtPct(r.maxSafeDiscount)}; legacy base-cost floor = ${fmtPct(r.legacyBreakevenDiscount)}`}
                  />
                  <SliderRow
                    label="Published opening band"
                    value={st.openingBandPct} setValue={set("openingBandPct")} min={0} max={50} step={0.5} suffix="%"
                    hint="Deals above this band require deal-desk review even when the hard floor passes."
                  />
                </>
              )}
              {st.pricingModel === "subscription" && (
                <div className="rounded-lg px-3 py-2 text-xs" style={{ background: ICE2, color: SLATE }}>
                  Subscription fee, included units, overage, term, uplift, support, churn and reserved-capacity inputs are on the risk-policy page.
                </div>
              )}
            </Section>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-bold tracking-widest" style={{ color: GOLDD }}>
                TRADITIONAL BASELINE · {st.complexityModelEnabled ? "CLASS-WEIGHTED" : "U × h × Rb"}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-6">
                {[
                  ["Revenue", fmt$(r.tradRevenue)],
                  ["Cost", fmt$(r.tradCost)],
                  ["Gross profit", fmt$(r.tradProfit)],
                  ["Margin", fmtPct(r.tradMarginPct)],
                  [`Price / ${U}`, fmt$full(r.tradPricePerUnit)],
                  ["Validated alternative", fmt$(r.validatedAlternative)],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div className="text-lg font-extrabold tabular-nums" style={{ color: NAVY }}>{v}</div>
                    <div className="text-xs" style={{ color: MUTED }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-extrabold" style={{ color: NAVY }}>
                  Selected scenario: {MODELS.find((m) => m.id === st.pricingModel)?.label}
                </h2>
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold"
                  style={{ background: profitDelta >= 0 ? "#E6F1E9" : "#F9E7E6", color: profitDelta >= 0 ? GREEN : RED }}
                >
                  Profit vs. traditional: {profitDelta >= 0 ? "+" : "−"}{fmt$(Math.abs(profitDelta))} ({fmtPct(Math.abs(profitDelta) / Math.max(Math.abs(r.tradProfit), 1))})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <Kpi label="Revenue" value={fmt$(sel.revenue)} sub={`${fmt$full(sel.pricePerUnit)} per ${U}${st.pricingModel === "subscription" ? "-year equivalent" : ""}`} />
                <Kpi label="Base AI cost" value={fmt$(sel.baseReferenceCost)} sub="Before risk and policy adjustments" />
                <Kpi label="Risk / policy adjustment" value={fmt$(sel.riskAdjustment)} sub={`+${fmtPct(sel.riskAdjustmentPct)} of base cost`} />
                <Kpi label="Risk-adjusted cost" value={fmt$(sel.cost)} sub={`${fmt$(r.laborCost)} labor · ${fmt$(r.tokenCost)} tokens · ${fmt$(r.effectivePlatformCost)} platform`} />
                <Kpi label="Gross profit" value={fmt$(sel.profit)} tone="dark" accent />
                <Kpi label="Gross margin" value={fmtPct(sel.marginPct)} tone="dark" />
                <Kpi label="Expected contribution" value={fmt$(sel.expectedContribution)} sub={`${st.winProbabilityPct}% win probability less ${fmt$(st.bidCost)} pursuit cost`} />
                <Kpi label="Revenue / delivery hour" value={fmt$full(sel.revPerHour)} sub={`vs. $${st.billRate} traditional`} />
                <Kpi label="Customer saves" value={sel.customerSavings > 0 ? fmt$(sel.customerSavings) : "$0"} sub={sel.customerSavings > 0 ? fmtPct(sel.customerSavings / Math.max(sel.customerReference, 1)) + " below validated alternative" : "No saving vs. validated alternative"} />
                <Kpi label="Delivery effort" value={`${Math.round(r.deliveryHours).toLocaleString()} hrs`} sub={`Production ${Math.round(r.productionHours).toLocaleString()} · QA ${Math.round(r.qaHours).toLocaleString()} · other ${Math.round(r.deliveryHours - r.aiHours).toLocaleString()}`} />
                <Kpi label="Expected duration" value={st.pricingModel === "subscription" ? `${st.subscriptionTermYears} yrs` : `${r.aiMonths.toFixed(1)} mo`} sub={`vs. ${r.tradMonths.toFixed(1)} months traditional project`} />
                <Kpi label="Required revenue floor" value={fmt$(r.requiredRevenue)} sub={`Maximum safe discount ${fmtPct(r.maxSafeDiscount)}`} />
              </div>

              <div className="mt-3 rounded-lg px-4 py-3" style={{ background: governanceStyle.bg }}>
                <div className="text-xs font-extrabold tracking-wider" style={{ color: governanceStyle.fg }}>DEAL GOVERNANCE · {r.governance.title}</div>
                <div className="mt-1 text-sm" style={{ color: SLATE }}>{r.governance.message}</div>
                {(r.hardFailures.length > 0 || r.warnings.length > 0) && (
                  <button onClick={() => setView("risk")} className="mt-2 text-xs font-bold underline" style={{ color: governanceStyle.fg }}>
                    Review {r.hardFailures.length} hard failures and {r.warnings.length} evidence warnings
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-1 text-sm font-extrabold" style={{ color: NAVY }}>Same engagement, four commercial architectures</div>
              <div className="mb-2 text-xs" style={{ color: MUTED }}>
                Risk and policy adjustments are applied to each scenario. Revenue-linked costs such as commission, financing and service credits make scenario costs differ. Subscription values are total contract economics.
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={compareData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E9F2" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: SLATE }} interval={0} />
                  <YAxis tickFormatter={(v) => "$" + Math.round(v / 1000) + "K"} tick={{ fontSize: 11, fill: MUTED }} />
                  <Tooltip formatter={(v) => fmt$full(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Revenue" fill="#7A93B8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Cost of delivery" fill={NAVY2} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Gross profit" radius={[3, 3, 0, 0]}>
                    {compareData.map((d, i) => <Cell key={d.name} fill={d["Gross profit"] >= r.targetProfit && i > 0 ? GOLD : i === 0 ? "#B9A26B" : RED} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-1 text-sm font-extrabold" style={{ color: NAVY }}>Risk-adjusted gain-share curve</div>
              <div className="mb-2 text-xs" style={{ color: MUTED }}>
                The target-profit line protects baseline gross profit plus the required growth hurdle. The vertical floor is the maximum discount after risk, commercial cost and margin policy.
              </div>
              <ResponsiveContainer width="100%" height={270}>
                <LineChart data={discountCurve} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E9F2" vertical={false} />
                  <XAxis dataKey="discount" tickFormatter={(v) => v + "%"} tick={{ fontSize: 11, fill: MUTED }} label={{ value: "Customer discount vs. validated alternative", position: "insideBottom", offset: -2, fontSize: 11, fill: SLATE }} height={40} />
                  <YAxis tickFormatter={(v) => "$" + Math.round(v / 1000) + "K"} tick={{ fontSize: 11, fill: MUTED }} />
                  <Tooltip formatter={(v) => fmt$full(v)} labelFormatter={(l) => `Discount: ${l}%`} />
                  <ReferenceLine y={r.targetProfit} stroke={GOLDD} strokeDasharray="6 4" strokeWidth={2} />
                  {r.maxSafeDiscount > 0 && r.maxSafeDiscount < 0.6 && <ReferenceLine x={Math.round(r.maxSafeDiscount * 100 * 2) / 2} stroke={RED} strokeDasharray="4 4" />}
                  {st.pricingModel === "value" && <ReferenceLine x={st.discountPct} stroke={NAVY} strokeWidth={2} />}
                  <Line type="monotone" dataKey="Risk-adjusted gross profit" stroke={GOLD} strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-1 flex flex-wrap gap-4 text-xs" style={{ color: MUTED }}>
                <span><span style={{ color: GOLDD }}>▬ ▬</span> Required profit</span>
                <span><span style={{ color: RED }}>▬ ▬</span> Risk-adjusted max discount</span>
                {st.pricingModel === "value" && <span><span style={{ color: NAVY }}>▬</span> Current discount</span>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-1 text-sm font-extrabold" style={{ color: NAVY }}>Where the productivity value goes</div>
              <div className="mb-2 text-xs" style={{ color: MUTED }}>
                This bridge separates the gross labor-and-platform productivity pool from the amount absorbed by risk and policy, passed to the customer, and retained as incremental partner profit.
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={allocationData} layout="vertical" margin={{ top: 4, right: 35, left: 25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E9F2" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => "$" + Math.round(v / 1000) + "K"} tick={{ fontSize: 11, fill: MUTED }} />
                  <YAxis type="category" dataKey="name" width={175} tick={{ fontSize: 11, fill: SLATE }} />
                  <Tooltip formatter={(v) => fmt$full(v)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {allocationData.map((x, i) => <Cell key={x.name} fill={[NAVY2, RED, "#7A93B8", GOLD][i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl p-4 text-sm" style={{ background: ICE, color: SLATE }}>
              <span className="font-bold" style={{ color: NAVY }}>How to read this: </span>
              base AI cost is the operational delivery estimate. The risk-policy page adds expected scope, capacity, rework, warranty, AI infrastructure, commercial, financing, SLA, legal and governance costs. The resulting factor is already included in cost, profit, margin and the required price floor. {cap(Up)} remain the quoting language; hours remain internal capacity math.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
