"""Synthetic ESSA manpower invoice package for QA (PT Amanah Lestari Energy, PO 4203000472)."""
import os
import zipfile
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

OUT = os.path.dirname(os.path.abspath(__file__))
INV = "901/PT.ALE-PAU/09/2026"
PO = "4203000472"
VENDOR = "PT. AMANAH LESTARI ENERGY"
BUYER = "PT. PANCA AMARA UTAMA"
PERIOD = "13 August 2026 - 12 September 2026"
WORKERS = [("Budi Santoso", "Welder"), ("Agus Pratama", "Fitter"),
           ("Rudi Hartono", "Pipe Fitter"), ("Dedi Kurniawan", "Helper")]
MH_EACH = 312  # 26 days x 12 h
MH_TOTAL = MH_EACH * len(WORKERS)  # 1.248
RATE = 26000
DPP = MH_TOTAL * RATE  # 32.448.000
VAT = round(DPP * 0.11)  # 3.569.280
TOTAL = DPP + VAT  # 36.017.280


def idr(n):
    return f"{n:,.0f}".replace(",", ".")


def header(c, title):
    w, h = A4
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, h - 50, VENDOR)
    c.setFont("Helvetica", 9)
    c.drawString(50, h - 64, "Desa Padang, Kec. Kintom, Kab. Banggai, Sulawesi Tengah  |  NPWP: 02.152.078.2-832.000")
    c.line(50, h - 72, w - 50, h - 72)
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(w / 2, h - 100, title)
    return h - 130


def rows(c, y, pairs, x=50, gap=16, size=10):
    c.setFont("Helvetica", size)
    for k, v in pairs:
        c.drawString(x, y, k)
        c.drawString(x + 170, y, ": " + str(v))
        y -= gap
    return y


def invoice(c):
    y = header(c, "INVOICE")
    y = rows(c, y, [("Invoice No", INV), ("Date", "15/09/2026"), ("Messrs", BUYER),
                    ("Contract Order No.", f"PO {PO}"), ("Payment Term", "30 Days From Invoice Date"),
                    ("Due Date", "15/10/2026")])
    y -= 10
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "DESCRIPTION"); c.drawRightString(545, y, "AMOUNT (IDR)")
    y -= 18
    c.setFont("Helvetica", 10)
    c.drawString(50, y, f"Manpower Supply for Production - Banggai Ammonia Plant Project, 9th Claim")
    y -= 14
    c.drawString(50, y, f"Period {PERIOD} - Manpower {len(WORKERS)} persons, {idr(MH_TOTAL)} MH x Rp {idr(RATE)}")
    c.drawRightString(545, y, idr(DPP))
    y -= 30
    for k, v in [("Total (DPP)", DPP), ("VAT 11%", VAT), ("Grand Total", TOTAL)]:
        c.setFont("Helvetica-Bold" if k == "Grand Total" else "Helvetica", 10)
        c.drawString(330, y, k); c.drawRightString(545, y, "Rp " + idr(v)); y -= 16
    y -= 20
    rows(c, y, [("Bank", "PT. Bank Mandiri (Persero) Tbk."), ("Account Name", "PT. Amanah Lestari Energy"),
                ("Account No", "151-00-1017369-5")])
    c.drawString(400, 120, "Meirwin H Babo"); c.drawString(400, 106, "(Director)")
    c.showPage()


def faktur(c):
    y = header(c, "FAKTUR PAJAK")
    y = rows(c, y, [("Kode dan Nomor Seri Faktur Pajak", "010.026-26.90123456"),
                    ("Pengusaha Kena Pajak", VENDOR), ("NPWP PKP", "02.152.078.2-832.000"),
                    ("Pembeli BKP/Penerima JKP", BUYER), ("NPWP Pembeli", "03.271.883.5-092.000"),
                    ("Referensi", f"Invoice {INV}"), ("Tanggal", "15 September 2026")])
    y -= 10
    y = rows(c, y, [("Harga Jual / Penggantian", "Rp " + idr(DPP)), ("Dasar Pengenaan Pajak", "Rp " + idr(DPP)),
                    ("PPN = 11% x DPP", "Rp " + idr(VAT))])
    c.showPage()


def berita_acara(c):
    y = header(c, "BERITA ACARA PEMERIKSAAN PEKERJAAN")
    c.setFont("Helvetica", 10)
    c.drawString(50, y, "(Work Progress Certificate)"); y -= 24
    y = rows(c, y, [("Nomor", "BA/ALE-PAU/09/2026/009"), ("Contract / PO", PO), ("Pekerjaan", "Manpower Supply - Production"),
                    ("Periode", PERIOD), ("Jumlah Tenaga Kerja", f"{len(WORKERS)} orang"),
                    ("This Man Hours", f"{idr(MH_TOTAL)} MH"), ("Overtime Man Hours", "0 MH"),
                    ("Nilai Pekerjaan", "Rp " + idr(DPP))])
    y -= 20
    c.drawString(50, y, "Pekerjaan tersebut di atas telah diperiksa dan diterima dengan baik.")
    c.drawString(60, 140, "PT. Panca Amara Utama"); c.drawString(360, 140, VENDOR)
    c.showPage()


def summary(c):
    y = header(c, "SUMMARY CALCULATION MANHOUR")
    c.setFont("Helvetica", 10); c.drawString(50, y, f"PO {PO}  |  Period {PERIOD}"); y -= 24
    c.setFont("Helvetica-Bold", 10)
    for x, t in [(50, "No"), (80, "Name"), (230, "Role"), (340, "Regular MH"), (430, "OT MH"), (490, "Rate/MH")]:
        c.drawString(x, y, t)
    y -= 16; c.setFont("Helvetica", 10)
    for i, (n, r) in enumerate(WORKERS, 1):
        for x, t in [(50, str(i)), (80, n), (230, r), (340, idr(MH_EACH)), (430, "0"), (490, idr(RATE))]:
            c.drawString(x, y, t)
        y -= 16
    c.setFont("Helvetica-Bold", 10)
    c.drawString(80, y - 6, "TOTAL"); c.drawString(340, y - 6, idr(MH_TOTAL)); c.drawString(430, y - 6, "0")
    c.drawString(80, y - 26, f"Total Amount: Rp {idr(DPP)}")
    c.showPage()


def timesheet(c):
    y = header(c, "DAILY TIME SHEET")
    c.setFont("Helvetica", 9); c.drawString(50, y, f"PO {PO}  |  Period {PERIOD}  |  Shift 07:00-19:00"); y -= 20
    for n, r in WORKERS:
        c.setFont("Helvetica-Bold", 9); c.drawString(50, y, f"{n} ({r})"); y -= 13
        c.setFont("Helvetica", 8)
        c.drawString(60, y, "13-Aug .. 12-Sep: 26 working days x 12.0 h = 312.0 h  (Sundays off)"); y -= 18
    c.showPage()


def attendance(c):
    y = header(c, "DAILY ATTENDANCE (BIOMETRIC)")
    c.setFont("Helvetica", 9); c.drawString(50, y, f"Site: Banggai Ammonia Plant  |  Period {PERIOD}  |  Source: Fingerprint device FP-07"); y -= 20
    for n, _ in WORKERS:
        c.drawString(50, y, f"{n}: 26 days present, 0 absent, avg check-in 06:52, avg check-out 19:04"); y -= 14
    c.showPage()


def purchase_order(c):
    y = header(c, "PURCHASE ORDER")
    rows(c, y, [("PO Number", PO), ("Vendor", VENDOR), ("Buyer", BUYER), ("Item", "Manpower Supply - Production"),
                ("Unit", "MH"), ("Unit Price", "Rp " + idr(RATE)), ("Currency", "IDR")])
    c.showPage()


def build(name, pages):
    c = canvas.Canvas(os.path.join(OUT, name), pagesize=A4)
    for p in pages:
        p(c)
    c.save()


build("QA901_complete_package.pdf", [invoice, faktur, berita_acara, summary, timesheet, attendance, purchase_order])
build("QA901_incomplete_package.pdf", [invoice, berita_acara, summary, timesheet])
build("QA901_reply_missing_docs.pdf", [faktur, attendance, purchase_order])
with zipfile.ZipFile(os.path.join(OUT, "QA901_one_pdf.zip"), "w") as z:
    z.write(os.path.join(OUT, "QA901_complete_package.pdf"), "QA901_complete_package.pdf")
with zipfile.ZipFile(os.path.join(OUT, "QA901_two_pdfs.zip"), "w") as z:
    z.write(os.path.join(OUT, "QA901_complete_package.pdf"), "a.pdf")
    z.write(os.path.join(OUT, "QA901_incomplete_package.pdf"), "b.pdf")
with open(os.path.join(OUT, "QA_not_a_pdf.pdf"), "w") as f:
    f.write("this is not a pdf")
print("DPP", idr(DPP), "VAT", idr(VAT), "TOTAL", idr(TOTAL), "MH", idr(MH_TOTAL))
