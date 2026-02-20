import type { SuggestedTopic } from '@knowledge-tool/shared';

interface Props {
  topics: SuggestedTopic[];
  onTopicClick: (topic: SuggestedTopic) => void;
  isCreating: boolean;
}

export function TopicChips({ topics, onTopicClick, isCreating }: Props) {
  return (
    <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
      <p className="text-xs text-muted" style={{ marginBottom: 8 }}>
        Explore further:
      </p>
      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
        {topics.map((topic, i) => (
          <button
            key={i}
            className="chip"
            onClick={() => onTopicClick(topic)}
            disabled={isCreating}
            title={`${topic.relationship} — ${topic.reason}`}
          >
            {topic.title}
          </button>
        ))}
      </div>
    </div>
  );
}
