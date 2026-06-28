/** Shared raw-model-reply fixtures for the import pipeline tests. */

const FENCE = '```'

export const RAW_CLEAN = JSON.stringify({
  occurrenceNumber: 'PR25-0098213',
  offenceType: 'Break & enter',
  requestingOfficerName: 'Liam McHugh',
  badgeNumber: '4471',
  requestingPhone: '905-555-0199',
  requestingEmail: 'det.mchugh@peelpolice.ca',
  businessName: "Kim's Convenience",
  locationAddress: '1450 Eglinton Ave W',
  city: 'Mississauga',
  locationContactName: 'Sandeep Gill',
  locationContactPhone: '905-555-0142',
  dvrMakeModel: 'Hikvision DS-7608',
  dvrRetention: '35 days',
  hasVideoMonitor: 'Yes',
  dvrUsername: 'admin',
  dvrPassword: 'Sp1ce2024',
  extractionTimeFrames: [
    { extractionStartTime: '11:45 PM on March 8 2025', extractionEndTime: '1:30 AM on March 9 2025', timePeriodType: 'Actual Time', cameraDetails: 'cameras 3, 4 and 7' },
  ],
})

const MESSY_JSON = JSON.stringify({
  occurrenceNumber: 'PR25-0098213',
  offenceType: 'Break & enter',
  requestingOfficerName: 'Det. Naplioni #2015',
  badgeNumber: '',
  requestingPhone: '(416) 487-7387',
  requestingEmail: 'det.naplioni@yrp.ca',
  businessName: "Kim's Convenience",
  locationAddress: '1450 Eglinton Ave W',
  city: 'Mississauga',
  locationContactName: 'Sandeep Gill',
  locationContactPhone: '4164877387',
  dvrMakeModel: 'Hikvision DS-7608',
  dvrRetention: '35 days',
  hasVideoMonitor: 'true',
  dvrUsername: 'admin',
  dvrPassword: 'Sp1ce2024',
  extractionTimeFrames: [
    { extractionStartTime: '11:45 PM on March 8 2025', extractionEndTime: '1:30 AM on March 9 2025', timePeriodType: 'recorder time', cameraDetails: 'cameras 3, 4 and 7' },
  ],
})

/** Fenced + chatter-wrapped (the kind of reply a small model emits). */
export const RAW_MESSY = `Sure! Here is the extracted data:\n${FENCE}json\n${MESSY_JSON}\n${FENCE}\nLet me know if you need anything else!`

export const RAW_NULLS = JSON.stringify({
  occurrenceNumber: 'N/A',
  offenceType: 'none',
  requestingOfficerName: '-',
  badgeNumber: '',
  requestingPhone: 'N/A',
  requestingEmail: 'none',
  businessName: '',
  locationAddress: 'Not specified',
  city: 'unknown',
  locationContactName: 'n/a',
  locationContactPhone: '-',
  dvrMakeModel: 'none',
  dvrRetention: '',
  hasVideoMonitor: 'unknown',
  dvrUsername: 'N/A',
  dvrPassword: '',
  extractionTimeFrames: [],
})

export const RAW_NO_JSON = 'the model said no'
