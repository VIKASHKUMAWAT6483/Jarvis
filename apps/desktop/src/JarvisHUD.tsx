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

  // External SSD
  ssdConnected: boolean;

  // Pending approvals count
  pendingApprovals: number;

  // Wake word status
  wakeWordStatus: 'off' | 'listening' | 'detected';

  // Callbacks
  onMicToggle: () => void;
  onStop: () => void;
  onOpenDashboard: () => void;
  onOpenApprovals: () => void;

  // HUD visibility
  visible: boolean;
  onClose: () => void;
}

// ──────────────────────── Voice Waveform (lightweight) ─────────────────────────
function VoiceWaveform({ active }: { active: boolean }) {
  const barCount = 18;
  return (
    <div className={`hud-waveform ${active ? 'hud-waveform--active' : ''}`}>
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
    ssdConnected,
    pendingApprovals,
    wakeWordStatus,
    onMicToggle,
    onStop,
    onOpenDashboard,
    onOpenApprovals,
    visible,
    onClose,
  } = props;

  const [expanded, setExpanded] = useState(false);

  // ───── Dragging logic ─────
  const hudRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only drag from the header area
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
      <VoiceWaveform active={voiceActive} />

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

          {/* SSD */}
          <div className="hud-detail-row">
            <span className="hud-detail-key">💾 SSD</span>
            <span className={`hud-detail-value ${ssdConnected ? 'hud-val--ok' : 'hud-val--warn'}`}>
              {ssdConnected ? 'Connected' : '⚠ Disconnected'}
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
        <button
          className={`hud-action-btn ${pendingApprovals > 0 ? 'hud-action-btn--badge' : ''}`}
          onClick={onOpenApprovals}
          title="Approvals"
          id="hud-approvals-btn"
          data-count={pendingApprovals > 0 ? pendingApprovals : undefined}
        >
          🛡️
        </button>
      </div>
    </div>
  );
}
