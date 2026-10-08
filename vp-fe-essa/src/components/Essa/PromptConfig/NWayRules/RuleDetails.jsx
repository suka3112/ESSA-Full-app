import { Pencil, Trash2 } from 'lucide-react'
import { Drawer } from '../../ui/Drawer'
import { Button } from '../../ui/Button'
import { sourceChannel, sourceLabel } from '../../lib/nWay/catalog'
import { Marker, TypeChip } from '../../lib/nWay/NWayChips'
import { describeRule, requirementLabel, scopeLabel, typeLabel } from '../../lib/nWay/ruleText'

function Fact({ label, children }) {
  return (
    <div className="nw-dt__fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/**
 * Right-hand drawer with everything about one rule. Opened from a matrix / list row.
 * props: rule, categoryCode (null for Common), readOnly, saving, onClose, onEdit, onToggleOff, onDelete
 */
export default function RuleDetails({ rule, categoryCode, readOnly, saving, onClose, onEdit, onToggleOff, onDelete }) {
  const open = Boolean(rule)
  const offHere = rule && categoryCode && (rule.disabledCategories || []).includes(categoryCode)
  const compares = (rule?.targets || []).filter((t) => t.requirement !== 'EXTRACT')
  const extracts = (rule?.targets || []).filter((t) => t.requirement === 'EXTRACT')

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="max-w-lg"
      className="nw-drawer"
      title={rule ? `Rule ${rule.ruleKey}` : ''}
      footer={
        rule ? (
          <>
            <button
              type="button"
              className="ic-icon-btn is-danger nw-dt__delete"
              aria-label={`Delete rule ${rule.ruleKey}`}
              title="Delete rule"
              onClick={() => onDelete(rule)}
              disabled={readOnly}>
              <Trash2 size={15} />
            </button>
            {categoryCode && rule.scope !== 'CATEGORY' ? (
              <Button variant="outline" onClick={() => onToggleOff(rule)} disabled={saving || readOnly}>
                {offHere ? 'Switch on for this category' : 'Switch off for this category'}
              </Button>
            ) : null}
            <Button variant="primary" onClick={() => onEdit(rule)}>
              <Pencil size={14} /> Edit rule
            </Button>
          </>
        ) : null
      }>
      {rule ? (
        <div className="nw-dt">
          <header className="nw-dt__head">
            <h3>{rule.dataPoint}</h3>
            <div className="nw-dt__chips">
              <TypeChip type={rule.ruleType} />
              {offHere ? <span className="nw-status nw-status--neutral nw-status--xs">Off for this category</span> : null}
            </div>
            <p className="nw-dt__sentence">{describeRule(rule)}</p>
          </header>

          <section className="nw-dt__sec">
            <h4>How it’s checked</h4>
            <ol className="nw-dt__flow">
              <li className="nw-dt__step is-source">
                <Marker role="SOURCE" />
                <div>
                  <span className="nw-dt__kicker">Read from</span>
                  <b>{sourceLabel(rule.source)}</b>
                  <small>{sourceChannel(rule.source).long}</small>
                </div>
              </li>
              {compares.length ? (
                <li className="nw-dt__step">
                  <span className="nw-dt__kicker nw-dt__kicker--pad">{rule.compareMode === 'STEPWISE' ? 'Then compare, step by step' : 'Compare with'}</span>
                  <ul className="nw-dt__targets">
                    {compares.map((t, i) => (
                      <li key={`${t.doc}-${i}`}>
                        <Marker role={t.requirement || 'REQUIRED'} />
                        <span>
                          <b>{rule.compareMode === 'STEPWISE' ? `${i + 1}. ` : ''}{sourceLabel(t.doc)}</b>
                          <small>{sourceChannel(t.doc).long}</small>
                        </span>
                        <em className={t.requirement === 'IF_PRESENT' ? 'is-soft' : ''}>{requirementLabel(t.requirement)}</em>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li className="nw-dt__step nw-dt__step--note">
                  {rule.ruleType === 'AVAILABILITY' ? 'Only checks the document is in the invoice package.' : 'Single-source rule — evaluated on the value itself.'}
                </li>
              )}
              {extracts.length ? (
                <li className="nw-dt__step nw-dt__step--note">
                  Also shown to the reviewer: {extracts.map((t) => sourceLabel(t.doc)).join(', ')}
                </li>
              ) : null}
            </ol>
          </section>

          <section className="nw-dt__sec">
            <h4>Rule</h4>
            <dl className="nw-dt__facts">
              <Fact label="Invoice category">{scopeLabel(rule)}</Fact>
              <Fact label="Source document">{sourceLabel(rule.source)}</Fact>
              <Fact label="Data point">{rule.dataPoint}</Fact>
              <Fact label="Validation type">{typeLabel(rule.ruleType)}</Fact>
            </dl>
          </section>
        </div>
      ) : null}
    </Drawer>
  )
}
