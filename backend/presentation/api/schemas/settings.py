from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


ThemeMode = Literal["light", "dark"]
AssistantVoice = Literal["feminine", "masculine", "neutral"]
ReminderStyle = Literal["friendly", "professional", "motivational"]
IntegrationProvider = Literal["google_calendar", "gmail", "outlook", "apple_watch"]
IntegrationStatus = Literal["connected", "disconnected", "error"]


class UiPrefs(BaseModel):
    theme_mode: ThemeMode
    assistant_voice: AssistantVoice


class SettingsUiPatch(BaseModel):
    theme_mode: ThemeMode | None = None
    assistant_voice: AssistantVoice | None = None


class NotificationPreferencesResponse(BaseModel):
    push_enabled: bool
    email_enabled: bool
    sms_enabled: bool
    sound_enabled: bool
    vibration_enabled: bool
    reminders_enabled: bool
    meetings_enabled: bool
    tasks_enabled: bool
    kiki_suggestions_enabled: bool
    daily_summary_enabled: bool
    weekly_report_enabled: bool
    reminder_style: str


class NotificationPreferencesPatch(BaseModel):
    push_enabled: bool | None = None
    email_enabled: bool | None = None
    sms_enabled: bool | None = None
    sound_enabled: bool | None = None
    vibration_enabled: bool | None = None
    reminders_enabled: bool | None = None
    meetings_enabled: bool | None = None
    tasks_enabled: bool | None = None
    kiki_suggestions_enabled: bool | None = None
    daily_summary_enabled: bool | None = None
    weekly_report_enabled: bool | None = None
    reminder_style: ReminderStyle | None = None


class IntegrationConnectionResponse(BaseModel):
    provider: str
    status: str
    last_sync_at: datetime | None = None


class SettingsAggregateResponse(BaseModel):
    ui: UiPrefs
    notifications: NotificationPreferencesResponse
    integrations: list[IntegrationConnectionResponse]


class IntegrationStatusPatch(BaseModel):
    status: Literal["connected", "disconnected"] = Field(
        description="Status da integração (sem OAuth real no MVP)."
    )
