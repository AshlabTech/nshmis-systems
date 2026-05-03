<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Referral Record — Niger State HMIS</title>
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
  .reason-block { background: #f7faf9; border: 1px solid #d8eeeb; border-radius: 4px; padding: 10px 12px; font-size: 11.5px; line-height: 1.5; margin-top: 6px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .badge-pending    { background: #fff3cd; color: #856404; }
  .badge-completed  { background: #d4edda; color: #155724; }
  .badge-active     { background: #cce5ff; color: #004085; }
  .badge-cancelled  { background: #f8d7da; color: #721c24; }
  .badge-high       { background: #f8d7da; color: #721c24; }
  .badge-critical   { background: #f5c6cb; color: #491217; font-weight: 900; }
  .badge-medium     { background: #fff3cd; color: #856404; }
  .badge-low        { background: #d4edda; color: #155724; }
  .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 9.5px; color: #888; padding: 8px; border-top: 1px solid #e0e0e0; background: #fff; }
</style>
</head>
<body>

<div class="header">
  <h1>Niger State HMIS Outreach</h1>
  <div class="sub">Referral Record</div>
  <div class="generated">Generated: {{ $generatedAt }}</div>
</div>

<div class="section">
  <div class="section-title">Patient Summary</div>
  <table class="detail">
    @php $p = $referral->patient; @endphp
    <tr><td class="label">Patient Name</td><td class="value">{{ trim(implode(' ', array_filter([$p->first_name ?? null, $p->middle_name ?? null, $p->last_name ?? null]))) ?: 'Anonymized' }}</td></tr>
    <tr><td class="label">Patient UUID</td><td class="value" style="font-size:10px;color:#888;">{{ $p->uuid ?? '—' }}</td></tr>
    <tr><td class="label">Sex</td><td class="value">{{ ucfirst($p->sex ?? '—') }}</td></tr>
    <tr><td class="label">Age</td><td class="value">{{ $p->estimated_age_years ? $p->estimated_age_years.' years' : '—' }}</td></tr>
    <tr><td class="label">NHIS Status</td><td class="value">{{ ucfirst($p->nhis_status ?? '—') }}</td></tr>
    <tr><td class="label">LGA</td><td class="value">{{ $referral->lga->name ?? '—' }}</td></tr>
    <tr><td class="label">Ward</td><td class="value">{{ $referral->ward->name ?? '—' }}</td></tr>
  </table>
</div>

<div class="section">
  <div class="section-title">Encounter Summary</div>
  <table class="detail">
    @if($referral->encounter)
    <tr><td class="label">Encounter Ref</td><td class="value">{{ strtoupper(str_replace('-','',substr($referral->encounter->uuid,0,6))) }}</td></tr>
    <tr><td class="label">Encounter Date</td><td class="value">{{ $referral->encounter->encounter_date ? \Carbon\Carbon::parse($referral->encounter->encounter_date)->format('d M Y') : '—' }}</td></tr>
    @else
    <tr><td colspan="2" style="color:#aaa;font-style:italic;padding:6px 8px;">No linked encounter</td></tr>
    @endif
  </table>
</div>

<div class="section">
  <div class="section-title">Referral Details</div>
  <table class="detail">
    <tr><td class="label">Referral Ref</td><td class="value">{{ strtoupper(str_replace('-','',substr($referral->uuid,0,6))) }}</td></tr>
    <tr><td class="label">Referred To Facility</td><td class="value">{{ $referral->referred_to_facility ?? '—' }}</td></tr>
    <tr>
      <td class="label">Urgency</td>
      <td class="value"><span class="badge badge-{{ strtolower($referral->urgency ?? 'low') }}">{{ strtoupper($referral->urgency ?? '—') }}</span></td>
    </tr>
    <tr>
      <td class="label">Referral Status</td>
      <td class="value"><span class="badge badge-{{ strtolower($referral->status ?? 'active') }}">{{ strtoupper($referral->status ?? '—') }}</span></td>
    </tr>
    <tr>
      <td class="label">Workflow Status</td>
      <td class="value"><span class="badge badge-{{ strtolower($referral->workflow_status ?? 'pending') }}">{{ strtoupper($referral->workflow_status ?? '—') }}</span></td>
    </tr>
    <tr><td class="label">Follow-up Date</td><td class="value">{{ $referral->follow_up_date ? \Carbon\Carbon::parse($referral->follow_up_date)->format('d M Y') : '—' }}</td></tr>
    <tr><td class="label">Completed Date</td><td class="value">{{ $referral->completed_at ? \Carbon\Carbon::parse($referral->completed_at)->format('d M Y H:i') : '—' }}</td></tr>
    <tr><td class="label">Completed By</td><td class="value">{{ $referral->completed_by ?? '—' }}</td></tr>
  </table>
</div>

@if($referral->referral_reason)
<div class="section">
  <div class="section-title">Referral Reason</div>
  <div class="reason-block">{{ $referral->referral_reason }}</div>
</div>
@endif

<div class="section">
  <div class="section-title">Capture & Sync</div>
  <table class="detail">
    <tr><td class="label">Created By</td><td class="value">{{ $referral->creator->name ?? '—' }}</td></tr>
    <tr><td class="label">Created At</td><td class="value">{{ $referral->created_at?->format('d M Y H:i') ?? '—' }}</td></tr>
    <tr><td class="label">Sync Status</td><td class="value"><span class="badge badge-{{ strtolower(str_replace('_','-',$referral->sync_status ?? 'pending')) }}">{{ strtoupper($referral->sync_status ?? '—') }}</span></td></tr>
    <tr><td class="label">Synced At</td><td class="value">{{ $referral->synced_at ? \Carbon\Carbon::parse($referral->synced_at)->format('d M Y H:i') : '—' }}</td></tr>
  </table>
</div>

<div class="footer">Niger State HMIS Outreach &nbsp;|&nbsp; Confidential &nbsp;|&nbsp; Generated {{ $generatedAt }}</div>
</body>
</html>
