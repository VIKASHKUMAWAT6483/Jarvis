import React, { useState, useCallback, useRef, useEffect } from "react";
import "./JarvisHUD.css";

/**
 * Voice status types matching the main App.tsx voice state machine.
 */
type VoiceStatus = 'idle' | 'Listening' | 'Processing' | 'Tool running' | 'Waiting for approval' | 'Completed' | 'Failed';

/**
 * Wake word status matching the main App.tsx wake word state machine.
 */
type WakeWordStatus = 'off' | 'listening' | 'detected';

/**
 * Recent command entry for the activity feed.
 */
interface RecentCommand {
  id: string;
  user_input: string;
  status: string;
}

/**
 * Props for the JarvisHUD component.
 */
interface JarvisHUDProps {
  visible: boolean;
  voiceStatus: VoiceStatus;
  wakeWordStatus: WakeWordStatus;
  isRecording: boolean;
  ssdConnected: boolean;
  voiceEnabled: boolean;
  activeProjectName: string | null;
  healthScore: number | null;
  healthStatus: string | null;
  pendingApprovalsCount: number;
  recentCommands: RecentCommand[];
  hudOpacity: number;
  defaultExpanded: boolean;

  // Action callbacks
  onMicToggle: () => void;
  onBriefingTrigger: () => void;
  onBackupTrigger: () => void;
}

/**
 * JarvisHUD — Lightweight floating glassmorphic heads-up display.
 * 
 * Provides at-a-glance system status, voice progress indicators,
 * recent command activity, and quick action buttons in a compact
 * overlay that can be minimized to a small orb.
 */
const JarvisHUD: React.FC<JarvisHUDProps> = ({
  visible,
  voiceStatus,
  wakeWordStatus,
  isRecording,
  ssdConnected,
  voiceEnabled,
  activeProjectName,
  healthScore,
  healthStatus,
  pendingApprovalsCount,
  recentCommands,
  hudOpacity,
  defaultExpanded,
  onMicToggle,
  onBriefingTrigger,
  onBackupTrigger,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const hudRef = useRef<HTMLDivElement>(null);

  // Reset expanded state when defaultExpanded prop changes
  useEffect(() => {
    setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);

  // Handle expand from orb
  const handleExpand = useCallback(() => {
    setIsCollapsing(false);
    setIsExpanded(true);
  }, []);

  // Handle collapse to orb with animation
  const handleCollapse = useCallback(() => {
    setIsCollapsing(true);
    setTimeout(() => {
      setIsExpanded(false);
      setIsCollapsing(false);
    }, 280);
  }, []);

  // Drag handlers for repositioning
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.hud-minimize-btn') || 
        (e.target as HTMLElement).closest('.hud-action-btn')) return;
    
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
    };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.origX - dx,
        y: dragRef.current.origY - dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!visible) return null;

  // Determine voice waveform state class
  const isVoiceActive = voiceStatus === 'Listening' || voiceStatus === 'Processing' || voiceStatus === 'Tool running' || voiceStatus === 'Waiting for approval';
  const isVoiceFailed = voiceStatus === 'Failed';
  const isVoiceCompleted = voiceStatus === 'Completed';
  const waveformClass = isVoiceActive ? 'active' : isVoiceFailed ? 'failed' : isVoiceCompleted ? 'completed' : '';

  // Determine voice status text class
  const voiceStatusClass = (() => {
    switch (voiceStatus) {
      case 'Listening': return 'listening';
      case 'Processing': return 'processing';
      case 'Tool running': return 'running';
      case 'Waiting for approval': return 'approval';
      case 'Completed': return 'completed';
      case 'Failed': return 'failed';
      default: return 'idle';
    }
  })();

  // Determine health badge class
  const healthBadgeClass = (() => {
    if (!healthStatus) return '';
    switch (healthStatus) {
      case 'Excellent': return 'excellent';
      case 'Good': return 'good';
      case 'Needs Work': return 'needs-work';
      case 'Critical': return 'critical';
      default: return 'needs-work';
    }
  })();

  // Voice status display text
  const voiceDisplayText = (() => {
    switch (voiceStatus) {
      case 'idle': return 'Idle';
      case 'Listening': return '● Listening...';
      case 'Processing': return '◉ Processing...';
      case 'Tool running': return '◈ Tool Running';
      case 'Waiting for approval': return '◆ Awaiting Approval';
      case 'Completed': return '✓ Completed';
      case 'Failed': return '✗ Failed';
      default: return 'Idle';
    }
  })();

  const isOrbVoiceActive = isRecording || voiceStatus === 'Listening' || voiceStatus === 'Processing';

  const containerStyle: React.CSSProperties = {
    right: `${24 + position.x}px`,
    bottom: `${24 + position.y}px`,
  };

  // Minimized Orb View
  if (!isExpanded) {
    return (
      <div 
        className="jarvis-hud-container" 
        style={containerStyle}
        ref={hudRef}
      >
        <div 
          className={`hud-minimized-orb ${isOrbVoiceActive ? 'voice-active' : ''}`}
          onClick={handleExpand}
          title="Expand Jarvis HUD"
        >
          <div className="orb-inner" />
          {pendingApprovalsCount > 0 && (
            <span className="hud-orb-badge">{pendingApprovalsCount}</span>
          )}
        </div>
      </div>
    );
  }

  // Expanded HUD Panel
  return (
    <div 
      className="jarvis-hud-container" 
      style={{ ...containerStyle, opacity: hudOpacity / 100 }}
      ref={hudRef}
    >
      <div className={`hud-expanded-panel ${isCollapsing ? 'collapsing' : ''}`}>
        {/* Header */}
        <div 
          className="hud-header" 
          onMouseDown={handleDragStart}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div className="hud-header-left">
            <div className="hud-header-orb" />
            <span className="hud-header-title">Jarvis HUD</span>
          </div>
          <button 
            className="hud-minimize-btn" 
            onClick={handleCollapse}
            title="Minimize HUD"
          >
            ▾
          </button>
        </div>

        {/* System Status Row */}
        <div className="hud-status-row">
          <div className="hud-status-item">
            <span className={`hud-status-dot ${ssdConnected ? 'connected' : 'disconnected'}`} />
            <span>SSD</span>
          </div>
          <div className="hud-status-item">
            <span className={`hud-status-dot ${voiceEnabled ? 'enabled' : 'disabled'}`} />
            <span>Voice</span>
          </div>
          <div className="hud-status-item">
            <span className={`hud-status-dot ${wakeWordStatus}`} />
            <span>Wake</span>
          </div>
        </div>

        {/* Voice Progress Display */}
        <div className="hud-voice-section">
          <div className="hud-voice-label">Voice Progress</div>
          <div className="hud-voice-indicator">
            <div className={`hud-waveform ${waveformClass}`}>
              <div className="hud-waveform-bar" style={{ height: '8px' }} />
              <div className="hud-waveform-bar" style={{ height: '14px' }} />
              <div className="hud-waveform-bar" style={{ height: '6px' }} />
              <div className="hud-waveform-bar" style={{ height: '18px' }} />
              <div className="hud-waveform-bar" style={{ height: '10px' }} />
            </div>
            <span className={`hud-voice-status-text ${voiceStatusClass}`}>
              {voiceDisplayText}
            </span>
          </div>
        </div>

        {/* Active Project Quick View */}
        <div className="hud-project-section">
          <div className="hud-project-info">
            <span className="hud-project-label">Active Project</span>
            <span className="hud-project-name">
              {activeProjectName || 'No Project Selected'}
            </span>
          </div>
          {healthScore !== null && healthStatus && (
            <span className={`hud-health-badge ${healthBadgeClass}`}>
              {healthScore}/100
            </span>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="hud-activity-section">
          <div className="hud-activity-label">Recent Activity</div>
          {recentCommands.length > 0 ? (
            recentCommands.map(cmd => (
              <div key={cmd.id} className="hud-activity-item">
                <span className="hud-activity-cmd">{cmd.user_input}</span>
                <span className={`hud-activity-status ${cmd.status}`}>{cmd.status}</span>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '0.68rem', color: '#4b5563', fontStyle: 'italic' }}>
              No recent commands
            </div>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="hud-actions-row">
          <button 
            className={`hud-action-btn ${isRecording ? 'recording' : ''}`}
            onClick={onMicToggle}
            title={isRecording ? 'Stop Recording' : 'Start Voice Input'}
          >
            {isRecording ? '🔴 Stop' : '🎙️ Mic'}
          </button>
          <button 
            className="hud-action-btn"
            onClick={onBriefingTrigger}
            title="Generate Daily Briefing"
          >
            📊 Brief
          </button>
          <button 
            className="hud-action-btn"
            onClick={onBackupTrigger}
            title="Quick Database Backup"
          >
            💾 Backup
          </button>
        </div>

        {/* Pending Approvals Banner */}
        {pendingApprovalsCount > 0 && (
          <div className="hud-approvals-banner">
            <span className="hud-approvals-dot" />
            <span>{pendingApprovalsCount} pending approval{pendingApprovalsCount > 1 ? 's' : ''} in Safety Gate</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default JarvisHUD;
