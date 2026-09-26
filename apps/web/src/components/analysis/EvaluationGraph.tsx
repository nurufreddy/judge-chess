'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip
} from 'recharts';
import { MoveAnalysis } from '@judge-chess/shared';

interface EvaluationGraphProps {
  analyzedMoves: MoveAnalysis[];
  currentPlyIndex: number;
  onSelectPly: (plyIndex: number) => void;
}

export const EvaluationGraph: React.FC<EvaluationGraphProps> = ({
  analyzedMoves,
  currentPlyIndex,
  onSelectPly
}) => {
  if (!analyzedMoves || analyzedMoves.length === 0) return null;

  // Build chart data
  const data = [
    { ply: -1, move: 'Start', eval: 0.2 },
    ...analyzedMoves.map((m) => {
      let val = 0;
      if (m.evalAfter.mateIn !== null) {
        val = m.evalAfter.mateIn > 0 ? 10 : -10;
      } else if (m.evalAfter.scoreCp !== null) {
        val = Math.max(-10, Math.min(10, m.evalAfter.scoreCp / 100));
      }

      return {
        ply: m.ply,
        move: `${m.moveNumber}.${m.playerColor === 'b' ? '..' : ''} ${m.san}`,
        eval: Math.round(val * 10) / 10,
        classification: m.classification
      };
    })
  ];

  return (
    <div className="w-full h-24 bg-judge-surface border border-judge-border rounded-xl p-2 select-none relative">
      <div className="flex items-center justify-between text-[10px] text-judge-muted px-1 pb-1">
        <span>+ White Advantage</span>
        <span className="font-mono">Eval Graph</span>
        <span>- Black Advantage</span>
      </div>

      <div className="w-full h-[60px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload.length > 0) {
                const ply = e.activePayload[0].payload.ply;
                if (ply >= 0) onSelectPly(ply);
              }
            }}
          >
            <defs>
              <linearGradient id="evalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d4a373" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#5e6878" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <YAxis domain={[-6, 6]} hide />
            <XAxis dataKey="ply" hide />
            <ReferenceLine y={0} stroke="#3d4455" strokeDasharray="3 3" />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-judge-panel border border-judge-border px-2 py-1 rounded shadow-lg text-[10px] font-mono">
                      <div className="font-bold text-judge-text">{item.move}</div>
                      <div className="text-judge-accent">
                        {item.eval > 0 ? `+${item.eval}` : item.eval}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="eval"
              stroke="#d4a373"
              strokeWidth={1.5}
              fill="url(#evalGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
