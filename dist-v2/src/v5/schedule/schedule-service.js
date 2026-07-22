import { createEntity, updateEntity } from '../common/entity.js';
import { AppError, invariant } from '../common/errors.js';

export class ScheduleService {
  constructor(repositories) { this.repos = repositories; }

  createShootEvent(command) {
    const project = this.repos.projects.require(command.projectId);
    const revision = this.repos.planRevisions.require(command.planRevisionId);
    invariant(revision.projectId === project.id, 'PLAN_PROJECT_MISMATCH', '方案版本不属于当前项目');
    invariant(revision.status === 'confirmed', 'PLAN_REVISION_NOT_CONFIRMED', '只有已确认方案版本可以创建拍摄日程', { planRevisionId: revision.id });
    const startAt = parseDate(command.startAt, 'startAt');
    const endAt = parseDate(command.endAt, 'endAt');
    invariant(endAt > startAt, 'INVALID_EVENT_RANGE', '拍摄结束时间必须晚于开始时间');
    const participantIds = uniqueStrings(command.participantAssignmentIds);
    const conflicts = this.detectConflicts({
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      participantAssignmentIds: participantIds,
      excludeEventId: command.excludeEventId,
    });
    if (conflicts.length) throw new AppError('CALENDAR_CONFLICT', '拍摄时间与现有日程冲突', { conflicts: conflicts.map(item => item.id) });
    participantIds.forEach(id => this.repos.participantAssignments.require(id));
    const event = this.repos.calendarEvents.create(createEntity('calendar-event', {
      projectId: project.id,
      planId: revision.planId,
      planRevisionId: revision.id,
      eventType: 'shoot',
      title: command.title || revision.concept || project.title,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      timezone: command.timezone || project.timezone || 'Asia/Shanghai',
      location: command.location || '',
      status: command.status || 'scheduled',
      participantAssignmentIds: participantIds,
      notes: command.notes || '',
      blocksTime: command.blocksTime !== false,
    }));
    let expectedRevenue = null;
    if (Number(command.expectedRevenue || 0) > 0) {
      expectedRevenue = this.recordExpectedRevenue({
        projectId: project.id,
        calendarEventId: event.id,
        amount: Number(command.expectedRevenue),
        currency: command.currency || project.defaultCurrency || 'CNY',
        occurredAt: event.startAt,
        notes: command.revenueNotes || '',
      });
    }
    return { event, expectedRevenue, events: [{ type: 'ShootEventCreated', calendarEventId: event.id, projectId: project.id }] };
  }

  detectConflicts({ startAt, endAt, participantAssignmentIds = [], excludeEventId = null }) {
    const start = parseDate(startAt, 'startAt');
    const end = parseDate(endAt, 'endAt');
    const participants = new Set(participantAssignmentIds);
    return this.repos.calendarEvents.list(item => {
      if (item.id === excludeEventId || item.status === 'cancelled' || item.blocksTime === false) return false;
      const itemStart = new Date(item.startAt);
      const itemEnd = new Date(item.endAt);
      if (!(start < itemEnd && end > itemStart)) return false;
      if (!participants.size) return true;
      return (item.participantAssignmentIds || []).some(id => participants.has(id));
    });
  }

  recordExpectedRevenue(command) { return this.recordFinancial({ ...command, type: 'expected_revenue' }); }
  recordReceivedRevenue(command) { return this.recordFinancial({ ...command, type: 'received_revenue' }); }
  recordExpense(command) { return this.recordFinancial({ ...command, type: 'expense' }); }

  recordFinancial(command) {
    this.repos.projects.require(command.projectId);
    invariant(['expected_revenue', 'received_revenue', 'expense'].includes(command.type), 'INVALID_FINANCIAL_TYPE', '财务记录类型不支持');
    const amount = Number(command.amount);
    invariant(Number.isFinite(amount) && amount >= 0, 'INVALID_FINANCIAL_AMOUNT', '金额必须是非负数字');
    return this.repos.financialEntries.create(createEntity('financial-entry', {
      projectId: command.projectId,
      calendarEventId: command.calendarEventId || null,
      planRevisionId: command.planRevisionId || null,
      type: command.type,
      amount,
      currency: command.currency || 'CNY',
      occurredAt: command.occurredAt || new Date().toISOString(),
      status: command.status || (command.type === 'expected_revenue' ? 'expected' : 'recorded'),
      notes: command.notes || '',
    }));
  }

  listForParticipant(participantAssignmentId, range = {}) {
    this.repos.participantAssignments.require(participantAssignmentId);
    const start = range.startAt ? parseDate(range.startAt, 'startAt') : new Date('1970-01-01T00:00:00.000Z');
    const end = range.endAt ? parseDate(range.endAt, 'endAt') : new Date('9999-12-31T23:59:59.999Z');
    return this.repos.calendarEvents.list(item =>
      (item.participantAssignmentIds || []).includes(participantAssignmentId)
      && new Date(item.startAt) < end && new Date(item.endAt) > start
      && (!range.projectId || item.projectId === range.projectId))
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  }

  getPeriodSummaries(options = {}) {
    const now = options.now ? new Date(options.now) : new Date();
    const timezone = options.timezone || 'Asia/Shanghai';
    const periods = periodRanges(now, timezone);
    return Object.fromEntries(Object.entries(periods).map(([name, range]) => [name, {
      ...range,
      ...this.getRevenueSummary({ ...range, projectId: options.projectId, currency: options.currency }),
    }]));
  }

  getRevenueSummary(range = {}) {
    const start = range.startAt ? new Date(range.startAt) : new Date('1970-01-01T00:00:00.000Z');
    const end = range.endAt ? new Date(range.endAt) : new Date('9999-12-31T23:59:59.999Z');
    const currency = range.currency || null;
    const entries = this.repos.financialEntries.list(item => {
      const date = new Date(item.occurredAt);
      return date >= start && date <= end && (!range.projectId || item.projectId === range.projectId) && (!currency || item.currency === currency);
    });
    const summary = { expected: 0, received: 0, expense: 0, netReceived: 0, count: entries.length, entries };
    for (const item of entries) {
      if (item.type === 'expected_revenue') summary.expected += item.amount;
      if (item.type === 'received_revenue') summary.received += item.amount;
      if (item.type === 'expense') summary.expense += item.amount;
    }
    summary.netReceived = summary.received - summary.expense;
    return summary;
  }

  cancelEvent(eventId, reason = '') {
    const event = this.repos.calendarEvents.require(eventId);
    if (event.status === 'cancelled') return event;
    return this.repos.calendarEvents.save(updateEntity(event, { status: 'cancelled', cancellationReason: reason }));
  }

  createTask(command) {
    this.repos.projects.require(command.projectId);
    invariant(String(command.title || '').trim(), 'TASK_TITLE_REQUIRED', '任务标题不能为空');
    return this.repos.tasks.create(createEntity('task', {
      projectId: command.projectId,
      planId: command.planId || null,
      planRevisionId: command.planRevisionId || null,
      title: String(command.title).trim(),
      phase: command.phase || '前期',
      status: command.status || 'todo',
      startAt: command.startAt || null,
      dueAt: command.dueAt || null,
      taskType: command.taskType || 'checklist',
      notes: command.notes || '',
    }));
  }

  updateTask(command) {
    const task = this.repos.tasks.require(command.taskId);
    return this.repos.tasks.save(updateEntity(task, command.patch || {}, { expectedVersion: command.expectedVersion }));
  }

  removeTask(taskId) {
    const task = this.repos.tasks.require(taskId);
    this.repos.tasks.remove(taskId);
    return task;
  }
}

function parseDate(value, field) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new AppError('INVALID_DATE', `${field} 不是有效日期`, { field, value });
  return date;
}
function uniqueStrings(values) { return [...new Set((values || []).map(String).filter(Boolean))]; }


function periodRanges(now, timezone) {
  const parts = zonedParts(now, timezone);
  const dayStart = zonedTimeToUtc({ year: parts.year, month: parts.month, day: parts.day }, timezone);
  const nextDay = addLocalDays(parts, 1, timezone);
  const mondayOffset = (parts.weekday + 6) % 7;
  const weekStartParts = shiftYmd(parts, -mondayOffset);
  const weekStart = zonedTimeToUtc(weekStartParts, timezone);
  const nextWeek = zonedTimeToUtc(shiftYmd(weekStartParts, 7), timezone);
  const monthStart = zonedTimeToUtc({ year: parts.year, month: parts.month, day: 1 }, timezone);
  const nextMonthParts = parts.month === 12 ? { year: parts.year + 1, month: 1, day: 1 } : { year: parts.year, month: parts.month + 1, day: 1 };
  const nextMonth = zonedTimeToUtc(nextMonthParts, timezone);
  return {
    today: rangeInclusive(dayStart, nextDay),
    week: rangeInclusive(weekStart, nextWeek),
    month: rangeInclusive(monthStart, nextMonth),
  };
}
function rangeInclusive(start, next) { return { startAt: start.toISOString(), endAt: new Date(next.getTime() - 1).toISOString() }; }
function addLocalDays(parts, amount, timezone) { return zonedTimeToUtc(shiftYmd(parts, amount), timezone); }
function shiftYmd(parts, amount) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + amount));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}
function zonedParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23', weekday: 'short' });
  const values = Object.fromEntries(formatter.formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(values.weekday);
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day), hour: Number(values.hour), minute: Number(values.minute), second: Number(values.second), weekday };
}
function zonedTimeToUtc(parts, timezone) {
  const target = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour || 0, parts.minute || 0, parts.second || 0);
  let candidate = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = zonedParts(new Date(candidate), timezone);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    const correction = target - actualAsUtc;
    candidate += correction;
    if (correction === 0) break;
  }
  return new Date(candidate);
}
