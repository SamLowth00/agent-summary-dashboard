import type { Request, Response } from 'express';

process.env.DATABASE_STORAGE = ':memory:';

// Loaded via require (rather than a hoisted `import`) so both the singleton and
// the route handler are built against the in-memory database configured above.
/* eslint-disable @typescript-eslint/no-var-requires */
const { sequelize } =
  require('../service/sequelize') as typeof import('../service/sequelize');
const { GET } = require('./agentSummary') as typeof import('./agentSummary');
/* eslint-enable @typescript-eslint/no-var-requires */

type SummaryRow = {
  date: string;
  agentName: string;
  totalInteractions: number;
  aveInteractionLength: number;
};

type SummaryResponse = {
  data: SummaryRow[];
  total: number;
  page: number;
  pageSize: number;
};

const invoke = async (
  query: Record<string, string>
): Promise<SummaryResponse> => {
  const req = { query } as unknown as Request;
  let body: SummaryResponse | undefined;
  const res = {
    send: (payload: SummaryResponse) => {
      body = payload;
      return res;
    },
  } as unknown as Response;

  await (GET as unknown as (req: Request, res: Response) => Promise<unknown>)(
    req,
    res
  );

  if (!body) throw new Error('handler did not send a response');
  return body;
};

beforeAll(async () => {
  // Silence the singleton's per-query SQL logging so test output stays clean.
  (sequelize as unknown as { options: { logging: unknown } }).options.logging =
    false;

  await sequelize.query(
    'CREATE TABLE agents (id INTEGER PRIMARY KEY, name TEXT)'
  );
  await sequelize.query(
    'CREATE TABLE interactions (id INTEGER PRIMARY KEY, agent_id INTEGER, ' +
      'customer_id INTEGER, length_seconds INTEGER, created_at TEXT)'
  );
  await sequelize.query(
    "INSERT INTO agents (id, name) VALUES (1, 'Ada'), (2, 'Grace'), (3, 'Zoe')"
  );

  const rows: Array<[number, number, number, string]> = [
    [1, 1, 10, '2024-01-01'],
    [2, 1, 20, '2024-01-01'],
    [3, 1, 30, '2024-01-01'],
    [4, 2, 10, '2024-01-01'],
    [5, 2, 20, '2024-01-01'],
    [6, 2, 25, '2024-01-01'],
    [7, 3, 50, '2024-01-01'],
    [8, 1, 5, '2024-01-02'],
    [9, 1, 10, '2024-01-02'],
  ];
  for (const [id, agentId, length, createdAt] of rows) {
    await sequelize.query(
      'INSERT INTO interactions (id, agent_id, customer_id, length_seconds, ' +
        'created_at) VALUES (?, ?, ?, ?, ?)',
      { replacements: [id, agentId, 100, length, createdAt] }
    );
  }
});

afterAll(async () => {
  await sequelize.close();
});

describe('GET /agentSummary — rollup SQL', () => {
  it('groups per agent/day with COUNT and rounded AVG, ordered by date then agent name', async () => {
    const body = await invoke({});

    expect(body).toEqual({
      page: 1,
      pageSize: 25,
      total: 4,
      data: [
        {
          date: '2024-01-01',
          agentName: 'Ada',
          totalInteractions: 3,
          aveInteractionLength: 20,
        },
        {
          date: '2024-01-01',
          agentName: 'Grace',
          totalInteractions: 3,
          aveInteractionLength: 18.3,
        },
        {
          date: '2024-01-01',
          agentName: 'Zoe',
          totalInteractions: 1,
          aveInteractionLength: 50,
        },
        {
          date: '2024-01-02',
          agentName: 'Ada',
          totalInteractions: 2,
          aveInteractionLength: 7.5,
        },
      ],
    });
  });

  it('drops agent/day groups below minInteractions (HAVING)', async () => {
    const body = await invoke({ minInteractions: '3' });

    expect(body.total).toBe(2);
    expect(body.data.map((r) => r.agentName)).toEqual(['Ada', 'Grace']);
    expect(body.data.every((r) => r.totalInteractions >= 3)).toBe(true);
  });

  it('treats dateFrom/dateTo as an inclusive range', async () => {
    const singleDay = await invoke({
      dateFrom: '2024-01-01',
      dateTo: '2024-01-01',
    });
    expect(singleDay.total).toBe(3);
    expect(singleDay.data.every((r) => r.date === '2024-01-01')).toBe(true);

    const fromSecondDay = await invoke({ dateFrom: '2024-01-02' });
    expect(fromSecondDay.data).toEqual([
      {
        date: '2024-01-02',
        agentName: 'Ada',
        totalInteractions: 2,
        aveInteractionLength: 7.5,
      },
    ]);
    expect(fromSecondDay.total).toBe(1);
  });

  it('paginates via LIMIT/OFFSET while total reflects the full result set', async () => {
    const pageOne = await invoke({ page: '1', pageSize: '2' });
    expect(pageOne).toMatchObject({ page: 1, pageSize: 2, total: 4 });
    expect(pageOne.data.map((r) => `${r.date} ${r.agentName}`)).toEqual([
      '2024-01-01 Ada',
      '2024-01-01 Grace',
    ]);

    const pageTwo = await invoke({ page: '2', pageSize: '2' });
    expect(pageTwo).toMatchObject({ page: 2, pageSize: 2, total: 4 });
    expect(pageTwo.data.map((r) => `${r.date} ${r.agentName}`)).toEqual([
      '2024-01-01 Zoe',
      '2024-01-02 Ada',
    ]);
  });
});
