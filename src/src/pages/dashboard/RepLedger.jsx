import { useState, useEffect, useMemo } from 'react'
import {
  getRepCustomers, addRepCustomer, updateRepCustomer, deleteRepCustomer,
  getCompanyEntries, addCompanyEntry, deleteCompanyEntry,
  getCustomerEntries, addCustomerEntry, deleteCustomerEntry,
  getPeerEntries, addPeerEntry, deletePeerEntry,
  getStaff,
} from '../../lib/supabase'
import { fmt, nowStr } from '../../lib/utils'
import { Card, Inp, Sel, Textarea, TealBtn, GhostBtn, RedBtn } from '../../components/ui'

function readAuth() {
  try { return JSON.parse(localStorage.getItem('carehub_auth') || '{}') } catch (e) { return {} }
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(d) {
  if (!d) return ''
  const x = new Date(d)
  if (isNaN(x)) return d
  return x.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })
}

const N = (v) => (isNaN(parseFloat(v)) ? 0 : parseFloat(v))

export default function RepLedger({ brand, showToast }) {
  const auth = readAuth()
  const meStaffId = (auth && auth.staff && auth.staff.id) ? auth.staff.id : null
  const meName = (auth && auth.staff && auth.staff.full_name)
    ? auth.staff.full_name
    : ((auth && auth.brand && auth.brand.owner) ? auth.brand.owner : 'Owner')
  const isOwner = meStaffId === null

  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  const [customers, setCustomers] = useState([])
  const [companyRows, setCompanyRows] = useState([])
  const [customerRows, setCustomerRows] = useState([])
  const [peerRows, setPeerRows] = useState([])
  const [staffList, setStaffList] = useState([])

  // Owner can look at any rep's book; a rep only ever sees their own.
  const [viewStaffId, setViewStaffId] = useState('')

  const [openCustomer, setOpenCustomer] = useState(null)
  const [form, setForm] = useState(null) // { kind: 'customer'|'company'|'customerEntry'|'peer', ...}
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [brand?.id, viewStaffId])

  const scopeStaffId = isOwner ? (viewStaffId || null) : meStaffId

  async function load() {
    if (!brand || !brand.id) return
    setLoading(true)
    try {
      const [cus, comp, cust, peer] = await Promise.all([
        getRepCustomers(brand.id, scopeStaffId),
        getCompanyEntries(brand.id, scopeStaffId),
        getCustomerEntries(brand.id, scopeStaffId),
        getPeerEntries(brand.id, scopeStaffId),
      ])
      setCustomers(cus || [])
      setCompanyRows(comp || [])
      setCustomerRows(cust || [])
      setPeerRows(peer || [])
      if (isOwner && staffList.length === 0) {
        const st = await getStaff(brand.id)
        setStaffList(st || [])
      }
    } catch (e) {
      alert('Could not load your ledger:\n\n' + (e.message || 'Unknown error'))
    }
    setLoading(false)
  }

  // ── the three balances ─────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let collected = 0, remitted = 0, returnedToCompany = 0
    for (const r of companyRows) {
      if (r.entry_type === 'collected') collected += N(r.amount)
      else if (r.entry_type === 'remitted') remitted += N(r.amount)
      else if (r.entry_type === 'returned') returnedToCompany += N(r.amount)
    }
    const owedToCompany = collected - remitted - returnedToCompany

    let supplied = 0, paid = 0, returnedByCustomer = 0, costOfSupplied = 0
    for (const r of customerRows) {
      if (r.entry_type === 'supplied') {
        supplied += N(r.amount)
        costOfSupplied += N(r.unit_cost) * N(r.quantity)
      } else if (r.entry_type === 'payment') paid += N(r.amount)
      else if (r.entry_type === 'returned') returnedByCustomer += N(r.amount)
    }
    const owedByCustomers = supplied - paid - returnedByCustomer

    let borrowed = 0, lent = 0, settled = 0
    for (const r of peerRows) {
      if (r.entry_type === 'borrowed') borrowed += N(r.amount)
      else if (r.entry_type === 'lent') lent += N(r.amount)
      else if (r.entry_type === 'settled') settled += N(r.amount)
    }

    // Margin only counts goods actually sold on, priced above cost.
    const margin = supplied - costOfSupplied

    return {
      collected, remitted, returnedToCompany, owedToCompany,
      supplied, paid, returnedByCustomer, owedByCustomers, costOfSupplied, margin,
      borrowed, lent, settled,
      position: owedByCustomers + paid - collected + remitted, // informational
    }
  }, [companyRows, customerRows, peerRows])

  // per-customer balances
  const customerBalances = useMemo(() => {
    const map = {}
    for (const c of customers) map[c.id] = { customer: c, supplied: 0, paid: 0, returned: 0, entries: [] }
    for (const r of customerRows) {
      if (!map[r.customer_id]) continue
      const b = map[r.customer_id]
      b.entries.push(r)
      if (r.entry_type === 'supplied') b.supplied += N(r.amount)
      else if (r.entry_type === 'payment') b.paid += N(r.amount)
      else if (r.entry_type === 'returned') b.returned += N(r.amount)
    }
    return Object.values(map).map(b => ({ ...b, balance: b.supplied - b.paid - b.returned }))
  }, [customers, customerRows])

  const peerBalances = useMemo(() => {
    const map = {}
    for (const r of peerRows) {
      const key = r.peer_staff_id || r.peer_name || 'unknown'
      if (!map[key]) map[key] = { name: r.peer_name || 'Colleague', borrowed: 0, lent: 0, settled: 0, entries: [] }
      const b = map[key]
      b.entries.push(r)
      if (r.entry_type === 'borrowed') b.borrowed += N(r.amount)
      else if (r.entry_type === 'lent') b.lent += N(r.amount)
      else if (r.entry_type === 'settled') b.settled += N(r.amount)
    }
    return Object.values(map).map(b => ({ ...b, balance: b.borrowed - b.lent - b.settled }))
  }, [peerRows])

  // ── saving ────────────────────────────────────────────────────────────────
  async function save() {
    if (!form) return
    setSaving(true)
    try {
      const base = { business_id: brand.id, staff_id: scopeStaffId }

      if (form.kind === 'customer') {
        if (!form.name || !form.name.trim()) { alert('Give the customer a name.'); setSaving(false); return }
        if (form.id) {
          await updateRepCustomer(form.id, {
            name: form.name.trim(), phone: form.phone || null,
            shop_name: form.shop_name || null, address: form.address || null, note: form.note || null,
          })
        } else {
          await addRepCustomer({
            ...base,
            name: form.name.trim(), phone: form.phone || null,
            shop_name: form.shop_name || null, address: form.address || null, note: form.note || null,
          })
        }
      }

      else if (form.kind === 'company') {
        const qty = N(form.quantity)
        const cost = N(form.unit_cost)
        const amount = form.amount !== '' && form.amount != null ? N(form.amount) : qty * cost
        if (amount <= 0) { alert('Enter an amount.'); setSaving(false); return }
        await addCompanyEntry({
          ...base,
          entry_type: form.entry_type,
          entry_date: form.entry_date || today(),
          product_name: form.product_name || null,
          quantity: qty || null,
          unit: form.unit || null,
          unit_cost: cost || null,
          amount,
          reference: form.reference || null,
          note: form.note || null,
        })
      }

      else if (form.kind === 'customerEntry') {
        if (!form.customer_id) { alert('Pick a customer.'); setSaving(false); return }
        const qty = N(form.quantity)
        const price = N(form.unit_price)
        const amount = form.amount !== '' && form.amount != null ? N(form.amount) : qty * price
        if (amount <= 0) { alert('Enter an amount.'); setSaving(false); return }
        await addCustomerEntry({
          ...base,
          customer_id: form.customer_id,
          entry_type: form.entry_type,
          entry_date: form.entry_date || today(),
          product_name: form.product_name || null,
          quantity: qty || null,
          unit: form.unit || null,
          unit_price: price || null,
          unit_cost: N(form.unit_cost) || null,
          amount,
          due_date: form.due_date || null,
          note: form.note || null,
        })
      }

      else if (form.kind === 'peer') {
        const amount = N(form.amount)
        if (amount <= 0) { alert('Enter an amount.'); setSaving(false); return }
        await addPeerEntry({
          ...base,
          peer_staff_id: form.peer_staff_id || null,
          peer_name: form.peer_name || null,
          entry_type: form.entry_type,
          entry_date: form.entry_date || today(),
          product_name: form.product_name || null,
          quantity: N(form.quantity) || null,
          unit: form.unit || null,
          amount,
          note: form.note || null,
        })
      }

      if (showToast) showToast('Saved')
      setForm(null)
      load()
    } catch (e) {
      alert('Could not save:\n\n' + (e.message || 'Unknown error'))
    }
    setSaving(false)
  }

  async function removeRow(kind, id) {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return
    try {
      if (kind === 'company') await deleteCompanyEntry(id)
      else if (kind === 'customerEntry') await deleteCustomerEntry(id)
      else if (kind === 'peer') await deletePeerEntry(id)
      else if (kind === 'customer') await deleteRepCustomer(id)
      if (showToast) showToast('Deleted')
      load()
    } catch (e) {
      alert('Could not delete:\n\n' + (e.message || 'Unknown error'))
    }
  }

  // ── printing ──────────────────────────────────────────────────────────────
  function printStatement(title, subtitle, rows, columns, summary) {
    const w = window.open('', '_blank', 'width=800,height=900')
    if (!w) { alert('Your browser blocked the print window. Allow pop-ups for this site.'); return }
    const head = columns.map(c => '<th>' + c.label + '</th>').join('')
    const body = rows.map(r =>
      '<tr>' + columns.map(c => '<td' + (c.right ? ' class="r"' : '') + '>' + (c.get(r) == null ? '' : String(c.get(r))) + '</td>').join('') + '</tr>'
    ).join('')
    const sumRows = (summary || []).map(s =>
      '<div class="sumrow"><span>' + s.label + '</span><span class="' + (s.strong ? 'strong' : '') + '">' + s.value + '</span></div>'
    ).join('')

    w.document.write('<!DOCTYPE html><html><head><title>' + title + '</title><style>' +
      '*{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif}' +
      'body{padding:28px;color:#0f172a}' +
      'h1{font-size:19px;margin-bottom:2px}' +
      '.sub{font-size:12px;color:#64748b;margin-bottom:2px}' +
      '.biz{font-size:13px;font-weight:800;color:#0f766e;margin-bottom:14px}' +
      'table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}' +
      'th{background:#0f172a;color:#fff;text-align:left;padding:7px 9px;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em}' +
      'td{padding:7px 9px;border-bottom:1px solid #e2e8f0}' +
      'td.r,th.r{text-align:right}' +
      '.sum{margin-top:16px;border-top:2px solid #0f172a;padding-top:10px;max-width:320px;margin-left:auto}' +
      '.sumrow{display:flex;justify-content:space-between;font-size:12.5px;padding:3px 0}' +
      '.strong{font-weight:900;font-size:14px}' +
      '.foot{margin-top:26px;font-size:10.5px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px}' +
      '</style></head><body>' +
      '<div class="biz">' + (brand?.name || 'CareHub') + '</div>' +
      '<h1>' + title + '</h1>' +
      '<div class="sub">' + subtitle + '</div>' +
      '<div class="sub">Printed ' + nowStr() + '</div>' +
      '<table><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>' +
      '<div class="sum">' + sumRows + '</div>' +
      '<div class="foot">Generated by CareHub — this statement reflects entries recorded up to the print date.</div>' +
      '</body></html>')
    w.document.close()
    setTimeout(() => { w.focus(); w.print() }, 400)
  }

  function printCustomer(b) {
    printStatement(
      'Customer statement — ' + b.customer.name,
      (b.customer.shop_name ? b.customer.shop_name + ' · ' : '') + (b.customer.phone || '') + '   ·   Rep: ' + meName,
      [...b.entries].sort((x, y) => (x.entry_date || '').localeCompare(y.entry_date || '')),
      [
        { label: 'Date', get: r => fmtDate(r.entry_date) },
        { label: 'Detail', get: r => r.entry_type === 'payment' ? 'Payment received' : (r.product_name || (r.entry_type === 'returned' ? 'Goods returned' : 'Goods supplied')) },
        { label: 'Qty', get: r => r.quantity ? r.quantity + ' ' + (r.unit || '') : '' },
        { label: 'Supplied', right: true, get: r => r.entry_type === 'supplied' ? fmt(N(r.amount)) : '' },
        { label: 'Paid', right: true, get: r => r.entry_type === 'payment' ? fmt(N(r.amount)) : '' },
        { label: 'Returned', right: true, get: r => r.entry_type === 'returned' ? fmt(N(r.amount)) : '' },
      ],
      [
        { label: 'Total supplied', value: fmt(b.supplied) },
        { label: 'Total paid', value: fmt(b.paid) },
        { label: 'Returned', value: fmt(b.returned) },
        { label: b.balance >= 0 ? 'Balance owing' : 'Overpaid', value: fmt(Math.abs(b.balance)), strong: true },
      ]
    )
  }

  function printCompany() {
    printStatement(
      'Company account statement',
      'Rep: ' + meName,
      [...companyRows].sort((x, y) => (x.entry_date || '').localeCompare(y.entry_date || '')),
      [
        { label: 'Date', get: r => fmtDate(r.entry_date) },
        { label: 'Detail', get: r => r.product_name || (r.entry_type === 'remitted' ? 'Payment to company' : r.entry_type === 'returned' ? 'Goods returned' : 'Goods collected') },
        { label: 'Qty', get: r => r.quantity ? r.quantity + ' ' + (r.unit || '') : '' },
        { label: 'Ref', get: r => r.reference || '' },
        { label: 'Collected', right: true, get: r => r.entry_type === 'collected' ? fmt(N(r.amount)) : '' },
        { label: 'Remitted', right: true, get: r => r.entry_type === 'remitted' ? fmt(N(r.amount)) : '' },
        { label: 'Returned', right: true, get: r => r.entry_type === 'returned' ? fmt(N(r.amount)) : '' },
      ],
      [
        { label: 'Goods collected', value: fmt(totals.collected) },
        { label: 'Money remitted', value: fmt(totals.remitted) },
        { label: 'Goods returned', value: fmt(totals.returnedToCompany) },
        { label: totals.owedToCompany >= 0 ? 'You owe the company' : 'Company owes you', value: fmt(Math.abs(totals.owedToCompany)), strong: true },
      ]
    )
  }

  // ── small UI pieces ───────────────────────────────────────────────────────
  const money = (v, color) => (
    <span style={{ fontWeight: '900', color: color || '#0f172a' }}>{fmt(v)}</span>
  )

  function StatCard({ label, value, sub, tone }) {
    const tones = {
      red: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
      green: { bg: '#f0fdf4', border: '#bbf7d0', text: '#059669' },
      teal: { bg: '#f0fdfa', border: '#ccfbf1', text: '#0f766e' },
      plain: { bg: 'white', border: '#e5e7eb', text: '#0f172a' },
    }
    const t = tones[tone] || tones.plain
    return (
      <div style={{ background: t.bg, border: '1px solid ' + t.border, borderRadius: '14px', padding: '14px' }}>
        <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: '21px', fontWeight: '900', color: t.text, marginTop: '4px' }}>{fmt(value)}</div>
        {sub && <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>{sub}</div>}
      </div>
    )
  }

  const TABS = [
    ['overview', 'Overview'],
    ['company', 'Company'],
    ['customers', 'Customers'],
    ['peers', 'Colleagues'],
  ]

  if (loading) return <div style={{ padding: '24px', color: '#888', fontSize: '13px' }}>Loading your ledger…</div>

  return (
    <div style={{ padding: '24px', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>My Account Book</div>
          <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>
            What you owe the company, what customers owe you, and what you have lent colleagues.
          </div>
        </div>
        {isOwner && (
          <select value={viewStaffId} onChange={e => setViewStaffId(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12.5px', background: 'white' }}>
            <option value=''>Whole company</option>
            {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        )}
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {TABS.map(([k, label]) => {
          const on = tab === k
          return (
            <button key={k} onClick={() => setTab(k)}
              style={{ fontSize: '12.5px', fontWeight: '800', padding: '9px 16px', borderRadius: '10px', cursor: 'pointer',
                border: on ? '1px solid #0f172a' : '1px solid #e2e8f0',
                background: on ? '#0f172a' : 'white', color: on ? 'white' : '#64748b' }}>
              {label}
            </button>
          )
        })}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '12px', marginBottom: '16px' }}>
            <StatCard label='You owe the company' value={Math.abs(totals.owedToCompany)}
              tone={totals.owedToCompany > 0 ? 'red' : 'green'}
              sub={totals.owedToCompany > 0 ? 'Goods collected, not yet paid for' : 'You are clear'} />
            <StatCard label='Customers owe you' value={totals.owedByCustomers} tone='teal'
              sub={customerBalances.filter(b => b.balance > 0).length + ' customer(s) owing'} />
            <StatCard label='Your margin so far' value={totals.margin}
              tone={totals.margin >= 0 ? 'green' : 'red'}
              sub='Selling price minus what you paid' />
          </div>

          <Card style={{ padding: '16px', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '10px' }}>WHERE YOU STAND</div>
            {[
              ['Goods collected from company', totals.collected, '#0f172a'],
              ['Money remitted to company', totals.remitted, '#059669'],
              ['Goods returned to company', totals.returnedToCompany, '#059669'],
              ['— Balance with company', totals.owedToCompany, totals.owedToCompany > 0 ? '#dc2626' : '#059669'],
              ['Goods supplied to customers', totals.supplied, '#0f172a'],
              ['Payments received', totals.paid, '#059669'],
              ['— Balance customers owe you', totals.owedByCustomers, '#0f766e'],
            ].map(([label, val, color], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0',
                borderBottom: '1px solid #f1f5f9',
                fontWeight: String(label).startsWith('—') ? '800' : '500' }}>
                <span style={{ fontSize: '13px', color: '#475569' }}>{String(label).replace('— ', '')}</span>
                {money(val, color)}
              </div>
            ))}
            <div style={{ marginTop: '12px' }}>
              <GhostBtn onClick={printCompany} style={{ width: '100%', padding: '11px' }}>Print company statement</GhostBtn>
            </div>
          </Card>

          {peerBalances.length > 0 && (
            <Card style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '10px' }}>WITH COLLEAGUES</div>
              {peerBalances.map((b, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '13px', color: '#475569' }}>{b.name}</span>
                  {b.balance > 0
                    ? <span style={{ fontSize: '13px', fontWeight: '800', color: '#dc2626' }}>You owe {fmt(b.balance)}</span>
                    : b.balance < 0
                      ? <span style={{ fontSize: '13px', fontWeight: '800', color: '#059669' }}>Owes you {fmt(Math.abs(b.balance))}</span>
                      : <span style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8' }}>Settled</span>}
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {/* ── COMPANY ── */}
      {tab === 'company' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <TealBtn onClick={() => setForm({ kind: 'company', entry_type: 'collected', entry_date: today() })}>+ Goods collected</TealBtn>
            <GhostBtn onClick={() => setForm({ kind: 'company', entry_type: 'remitted', entry_date: today() })} style={{ padding: '10px 14px' }}>+ Money paid in</GhostBtn>
            <GhostBtn onClick={() => setForm({ kind: 'company', entry_type: 'returned', entry_date: today() })} style={{ padding: '10px 14px' }}>+ Goods returned</GhostBtn>
            <GhostBtn onClick={printCompany} style={{ padding: '10px 14px' }}>Print</GhostBtn>
          </div>

          <Card style={{ padding: '14px', marginBottom: '14px', background: totals.owedToCompany > 0 ? '#fef2f2' : '#f0fdf4' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b' }}>
              {totals.owedToCompany > 0 ? 'YOU ARE HOLDING' : 'YOU ARE CLEAR'}
            </div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: totals.owedToCompany > 0 ? '#dc2626' : '#059669', marginTop: '3px' }}>
              {fmt(Math.abs(totals.owedToCompany))}
            </div>
          </Card>

          {companyRows.length === 0 && <Card style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Nothing recorded yet.</Card>}

          {companyRows.map(r => (
            <Card key={r.id} style={{ padding: '13px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                    {r.product_name || (r.entry_type === 'remitted' ? 'Payment to company' : r.entry_type === 'returned' ? 'Goods returned' : 'Goods collected')}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                    {fmtDate(r.entry_date)}
                    {r.quantity ? ' · ' + r.quantity + ' ' + (r.unit || '') : ''}
                    {r.reference ? ' · ' + r.reference : ''}
                  </div>
                  {r.note && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>{r.note}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '900', color: r.entry_type === 'collected' ? '#dc2626' : '#059669' }}>
                    {r.entry_type === 'collected' ? '+' : '−'}{fmt(N(r.amount))}
                  </div>
                  <button onClick={() => removeRow('company', r.id)}
                    style={{ marginTop: '4px', background: 'none', border: 'none', color: '#cbd5e1', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── CUSTOMERS ── */}
      {tab === 'customers' && !openCustomer && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <TealBtn onClick={() => setForm({ kind: 'customer' })}>+ New customer</TealBtn>
            <GhostBtn onClick={() => setForm({ kind: 'customerEntry', entry_type: 'supplied', entry_date: today() })} style={{ padding: '10px 14px' }}>+ Goods supplied</GhostBtn>
            <GhostBtn onClick={() => setForm({ kind: 'customerEntry', entry_type: 'payment', entry_date: today() })} style={{ padding: '10px 14px' }}>+ Payment received</GhostBtn>
          </div>

          {customers.length === 0 && (
            <Card style={{ padding: '28px', textAlign: 'center' }}>
              <div style={{ fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>No customers yet</div>
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '14px' }}>
                Add each shop or person you supply, then record what they take and what they pay.
              </div>
              <TealBtn onClick={() => setForm({ kind: 'customer' })}>+ New customer</TealBtn>
            </Card>
          )}

          {customerBalances
            .sort((a, b) => b.balance - a.balance)
            .map(b => (
              <Card key={b.customer.id} style={{ padding: '14px', marginBottom: '8px', cursor: 'pointer' }}
                onClick={() => setOpenCustomer(b.customer.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{b.customer.name}</div>
                    <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                      {b.customer.shop_name ? b.customer.shop_name : ''}
                      {b.customer.phone ? (b.customer.shop_name ? ' · ' : '') + b.customer.phone : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '3px' }}>{b.entries.length} entr{b.entries.length === 1 ? 'y' : 'ies'} ›</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>
                      {b.balance > 0 ? 'Owes you' : b.balance < 0 ? 'Overpaid' : 'Settled'}
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: '900', color: b.balance > 0 ? '#dc2626' : '#059669' }}>
                      {fmt(Math.abs(b.balance))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* ── ONE CUSTOMER ── */}
      {tab === 'customers' && openCustomer && (() => {
        const b = customerBalances.filter(x => x.customer.id === openCustomer)[0]
        if (!b) return null
        return (
          <div>
            <button onClick={() => setOpenCustomer(null)}
              style={{ background: 'none', border: 'none', color: '#0f766e', fontSize: '13px', fontWeight: '700', cursor: 'pointer', padding: 0, marginBottom: '12px' }}>
              ← All customers
            </button>

            <Card style={{ padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>{b.customer.name}</div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '3px' }}>
                {b.customer.shop_name || ''}{b.customer.shop_name && b.customer.phone ? ' · ' : ''}{b.customer.phone || ''}
              </div>
              {b.customer.address && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{b.customer.address}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '14px' }}>
                <div><div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: '800' }}>SUPPLIED</div><div style={{ fontSize: '14px', fontWeight: '900' }}>{fmt(b.supplied)}</div></div>
                <div><div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: '800' }}>PAID</div><div style={{ fontSize: '14px', fontWeight: '900', color: '#059669' }}>{fmt(b.paid)}</div></div>
                <div><div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: '800' }}>BALANCE</div><div style={{ fontSize: '14px', fontWeight: '900', color: b.balance > 0 ? '#dc2626' : '#059669' }}>{fmt(Math.abs(b.balance))}</div></div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                <TealBtn onClick={() => setForm({ kind: 'customerEntry', entry_type: 'supplied', customer_id: b.customer.id, entry_date: today() })} style={{ flex: 1, padding: '11px' }}>+ Supplied</TealBtn>
                <GhostBtn onClick={() => setForm({ kind: 'customerEntry', entry_type: 'payment', customer_id: b.customer.id, entry_date: today() })} style={{ flex: 1, padding: '11px' }}>+ Payment</GhostBtn>
                <GhostBtn onClick={() => printCustomer(b)} style={{ flex: 1, padding: '11px' }}>Print</GhostBtn>
              </div>
              <button onClick={() => setForm({ kind: 'customer', ...b.customer })}
                style={{ marginTop: '10px', background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', fontWeight: '700', cursor: 'pointer', padding: 0 }}>
                Edit customer details
              </button>
            </Card>

            {b.entries.length === 0 && <Card style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Nothing recorded for this customer yet.</Card>}

            {b.entries.map(r => (
              <Card key={r.id} style={{ padding: '13px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                      {r.entry_type === 'payment' ? 'Payment received' : (r.product_name || (r.entry_type === 'returned' ? 'Goods returned' : 'Goods supplied'))}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                      {fmtDate(r.entry_date)}
                      {r.quantity ? ' · ' + r.quantity + ' ' + (r.unit || '') : ''}
                      {r.due_date ? ' · due ' + fmtDate(r.due_date) : ''}
                    </div>
                    {r.note && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>{r.note}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: r.entry_type === 'supplied' ? '#dc2626' : '#059669' }}>
                      {r.entry_type === 'supplied' ? '+' : '−'}{fmt(N(r.amount))}
                    </div>
                    <button onClick={() => removeRow('customerEntry', r.id)}
                      style={{ marginTop: '4px', background: 'none', border: 'none', color: '#cbd5e1', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      })()}

      {/* ── PEERS ── */}
      {tab === 'peers' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <TealBtn onClick={() => setForm({ kind: 'peer', entry_type: 'borrowed', entry_date: today() })}>+ I collected from a colleague</TealBtn>
            <GhostBtn onClick={() => setForm({ kind: 'peer', entry_type: 'lent', entry_date: today() })} style={{ padding: '10px 14px' }}>+ I gave to a colleague</GhostBtn>
            <GhostBtn onClick={() => setForm({ kind: 'peer', entry_type: 'settled', entry_date: today() })} style={{ padding: '10px 14px' }}>+ Settled up</GhostBtn>
          </div>

          {peerRows.length === 0 && (
            <Card style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              Nothing recorded. Use this when you borrow goods from another rep, or give them some of yours.
            </Card>
          )}

          {peerBalances.map((b, i) => (
            <Card key={i} style={{ padding: '14px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{b.name}</span>
                <span style={{ fontSize: '14px', fontWeight: '900', color: b.balance > 0 ? '#dc2626' : b.balance < 0 ? '#059669' : '#94a3b8' }}>
                  {b.balance > 0 ? 'You owe ' + fmt(b.balance) : b.balance < 0 ? 'Owes you ' + fmt(Math.abs(b.balance)) : 'Settled'}
                </span>
              </div>
              {b.entries.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {fmtDate(r.entry_date)} · {r.entry_type === 'borrowed' ? 'collected' : r.entry_type === 'lent' ? 'gave' : 'settled'}
                    {r.product_name ? ' · ' + r.product_name : ''}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: '800' }}>{fmt(N(r.amount))}</span>
                    <button onClick={() => removeRow('peer', r.id)}
                      style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                  </span>
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}

      {/* ── FORM SHEET ── */}
      {form && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '560px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '16px 16px 0 0', padding: '20px' }}>
            <div style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', marginBottom: '14px' }}>
              {form.kind === 'customer' ? (form.id ? 'Edit customer' : 'New customer')
                : form.kind === 'company' ? (form.entry_type === 'collected' ? 'Goods collected from company' : form.entry_type === 'remitted' ? 'Money paid to company' : 'Goods returned to company')
                : form.kind === 'customerEntry' ? (form.entry_type === 'supplied' ? 'Goods supplied to customer' : form.entry_type === 'payment' ? 'Payment received' : 'Goods returned by customer')
                : (form.entry_type === 'borrowed' ? 'Collected from a colleague' : form.entry_type === 'lent' ? 'Gave to a colleague' : 'Settled up with a colleague')}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {form.kind === 'customer' && (
                <>
                  <Inp label='Customer name *' value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder='e.g. Mama Blessing' />
                  <Inp label='Shop / business name' value={form.shop_name} onChange={v => setForm({ ...form, shop_name: v })} placeholder='e.g. Blessing Chemist' />
                  <Inp label='Phone' value={form.phone} onChange={v => setForm({ ...form, phone: v })} placeholder='080…' />
                  <Inp label='Address' value={form.address} onChange={v => setForm({ ...form, address: v })} placeholder='Where the shop is' />
                  <Textarea label='Note' value={form.note} onChange={v => setForm({ ...form, note: v })} rows={2} placeholder='Anything worth remembering' />
                </>
              )}

              {form.kind === 'company' && (
                <>
                  <Inp label='Date' value={form.entry_date} onChange={v => setForm({ ...form, entry_date: v })} type='date' />
                  {form.entry_type !== 'remitted' && (
                    <>
                      <Inp label='Product' value={form.product_name} onChange={v => setForm({ ...form, product_name: v })} placeholder='What did you collect?' />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <Inp label='Quantity' value={form.quantity} onChange={v => setForm({ ...form, quantity: v })} type='number' placeholder='0' />
                        <Inp label='Unit' value={form.unit} onChange={v => setForm({ ...form, unit: v })} placeholder='carton, pack…' />
                      </div>
                      <Inp label='Company price per unit (₦)' value={form.unit_cost} onChange={v => setForm({ ...form, unit_cost: v })} type='number' placeholder='0' />
                    </>
                  )}
                  <Inp label={'Total amount (₦)' + (form.entry_type !== 'remitted' ? ' — leave blank to calculate' : '')}
                    value={form.amount} onChange={v => setForm({ ...form, amount: v })} type='number'
                    placeholder={form.quantity && form.unit_cost ? String(N(form.quantity) * N(form.unit_cost)) : '0'} />
                  <Inp label='Reference / invoice no.' value={form.reference} onChange={v => setForm({ ...form, reference: v })} placeholder='Optional' />
                  <Textarea label='Note' value={form.note} onChange={v => setForm({ ...form, note: v })} rows={2} />
                </>
              )}

              {form.kind === 'customerEntry' && (
                <>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Customer *</div>
                    <select value={form.customer_id || ''} onChange={e => setForm({ ...form, customer_id: e.target.value })}
                      style={{ width: '100%', padding: '11px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', background: 'white' }}>
                      <option value=''>Choose…</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.shop_name ? ' — ' + c.shop_name : ''}</option>)}
                    </select>
                  </div>
                  <Inp label='Date' value={form.entry_date} onChange={v => setForm({ ...form, entry_date: v })} type='date' />
                  {form.entry_type !== 'payment' && (
                    <>
                      <Inp label='Product' value={form.product_name} onChange={v => setForm({ ...form, product_name: v })} placeholder='What did you give them?' />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <Inp label='Quantity' value={form.quantity} onChange={v => setForm({ ...form, quantity: v })} type='number' placeholder='0' />
                        <Inp label='Unit' value={form.unit} onChange={v => setForm({ ...form, unit: v })} placeholder='carton, pack…' />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <Inp label='Your selling price / unit' value={form.unit_price} onChange={v => setForm({ ...form, unit_price: v })} type='number' placeholder='0' />
                        <Inp label='What it cost you / unit' value={form.unit_cost} onChange={v => setForm({ ...form, unit_cost: v })} type='number' placeholder='0' />
                      </div>
                      <Inp label='Balance due by' value={form.due_date} onChange={v => setForm({ ...form, due_date: v })} type='date' />
                    </>
                  )}
                  <Inp label={'Total amount (₦)' + (form.entry_type !== 'payment' ? ' — leave blank to calculate' : '')}
                    value={form.amount} onChange={v => setForm({ ...form, amount: v })} type='number'
                    placeholder={form.quantity && form.unit_price ? String(N(form.quantity) * N(form.unit_price)) : '0'} />
                  <Textarea label='Note' value={form.note} onChange={v => setForm({ ...form, note: v })} rows={2} />
                </>
              )}

              {form.kind === 'peer' && (
                <>
                  <Inp label='Colleague name *' value={form.peer_name} onChange={v => setForm({ ...form, peer_name: v })} placeholder='Who?' />
                  <Inp label='Date' value={form.entry_date} onChange={v => setForm({ ...form, entry_date: v })} type='date' />
                  <Inp label='Product' value={form.product_name} onChange={v => setForm({ ...form, product_name: v })} placeholder='What was it?' />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <Inp label='Quantity' value={form.quantity} onChange={v => setForm({ ...form, quantity: v })} type='number' placeholder='0' />
                    <Inp label='Unit' value={form.unit} onChange={v => setForm({ ...form, unit: v })} placeholder='carton, pack…' />
                  </div>
                  <Inp label='Value (₦) *' value={form.amount} onChange={v => setForm({ ...form, amount: v })} type='number' placeholder='0' />
                  <Textarea label='Note' value={form.note} onChange={v => setForm({ ...form, note: v })} rows={2} />
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <GhostBtn onClick={() => setForm(null)} style={{ flex: 1, padding: '13px' }}>Cancel</GhostBtn>
              <TealBtn onClick={save} style={{ flex: 2, padding: '13px' }}>{saving ? 'Saving…' : 'Save'}</TealBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
