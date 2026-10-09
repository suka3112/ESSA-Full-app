/** Names that were tables before field kind existed. Used only when kind is unset. */
const LEGACY_TABLE_FIELD_RE =
  /^(invoiceLineItems|lineItems|manpower|manhourSummary|timesheetEntries|timesheets|attendanceEntries|poLineItems|appendixItems|transmittalItems|progressLineItems|classifications|sesLineItems)$/i

const COLUMN_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

export function resolveFieldKind(field) {
  const explicit = String(field?.kind || field?.fieldKind || '')
    .trim()
    .toLowerCase()
  if (explicit === 'table' || explicit === 'array' || explicit === 'json') return 'table'
  if (explicit === 'scalar' || explicit === 'single') return 'scalar'
  const name = String(field?.name || field?.fieldName || '').trim()
  return LEGACY_TABLE_FIELD_RE.test(name) ? 'table' : 'scalar'
}

/** Comma-separated identifier lists are row columns. Prose hints are not. */
export function columnKeysFromHint(hint) {
  const parts = String(hint || '')
    .split(/[,;]/)
    .map((part) => part.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
  if (parts.length < 2) return []
  if (!parts.every((part) => COLUMN_KEY_RE.test(part))) return []
  return parts
}

const fieldKey = (field) => String(field?.name || field?.fieldName || '').trim() || '{{field}}'

const tableLine = (field) => {
  const name = fieldKey(field)
  const hint = String(field?.hint || '').trim()
  const columns = columnKeysFromHint(hint)
  if (columns.length) {
    return `- ${name}  // JSON array. Each row uses keys: ${columns.join(', ')}`
  }
  if (hint) return `- ${name}  // JSON array of row objects. ${hint}`
  return `- ${name}  // JSON array of row objects. Use the printed column headers as keys.`
}

export function fieldSnippet(field) {
  if (resolveFieldKind(field) === 'table') return tableLine(field)
  const name = fieldKey(field)
  const hint = String(field?.hint || '').trim()
  return `- ${name}${hint ? `  // ${hint}` : ''}`
}

/**
 * Extraction prompt for any invoice service.
 * Single-value fields go under header. Table fields are top-level JSON arrays.
 * A document does not get a line-item array unless one of its fields is a table.
 */
export function buildPrompt(type, configs) {
  if (!type) return ''
  const cfg = configs[type.id] || {}
  const activeDocs = type.documents.filter((doc) => cfg[doc]?.enabled)
  const lines = [
    `You are extracting structured data from documents belonging to a "${type.subtype}" invoice (${type.category}).`,
    '',
    'Scan the ENTIRE page (headings, body tables, footers, stamps, and signature blocks).',
    'Match labels by meaning (including English and Bahasa Indonesia). Preserve printed values exactly (including thousand separators).',
    'Never invent values. Use null when a single value is absent, and [] when a table is absent.',
    ''
  ]

  if (activeDocs.length === 0) {
    lines.push('No documents selected yet — toggle on the documents you want this prompt to cover.')
    return lines.join('\n')
  }

  const headerKeys = []
  const seenHeader = new Set()
  const tableKeys = new Map()

  activeDocs.forEach((doc) => {
    const fields = cfg[doc]?.fields || []
    const scalars = fields.filter((field) => resolveFieldKind(field) !== 'table')
    const tables = fields.filter((field) => resolveFieldKind(field) === 'table')

    lines.push(`## ${doc}`)
    lines.push('### header (single values — put these under JSON key "header")')
    if (scalars.length === 0) {
      lines.push('- (no single-value fields)')
    } else {
      scalars.forEach((field) => {
        const name = fieldKey(field)
        const hint = String(field.hint || '').trim()
        lines.push(`- ${name}${hint ? `  // ${hint}` : ''}`)
        if (name !== '{{field}}' && !seenHeader.has(name) && headerKeys.length < 8) {
          seenHeader.add(name)
          headerKeys.push(name)
        }
      })
    }

    lines.push('')
    lines.push('### tables (JSON arrays at the top level — one object per printed row)')
    if (tables.length === 0) {
      lines.push('- (none for this document — do not invent a line-item array)')
    } else {
      tables.forEach((field) => {
        const name = fieldKey(field)
        if (!tableKeys.has(name)) tableKeys.set(name, columnKeysFromHint(field.hint))
        lines.push(tableLine(field))
      })
    }
    lines.push('')
  })

  const rules = [
    'OUTPUT RULES:',
    '1. Return ONE JSON object. Do not wrap fields under the document section title.',
    '2. Put every header field inside "header" using the exact key names. Use null when a value is not printed.',
    '3. Put every table field at the top level as a JSON array of row objects, using the exact field name as the key. Use [] when that table is not on the page.',
    '4. A table row uses only the columns listed for that field. Do not add columns that are not listed, and do not repeat header totals inside the rows.',
    '5. Never invent values.'
  ]
  if (tableKeys.has('invoiceLineItems') || tableKeys.has('lineItems')) {
    rules.push(
      '6. When invoiceLineItems is listed, copy the same rows into "lineItems" (same order, same values).'
    )
  }
  lines.push(...rules)
  lines.push('')
  lines.push('Example shape:')
  lines.push('{')
  const headerBody = headerKeys.map((key) => `"${key}": null`).join(', ')
  const tableLines = [...tableKeys.entries()].map(([name, columns]) => {
    const row = columns.length
      ? `{ ${columns.map((column) => `"${column}": null`).join(', ')} }`
      : '{}'
    return `  "${name}": [${row}]`
  })
  if (tableKeys.has('invoiceLineItems') && !tableKeys.has('lineItems')) {
    const columns = tableKeys.get('invoiceLineItems') || []
    const row = columns.length
      ? `{ ${columns.map((column) => `"${column}": null`).join(', ')} }`
      : '{}'
    tableLines.push(`  "lineItems": [${row}]`)
  }
  lines.push(`  "header": {${headerBody ? ` ${headerBody} ` : ''}}${tableLines.length ? ',' : ''}`)
  tableLines.forEach((line, index) => {
    lines.push(`${line}${index === tableLines.length - 1 ? '' : ','}`)
  })
  lines.push('}')

  return lines.join('\n')
}
