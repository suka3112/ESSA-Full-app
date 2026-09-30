export function parsePoInvoiceRawId(id) {
  if (!id) return null
  const str = String(id)
  return str.startsWith('po-') ? str.slice(3) : str
}

export function invoiceMatchesPo(invoice, poNumber) {
  if (!poNumber) return true
  const target = String(poNumber)
  if (String(invoice.po_number) === target) return true
  const extra = invoice.po_numbers || invoice.totalPoNo || []
  return extra.some((n) => String(n) === target)
}

export function normalizePoListItem(item) {
  return {
    po_number: item.PONo || item.po_number,
    vendor_name: item?.vendor?.Vendor_Name_EN || item.vendor_name || ''
  }
}

export function mergePoOptions(apiPos = [], invoices = []) {
  const map = new Map()

  for (const p of apiPos) {
    if (p?.po_number) map.set(String(p.po_number), p)
  }

  for (const inv of invoices) {
    if (!inv.po_number) continue
    const key = String(inv.po_number)
    if (!map.has(key)) {
      map.set(key, { po_number: inv.po_number, vendor_name: inv.vendor_name || '' })
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    String(a.po_number).localeCompare(String(b.po_number))
  )
}

export function buildMatchFromPoInvoiceDetails(poNumber, detail) {
  const lines = (detail?.invoicedetails || []).filter(
    (line) => String(line.PONo) === String(poNumber)
  )

  const rows = lines.map((line) => {
    const poQty = Number(line.PO_Qty ?? 0)
    const invQty = Number(line.Inv_Qty ?? 0)
    const grQty = line.GR_Qty != null ? Number(line.GR_Qty) : null
    const rate = Number(line.UnitPrice ?? 0)
    const qtyOk = poQty > 0 ? invQty <= poQty + 0.001 : invQty >= 0
    const sesOk =
      grQty != null
        ? Math.abs(invQty - grQty) <= Math.max(0.01, Math.abs(grQty) * 0.01)
        : null

    return {
      line_no: line.POLnNo,
      description: line.Material_Description || line.Material_Code || '—',
      unit: line.Unit_of_measure || '—',
      po: {
        qty: poQty,
        consumed: 0,
        rate,
        total: poQty * rate
      },
      invoice: {
        qty: invQty,
        rate,
        total: Number(line.Line_Total ?? invQty * rate)
      },
      ses: grQty != null ? { qty: grQty } : null,
      flags: {
        rateOk: true,
        qtyOk,
        sesOk,
        extra: false
      }
    }
  })

  return {
    po: { po_number: poNumber },
    invoice: {
      id: `po-${detail.ID}`,
      invoice_no: detail.InvNo
    },
    rows
  }
}
