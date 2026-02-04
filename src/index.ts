/**
 * @securecheckio/rules-engine
 * 
 * High-performance rules engine supporting:
 * - Keyword matching
 * - Regex patterns (pcre)
 * - Semantic similarity (vector DB)
 * - Stateful multi-stage detection
 * - Threshold/rate limiting
 */

export { RulesEngine } from './rules-engine.js';
export type {
  RulesEngineOptions,
  SemanticMatcher,
  StateProvider
} from './rules-engine.js';

export type {
  Rule,
  RuleAction,
  RuleSeverity,
  RuleCategory,
  RuleFlags,
  ConversationState,
  FlagHistoryEntry,
  EvaluationContext,
  EvaluationResult
} from './types.js';
