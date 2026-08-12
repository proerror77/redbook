'use strict';

function summarizeDaily(events = []) {
  const summary = {
    date: new Date().toISOString().slice(0, 10),
    applied: 0,
    communicated: 0,
    replied: 0,
    interviewInvites: 0,
    conversionRate: 0,
  };
  for (const event of events) {
    if (!event || !event.type) continue;
    if (event.type === 'application_updated') {
      const status = event.payload?.status || '';
      if (status === 'applied') summary.applied += 1;
      if (status === 'communicated') summary.communicated += 1;
      if (status === 'replied') summary.replied += 1;
    }
    if (event.type === 'message_classified' && event.payload?.category === 'interview') {
      summary.interviewInvites += 1;
    }
  }
  if (summary.applied > 0) {
    summary.conversionRate = summary.interviewInvites / summary.applied;
  }
  return summary;
}

function buildFeishuBaseRecord(summary) {
  return {
    date: summary.date,
    applied: summary.applied,
    communicated: summary.communicated,
    replied: summary.replied,
    interviewInvites: summary.interviewInvites,
    conversionRate: Number(summary.conversionRate.toFixed(3)),
  };
}

module.exports = { summarizeDaily, buildFeishuBaseRecord };
