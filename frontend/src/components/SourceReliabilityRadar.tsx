import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { ClaimDossier, Language } from '../types';
import { computeSourceReliability, type ReliabilityAxis } from '../utils/sourceReliability';

interface SourceReliabilityRadarProps {
  dossier: ClaimDossier | null;
  currentLang: Language;
  compact?: boolean;
}

export const SourceReliabilityRadar: React.FC<SourceReliabilityRadarProps> = ({
  dossier,
  currentLang,
  compact = false,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeAxisKey, setActiveAxisKey] = useState<ReliabilityAxis['key'] | null>(null);

  const report = useMemo(() => {
    if (!dossier) return null;
    return computeSourceReliability(dossier, currentLang);
  }, [dossier, currentLang]);

  const activeAxis = useMemo(() => {
    if (!report) return null;
    if (activeAxisKey) {
      return report.axes.find((a) => a.key === activeAxisKey) || report.axes[0];
    }
    return [...report.axes].sort((a, b) => b.score - a.score)[0] || null;
  }, [report, activeAxisKey]);

  const palette = useMemo(() => {
    if (!report) {
      return {
        stroke: '#64748b',
        fill: 'rgba(100, 116, 139, 0.16)',
        badge: 'bg-[#f1f5f9] text-[#475569] border-[#cbd5e1]',
        scoreColor: 'text-[#475569]',
      };
    }
    if (report.grade === 'high') {
      return {
        stroke: '#16a34a',
        fill: 'rgba(22, 163, 74, 0.18)',
        badge: 'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]',
        scoreColor: 'text-[#15803d]',
      };
    }
    if (report.grade === 'moderate') {
      return {
        stroke: '#2563eb',
        fill: 'rgba(37, 99, 235, 0.18)',
        badge: 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]',
        scoreColor: 'text-[#1d4ed8]',
      };
    }
    if (report.grade === 'limited') {
      return {
        stroke: '#d97706',
        fill: 'rgba(217, 119, 6, 0.18)',
        badge: 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]',
        scoreColor: 'text-[#b45309]',
      };
    }
    return {
      stroke: '#64748b',
      fill: 'rgba(100, 116, 139, 0.14)',
      badge: 'bg-[#f1f5f9] text-[#475569] border-[#cbd5e1]',
      scoreColor: 'text-[#475569]',
    };
  }, [report]);

  useEffect(() => {
    setActiveAxisKey(null);
  }, [dossier?.id]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || !report) return;

    const width = compact ? 276 : 330;
    const height = compact ? 236 : 272;
    const radius = compact ? 74 : 92;
    const cx = width / 2;
    const cy = height / 2 + 4;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-label', `Source Reliability Score radar chart: ${report.overallScore} out of 100`);

    const g = svg.append('g').attr('transform', `translate(${cx}, ${cy})`);

    const axes = report.axes;
    const angleSlice = (Math.PI * 2) / axes.length;
    const rScale = d3.scaleLinear().domain([0, 100]).range([0, radius]);

    // Concentric polygonal grid rings (25, 50, 75, 100)
    const levels = [25, 50, 75, 100];
    levels.forEach((lvl) => {
      const ringRadius = rScale(lvl);
      const ringPoints = axes.map((_, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        return [ringRadius * Math.cos(angle), ringRadius * Math.sin(angle)] as [number, number];
      });
      const ringLine = d3.line<[number, number]>().curve(d3.curveLinearClosed);
      g.append('path')
        .datum(ringPoints)
        .attr('d', ringLine)
        .attr('fill', lvl === 100 ? 'rgba(248, 250, 252, 0.7)' : 'none')
        .attr('stroke', lvl === 100 ? '#cbd5e1' : '#e2e8f0')
        .attr('stroke-width', lvl === 100 ? 1.2 : 0.9)
        .attr('stroke-dasharray', lvl === 50 ? '2,2' : null);

      if (lvl === 50 || lvl === 100) {
        g.append('text')
          .attr('x', 4)
          .attr('y', -ringRadius + 3)
          .attr('font-size', '9px')
          .attr('font-weight', '600')
          .attr('fill', '#94a3b8')
          .text(`${lvl}`);
      }
    });

    // Radial spokes & axis labels
    axes.forEach((axis, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const xEnd = radius * Math.cos(angle);
      const yEnd = radius * Math.sin(angle);

      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', xEnd)
        .attr('y2', yEnd)
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1);

      const labelOffset = compact ? 17 : 21;
      const lx = (radius + labelOffset) * Math.cos(angle);
      const ly = (radius + labelOffset) * Math.sin(angle);
      const cos = Math.cos(angle);
      const textAnchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';

      const labelGroup = g
        .append('g')
        .style('cursor', 'pointer')
        .on('mouseenter', () => setActiveAxisKey(axis.key))
        .on('click', () => setActiveAxisKey(axis.key));

      labelGroup
        .append('text')
        .attr('x', lx)
        .attr('y', ly - 2)
        .attr('text-anchor', textAnchor)
        .attr('font-size', compact ? '10px' : '11px')
        .attr('font-weight', activeAxisKey === axis.key ? '800' : '700')
        .attr('fill', activeAxisKey === axis.key ? palette.stroke : '#334155')
        .text(axis.shortLabel);

      labelGroup
        .append('text')
        .attr('x', lx)
        .attr('y', ly + 9)
        .attr('text-anchor', textAnchor)
        .attr('font-size', '9.5px')
        .attr('font-weight', '700')
        .attr('fill', axis.score > 0 ? palette.stroke : '#94a3b8')
        .text(`${axis.score}%`);
    });

    // Radar value polygon using d3.lineRadial
    const radialLine = d3
      .lineRadial<ReliabilityAxis>()
      .angle((_, i) => i * angleSlice)
      .radius((d) => rScale(d.score))
      .curve(d3.curveLinearClosed);

    g.append('path')
      .datum(axes)
      .attr('d', radialLine)
      .attr('fill', palette.fill)
      .attr('stroke', palette.stroke)
      .attr('stroke-width', 2);

    // Interactive data vertices
    axes.forEach((axis, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const valR = rScale(axis.score);
      const vx = valR * Math.cos(angle);
      const vy = valR * Math.sin(angle);
      const isSelected = activeAxisKey === axis.key;

      g.append('circle')
        .attr('cx', vx)
        .attr('cy', vy)
        .attr('r', isSelected ? 5.5 : 4)
        .attr('fill', isSelected ? palette.stroke : '#ffffff')
        .attr('stroke', palette.stroke)
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseenter', () => setActiveAxisKey(axis.key))
        .on('click', () => setActiveAxisKey(axis.key));
    });
  }, [report, compact, palette, activeAxisKey]);

  const titleLabel =
    currentLang === 'kn'
      ? 'ಮೂಲಗಳ ವಿಶ್ವಾಸಾರ್ಹತೆ ಅಂಕ'
      : currentLang === 'hi'
      ? 'स्रोत विश्वसनीयता स्कोर'
      : 'Source Reliability Score';

  if (!dossier || !report) {
    return null;
  }

  return (
    <div className="mt-2 pt-3 border-t border-[#f1f5f9] flex flex-col gap-2.5">
      {/* Header row with composite score & trust grade */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-[#2563eb]">radar</span>
          <span className="font-['Plus_Jakarta_Sans'] font-bold text-xs text-[#0f172a]">
            {titleLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`font-['Plus_Jakarta_Sans'] font-extrabold text-sm ${palette.scoreColor}`}>
            {report.overallScore}
            <span className="text-[10px] font-semibold text-[#64748b]">/100</span>
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${palette.badge}`}
          >
            {report.gradeLabel}
          </span>
        </div>
      </div>

      {/* D3 Radar Chart SVG */}
      <div className="rounded-xl bg-[#f8fafc] border border-[#e2e8f0] px-2 py-2 flex flex-col items-center">
        <svg ref={svgRef} className="w-full max-w-[320px] h-auto select-none" />

        {/* Interactive Axis Inspection Bar */}
        {activeAxis && (
          <div className="w-full mt-1 px-2.5 py-2 rounded-lg bg-white border border-[#e2e8f0] text-[11px] flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[#0f172a]">{activeAxis.label}</span>
              <span className={`font-bold ${palette.scoreColor}`}>{activeAxis.score} / 100</span>
            </div>
            <p className="text-[#475569] leading-snug">{activeAxis.description}</p>
            {activeAxis.sampleSources.length > 0 && (
              <p className="text-[10px] text-[#64748b] truncate">
                Archives: {activeAxis.sampleSources.join(', ')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Archive Composition Breakdown */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="px-2 py-1.5 rounded-lg bg-[#f8fafc] border border-[#f1f5f9] flex items-center justify-between">
          <span className="text-[#64748b] font-medium">Official Registries</span>
          <span className="font-bold text-[#0f172a]">{report.archives.officialCount}</span>
        </div>
        <div className="px-2 py-1.5 rounded-lg bg-[#f8fafc] border border-[#f1f5f9] flex items-center justify-between">
          <span className="text-[#64748b] font-medium">Fact-Check / Ref</span>
          <span className="font-bold text-[#0f172a]">{report.archives.factCheckCount}</span>
        </div>
        <div className="px-2 py-1.5 rounded-lg bg-[#f8fafc] border border-[#f1f5f9] flex items-center justify-between">
          <span className="text-[#64748b] font-medium">Accredited Press</span>
          <span className="font-bold text-[#0f172a]">{report.archives.accreditedPressCount}</span>
        </div>
        <div className="px-2 py-1.5 rounded-lg bg-[#f8fafc] border border-[#f1f5f9] flex items-center justify-between">
          <span className="text-[#64748b] font-medium">Web / Secondary</span>
          <span className="font-bold text-[#0f172a]">{report.archives.secondaryWebCount}</span>
        </div>
      </div>
    </div>
  );
};
