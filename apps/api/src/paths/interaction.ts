import { Request, Response } from 'express';
import { Operation } from 'express-openapi';
import { Interaction } from '../util/models/Interaction';

export const GET: Operation = async (req: Request, res: Response) => {
  // current version does not parse the datetime as DATE (returns null),
  // upgrading to v7 would fix but for now, will just use raw:true to bypass
  // type matching
  const interactions = await Interaction.findAll({ raw: true });

  return res.send({ data: interactions });
};

GET.apiDoc = {
  description: 'Get all interaction records.',
  operationId: 'getInteractions',
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
                    id: {
                      type: 'number',
                    },
                    agent_id: {
                      type: 'number',
                    },
                    customer_id: {
                      type: 'number',
                    },
                    length_seconds: {
                      type: 'number',
                    },
                    created_at: {
                      type: 'string',
                      format: 'date',
                    },
                  },
                  type: 'object',
                },
              },
            },
            required: ['data'],
            type: 'object',
          },
        },
      },
      description: 'Interactions',
    },
  },
};
