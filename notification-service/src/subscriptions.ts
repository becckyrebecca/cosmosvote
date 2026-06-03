import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GovernanceEventType, Subscriber, SubscriptionStore } from './types';

const SUBSCRIPTIONS_FILE = process.env.SUBSCRIPTIONS_FILE ?? './data/subscriptions.json';

function load(): SubscriptionStore {
  try {
    const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8');
    return JSON.parse(raw) as SubscriptionStore;
  } catch {
    return { subscribers: [], cursor: 'now' };
  }
}

function save(store: SubscriptionStore): void {
  const dir = path.dirname(SUBSCRIPTIONS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(store, null, 2));
}

export function getStore(): SubscriptionStore {
  return load();
}

export function saveCursor(cursor: string): void {
  const store = load();
  store.cursor = cursor;
  save(store);
}

export function addSubscriber(opts: {
  proposalId?: string;
  events: GovernanceEventType[];
  email?: string;
  webhookUrl?: string;
}): Subscriber {
  if (!opts.email && !opts.webhookUrl) {
    throw new Error('At least one of email or webhookUrl is required.');
  }
  const store = load();
  const subscriber: Subscriber = { id: crypto.randomUUID(), ...opts };
  store.subscribers.push(subscriber);
  save(store);
  return subscriber;
}

export function removeSubscriber(id: string): boolean {
  const store = load();
  const before = store.subscribers.length;
  store.subscribers = store.subscribers.filter((s) => s.id !== id);
  if (store.subscribers.length === before) return false;
  save(store);
  return true;
}

export function listSubscribers(): Subscriber[] {
  return load().subscribers;
}

/** Return subscribers that should be notified for a given event. */
export function matchingSubscribers(
  eventType: GovernanceEventType,
  proposalId?: string,
): Subscriber[] {
  return load().subscribers.filter((s) => {
    if (!s.events.includes(eventType)) return false;
    if (s.proposalId && s.proposalId !== proposalId) return false;
    return true;
  });
}
