import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../service/sequelize';

type PersonRow = { id: number; name: string };

type InteractionRow = {
  id: number;
  agentId: number;
  agentName: string;
  customerId: number;
  customerName: string;
  lengthSeconds: number;
  createdAt: string;
};

const MAX_ROWS = 500;

export const searchPeople = tool(
  async ({ name, role }) => {
    const like = `%${name}%`;
    const results: Array<PersonRow & { role: string }> = [];

    if (role === 'agent' || role === 'any') {
      const agents = await sequelize.query<PersonRow>(
        'SELECT id, name FROM agents WHERE name LIKE :like ORDER BY name LIMIT 25',
        { type: QueryTypes.SELECT, replacements: { like } }
      );
      results.push(...agents.map((a) => ({ ...a, role: 'agent' })));
    }

    if (role === 'customer' || role === 'any') {
      const customers = await sequelize.query<PersonRow>(
        'SELECT id, name FROM customers WHERE name LIKE :like ORDER BY name LIMIT 25',
        { type: QueryTypes.SELECT, replacements: { like } }
      );
      results.push(...customers.map((c) => ({ ...c, role: 'customer' })));
    }

    return JSON.stringify(results);
  },
  {
    name: 'search_people',
    description:
      'Resolve an agent or customer name into an id. Names are NOT unique, so this can return several matches — inspect the roles and ids and, if the intended person is ambiguous, ask the user to clarify. Always call this before query_interactions.',
    schema: z.object({
      name: z.string().describe('Full or partial person name to search for.'),
      role: z
        .enum(['agent', 'customer', 'any'])
        .default('any')
        .describe('Restrict the search to agents, customers, or both.'),
    }),
  }
);

export const queryInteractions = tool(
  async ({ agentId, customerId, dateFrom, dateTo }) => {
    if (agentId == null && customerId == null && !dateFrom && !dateTo) {
      return 'Error: provide at least one filter — agentId, customerId, dateFrom, or dateTo.';
    }

    const rows = await sequelize.query<InteractionRow>(
      `SELECT
         i.id             AS id,
         i.agent_id       AS agentId,
         a.name           AS agentName,
         i.customer_id    AS customerId,
         c.name           AS customerName,
         i.length_seconds AS lengthSeconds,
         i.created_at     AS createdAt
       FROM interactions i
       JOIN agents a    ON a.id = i.agent_id
       JOIN customers c ON c.id = i.customer_id
       WHERE (:agentId    IS NULL OR i.agent_id    = :agentId)
         AND (:customerId IS NULL OR i.customer_id = :customerId)
         AND (:dateFrom   IS NULL OR i.created_at >= :dateFrom)
         AND (:dateTo     IS NULL OR i.created_at <= :dateTo)
       ORDER BY i.created_at ASC
       LIMIT :limit`,
      {
        type: QueryTypes.SELECT,
        replacements: {
          agentId: agentId ?? null,
          customerId: customerId ?? null,
          dateFrom: dateFrom ?? null,
          dateTo: dateTo ?? null,
          limit: MAX_ROWS,
        },
      }
    );

    return JSON.stringify(rows);
  },
  {
    name: 'query_interactions',
    description:
      'Fetch interaction rows filtered by agent id, customer id, and/or an inclusive created_at date range (YYYY-MM-DD). At least one filter is required. Returns up to 500 rows; count them yourself to answer "how many" questions.',
    schema: z.object({
      agentId: z
        .number()
        .int()
        .optional()
        .describe('Restrict to this agent id.'),
      customerId: z
        .number()
        .int()
        .optional()
        .describe('Restrict to this customer id.'),
      dateFrom: z
        .string()
        .optional()
        .describe('Inclusive start date, YYYY-MM-DD.'),
      dateTo: z.string().optional().describe('Inclusive end date, YYYY-MM-DD.'),
    }),
  }
);
