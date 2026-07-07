import { createAgent } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { MemorySaver } from '@langchain/langgraph';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../service/sequelize';
import { searchPeople, queryInteractions } from './tools';

type DateRange = { minDate: string; maxDate: string };

const buildSystemPrompt = ({ minDate, maxDate }: DateRange): string =>
  `You are a data assistant for a contact-centre dashboard. You answer questions about agents, customers, and the interactions (calls) between them.

An interaction links one agent and one customer, and has a length in seconds and a date.

Tools:
- search_people resolves a person's name to an id. Names are not unique, so if the intended person is ambiguous, ask the user to clarify instead of guessing.
- query_interactions returns interaction rows for a given agent id, customer id and/or date range. Count the returned rows yourself to answer "how many" questions.

Always resolve a name to an id with search_people before calling query_interactions.

The interaction data only covers ${minDate} to ${maxDate}. Treat ${maxDate} as "today" for relative periods: "last week" is the 7 days ending ${maxDate}, "last month" is the calendar month of ${maxDate}, and so on. If a request falls entirely outside ${minDate}–${maxDate}, say so plainly.

Keep answers concise.`;

const createAssistantAgent = async () => {
  const [range] = await sequelize.query<DateRange>(
    'SELECT MIN(created_at) AS minDate, MAX(created_at) AS maxDate FROM interactions',
    { type: QueryTypes.SELECT }
  );

  const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    temperature: 0,
    streaming: true,
  });

  return createAgent({
    model,
    tools: [searchPeople, queryInteractions],
    systemPrompt: buildSystemPrompt(range),
    checkpointer: new MemorySaver(),
  });
};

let agentPromise: ReturnType<typeof createAssistantAgent> | null = null;

export const getAssistantAgent = () => {
  if (!agentPromise) {
    agentPromise = createAssistantAgent();
  }
  return agentPromise;
};
