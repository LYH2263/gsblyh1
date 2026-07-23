import { AppController } from './app.controller';

describe('AppController', () => {
  it('returns health payload with status ok', () => {
    const controller = new AppController();
    const result = controller.health();

    expect(result.status).toBe('ok');
    expect(typeof result.timestamp).toBe('string');
  });
});
