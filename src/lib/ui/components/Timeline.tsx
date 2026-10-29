import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export interface TimelineGroup<T> {
  key: string;
  heading: string;
  subLabel: string;
  isToday?: boolean;
  items: T[];
}

export interface TimelineProps<T> {
  groups: TimelineGroup<T>[];
  composer?: ReactNode;
  renderItem: (item: T) => ReactNode;
  className?: string;
}

export function Timeline<T>({ groups, composer, renderItem, className }: TimelineProps<T>) {
  return (
    <div className={cn("timeline", className)}>
      <div className="timeline-rail" />

      {groups.map((group, gi) => (
        <div key={group.key} className="contents">
          <div className="timeline-day">
            <div className={cn("timeline-dot", group.isToday && "today")} />
            <div className="timeline-day-label">
              <span className="timeline-day-heading">{group.heading}</span>
              <span className="timeline-day-sub">{group.subLabel}</span>
            </div>
          </div>

          {gi === 0 && composer ? (
            <div className="timeline-entry">
              <div className="timeline-bullet accent" />
              <div className="timeline-entry-body">{composer}</div>
            </div>
          ) : null}

          {group.items.map((item, ii) => (
            <div className="timeline-entry" key={ii}>
              <div className="timeline-bullet" />
              <div className="timeline-entry-body">{renderItem(item)}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
