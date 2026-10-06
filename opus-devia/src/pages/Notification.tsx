import "./Notification.css";
import "./SettingsSubPage.css";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

/* =========================================================
   ICONS
   ========================================================= */

interface IconProps {
  size?: number;
  strokeWidth?: number;
}

function ArrowLeftIcon({ size = 22, strokeWidth = 2.5 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function BellIcon({ size = 20, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function FlameIcon({ size = 20, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22c4.2 0 7-2.8 7-7 0-3.1-1.8-5.4-4.3-7.8.1 2.2-.5 3.8-1.9 4.8.1-4.1-1.8-7.4-4.7-10C8.1 6.6 5 9.9 5 14.5 5 19 7.9 22 12 22Z" />
    </svg>
  );
}

function CrownIcon({ size = 20, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m2 4 3 14h14l3-14-5.5 5L12 4 8.5 9 2 4Z" />
      <path d="M5 22h14" />
    </svg>
  );
}

function MessageCircleIcon({ size = 20, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 8.8 8.8 0 0 1-4-.9L3 21l1.9-4.3A8.3 8.3 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />
    </svg>
  );
}

function BrainIcon({ size = 20, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.5 4.5A3.5 3.5 0 0 0 6 8v.5A3.5 3.5 0 0 0 4 12a3.5 3.5 0 0 0 2 3.2V16a4 4 0 0 0 4 4h1V4.5h-1.5Z" />
      <path d="M14.5 4.5A3.5 3.5 0 0 1 18 8v.5a3.5 3.5 0 0 1 2 3.5 3.5 3.5 0 0 1-2 3.2v.8a4 4 0 0 1-4 4h-1V4.5h1.5Z" />
      <path d="M9.5 8H8" />
      <path d="M9.5 12H7" />
      <path d="M14.5 8H16" />
      <path d="M14.5 12H17" />
      <path d="M9.5 16H8" />
      <path d="M14.5 16H16" />
    </svg>
  );
}

function MoonIcon({ size = 20, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8Z" />
    </svg>
  );
}

function ClockIcon({ size = 20, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ChevronDownIcon({ size = 15, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* =========================================================
   MAIN NOTIFICATIONS PAGE
   ========================================================= */

export default function Notifications() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    dailyQuest: true,
    streakRisk: true,
    weeklyBoss: false,
    mentorMessages: true,
    resistanceDetected: true,
    quietHours: true,
  });

  const [quietFrom, setQuietFrom] = useState("10:00 PM");
  const [quietTo, setQuietTo] = useState("7:00 AM");
  const [questReminder, setQuestReminder] = useState("9:00 AM");
  const [maxNotifications, setMaxNotifications] = useState("3");

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="notifications-page">

      {/* ================= HEADER ================= */}

      <header className="notifications-header">
        <button
          className="back-button"
          onClick={() => navigate("/settings")}
          aria-label="Back to Settings"
        >
          <ArrowLeftIcon size={22} />
        </button>

        <h1>Notifications</h1>

        <div className="header-spacer" />
      </header>

      {/* ================= QUEST ALERTS ================= */}

      <section className="notification-section">
        <div className="section-label">
          QUEST ALERTS
        </div>

        <div className="settings-card">

          <NotificationRow
            icon={<BellIcon size={20} />}
            title="Daily quest reminder"
            description="Reminds you when today's quest is waiting"
            enabled={settings.dailyQuest}
            onToggle={() => toggleSetting("dailyQuest")}
          />

          <NotificationRow
            icon={<FlameIcon size={20} />}
            title="Streak at risk"
            description="Alert before your streak breaks"
            enabled={settings.streakRisk}
            onToggle={() => toggleSetting("streakRisk")}
          />

          <NotificationRow
            icon={<CrownIcon size={20} />}
            title="Weekly boss challenge"
            description="Notify when a new boss challenge unlocks"
            enabled={settings.weeklyBoss}
            onToggle={() => toggleSetting("weeklyBoss")}
            last
          />

        </div>
      </section>

      {/* ================= MENTOR ================= */}

      <section className="notification-section">
        <div className="section-label">
          MENTOR
        </div>

        <div className="settings-card">

          <NotificationRow
            icon={<MessageCircleIcon size={20} />}
            title="Mentor messages"
            description="Push when your mentor sends a nudge"
            enabled={settings.mentorMessages}
            onToggle={() => toggleSetting("mentorMessages")}
          />

          <NotificationRow
            icon={<BrainIcon size={20} />}
            title="Resistance detected"
            description="Alert when you've avoided a quest too long"
            enabled={settings.resistanceDetected}
            onToggle={() => toggleSetting("resistanceDetected")}
            last
          />

        </div>
      </section>

      {/* ================= QUIET HOURS ================= */}

      <section className="notification-section">
        <div className="section-label">
          QUIET HOURS
        </div>

        <div className="settings-card">

          <NotificationRow
            icon={<MoonIcon size={20} />}
            title="Enable quiet hours"
            description="No notifications during this window"
            enabled={settings.quietHours}
            onToggle={() => toggleSetting("quietHours")}
          />

          <div className="time-row">

            <span>From</span>

            <TimeSelect
              value={quietFrom}
              onChange={setQuietFrom}
              options={[
                "9:00 PM",
                "10:00 PM",
                "11:00 PM",
                "12:00 AM",
              ]}
            />

            <span>To</span>

            <TimeSelect
              value={quietTo}
              onChange={setQuietTo}
              options={[
                "6:00 AM",
                "7:00 AM",
                "8:00 AM",
                "9:00 AM",
              ]}
            />

          </div>

        </div>
      </section>

      {/* ================= FREQUENCY ================= */}

      <section className="notification-section">
        <div className="section-label">
          FREQUENCY
        </div>

        <div className="settings-card">

          <SettingSelectRow
            icon={<ClockIcon size={20} />}
            title="Quest reminder time"
            description="When to remind you each day"
            value={questReminder}
            options={[
              "8:00 AM",
              "9:00 AM",
              "10:00 AM",
              "12:00 PM",
            ]}
            onChange={setQuestReminder}
          />

          <SettingSelectRow
            icon={<BellIcon size={20} />}
            title="Max notifications per day"
            description="Caps how often we can reach you"
            value={maxNotifications}
            options={[
              "1",
              "2",
              "3",
              "4",
              "5",
            ]}
            onChange={setMaxNotifications}
            last
          />

        </div>
      </section>

    </div>
  );
}

/* =========================================================
   NOTIFICATION ROW
   ========================================================= */

interface NotificationRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  last?: boolean;
}

function NotificationRow({
  icon,
  title,
  description,
  enabled,
  onToggle,
  last = false,
}: NotificationRowProps) {
  return (
    <div
      className={`notification-row ${
        last ? "last" : ""
      }`}
    >

      <div className="notification-icon">
        {icon}
      </div>

      <div className="notification-info">
        <div className="notification-title">
          {title}
        </div>

        <div className="notification-description">
          {description}
        </div>
      </div>

      <button
        type="button"
        className={`toggle ${
          enabled ? "active" : ""
        }`}
        onClick={onToggle}
        aria-label={`Toggle ${title}`}
        aria-pressed={enabled}
      >
        <span className="toggle-knob" />
      </button>

    </div>
  );
}

/* =========================================================
   TIME SELECT
   ========================================================= */

interface TimeSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function TimeSelect({
  value,
  options,
  onChange,
}: TimeSelectProps) {
  return (
    <div className="select-wrapper small">

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <ChevronDownIcon size={15} />

    </div>
  );
}

/* =========================================================
   SETTING SELECT ROW
   ========================================================= */

interface SettingSelectRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  last?: boolean;
}

function SettingSelectRow({
  icon,
  title,
  description,
  value,
  options,
  onChange,
  last = false,
}: SettingSelectRowProps) {
  return (
    <div
      className={`select-setting-row ${
        last ? "last" : ""
      }`}
    >

      <div className="setting-icon">
        {icon}
      </div>

      <div className="setting-info">

        <div className="setting-title">
          {title}
        </div>

        <div className="setting-description">
          {description}
        </div>

      </div>

      <div className="select-wrapper">

        <select
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <ChevronDownIcon size={15} />

      </div>

    </div>
  );
}