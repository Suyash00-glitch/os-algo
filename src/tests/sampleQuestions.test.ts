import { describe, it, expect } from 'vitest';
import { generateSampleQuestion, SAMPLE_QUESTION_TEMPLATES } from '../engine/sampleQuestions';

describe('Sample Question Generator', () => {
  it('has at least 5 distinct sample question templates', () => {
    expect(SAMPLE_QUESTION_TEMPLATES.length).toBeGreaterThanOrEqual(5);
  });

  it('generates a valid sample question for all difficulty filters', () => {
    const difficulties: Array<'all' | 'beginner' | 'intermediate' | 'advanced'> = [
      'all',
      'beginner',
      'intermediate',
      'advanced',
    ];

    for (const diff of difficulties) {
      const q = generateSampleQuestion(diff);

      expect(q).toBeDefined();
      expect(q.id).toBeDefined();
      expect(q.title.length).toBeGreaterThan(0);
      expect(['Beginner', 'Intermediate', 'Advanced']).toContain(q.difficulty);
      expect(q.targetAlgorithm).toBeDefined();
      expect(q.taskPrompt.length).toBeGreaterThan(0);
      expect(q.scenarioDescription.length).toBeGreaterThan(0);
      expect(q.assumptions.length).toBeGreaterThan(0);

      // Verify processes
      expect(q.processes.length).toBeGreaterThanOrEqual(2);
      for (const p of q.processes) {
        expect(p.pid).toBeDefined();
        expect(p.arrivalTime).toBeGreaterThanOrEqual(0);
        expect(p.burstTime).toBeGreaterThan(0);
        expect([1, 2, 3, 4, 5]).toContain(p.priority);
        expect(['interactive', 'cpu']).toContain(p.processType);
      }

      // Verify config
      if (q.config.contextSwitchOverhead !== undefined) {
        expect(q.config.contextSwitchOverhead).toBeGreaterThanOrEqual(0);
      }
      if (q.config.rrQuantum !== undefined) {
        expect(q.config.rrQuantum).toBeGreaterThan(0);
      }
    }
  });

  it('generates questions exercising DART concepts', () => {
    const qAdv = generateSampleQuestion('advanced');
    expect(['Intermediate', 'Advanced']).toContain(qAdv.difficulty);
    // At least one process should be interactive or cpu
    const hasInteractive = qAdv.processes.some((p) => p.processType === 'interactive');
    const hasCpu = qAdv.processes.some((p) => p.processType === 'cpu');
    expect(hasInteractive || hasCpu).toBe(true);
  });
});
