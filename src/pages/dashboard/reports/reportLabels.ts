// labels for report types and statuses, shared by the user's reports page and the admin one

import { ReportStatuses, ReportTypes } from '@/lib/api';


export type ReportTone = 'warning' | 'danger' | 'neutral' | 'brand' | 'success';

export const REPORT_STATUSES: Array<{value: number, label: string, tone: ReportTone}> = [
  {value: ReportStatuses.OPEN, label: 'Open', tone: 'warning'},
  {value: ReportStatuses.RESOLVED, label: 'Resolved', tone: 'success'},
  {value: ReportStatuses.DISMISSED, label: 'Dismissed', tone: 'neutral'},
];

export const REPORT_TYPES: Array<{value: number, label: string, tone: ReportTone}> = [
  {value: ReportTypes.BUG, label: 'Bug', tone: 'brand'},
  {value: ReportTypes.USER, label: 'User', tone: 'danger'},
  {value: ReportTypes.SERVER, label: 'Server', tone: 'warning'},
  {value: ReportTypes.MESSAGE, label: 'Message', tone: 'danger'},
  {value: ReportTypes.TAG, label: 'Tag', tone: 'warning'},
];

export function reportStatusInfo(status: number) {
  return REPORT_STATUSES.find((item) => item.value === status) ?? {value: status, label: `Status ${status}`, tone: 'neutral' as ReportTone};
}

export function reportTypeInfo(type: number) {
  return REPORT_TYPES.find((item) => item.value === type) ?? {value: type, label: `Type ${type}`, tone: 'neutral' as ReportTone};
}

// message reports have the reported message here, other reports have where the report command was used
export function reportJumpUrl(report: {channel_id: string | null, guild_id: string | null, message_id: string | null}): string | null {
  return (report.channel_id && report.message_id)
    ? `https://discord.com/channels/${report.guild_id ?? '@me'}/${report.channel_id}/${report.message_id}`
    : null;
}
