<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Encounter Record — Niger State HMIS</title>
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
  table.ref-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11px; }
  table.ref-table th { background: #0d6b55; color: #fff; padding: 5px 7px; text-align: left; font-size: 10.5px; }
  table.ref-table td { padding: 5px 7px; border-bottom: 1px solid #e8e8e8; }
  .findings-block { background: #f7faf9; border: 1px solid #d8eeeb; border-radius: 4px; padding: 10px 12px; font-size: 11px; }
  .findings-block .finding-row { display: flex; margin-bottom: 5px; }
  .findings-block .finding-key { font-weight: 600; color: #555; min-width: 180px; }
  .findings-block .finding-val { color: #222; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .badge-synced { background: #d4edda; color: #155724; }
  .badge-pending { background: #fff3cd; color: #856404; }
  .badge-failed { background: #f8d7da; color: #721c24; }
  .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 9.5px; color: #888; padding: 8px; border-top: 1px solid #e0e0e0; background: #fff; }
</style>
</head>
<body>

<div class="header">
  <h1>Niger State HMIS Outreach</h1>
  <div class="sub">Encounter Record</div>
  <div class="generated">Generated: {{ $generatedAt }}</div>
</div>

<div class="section">
  <div class="section-title">Encounter Metadata</div>
  <table class="detail">
    <tr><td class="label">Reference</td><td class="value">{{ strtoupper(str_replace('-','',substr($encounter->uuid,0,6))) }}</td></tr>
    <tr><td class="label">UUID</td><td class="value" style="font-size:10px;color:#888;">{{ $encounter->uuid }}</td></tr>
    <tr><td class="label">Encounter Type</td><td class="value">{{ ucfirst($encounter->encounter_type ?? '—') }}</td></tr>
    <tr><td class="label">Service Point</td><td class="value">{{ $encounter->service_point ?? '—' }}</td></tr>
    <tr><td class="label">Encounter Date</td><td class="value">{{ $encounter->encounter_date ? \Carbon\Carbon::parse($encounter->encounter_date)->format('d M Y') : '—' }}</td></tr>
    <tr><td class="label">Version</td><td class="value">{{ $encounter->version_stamp ?? 1 }}</td></tr>
  </table>
</div>

<div class="section">
  <div class="section-title">Patient Summary</div>
  <table class="detail">
    @php $p = $encounter->patient; @endphp
    <tr><td class="label">Patient Name</td><td class="value">{{ trim(implode(' ', array_filter([$p->first_name ?? null, $p->middle_name ?? null, $p->last_name ?? null]))) ?: 'Anonymized' }}</td></tr>
    <tr><td class="label">Patient UUID</td><td class="value" style="font-size:10px;color:#888;">{{ $p->uuid ?? '—' }}</td></tr>
    <tr><td class="label">Sex</td><td class="value">{{ ucfirst($p->sex ?? '—') }}</td></tr>
    <tr><td class="label">Age</td><td class="value">{{ $p->estimated_age_years ? $p->estimated_age_years.' years' : '—' }}</td></tr>
    <tr><td class="label">NHIS Status</td><td class="value">{{ ucfirst($p->nhis_status ?? '—') }}</td></tr>
  </table>
</div>

<div class="section">
  <div class="section-title">Location</div>
  <table class="detail">
    <tr><td class="label">LGA</td><td class="value">{{ $encounter->lga->name ?? '—' }}</td></tr>
    <tr><td class="label">Ward</td><td class="value">{{ $encounter->ward->name ?? '—' }}</td></tr>
  </table>
</div>

@if($encounter->findings)
<div class="section">
  <div class="section-title">Clinical Information & Services</div>
  @php
    $labelMap = [
      'presenting_complaint' => 'Presenting Complaint',
      'symptoms' => 'Symptoms',
      'disease_program_category' => 'Disease / Program',
      'preliminary_diagnosis' => 'Preliminary Diagnosis',
      'services_provided' => 'Services Provided',
      'drugs_commodities_issued' => 'Drugs / Commodities Issued',
      'health_education' => 'Health Education',
      'service_notes' => 'Service Notes',
      'outcome_status' => 'Outcome',
      'referral_required' => 'Referral Required',
    ];
    $findings = is_array($encounter->findings) ? $encounter->findings : json_decode($encounter->findings, true) ?? [];
  @endphp
  <table class="detail">
    @foreach($labelMap as $key => $label)
      @if(isset($findings[$key]) && $findings[$key] !== '' && $findings[$key] !== null)
      <tr>
        <td class="label">{{ $label }}</td>
        <td class="value">
          @if(is_bool($findings[$key])){{ $findings[$key] ? 'Yes' : 'No' }}
          @elseif(is_array($findings[$key])){{ implode(', ', $findings[$key]) }}
          @else{{ $findings[$key] }}
          @endif
        </td>
      </tr>
      @endif
    @endforeach
  </table>
</div>
@endif

@if($encounter->notes)
<div class="section">
  <div class="section-title">Notes</div>
  <p style="font-size:11.5px;line-height:1.5;padding:8px;background:#f9f9f9;border-left:3px solid #0d6b55;">{{ $encounter->notes }}</p>
</div>
@endif

<div class="section">
  <div class="section-title">Capture & Sync</div>
  <table class="detail">
    <tr><td class="label">Captured By</td><td class="value">{{ $encounter->creator->name ?? '—' }}</td></tr>
    <tr><td class="label">Sync Status</td><td class="value"><span class="badge badge-{{ $encounter->sync_status }}">{{ strtoupper($encounter->sync_status ?? '—') }}</span></td></tr>
    <tr><td class="label">Synced At</td><td class="value">{{ $encounter->synced_at ? \Carbon\Carbon::parse($encounter->synced_at)->format('d M Y H:i') : '—' }}</td></tr>
  </table>
</div>

@if($encounter->referrals->isNotEmpty())
<div class="section">
  <div class="section-title">Referral Information</div>
  <table class="ref-table">
    <thead>
      <tr>
        <th>Ref</th>
        <th>Facility</th>
        <th>Urgency</th>
        <th>Status</th>
        <th>Reason</th>
      </tr>
    </thead>
    <tbody>
      @foreach($encounter->referrals as $ref)
      <tr>
        <td>{{ strtoupper(str_replace('-','',substr($ref->uuid,0,6))) }}</td>
        <td>{{ $ref->referred_to_facility ?? '—' }}</td>
        <td>{{ ucfirst($ref->urgency ?? '—') }}</td>
        <td>{{ ucfirst($ref->workflow_status ?? '—') }}</td>
        <td>{{ $ref->referral_reason ?? '—' }}</td>
      </tr>
      @endforeach
    </tbody>
  </table>
</div>
@endif

<div class="footer">Niger State HMIS Outreach &nbsp;|&nbsp; Confidential &nbsp;|&nbsp; Generated {{ $generatedAt }}</div>
</body>
</html>
