import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeReviewFeedback } from '../../src/services/feedback-analytics.js';

test('feedback analytics ranks friction, averages outcomes and measures role coverage', () => {
  const summary = summarizeReviewFeedback([
    { planScore: 4, executionScore: 3, keepRate: 60, improvementArea: 'onsite', workflowReuse: 'with-changes', photographerFriction: '按钮太小', modelFeedback: '通告清楚' },
    { planScore: 5, executionScore: 4, keepRate: 80, improvementArea: 'onsite', workflowReuse: 'yes', photographerFriction: '切换慢', assistantFeedback: '清单有效', clientFeedback: '交付明确' },
    { planScore: 3, executionScore: 4, keepRate: 70, improvementArea: 'brief', workflowReuse: 'no' },
  ]);
  assert.equal(summary.count, 3);
  assert.equal(summary.averagePlanScore, 4);
  assert.equal(summary.averageExecutionScore, 3.7);
  assert.equal(summary.averageKeepRate, 70);
  assert.equal(summary.topArea.key, 'onsite');
  assert.equal(summary.reusableRate, 67);
  assert.equal(summary.roleCoverage.photographer, 2);
  assert.equal(summary.roleCoverageRate, 42);
});

test('feedback analytics returns stable zero state', () => {
  const summary = summarizeReviewFeedback([]);
  assert.equal(summary.count, 0);
  assert.equal(summary.topArea, null);
  assert.equal(summary.reusableRate, 0);
  assert.equal(summary.roleCoverageRate, 0);
});
