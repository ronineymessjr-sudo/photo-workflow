import { evaluate } from './lab.mjs';

export default class FixedPlanProvider {
  id() { return 'local-plan-fixtures'; }

  async callApi(prompt) {
    const { results } = await evaluate();
    const result = results.find(row => row.id === prompt);
    return result ? { output: JSON.stringify(result) } : { error: 'Unknown fixture' };
  }
}
