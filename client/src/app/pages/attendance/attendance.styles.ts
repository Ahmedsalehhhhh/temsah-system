export const attendanceStyles = `
.field { width:100%; border:1px solid #D1D5DB; border-radius:6px; background:#F9FAFB; color:#1A1A1A; padding:10px; margin-top:5px }
.card { background:#FFFFFF; border:1px solid #E5E7EB; border-radius:8px; padding:20px }
.btn { border:1px solid #D1D5DB; border-radius:6px; padding:9px 16px; color:#1A1A1A }
.btn.primary { background:#D4A017; color:#1A1A1A; border-color:#D4A017 }
.btn:disabled { opacity:.45; cursor:not-allowed }
th,td { padding:12px; text-align:start; border-bottom:1px solid #E5E7EB; vertical-align:top }
.attendance-modal-backdrop { position:fixed; inset:0; z-index:10000; display:grid; place-items:center; padding:16px; background:rgb(0 0 0 / .72); overscroll-behavior:contain }
.attendance-detail-dialog { width:min(900px,calc(100vw - 32px)); max-height:90vh; overflow:auto; border:1px solid #D1D5DB; border-radius:12px; background:#FFFFFF; color:#1A1A1A; padding:24px; box-shadow:0 24px 80px rgb(0 0 0 / .35) }
.detail-dialog-header { position:sticky; top:-24px; z-index:3; display:flex; justify-content:space-between; align-items:center; gap:12px; margin:-24px -24px 16px; padding:16px 24px; background:#FFFFFF; border-bottom:1px solid #E5E7EB }
.detail-close { position:relative; z-index:4; min-width:76px; min-height:48px; touch-action:manipulation; background:#FFFFFF }
.timeline { border-right:2px solid #D1D5DB; padding-right:18px; margin-right:5px }
.timeline li { margin:18px 0; white-space:pre-wrap; overflow-wrap:anywhere }
.work-today-cell { min-width:240px; max-width:420px; white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.7 }
.work-today-box { margin:16px 0; padding:16px; border:1px solid #ead9a8; border-radius:10px; background:#fffbeb }
.work-today-box h3 { font-weight:700; color:#8a6414; margin-bottom:8px }
.work-today-box p { white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.8 }
.shift-list { display:grid; gap:10px; margin-top:14px }
.shift-row { display:flex; flex-wrap:wrap; align-items:center; gap:10px 16px; padding:12px; border:1px solid #E5E7EB; border-radius:8px; background:#F9FAFB }
.shift-row strong { color:#8a6414 }
.shift-row small { margin-inline-start:auto }
.table-shift { white-space:nowrap; margin-bottom:5px }
@media(max-width:700px){.attendance-modal-backdrop{padding:12px}.attendance-detail-dialog{width:100%;max-height:calc(100dvh - 24px);padding:18px}.detail-dialog-header{top:-18px;margin:-18px -18px 14px;padding:14px 18px}.detail-close{min-width:88px;min-height:52px}}
`
