import { useEffect } from 'react';

const DEFAULT_TITLE = 'CosmosVote — Governance';
const DEFAULT_DESCRIPTION = 'On-chain governance and voting on Stellar Soroban';

export function useMeta(title?: string, description?: string): void {
  useEffect(() => {
    document.title = title ? `${title} | CosmosVote` : DEFAULT_TITLE;

    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'description';
      document.head.appendChild(tag);
    }
    tag.content = description ?? DEFAULT_DESCRIPTION;

    return () => {
      document.title = DEFAULT_TITLE;
      if (tag) tag.content = DEFAULT_DESCRIPTION;
    };
  }, [title, description]);
}
