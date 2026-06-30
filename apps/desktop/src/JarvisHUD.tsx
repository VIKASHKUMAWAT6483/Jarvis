import React, { useState, useRef, useCallback, useEffect } from 'react';
import './JarvisHUD.css';

// ─────────────────────────────── Types ───────────────────────────────
export interface HUDProps {
  // Voice & command state
  voiceStatus: 'idle' | 'Listening' | 'Processing' | 'Tool running' | 'Waiting for approval' | 'Completed' | 'Failed';
  currentCommand: string;
  isRecording: boolean;

  // Project context
  projectName: string;
  projectHealthScore?: number;

  // External SSD
  ssdConnected: boolean;

  // Pending approvals count
  pendingApprovals: number;

  // Wake word status
  wakeWordStatus: 'off' | 'listening' | 'detected';

  // Active monitoring status
  activeMonitoring?: boolean;

  // Recent command history
  commandHistory?: string[];

  // Callbacks
  onMicToggle: () => void;
  onStop: () => void;
  onOpenDashboard: () => void;
  onOpenApprovals: () => void;
  onOpenReports?: () => void;
  onRunDailyBriefing?: () => void;

  // HUD visibility
  visible: boolean;
  onClose: () => void;

  // Low power mode & real-time system stats
  lowPowerMode?: boolean;
  cpuPercent?: number;
  ramBytes?: number;
}

// ──────────────────────── Voice Waveform (lightweight) ─────────────────────────
function VoiceWaveform({ active, paused }: { active: boolean; paused?: boolean }) {
  const barCount = 18;
  return (
    <div className={`hud-waveform ${active ? 'hud-waveform--active' : ''} ${paused ? 'hud-waveform--paused' : ''}`}>
      {Array.from({ length: barCount }).map((_, i) => (
        <span
          key={i}
          className="hud-waveform__bar"
          style={{
            animationDelay: `${i * 0.06}s`,
            height: active ? undefined : '2px',
          }}
        />
      ))}
    </div>
  );
}

// ───────────────────────── Status Indicator Dot ────────────────────────────
function StatusDot({ status }: { status: string }) {
  let colorClass = 'dot--idle';
  if (status === 'Listening' || status === 'listening') colorClass = 'dot--listening';
  else if (status === 'Processing' || status === 'Tool running') colorClass = 'dot--processing';
  else if (status === 'Waiting for approval') colorClass = 'dot--approval';
  else if (status === 'Completed' || status === 'detected') colorClass = 'dot--success';
  else if (status === 'Failed') colorClass = 'dot--error';
  return <span className={`hud-status-dot ${colorClass}`} />;
}

// ──────────────────────── Main HUD Component ─────────────────────────────
export default function JarvisHUD(props: HUDProps) {
  const {
    voiceStatus,
    currentCommand,
    isRecording,
    projectName,
    projectHealthScore = 100,
    ssdConnected,
    pendingApprovals,
    wakeWordStatus,
    activeMonitoring = false,
    commandHistory = [],
    onMicToggle,
    onStop,
    onOpenDashboard,
    onOpenApprovals,
    onOpenReports,
    onRunDailyBriefing,
    visible,
    onClose,
    lowPowerMode = false,
    cpuPercent = 15,
    ramBytes = 180000000,
  } = props;

  const [expanded, setExpanded] = useState(false);

  // ───── High CPU Collapse Logic ─────
  useEffect(() => {
    if (cpuPercent > 85 && expanded) {
      setExpanded(false);
      console.warn("[Jarvis HUD Alert]: CPU usage exceeds 85%. Auto-collapsed to compact mode.");
    }
  }, [cpuPercent, expanded]);

  // ───── Dragging logic ─────
  const hudRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!(e.target as HTMLElement).closest('.hud-drag-handle')) return;
    dragging.current = true;
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [position]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    setPosition({
      x: Math.max(0, e.clientX - dragOffset.current.x),
      y: Math.max(0, e.clientY - dragOffset.current.y),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Determine voice active for waveform
  const voiceActive = voiceStatus === 'Listening' || voiceStatus === 'Processing' || isRecording;

  // Human-readable status label
  const statusLabel = (() => {
    if (voiceStatus === 'idle' && wakeWordStatus === 'listening') return '🎙️ Wake word listening...';
    if (voiceStatus === 'idle') return '💤 Idle';
    if (voiceStatus === 'Listening') return '🎤 Listening...';
    if (voiceStatus === 'Processing') return '⚙️ Processing...';
    if (voiceStatus === 'Tool running') return '🔧 Tool running...';
    if (voiceStatus === 'Waiting for approval') return '🛡️ Waiting for approval';
    if (voiceStatus === 'Completed') return '✅ Completed';
    if (voiceStatus === 'Failed') return '❌ Failed';
    return voiceStatus;
  })();

  const getTimelineSteps = () => {
    const steps = [
      { id: 1, label: 'Capture voice input' },
      { id: 2, label: 'Transcribe content' },
      { id: 3, label: 'Safety Engine check' },
      { id: 4, label: 'Execute process' }
    ];

    return steps.map(step => {
      let state: 'pending' | 'active' | 'completed' = 'pending';
      if (voiceStatus === 'Listening') {
        if (step.id === 1) state = 'active';
      } else if (voiceStatus === 'Processing') {
        if (step.id < 2) state = 'completed';
        else if (step.id === 2) state = 'active';
      } else if (voiceStatus === 'Tool running') {
        if (step.id < 4) state = 'completed';
        else if (step.id === 4) state = 'active';
      } else if (voiceStatus === 'Waiting for approval') {
        if (step.id < 3) state = 'completed';
        else if (step.id === 3) state = 'active';
      } else if (voiceStatus === 'Completed') {
        state = 'completed';
      } else if (voiceStatus === 'Failed') {
        if (step.id === 4) state = 'pending';
        else state = 'completed';
      }
      return { ...step, state };
    });
  };

  if (!visible) return null;

  return (
    <div
      ref={hudRef}
      className={`jarvis-hud ${expanded ? 'jarvis-hud--expanded' : 'jarvis-hud--compact'}`}
      style={{ left: position.x, top: position.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      id="jarvis-hud"
    >
      {/* ── Header (drag handle) ── */}
      <div className="hud-header hud-drag-handle">
        <div className="hud-header__left">
          <div className="hud-brand-orb" />
          <span className="hud-brand-label">JARVIS</span>
          <StatusDot status={voiceStatus === 'idle' ? wakeWordStatus : voiceStatus} />
        </div>
        <div className="hud-header__right">
          <button
            className="hud-icon-btn"
            title={expanded ? 'Compact mode' : 'Expand'}
            onClick={() => setExpanded(!expanded)}
            id="hud-toggle-expand"
          >
            {expanded ? '⊟' : '⊞'}
          </button>
          <button className="hud-icon-btn hud-icon-btn--close" title="Close HUD" onClick={onClose} id="hud-close-btn">
            ✕
          </button>
        </div>
      </div>

      {/* ── Waveform strip ── */}
      <VoiceWaveform active={voiceActive} paused={lowPowerMode} />

      {/* ── Status row ── */}
      <div className="hud-status-row">
        <span className="hud-status-label">{statusLabel}</span>
      </div>

      {/* ── Current command ── */}
      {currentCommand && (
        <div className="hud-command-row">
          <span className="hud-command-text">❯ {currentCommand}</span>
        </div>
      )}

      {/* ── Expanded details ── */}
      {expanded && (
        <div className="hud-expanded-section">
          {/* Project */}
          <div className="hud-detail-row">
            <span className="hud-detail-key">📁 Project</span>
            <span className="hud-detail-value">{projectName || 'None selected'}</span>
          </div>

          {/* Health Score */}
          <div className="hud-detail-row">
            <span className="hud-detail-key">💖 Health Score</span>
            <span className={`hud-detail-value ${projectHealthScore >= 80 ? 'hud-val--ok' : 'hud-val--warn'}`}>
              {projectHealthScore} / 100
            </span>
          </div>

          {/* Watchlist Monitor */}
          <div className="hud-detail-row">
            <span className="hud-detail-key">⏱️ Monitor status</span>
            <span className={`hud-detail-value ${activeMonitoring ? 'hud-val--ok' : 'hud-val--warn'}`}>
              {activeMonitoring ? 'Active' : 'Standby'}
            </span>
          </div>

          {/* SSD */}
          <div className="hud-detail-row">
            <span className="hud-detail-key">💾 SSD</span>
            <span className={`hud-detail-value ${ssdConnected ? 'hud-val--ok' : 'hud-val--warn'}`}>
              {ssdConnected ? 'Connected' : '⚠ Disconnected'}
            </span>
          </div>

          {/* System Performance stats */}
          <div className="hud-detail-row">
            <span className="hud-detail-key">🖥️ CPU / RAM</span>
            <span className="hud-detail-value">
              {cpuPercent}% / {(ramBytes / (1024 * 1024)).toFixed(0)} MB
            </span>
          </div>

          {/* SSD warning banner */}
          {!ssdConnected && (
            <div className="hud-warning-banner" id="hud-ssd-warning">
              ⚠️ External SSD disconnected — heavy writes paused.
            </div>
          )}

          {/* Pending approvals */}
          <div className="hud-detail-row">
            <span className="hud-detail-key">🛡️ Approvals</span>
            <span className={`hud-detail-value ${pendingApprovals > 0 ? 'hud-val--pending' : 'hud-val--ok'}`}>
              {pendingApprovals > 0 ? `${pendingApprovals} pending` : 'None'}
            </span>
          </div>

          {/* Voice fallback warning */}
          {voiceStatus === 'Failed' && (
            <div className="hud-warning-banner hud-warning-banner--voice" id="hud-voice-fallback">
              🎤 Voice failed — use text input as fallback.
            </div>
          )}

          {/* Task Timeline */}
          <div className="hud-timeline">
            <div className="hud-timeline-title">Task Timeline</div>
            {getTimelineSteps().map(s => (
              <div key={s.id} className="hud-timeline-step">
                <span className={`step-dot ${s.state === 'active' ? 'step-dot--active' : s.state === 'completed' ? 'step-dot--completed' : ''}`} />
                <span className={`step-text ${s.state === 'active' ? 'step-text--active' : s.state === 'completed' ? 'step-text--completed' : ''}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Command History */}
          {commandHistory.length > 0 && (
            <div className="hud-history">
              <div className="hud-history-title">Command History</div>
              {commandHistory.slice(-3).reverse().map((cmd, index) => (
                <div key={index} className="hud-history-item">
                  ❯ {cmd}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Quick action buttons ── */}
      <div className="hud-actions">
        <button
          className={`hud-action-btn ${isRecording ? 'hud-action-btn--recording' : ''}`}
          onClick={onMicToggle}
          title={isRecording ? 'Stop recording' : 'Start mic'}
          id="hud-mic-btn"
        >
          {isRecording ? '⏹' : '🎤'}
        </button>
        <button className="hud-action-btn" onClick={onStop} title="Stop" id="hud-stop-btn">
          ⏸
        </button>
        <button className="hud-action-btn" onClick={onOpenDashboard} title="Open Dashboard" id="hud-dashboard-btn">
          📊
        </button>
        {onOpenReports && (
          <button className="hud-action-btn" onClick={onOpenReports} title="Open Reports" id="hud-reports-btn">
            📂
          </button>
        )}
        <button
          className={`hud-action-btn ${pendingApprovals > 0 ? 'hud-action-btn--badge' : ''}`}
          onClick={onOpenApprovals}
          title="Approvals"
          id="hud-approvals-btn"
          data-count={pendingApprovals > 0 ? pendingApprovals : undefined}
        >
          🛡️
        </button>
        {onRunDailyBriefing && (
          <button className="hud-action-btn" onClick={onRunDailyBriefing} title="Run Daily Briefing" id="hud-briefing-btn">
            ☕
          </button>
        )}
      </div>
    </div>
  );
}
