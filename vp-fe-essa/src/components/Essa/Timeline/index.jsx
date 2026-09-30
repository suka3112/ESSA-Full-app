import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight, Archive, Building2, CheckCircle2, ChevronLeft, ChevronRight, ChevronsUpDown,
  CircleDollarSign, ClipboardList, Command, CloudUpload, FileText, Filter, Loader2,
  MessageSquare, Pencil, Receipt, Search, Send, ShieldCheck, Sparkles,
  UserCheck, Users, Wallet, Workflow, XCircle,
} from 'lucide-react';

import { connect } from 'react-redux';
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton, SkeletonCard } from '../ui/Skeleton';
import { usePoBasedInvoices } from 'hooks/usePoBasedInvoices';
import { usePoBasedInvoice } from 'hooks/usePoBasedInvoice';
import { useEssaInvoices } from 'hooks/useEssaInvoices';
import { useEssaInvoice } from 'hooks/useEssaInvoice';
import { fmtMoney, fmtDate, fmtDateOnly, NON_PO_LABEL } from 'api/essaDashboard';
import { SAP_TIMELINE_STEPS, getSapWorkflowCompletedStepIndex } from '../lib/invoiceWorkflowStatus';
import { normalizeTimelineEvents, parseTimelineDate } from '../lib/timelineEvents';
import { cn } from '../lib/cn';
import { INVOICE_DETAIL, PO_MATCHING } from 'constants/url';
import '../../../assets/scss/essa/dashboard.scss';

const BRAND = 'var(--brand-primary-color, var(--dx-primary-600))';
const BRAND_LIGHT = 'var(--brand-primary-color-light, rgba(13, 166, 234, 0.1))';
const BRAND_SECONDARY = 'var(--brand-secondary-color, var(--dx-primary-700))';

function getInvoiceDetailPath(userType, inv) {
  const id = inv?.id ?? (inv?.rawId != null ? `po-${inv.rawId}` : '')
  return `/${userType}${INVOICE_DETAIL.replace(':id', encodeURIComponent(id))}`
}

const EVENT_META = {
  uploaded:           { icon: CloudUpload,    label: 'Invoice uploaded',              tone: 'neutral' },
  ocr_completed:      { icon: Sparkles,       label: 'OCR extraction completed',     tone: 'neutral' },
  validation_done:    { icon: ShieldCheck,    label: 'Validated',                   tone: 'success' },
  matching_done:      { icon: Workflow,       label: 'PO matching completed',        tone: 'neutral' },
  pending_approval: { icon: Users,          label: 'Approval workflow',           tone: 'info' },
  approval_requested: { icon: Users,          label: 'Approval workflow',           tone: 'info' },
  parked_to_sap:       { icon: Archive,        label: 'Invoice parked to SAP',         tone: 'info' },
  approved:           { icon: CheckCircle2,   label: 'Approved',                    tone: 'success' },
  rejected:           { icon: XCircle,        label: 'Rejected',                    tone: 'danger' },
  posted:             { icon: Send,           label: 'Invoice posted to SAP',        tone: 'success' },
  paid:               { icon: CircleDollarSign, label: 'Invoice paid',                tone: 'success' },
  manual_correction:  { icon: Pencil,         label: 'Manual correction',            tone: 'warn' },
  exception:          { icon: XCircle,        label: 'Exception',                    tone: 'warn' },
};

const STEPPER_ICONS = {
  validated: ShieldCheck,
  approved: CheckCircle2,
  parked: Archive,
  posted: Send,
  paid: CircleDollarSign,
};

const TONE_COLORS = {
  neutral: { bg: 'var(--dx-g-100)',         fg: 'var(--dx-text)'       },
  info:    { bg: BRAND_LIGHT,             fg: BRAND_SECONDARY },
  success: { bg: 'var(--dx-success-50)',    fg: 'var(--dx-success-700)' },
  warn:    { bg: 'var(--dx-warn-50)',       fg: 'var(--dx-warn-700)'    },
  danger:  { bg: 'var(--dx-error-50)',      fg: 'var(--dx-error-700)'   },
};

function EssaTimeline({ userInfo: { userType } }) {
  const { data: poRows = [], isLoading: poLoading } = usePoBasedInvoices();
  const { data: essaRows = [], isLoading: essaLoading } = useEssaInvoices({});
  const listLoading = poLoading || essaLoading;

  const invoices = useMemo(() => {
    const essaNormalized = (essaRows || []).map((row) => ({
      ...row,
      listSource: 'essa',
      rawId: row.id
    }));
    return [...poRows, ...essaNormalized].sort((a, b) => {
      const aTime = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
      const bTime = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [poRows, essaRows]);

  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');

  const isPoSelection = String(selectedId || '').startsWith('po-');

  useEffect(() => {
    if (invoices.length && !selectedId) setSelectedId(invoices[0].id);
  }, [invoices, selectedId]);

  const { data: poDetail, isLoading: poDetailLoading } = usePoBasedInvoice(
    isPoSelection ? selectedId : null
  );
  const { data: essaDetail, isLoading: essaDetailLoading } = useEssaInvoice(
    !isPoSelection && selectedId ? selectedId : null
  );
  const detail = isPoSelection ? poDetail : essaDetail;
  const detailLoading = isPoSelection ? poDetailLoading : essaDetailLoading;

  // Day-grouped events
  const timelineEvents = useMemo(
    () => normalizeTimelineEvents(detail?.timeline, detail?.uploaded_at),
    [detail?.timeline, detail?.uploaded_at]
  );
  const grouped = useMemo(() => groupByDay(timelineEvents), [timelineEvents]);
  const filtered = useMemo(() => {
    if (!query.trim()) return grouped;
    const q = query.toLowerCase();
    return grouped
      .map(([day, evs]) => [day, evs.filter(e =>
        (e.message || '').toLowerCase().includes(q) ||
        (e.actor_name || '').toLowerCase().includes(q) ||
        (EVENT_META[e.event_type]?.label || '').toLowerCase().includes(q)
      )])
      .filter(([_, evs]) => evs.length > 0);
  }, [grouped, query]);

  const idx = invoices.findIndex(i => i.id === selectedId);
  const isSwitchingInvoice = Boolean(
    selectedId && (detailLoading || (detail && detail.id !== selectedId))
  );
  const displayInv = useMemo(() => {
    if (detail?.id === selectedId) return detail;
    return invoices.find((i) => i.id === selectedId) || detail;
  }, [detail, selectedId, invoices]);

  const goto = (delta) => {
    if (idx < 0 || !invoices.length || isSwitchingInvoice) return;
    const next = invoices[(idx + delta + invoices.length) % invoices.length];
    if (next) setSelectedId(next.id);
  };

  return (
    <LeftPageContainer>
      <div className="essa-dashboard">
        <div className="dx-page dx-stack">
          {listLoading && !invoices.length ? (
            <EmptyState icon="clock-history" title="Loading invoices…" description="Picking an invoice for you." />
          ) : !invoices.length ? (
            <EmptyState icon="clock-history" title="No invoices yet" description="Invoices will appear here once uploaded or seeded for demo." />
          ) : !displayInv && !detail ? (
            <EmptyState icon="clock-history" title="Invoice not found" description="Could not load the selected invoice." />
          ) : (
            <>
              <HeroStrip
                inv={displayInv}
                position={idx + 1}
                total={invoices.length}
                invoices={invoices}
                userType={userType}
                navLoading={isSwitchingInvoice}
                onSelect={setSelectedId}
                onPrev={() => goto(-1)}
                onNext={() => goto(+1)}
              />

              {isSwitchingInvoice ? (
                <>
                  <Skeleton style={{ height: 72, borderRadius: 14 }} />
                  <div className="dx-grid-5-7">
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                </>
              ) : detail ? (
                <>
              <ProcessStepper inv={detail} events={timelineEvents} />

              <div className="dx-grid-5-7">
                <ProfileCard inv={detail} userType={userType} />

                <div className="dx-stack-sm">
                  <Toolbar query={query} setQuery={setQuery} count={timelineEvents.length} />
                  <Card style={{ padding: '16px 18px' }}>
                    {filtered.length === 0 ? (
                      <EmptyState
                        icon="search"
                        title="No matching events"
                        description={query ? `Nothing matches "${query}"` : 'No events yet.'}
                      />
                    ) : (
                      <div className="dx-stack" style={{ gap: 20 }}>
                        {filtered.map(([day, events], gi) => (
                          <DayBlock
                            key={day.iso}
                            day={day}
                            events={events}
                            userType={userType}
                            isLast={gi === filtered.length - 1}
                          />
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
                </>
              ) : (
                <EmptyState
                  icon="clock-history"
                  title="Could not load invoice"
                  description="Try another invoice from the list."
                />
              )}
            </>
          )}
        </div>
      </div>
    </LeftPageContainer>
  );
}

/* ─── HERO with searchable invoice switcher ─────────────── */
function NavIconButton({ children, loading = false, disabled, title, onClick }) {
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      title={title}
      style={{
        width: 32,
        height: 32,
        border: 'none',
        borderRadius: 999,
        background: loading ? BRAND_LIGHT : 'transparent',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        color: loading ? BRAND : 'var(--dx-text-soft)',
        display: 'grid',
        placeItems: 'center',
        opacity: disabled && !loading ? 0.45 : 1,
        transition: 'background .15s ease, color .15s ease, opacity .15s ease',
      }}
      onMouseEnter={(e) => {
        if (isDisabled) return;
        e.currentTarget.style.background = loading ? BRAND_LIGHT : 'var(--dx-bg)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = loading ? BRAND_LIGHT : 'transparent';
      }}
    >
      {loading ? <Loader2 size={15} className="dx-spin" /> : children}
    </button>
  );
}

function HeroStrip({ inv, position, total, invoices, userType, navLoading = false, onSelect, onPrev, onNext }) {
  const detailPath = getInvoiceDetailPath(userType, inv);
  const [open, setOpen] = useState(false);

  // ⌘K / Ctrl+K opens the switcher; Esc closes; arrow keys cycle when closed
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      } else if (!open && !navLoading && (e.key === 'j' || e.key === 'ArrowDown')) {
        // Only when not focused in an input
        if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
        onNext();
      } else if (!open && !navLoading && (e.key === 'k' || e.key === 'ArrowUp')) {
        if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
        onPrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onNext, onPrev, navLoading]);

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap'
        }}
      >
        <div
          className="text-xs text-muted"
          style={{
            letterSpacing: 0.4,
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 600
          }}
        >
          <FileText size={11} />
          Invoice timeline
        </div>

        <button
          onClick={() => setOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--dx-text)',
            letterSpacing: '-0.4px',
            lineHeight: 1.2,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 10,
            transition: 'background .15s ease',
            fontFamily: 'inherit',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--dx-bg)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
          title="Click to switch invoice (⌘K)"
        >
          {inv.invoice_no || '—'}
          {navLoading ? (
            <Loader2 size={15} className="dx-spin" style={{ color: BRAND }} />
          ) : (
            <ChevronsUpDown size={15} style={{ color: 'var(--dx-text-mute)' }} />
          )}
        </button>

        <span
          style={{
            fontSize: 13,
            color: 'var(--dx-text-soft)',
            fontWeight: 500,
            flexShrink: 0,
            maxWidth: 280,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={inv.vendor_name || ''}
        >
          {inv.vendor_name || '—'}
        </span>

        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0
          }}
        >
          <button
            onClick={() => setOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid var(--dx-border)',
              background: 'var(--dx-card)',
              color: 'var(--dx-text-soft)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              font: 'inherit',
              fontFamily: 'inherit',
              transition: 'all .15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = BRAND
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--dx-border)'
            }}
            title="Browse all invoices (⌘K)"
          >
            <Search size={12} />
            <span>Browse</span>
            <kbd
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                padding: '1px 6px',
                borderRadius: 4,
                fontSize: 10,
                background: 'var(--dx-bg)',
                color: 'var(--dx-text-mute)',
                border: '1px solid var(--dx-border)',
                fontFamily: 'inherit'
              }}
            >
              ⌘K
            </kbd>
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px',
              borderRadius: 999,
              background: 'var(--dx-card)',
              border: '1px solid var(--dx-border)'
            }}
          >
            <NavIconButton
              onClick={onPrev}
              disabled={navLoading}
              title="Previous (K / ↑)"
            >
              <ChevronLeft size={15} />
            </NavIconButton>
            <span
              style={{
                fontSize: 11,
                color: 'var(--dx-text-soft)',
                fontVariantNumeric: 'tabular-nums',
                padding: '0 6px',
                fontWeight: 500,
                minWidth: 50,
                textAlign: 'center',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}
            >
              {navLoading ? (
                <>
                  <Loader2 size={11} className="dx-spin" style={{ color: BRAND }} />
                  <span style={{ color: BRAND }}>…</span>
                </>
              ) : (
                `${position} / ${total}`
              )}
            </span>
            <NavIconButton
              onClick={onNext}
              disabled={navLoading}
              title="Next (J / ↓)"
              loading={navLoading}
            >
              <ChevronRight size={15} />
            </NavIconButton>
          </div>

          <Link to={detailPath}>
            <Button variant="primary" size="sm">
              <Pencil size={13} /> Open detail
            </Button>
          </Link>
        </div>
      </div>

      <InvoiceSwitcher
        open={open}
        onClose={() => setOpen(false)}
        invoices={invoices}
        selectedId={inv.id}
        onSelect={(id) => {
          onSelect(id)
          setOpen(false)
        }}
      />
    </div>
  )
}

/* ─── Searchable invoice command palette ─── */
function InvoiceSwitcher({ open, onClose, invoices, selectedId, onSelect }) {
  const [q, setQ] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Reset query + highlight + focus input on open
  useEffect(() => {
    if (open) {
      setQ('');
      setHighlight(Math.max(0, invoices.findIndex(i => i.id === selectedId)));
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, invoices, selectedId]);

  // Filter
  const filtered = useMemo(() => {
    if (!q.trim()) return invoices;
    const needle = q.toLowerCase();
    return invoices.filter(i =>
      (i.invoice_no || '').toLowerCase().includes(needle) ||
      (i.vendor_name || '').toLowerCase().includes(needle) ||
      (i.po_number || '').toLowerCase().includes(needle)
    );
  }, [q, invoices]);

  // Scroll highlighted into view
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(`[data-row="${highlight}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = filtered[highlight];
      if (pick) onSelect(pick.id);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 999,
              background: 'rgba(21, 25, 43, .45)', backdropFilter: 'blur(4px)',
            }}
          />
          {/* Popover */}
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed', top: 100, left: '50%', transform: 'translateX(-50%)',
              width: 'min(640px, 92vw)', maxHeight: '70vh', zIndex: 1000,
              background: 'var(--dx-card)', borderRadius: 16,
              boxShadow: 'var(--dx-shadow-lg)', border: '1px solid var(--dx-border)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            {/* Search row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 18px', borderBottom: '1px solid var(--dx-border-soft)',
            }}>
              <Search size={16} style={{ color: 'var(--dx-text-mute)' }} />
              <input
                ref={inputRef}
                placeholder="Search invoice no., vendor, or PO…"
                value={q}
                onChange={(e) => { setQ(e.target.value); setHighlight(0); }}
                onKeyDown={onKeyDown}
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 15, color: 'var(--dx-text)', fontFamily: 'inherit',
                }}
              />
              <kbd style={{
                padding: '2px 7px', borderRadius: 4, fontSize: 10,
                background: 'var(--dx-bg)', color: 'var(--dx-text-mute)',
                border: '1px solid var(--dx-border)',
              }}>esc</kbd>
            </div>

            {/* List */}
            <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '6px 6px' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--dx-text-mute)', fontSize: 13 }}>
                  No invoices match "<strong style={{ color: 'var(--dx-text)' }}>{q}</strong>"
                </div>
              ) : (
                filtered.map((i, idx) => (
                  <div
                    key={i.id}
                    data-row={idx}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => onSelect(i.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                      background: idx === highlight ? BRAND_LIGHT : 'transparent',
                    }}
                  >
                    {/* Vendor avatar */}
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: i.id === selectedId ? BRAND : 'var(--dx-bg)',
                      color: i.id === selectedId ? '#fff' : 'var(--dx-text-soft)',
                      display: 'grid', placeItems: 'center',
                      fontWeight: 700, fontSize: 11, letterSpacing: 0.3, flexShrink: 0,
                    }}>
                      {(i.vendor_name || '?').replace(/^PT\s+/i, '').split(/\s+/).map(s => s[0]).filter(Boolean).slice(0,2).join('').toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: 13, fontWeight: 600, color: 'var(--dx-text)',
                      }}>
                        <span style={{
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200,
                        }}>{i.invoice_no || '—'}</span>
                        {i.id === selectedId && (
                          <span style={{
                            fontSize: 10, padding: '1px 6px', borderRadius: 999,
                            background: BRAND_LIGHT, color: BRAND_SECONDARY, fontWeight: 600,
                          }}>current</span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 12, color: 'var(--dx-text-mute)', marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {i.vendor_name || '—'} {i.po_number ? `· PO ${i.po_number}` : ''}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--dx-text)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtMoney(i.total_amount, i.currency)}
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <Badge tone={i.overall} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer hints */}
            <div style={{
              padding: '10px 18px', borderTop: '1px solid var(--dx-border-soft)',
              display: 'flex', justifyContent: 'space-between',
              fontSize: 11, color: 'var(--dx-text-mute)',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
                <span><Kbd>↵</Kbd> select</span>
                <span><Kbd>esc</Kbd> close</span>
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{filtered.length} of {invoices.length}</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Kbd({ children }) {
  return (
    <kbd style={{
      display: 'inline-block', minWidth: 18, padding: '1px 5px', borderRadius: 4,
      background: 'var(--dx-bg)', color: 'var(--dx-text-soft)',
      border: '1px solid var(--dx-border)', fontSize: 10, fontFamily: 'inherit',
      textAlign: 'center', marginRight: 3,
    }}>{children}</kbd>
  );
}

/* ─── PROCESS STEPPER (SAP lifecycle) ───────────────────── */
function ProcessStepper({ inv, events = [] }) {
  const hasEvent = (type) => events.some((e) => e.event_type === type)
  const completedIdx = getSapWorkflowCompletedStepIndex(inv)
  const rejected = String(inv?.overall || '').toLowerCase() === 'rejected' || inv?.status === 'rejected'

  const steps = SAP_TIMELINE_STEPS.map((s, i) => ({
    ...s,
    icon: [STEPPER_ICONS.validated, STEPPER_ICONS.approved, STEPPER_ICONS.parked, STEPPER_ICONS.posted, STEPPER_ICONS.paid][i],
    done: !rejected && (i <= completedIdx || hasEvent(s.eventType)),
    current: !rejected && i === completedIdx + 1,
  }))

  return (
    <Card style={{ padding: '14px 16px', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative', minWidth: 720 }}>
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isLast = i === steps.length - 1;
          const ringColor = rejected && i === completedIdx + 1
            ? 'var(--dx-error-500)'
            : s.done
              ? BRAND
              : 'var(--dx-border)';
          const bg = s.done ? BRAND : 'var(--dx-card)';
          const fg = s.done ? '#fff' : 'var(--dx-text-mute)';
          return (
            <div key={s.key} style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, maxWidth: 120 }}>
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: bg, color: fg,
                    border: `1.5px solid ${ringColor}`,
                    display: 'grid', placeItems: 'center',
                    boxShadow: s.current ? `0 0 0 4px ${BRAND_LIGHT}` : 'none',
                  }}
                >
                  <Icon size={15} />
                </motion.div>
                <div style={{
                  fontSize: 10, marginTop: 8, fontWeight: 500,
                  color: s.done ? 'var(--dx-text)' : 'var(--dx-text-mute)',
                  textAlign: 'center',
                  lineHeight: 1.25,
                  maxWidth: 108,
                }}>{s.label}</div>
              </div>
              {!isLast && (
                <div style={{
                  flex: 1, height: 2, margin: '0 8px 22px',
                  background: s.done && steps[i + 1]?.done ? BRAND : 'var(--dx-border)',
                  transition: 'background .3s ease',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ─── PROFILE CARD (left column) ─────────────────────────── */
function ProfileCard({ inv, userType }) {
  const detailPath = getInvoiceDetailPath(userType, inv);
  const vendorInitials = (inv.vendor_name || '?')
    .replace(/^PT\s+/i, '').split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const checks = inv.validation?.checks || [];
  const failed = checks.filter(c => c.status === 'fail').length;
  const warned = checks.filter(c => c.status === 'warn').length;
  const passed = checks.filter((c) => c.status === 'pass' || c.status === 'na').length

  return (
    <Card style={{ position: 'sticky', top: 88, overflow: 'hidden' }}>
      {/* Decorative top strip */}
      <div style={{
        height: 70,
        background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_SECONDARY} 100%)`,
        position: 'relative',
      }}>
        <DotPattern />
      </div>

      <div style={{ padding: '0 16px 16px', marginTop: -32, position: 'relative' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: '#fff', border: '1px solid var(--dx-border)',
          boxShadow: 'var(--dx-shadow-sm)',
          display: 'grid', placeItems: 'center',
          color: BRAND, fontWeight: 700, fontSize: 18,
        }}>
          {vendorInitials}
        </div>

        <h2 style={{
          fontSize: 17, fontWeight: 600, color: 'var(--dx-text)',
          margin: '14px 0 4px', lineHeight: 1.3, wordBreak: 'break-word',
        }} title={inv.vendor_name || ''}>
          {inv.vendor_name || '—'}
        </h2>
        <div className="text-xs text-muted" title={inv.invoice_no || ''}>
          Invoice ID: <strong style={{ color: 'var(--dx-text)' }}>{inv.invoice_no || '—'}</strong>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Link to={detailPath} style={{ flex: 1 }}>
            <button className="dx-btn dx-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <Send size={13} /> Open detail
            </button>
          </Link>
        </div>

        {/* Sectioned info */}
        <Section icon={Receipt} title="Invoice details">
          <Field icon="hash"      label="Invoice no.">{inv.invoice_no || '—'}</Field>
          <Field icon="calendar"  label="Date">{fmtDateOnly(inv.invoice_date)}</Field>
          <Field icon="hash"      label="PO number">{inv.po_number || <span className="text-muted">{NON_PO_LABEL}</span>}</Field>
          <Field icon="money"     label="Subtotal">{fmtMoney(inv.subtotal, inv.currency)}</Field>
          <Field icon="money"     label="VAT">{fmtMoney(inv.vat_amount, inv.currency)}</Field>
          <Field icon="money"     label="Total" highlight>{fmtMoney(inv.total_amount, inv.currency)}</Field>
        </Section>

        <Section icon={Building2} title="Vendor">
          <Field label="Code">{inv.vendor_code || '—'}</Field>
          <Field label="Bank">{inv.bank_name || '—'}</Field>
          <Field label="Account">{inv.bank_account || '—'}</Field>
        </Section>

        <Section icon={ShieldCheck} title="Validation">
          <Field label="Outcome"><Badge tone={inv.overall} /></Field>
          <Field label="Workflow"><Badge tone={inv.status} /></Field>
          <Field label="Passed"><span className="text-success fw-600">{passed}</span></Field>
          <Field label="Warnings"><span className="text-warning fw-600">{warned}</span></Field>
          <Field label="Failed"><span className="text-danger fw-600">{failed}</span></Field>
        </Section>

        {/* Add-note input */}
        <div style={{ marginTop: 18 }}>
          <div className="dx-info-label" style={{ marginBottom: 6 }}>Add note</div>
          <div style={{
            border: '1px solid var(--dx-border)', borderRadius: 12, padding: '4px 4px 4px 12px',
            display: 'flex', alignItems: 'center', gap: 8, background: '#fff',
          }}>
            <input
              placeholder="Write a note for this invoice…"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent' }}
            />
            <button className="dx-icon-btn" style={{ width: 32, height: 32, background: BRAND, color: '#fff', border: 'none' }}>
              <Send size={13} />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div style={{
      marginTop: 22, paddingTop: 18,
      borderTop: '1px solid var(--dx-border-soft)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon size={14} style={{ color: 'var(--dx-text-soft)' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dx-text)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}

function Field({ label, children, highlight, icon }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
      <span style={{ color: 'var(--dx-text-soft)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {label}
      </span>
      <span style={{
        color: 'var(--dx-text)',
        fontWeight: highlight ? 700 : 500,
        fontVariantNumeric: 'tabular-nums',
        maxWidth: '60%',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textAlign: 'right',
      }}>{children}</span>
    </div>
  );
}

/* ─── TOOLBAR ─────────────────────────────────────────────── */
function Toolbar({ query, setQuery, count }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <div style={{
        flex: 1, minWidth: 220,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', borderRadius: 999,
        background: 'var(--dx-card)', border: '1px solid var(--dx-border)',
      }}>
        <Search size={14} style={{ color: 'var(--dx-text-mute)' }} />
        <input
          placeholder="Search in timeline…"
          value={query} onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, color: 'var(--dx-text)', fontFamily: 'inherit',
          }}
        />
        <span className="text-xs text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{count} events</span>
      </div>
      <button className="dx-btn dx-btn-ghost"><Filter size={13} /> Filter</button>
      <button className="dx-btn dx-btn-ghost"><MessageSquare size={13} /> Add note</button>
    </div>
  );
}

/* ─── DAY BLOCK (left calendar marker + events) ───────────── */
function DayBlock({ day, events, userType, isLast }) {
  const tonePriority = ['rejected', 'posted', 'paid', 'parked_to_sap', 'validation_done', 'approved'];
  const primary = events.find((e) => tonePriority.includes(e.event_type));
  const tone = primary
    ? (primary.event_type === 'rejected'
      ? 'danger'
      : ['posted', 'paid', 'validation_done', 'approved'].includes(primary.event_type)
        ? 'success'
        : 'info')
    : 'neutral';
  const colors = TONE_COLORS[tone];

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {/* Calendar block + vertical connector */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 54, padding: '6px 0 8px',
          borderRadius: 12, textAlign: 'center',
          background: colors.bg, color: colors.fg,
          border: `1px solid ${tone === 'neutral' ? 'var(--dx-border)' : 'transparent'}`,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, opacity: 0.7 }}>
            {day.weekday}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
            {day.dayNum}
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.7, marginTop: 1 }}>
            {day.monthShort}
          </div>
        </div>
        {!isLast && (
          <div style={{ flex: 1, width: 2, background: 'var(--dx-border)', minHeight: 24, marginTop: 8 }} />
        )}
      </div>

      {/* Events column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: isLast ? 0 : 16 }}>
        {events.map((e, i) => (
          <motion.div
            key={e.id || i}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <EventRow event={e} userType={userType} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── EVENT ROW (right of day block) ──────────────────────── */
function EventRow({ event, userType }) {
  const meta = EVENT_META[event.event_type] || { icon: Sparkles, label: event.event_type, tone: 'neutral' };
  const Icon = meta.icon;
  const metaJson = event.metadata && typeof event.metadata === 'object' ? event.metadata : null;
  const time = getEventDisplayTime(event);
  const showActor = Boolean(event.actor_name) && event.actor_name !== 'System';

  return (
    <div className={cn('dx-timeline-event', `dx-timeline-event--${meta.tone}`)}>
      <div className="dx-timeline-event__icon">
        <Icon size={16} strokeWidth={2.25} />
      </div>

      <div className="dx-timeline-event__body">
        <div className="dx-timeline-event__head">
          <span className="dx-timeline-event__title">{meta.label}</span>
          <span className="dx-timeline-event__time">{time}</span>
        </div>

        <div className="dx-timeline-event__detail">
          <EventContent event={event} meta={metaJson} userType={userType} />
        </div>

        {showActor && <EventActor event={event} />}
      </div>
    </div>
  );
}

function EventActor({ event }) {
  const name = event.actor_name || '';
  const isSystem = !event.actor_role || event.actor_role === 'system';
  const initials = name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="dx-timeline-event__actor">
      <span
        className="dx-timeline-event__avatar"
        style={isSystem ? {
          background: 'var(--dx-bg)',
          color: 'var(--dx-text-soft)',
          border: '1px solid var(--dx-border-soft)',
        } : undefined}
      >
        {isSystem ? <Sparkles size={11} /> : (initials || '?')}
      </span>
      <span className="dx-timeline-event__actor-name">{name}</span>
      {event.actor_role && event.actor_role !== 'system' && (
        <span className="dx-timeline-event__actor-role">{event.actor_role.replace(/_/g, ' ')}</span>
      )}
    </div>
  );
}

function EventChip({ tone = 'neutral', children }) {
  return <span className={cn('dx-timeline-event__chip', `dx-timeline-event__chip--${tone}`)}>{children}</span>;
}

function EventContent({ event, meta, userType }) {
  switch (event.event_type) {
    case 'uploaded': {
      const file = meta?.file || event.message?.match(/\((.+)\)$/)?.[1] || 'invoice.pdf';
      return <FileBadge name={file} source={meta?.source} />;
    }

    case 'ocr_completed': {
      const m = (event.message || '').match(/confidence (\d+)%/i);
      const conf = m ? parseInt(m[1], 10) : null;
      const engine = (event.message || '').match(/via (\w+)/i)?.[1];
      return (
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <MiniMeta label="Engine">{engine || 'local'}</MiniMeta>
          {meta?.lines != null && <MiniMeta label="Lines">{meta.lines}</MiniMeta>}
          {conf != null && (
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--dx-text-mute)', marginBottom: 4 }}>
                <span>Confidence</span><span style={{ fontWeight: 600 }}>{conf}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--dx-border)', borderRadius: 999, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${conf}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: conf >= 90 ? 'var(--dx-success-500)' : conf >= 75 ? 'var(--dx-warn-500)' : 'var(--dx-error-500)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'validation_done': {
      const failed = parseInt((event.message || '').match(/(\d+)\s+failed/)?.[1] || '0', 10)
      const warns = parseInt((event.message || '').match(/(\d+)\s+warnings/)?.[1] || '0', 10)
      const passed = meta?.passed ?? parseInt((event.message || '').match(/(\d+)\/(\d+)/)?.[1] || '0', 10)
      const total = meta?.passed != null ? (passed + (meta?.failed || 0)) : parseInt((event.message || '').match(/(\d+)\/(\d+)/)?.[2] || '12', 10)
      const overall = meta?.overall || (event.message || '').match(/→\s+(\w+)/)?.[1]
      return (
        <div className="dx-timeline-event__chip-row">
          {failed > 0 && <EventChip tone="danger">{failed} failed</EventChip>}
          {warns > 0 && <EventChip tone="warn">{warns} warnings</EventChip>}
          {!failed && !warns && (
            <EventChip tone="success">
              <CheckCircle2 size={11} />
              {passed && total ? `${passed}/${total} checks passed` : 'All checks passed'}
            </EventChip>
          )}
          {overall && <EventChip tone={overall === 'pass' ? 'success' : 'neutral'}>{overall}</EventChip>}
        </div>
      )
    }

    case 'matching_done': {
      const po = (event.message || '').match(/PO\s+(\d+)/)?.[1];
      return po ? (
        <div style={{ fontSize: 12, color: 'var(--dx-text-soft)' }}>
          3-way matched against{' '}
          <Link
            to={`/${userType}${PO_MATCHING}?po=${po}`}
            style={{ color: BRAND, fontWeight: 600, fontFamily: 'SF Mono, Menlo, monospace' }}
          >
            PO {po}
          </Link>
        </div>
      ) : <span className="text-muted text-xs">No PO matched · non-PO invoice</span>;
    }

    case 'pending_approval':
    case 'approval_requested':
      return (
        <div className="dx-timeline-event__chip-row">
          <EventChip tone="info">
            <Users size={11} />
            {meta?.levels ?? 4} approval levels
          </EventChip>
          <span className="dx-timeline-event__detail-text">Routed into the AP approval chain.</span>
        </div>
      );

    case 'parked_to_sap':
      return (
        <p className="dx-timeline-event__detail-text">
          Document parked in SAP — awaiting posting to the general ledger.
        </p>
      );

    case 'paid':
      return (
        <div className="dx-timeline-event__chip-row">
          <EventChip tone="success">
            <CircleDollarSign size={11} />
            Payment run complete
          </EventChip>
        </div>
      );

    case 'approved':
    case 'rejected': {
      const lvl = (event.message || '').match(/L(\d+)/)?.[1];
      const note = (event.message || '').split('—')[1]?.trim();
      const isOk = event.event_type === 'approved';
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: isOk ? 'var(--dx-success-100)' : 'var(--dx-error-100)',
              color: isOk ? 'var(--dx-success-700)' : 'var(--dx-error-700)',
              display: 'grid', placeItems: 'center',
              fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
            }}>
              {(event.actor_name || '?').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--dx-text)', fontWeight: 500 }}>
                {event.actor_name}
                {lvl && <span className="text-muted" style={{ fontWeight: 400 }}> · Level {lvl}</span>}
              </div>
            </div>
            <UserCheck size={14} style={{ color: isOk ? 'var(--dx-success-600)' : 'var(--dx-error-600)' }} />
          </div>
          {note && (
            <div style={{
              marginTop: 8, padding: '8px 12px',
              background: 'var(--dx-bg)', border: '1px solid var(--dx-border-soft)',
              borderRadius: 8, fontSize: 12, fontStyle: 'italic', color: 'var(--dx-text-soft)',
            }}>"{note}"</div>
          )}
        </div>
      );
    }

    case 'posted':
      return (
        <EventChip tone="success">
          <Send size={11} />
          Successfully posted to SAP
        </EventChip>
      );

    default:
      return event.message
        ? <span style={{ fontSize: 12, color: 'var(--dx-text-soft)' }}>{event.message}</span>
        : null;
  }
}

function MiniMeta({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--dx-text-mute)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--dx-text)', fontWeight: 500, marginTop: 2 }}>{children}</div>
    </div>
  );
}

function CountChip({ tone, children }) {
  const map = {
    success: { bg: 'var(--dx-success-50)', fg: 'var(--dx-success-700)' },
    danger:  { bg: 'var(--dx-error-50)',   fg: 'var(--dx-error-700)'   },
    warn:    { bg: 'var(--dx-warn-50)',    fg: 'var(--dx-warn-700)'    },
  };
  const c = map[tone] || map.success;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
      background: c.bg, color: c.fg,
    }}>{children}</span>
  );
}

function FileBadge({ name, source }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 32, height: 40, borderRadius: 6,
        background: '#fff', border: '1px solid var(--dx-border)',
        display: 'grid', placeItems: 'center',
        boxShadow: 'var(--dx-shadow-xs)',
      }}>
        <FileText size={14} style={{ color: 'var(--dx-error-600)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500, color: 'var(--dx-text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} title={name}>{name}</div>
        <div className="text-xs text-muted">{source ? `source: ${source}` : 'uploaded via web'}</div>
      </div>
    </div>
  );
}

function DotPattern() {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.18 }}>
      <defs>
        <pattern id="dot-pattern" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#fff" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dot-pattern)" />
    </svg>
  );
}

const WORKFLOW_STEP_ORDER = [
  'uploaded', 'ocr_completed', 'validation_done', 'matching_done',
  'pending_approval', 'approval_requested', 'approved',
  'parked_to_sap', 'posted', 'paid', 'manual_correction', 'rejected', 'exception',
];

const STEP_DISPLAY_TIME = {
  uploaded:           '08:30',
  ocr_completed:      '08:50',
  validation_done:    '09:15',
  matching_done:      '09:30',
  pending_approval:   '10:00',
  approval_requested: '10:00',
  approved:           '11:30',
  parked_to_sap:      '14:00',
  posted:             '09:00',
  paid:               '14:00',
  manual_correction:  '10:30',
  rejected:           '11:00',
  exception:          '10:45',
};

function getEventDisplayTime(event) {
  if (STEP_DISPLAY_TIME[event.event_type]) return STEP_DISPLAY_TIME[event.event_type]
  const parsed = parseTimelineDate(event.created_at)
  if (!parsed) return '—'
  return parsed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

function sortByWorkflow(events) {
  return [...events].sort((a, b) => {
    const ai = WORKFLOW_STEP_ORDER.indexOf(a.event_type);
    const bi = WORKFLOW_STEP_ORDER.indexOf(b.event_type);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return (parseTimelineDate(a.created_at)?.getTime() || 0) - (parseTimelineDate(b.created_at)?.getTime() || 0);
  });
}

/* ─── Day grouping ───────────────────────────────────────── */
function groupByDay(events) {
  if (!events?.length) return [];
  const groups = {};
  for (const e of events) {
    const d = parseTimelineDate(e.created_at);
    if (!d) continue;
    const key = d.toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = { iso: key, events: [] };
    groups[key].events.push(e);
  }
  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([iso, { events }]) => {
      const day = new Date(iso + 'T00:00:00Z');
      return [
        {
          iso,
          weekday:    day.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }),
          dayNum:     day.getUTCDate(),
          monthShort: day.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
          full:       day.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
        },
        sortByWorkflow(events).reverse(),
      ];
    });
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
});

export default connect(mapStateToProps)(EssaTimeline);
