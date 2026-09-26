'use client';

import React from 'react';
import { MoveClassification, CLASSIFICATION_META } from '@judge-chess/shared';

interface MoveClassificationBadgeProps {
  classification: MoveClassification;
  showDescription?: boolean;
}

export const MoveClassificationBadge: React.FC<MoveClassificationBadgeProps> = ({
  classification,
  showDescription = false
}) => {
  const meta = CLASSIFICATION_META[classification];
  if (!meta) return null;

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-bold uppercase tracking-wider ${meta.badgeBg} ${meta.badgeText}`}
      >
        <span className="text-sm font-extrabold">{meta.symbol}</span>
        <span>{meta.label}</span>
      </span>
      {showDescription && (
        <span className="text-[11px] text-judge-muted italic">
          {meta.description}
        </span>
      )}
    </div>
  );
};
