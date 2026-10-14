import { describe, it, expect } from 'vitest';
import { db } from '../db/repository';

describe('Interview Scheduling & Conflict Prevention', () => {
  const interviewerId = 'e0000000-0000-0000-0000-000000000001';
  const interviewerName = 'Sarah Connor';

  it('should successfully book an interview when no time conflict exists', () => {
    const tomorrow10am = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow10am.setHours(10, 0, 0, 0);

    const result = db.scheduleInterview({
      applicationId: 'app-calendar-1',
      interviewerId,
      interviewerName,
      scheduledStart: tomorrow10am.toISOString(),
      durationMinutes: 45,
      timezone: 'America/New_York',
      schedulingMode: 'MANUAL',
      meetingUrl: 'https://meet.google.com/test-abc-def'
    });

    expect(result.conflict).toBeFalsy();
    expect(result.interview).toBeDefined();
    expect(result.interview?.scheduling_mode).toBe('MANUAL');
  });

  it('should detect and prevent conflicting interview bookings for the same interviewer', () => {
    const baseTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
    baseTime.setHours(14, 0, 0, 0);

    // Book first interview 14:00 - 14:45
    const booking1 = db.scheduleInterview({
      applicationId: 'app-calendar-2',
      interviewerId,
      interviewerName,
      scheduledStart: baseTime.toISOString(),
      durationMinutes: 45,
      timezone: 'America/New_York',
      schedulingMode: 'MANUAL'
    });
    expect(booking1.interview).toBeDefined();

    // Attempt second interview overlapping at 14:30 - 15:15
    const overlapTime = new Date(baseTime.getTime() + 30 * 60 * 1000);
    const booking2 = db.scheduleInterview({
      applicationId: 'app-calendar-3',
      interviewerId,
      interviewerName,
      scheduledStart: overlapTime.toISOString(),
      durationMinutes: 45,
      timezone: 'America/New_York',
      schedulingMode: 'MANUAL'
    });

    expect(booking2.conflict).toBe(true);
    expect(booking2.error).toContain('already has a scheduled interview');
  });
});
