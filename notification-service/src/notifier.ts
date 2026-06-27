import nodemailer from 'nodemailer';
import axios from 'axios';
import { GovernanceEvent, Subscriber } from './types';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function buildMessage(event: GovernanceEvent): string {
  const labels: Record<string, string> = {
    created: 'A new governance proposal has been created.',
    voted:   'A vote has been cast on a proposal.',
    final:   'A proposal has been finalized.',
    exec:    'A proposal has been executed.',
    cancel:  'A proposal has been cancelled.',
  };
  const base = labels[event.type] ?? `Governance event: ${event.type}`;
  return event.proposalId
    ? `${base}\nProposal ID: ${event.proposalId}\nLedger: ${event.ledger}`
    : `${base}\nLedger: ${event.ledger}`;
}

async function sendEmail(to: string, event: GovernanceEvent): Promise<void> {
  const text = buildMessage(event);
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `CosmosVote: proposal ${event.type} event`,
    text,
  });
}

async function sendWebhook(url: string, event: GovernanceEvent): Promise<void> {
  await axios.post(url, { event }, { timeout: 10_000 });
}

export async function notify(subscriber: Subscriber, event: GovernanceEvent): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (subscriber.email) tasks.push(sendEmail(subscriber.email, event));
  if (subscriber.webhookUrl) tasks.push(sendWebhook(subscriber.webhookUrl, event));
  await Promise.all(tasks);
}
