import { Request, Response } from 'express';
import { Operation } from 'express-openapi';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../service/sequelize';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

// Per-agent, per-day rollup of interactions, don't need any customer fields
const AGENT_SUMMARY_SQL_QUERY = `
  SELECT
    i.created_at                     AS date,
    a.name                           AS agentName,
    COUNT(*)                         AS totalInteractions,
    ROUND(AVG(i.length_seconds), 1)  AS aveInteractionLength
  FROM interactions i
  JOIN agents a ON a.id = i.agent_id
  WHERE (:dateFrom IS NULL OR i.created_at >= :dateFrom)
    AND (:dateTo   IS NULL OR i.created_at <= :dateTo)
  GROUP BY i.created_at, i.agent_id
  HAVING COUNT(*) >= :minInteractions
  ORDER BY i.created_at ASC, agentName ASC
  LIMIT :limit OFFSET :offset
`;

const AGENT_SUMMARY_COUNT_QUERY = `
  SELECT COUNT(*) AS total FROM (
    SELECT 1 FROM interactions
    WHERE (:dateFrom IS NULL OR created_at >= :dateFrom)
      AND (:dateTo   IS NULL OR created_at <= :dateTo)
    GROUP BY created_at, agent_id
    HAVING COUNT(*) >= :minInteractions
  )
`;

export const GET: Operation = async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const pageSize = req.query.pageSize
    ? Number(req.query.pageSize)
    : DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  // Optional filters.
  const dateFrom = req.query.dateFrom ? String(req.query.dateFrom) : null;
  const dateTo = req.query.dateTo ? String(req.query.dateTo) : null;
  const minInteractions = req.query.minInteractions
    ? Math.max(1, Number(req.query.minInteractions))
    : 1;

  const filters = { dateFrom, dateTo, minInteractions };

  const [data, totalCount] = await Promise.all([
    sequelize.query(AGENT_SUMMARY_SQL_QUERY, {
      type: QueryTypes.SELECT,
      replacements: { ...filters, limit: pageSize, offset },
    }),
    sequelize.query<{ total: number }>(AGENT_SUMMARY_COUNT_QUERY, {
      type: QueryTypes.SELECT,
      replacements: filters,
    }),
  ]);

  return res.send({ data, total: totalCount[0].total, page, pageSize });
};

GET.apiDoc = {
  description: 'Get a paginated per-agent, per-day summary of interactions.',
  operationId: 'getAgentSummary',
  parameters: [
    {
      in: 'query',
      name: 'page',
      required: false,
      description: 'Page number, 1-based.',
      schema: { type: 'integer', minimum: 1, default: 1 },
    },
    {
      in: 'query',
      name: 'pageSize',
      required: false,
      description: 'Rows per page.',
      schema: {
        type: 'integer',
        minimum: 1,
        maximum: MAX_PAGE_SIZE,
        default: DEFAULT_PAGE_SIZE,
      },
    },
    {
      in: 'query',
      name: 'dateFrom',
      required: false,
      description: 'Only include interactions on or after this date (inclusive).',
      schema: { type: 'string', format: 'date' },
    },
    {
      in: 'query',
      name: 'dateTo',
      required: false,
      description: 'Only include interactions on or before this date (inclusive).',
      schema: { type: 'string', format: 'date' },
    },
    {
      in: 'query',
      name: 'minInteractions',
      required: false,
      description:
        'Only include agent/day rows with at least this many interactions.',
      schema: { type: 'integer', minimum: 1, default: 1 },
    },
  ],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: {
            properties: {
              data: {
                type: 'array',
                items: {
                  properties: {
                    date: {
                      type: 'string',
                      format: 'date',
                    },
                    agentName: {
                      type: 'string',
                    },
                    totalInteractions: {
                      type: 'number',
                    },
                    aveInteractionLength: {
                      type: 'number',
                    },
                  },
                  type: 'object',
                },
              },
              total: {
                type: 'number',
              },
              page: {
                type: 'number',
              },
              pageSize: {
                type: 'number',
              },
            },
            required: ['data', 'total', 'page', 'pageSize'],
            type: 'object',
          },
        },
      },
      description: 'Paginated agent daily summary',
    },
  },
};
