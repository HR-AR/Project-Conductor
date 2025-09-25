import request from 'supertest';
import app from '../src/index';

describe('Project Conductor API', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'project-conductor');
    expect(response.body).toHaveProperty('version', '1.0.0');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should return project info at root endpoint', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    expect(response.body).toHaveProperty('message', 'Project Conductor - Workflow Orchestration System');
    expect(response.body).toHaveProperty('version', '1.0.0');
  });
});