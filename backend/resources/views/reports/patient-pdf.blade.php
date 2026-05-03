<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Patient Record — Niger State HMIS</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #222; background: #fff; }
  .header { text-align: center; padding: 18px 0 14px; border-bottom: 2.5px solid #0d6b55; margin-bottom: 18px; }
  .header h1 { font-size: 20px; color: #0d6b55; letter-spacing: .5px; }
  .header .sub { font-size: 11px; color: #555; margin-top: 4px; }
  .header .generated { font-size: 10px; color: #888; margin-top: 3px; }
  .section { margin-bottom: 16px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #0d6b55; border-bottom: 1px solid #d8eeeb; padding-bottom: 4px; margin-bottom: 8px; }
  table.detail { width: 100%; border-collapse: collapse; }
  table.detail td { padding: 5px 8px; vertical-align: top; font-size: 11.5px; border-bottom: 1px solid #f0f0f0; }
  table.detail td.label { width: 38%; font-weight: 600; color: #444; white-space: nowrap; }
  table.detail td.value { color: #222; }
  table.encounters { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11px; }
  table.encounters th { background: #0d6b55; color: #fff; padding: 5px 7px; text-align: left; font-size: 10.5px; }
  table.encounters td { padding: 5px 7px; border-bottom: 1px solid #e8e8e8; }
  table.encounters tr:nth-child(even) td { background: #f7faf9; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .badge-synced { background: #d4edda; color: #155724; }
  .badge-pending { background: #fff3cd; color: #856404; }
  .badge-failed { background: #f8d7da; color: #721c24; }
  .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 9.5px; color: #888; padding: 8px; border-top: 1px solid #e0e0e0; background: #fff; }
  .page-break { page-break-after: always; }
  .empty { font-size: 11px; color: #aaa; font-style: italic; }
</style>
</head>
<body>

<div class="header">
  <h1>Niger State HMIS Outreach</h1>
  <div class="sub">Patient Record</div>
  <div class="generated">Generated: {{ $generatedAt }}</div>
</div>

<div class="section">
  <div class="section-title">Patient Identity</div>
  <table class="detail">
    <tr><td class="label">Reference</td><td class="value">{{ strtoupper(str_replace('-','',substr($patient->uuid,0,6))) }}</td></tr>
    <tr><td class="label">Full Name</td><td class="value">{{ trim(implode(' ', array_filter([$patient->first_name, $patient->middle_name, $patient->last_name]))) ?: 'Anonymized / Not Provided' }}</td></tr>
    <tr><td class="label">UUID</td><td class="value" style="font-size:10px;color:#888;">{{ $patient->uuid }}</td></tr>
  </table>
</div>

<div class="section">
  <div class="section-title">Demographics</div>
  <table class="detail">
    <tr><td class="label">Sex</td><td class="value">{{ ucfirst($patient->sex ?? '—') }}</td></tr>
    <tr><td class="label">Date of Birth</td><td class="value">{{ $patient->date_of_birth ? $patient->date_of_birth->format('d M Y') : '—' }}</td></tr>
    <tr><td class="label">Estimated Age</td><td class="value">{{ $patient->estimated_age_years ? $patient->estimated_age_years.' years' : '—' }}</td></tr>
    <tr><td class="label">Age Estimated</td><td class="value">{{ $patient->is_estimated_age ? 'Yes' : 'No' }}</td></tr>
  </table>
</div>

<div class="section">
  <div class="section-title">Contact Information</div>
  <table class="detail">
    <tr><td class="label">Phone Number</td><td class="value">{{ $patient->phone_number ?? '—' }}</td></tr>
    <tr><td class="label">Address</td><td class="value">{{ $patient->address_line ?? '—' }}</td></tr>
  </table>
</div>

<div class="section">
  <div class="section-title">Location & Facility</div>
  <table class="detail">
    <tr><td class="label">LGA</td><td class="value">{{ $patient->lga->name ?? '—' }}</td></tr>
    <tr><td class="label">Ward</td><td class="value">{{ $patient->ward->name ?? '—' }}</td></tr>
    <tr><td class="label">Primary Facility</td><td class="value">{{ $patient->primaryFacility->name ?? '—' }}{{ $patient->primaryFacility?->type ? ' ('.$patient->primaryFacility->type.')' : '' }}</td></tr>
  </table>
</div>

<div class="section">
  <div class="section-title">Program Information</div>
  <table class="detail">
    <tr><td class="label">NHIS Status</td><td class="value">{{ ucfirst($patient->nhis_status ?? '—') }}</td></tr>
    <tr><td class="label">Consent Confirmed</td><td class="value">—</td></tr>
    <tr><td class="label">Enrollment Date</td><td class="value">{{ $patient->created_at?->format('d M Y') ?? '—' }}</td></tr>
    <tr><td class="label">Created By</td><td class="value">{{ $patient->creator->name ?? '—' }}</td></tr>
    <tr>
      <td class="label">Sync Status</td>
      <td class="value">
        <span class="badge badge-{{ $patient->sync_status }}">{{ strtoupper($patient->sync_status ?? '—') }}</span>
      </td>
    </tr>
    <tr><td class="label">Synced At</td><td class="value">{{ $patient->synced_at?->format('d M Y H:i') ?? '—' }}</td></tr>
  </table>
</div>

@if($patient->encounters->isNotEmpty())
<div class="section">
  <div class="section-title">Encounter History ({{ $patient->encounters->count() }})</div>
  <table class="encounters">
    <thead>
      <tr>
        <th>Ref</th>
        <th>Type</th>
        <th>Date</th>
        <th>Data Clerk</th>
        <th>Sync</th>
      </tr>
    </thead>
    <tbody>
      @foreach($patient->encounters as $enc)
      <tr>
        <td>{{ strtoupper(str_replace('-','',substr($enc->uuid,0,6))) }}</td>
        <td>{{ $enc->encounter_type ?? '—' }}</td>
        <td>{{ $enc->encounter_date ? \Carbon\Carbon::parse($enc->encounter_date)->format('d M Y') : '—' }}</td>
        <td>{{ $enc->creator->name ?? '—' }}</td>
        <td>{{ strtoupper($enc->sync_status ?? '—') }}</td>
      </tr>
      @endforeach
    </tbody>
  </table>
</div>
@endif

<div class="footer">Niger State HMIS Outreach &nbsp;|&nbsp; Confidential &nbsp;|&nbsp; Generated {{ $generatedAt }}</div>
</body>
</html>
