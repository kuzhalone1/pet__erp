import { useEffect, useState, useRef } from 'react'
import { Printer, X, MessageCircle, FileText, Loader2 } from 'lucide-react'
import api from '../api'

// ── Indian Numbering system to Words Converter ──────────────────
function numberToWordsIndian(num) {
  const n = Math.round(num)
  if (n === 0) return 'Zero Rupees Only'
  
  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const doubleDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  
  const getBelowHundred = (val) => {
    if (val < 10) return singleDigits[val]
    if (val < 20) return doubleDigits[val - 10]
    const tenVal = Math.floor(val / 10)
    const singleVal = val % 10
    return tens[tenVal] + (singleVal ? ' ' + singleDigits[singleVal] : '')
  }
  
  const getBelowThousand = (val) => {
    const hundredVal = Math.floor(val / 100)
    const remainder = val % 100
    let str = ''
    if (hundredVal > 0) {
      str += singleDigits[hundredVal] + ' Hundred'
      if (remainder > 0) str += ' and '
    }
    if (remainder > 0 || hundredVal === 0) {
      str += getBelowHundred(remainder)
    }
    return str
  }

  let temp = n
  let crore = Math.floor(temp / 10000000)
  temp %= 10000000
  let lakh = Math.floor(temp / 100000)
  temp %= 100000
  let thousand = Math.floor(temp / 1000)
  temp %= 1000
  let remaining = temp
  
  let parts = []
  if (crore > 0) {
    parts.push(getBelowThousand(crore) + ' Crore')
  }
  if (lakh > 0) {
    parts.push(getBelowThousand(lakh) + ' Lakh')
  }
  if (thousand > 0) {
    parts.push(getBelowThousand(thousand) + ' Thousand')
  }
  if (remaining > 0) {
    parts.push(getBelowThousand(remaining))
  }
  
  return parts.join(' ') + ' Rupees Only'
}

/**
 * SalesBillPrint — A4 Sales Invoice Print and Share Component
 */
export default function SalesBillPrint({ bill, onClose, owners = [], pets = [], doctors = [] }) {
  const [clinic, setClinic] = useState(null)
  const [doctor, setDoctor] = useState(null)
  const [showOptions, setShowOptions] = useState(false)
  const [generating, setGenerating] = useState(false)   // PDF generation in progress
  const printRef = useRef(null)

  // ── Fetch Clinic setup ──────────────────────────────────────
  useEffect(() => {
    api.get('/clinic/setup')
      .then(r => setClinic(r.data))
      .catch(() => { })
  }, [])

  // ── Fetch/Resolve Doctor ────────────────────────────────────
  useEffect(() => {
    const doctorId = bill?.doctor_id

    const loadFirstActive = () =>
      api.get('/doctors')
        .then(r => { if (r.data.length > 0) setDoctor(r.data[0]) })
        .catch(() => { })

    if (!doctorId) {
      loadFirstActive()
      return
    }

    api.get(`/doctors/${doctorId}`)
      .then(r => {
        const doc = r.data
        if (doc.is_active === false) {
          loadFirstActive()
        } else {
          setDoctor(doc)
        }
      })
      .catch(() => loadFirstActive())
  }, [bill?.doctor_id])

  // ── Resolve Metadata Names ──────────────────────────────────
  const ownerName = bill?.owner?.name || owners.find(o => o.owner_id === parseInt(bill?.owner_id))?.name || 'Walking Customer'
  const ownerPhone = bill?.owner?.phone || owners.find(o => o.owner_id === parseInt(bill?.owner_id))?.phone || '—'
  const petName = bill?.pet?.name || pets.find(p => p.pet_id === parseInt(bill?.pet_id))?.name || '—'
  const doctorName = bill?.doctor?.name || doctor?.name || doctors.find(d => d.doctor_id === parseInt(bill?.doctor_id))?.name || 'House Staff'

  const clinicAddress = clinic
    ? [clinic.address1, clinic.address2, clinic.address3, clinic.district, clinic.state_name, clinic.pincode]
      .filter(Boolean).join(', ')
    : ''

  const rawDate = bill?.bill_date
  const billDate = rawDate
    ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  // Filename: Bill_SB-001_10-Jun-2026.pdf
  const dateSlug = rawDate
    ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
    : 'Date'
  const pdfFilename = `Bill_${bill?.bill_number || 'Draft'}_${dateSlug}.pdf`

  // ── Calculate GST Summary Slabs for the table ────────────────
  const getGstSummary = () => {
    const slabs = {}
    const items = bill?.items || []
    items.forEach(l => {
      const qty = parseFloat(l.qty) || 0
      const rate = parseFloat(l.rate) || 0
      const discPct = parseFloat(l.discount_pct) || 0
      const gross = qty * rate
      const disc = gross * (discPct / 100)
      const taxable = gross - disc
      const gstPct = parseFloat(l.gst_pct) || 0
      const taxAmount = taxable * (gstPct / 100)
      
      if (gstPct > 0) {
        if (!slabs[gstPct]) slabs[gstPct] = { gstPct, taxable: 0, taxAmount: 0 }
        slabs[gstPct].taxable += taxable
        slabs[gstPct].taxAmount += taxAmount
      }
    })
    return Object.values(slabs).sort((a, b) => b.gstPct - a.gstPct)
  }

  const gstSlabs = getGstSummary()
  const showGstSummary = gstSlabs.length > 0 && parseFloat(bill?.total_tax) > 0

  // ── Generate PDF Blob from preview DOM ─────────────────────
  const generatePdfBlob = async () => {
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')

    const el = printRef.current
    if (!el) throw new Error('No element to capture')

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const imgW = pageW
    const imgH = (canvas.height * pageW) / canvas.width

    if (imgH <= pageH) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH)
    } else {
      let y = 0
      while (y < imgH) {
        if (y > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -y, imgW, imgH)
        y += pageH
      }
    }

    return pdf.output('blob')
  }

  // ── WhatsApp: share actual PDF ──────────────────────────────
  const handleWhatsApp = async () => {
    setGenerating(true)
    try {
      const blob = await generatePdfBlob()
      const file = new File([blob], pdfFilename, { type: 'application/pdf' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Invoice — ${bill?.bill_number || 'Bill'}`,
          text: `Sales Invoice ${bill?.bill_number || ''} from ${clinic?.clinic_name || 'Animal Clinic'}`,
          files: [file],
        })
      } else {
        // Desktop fallback: download the PDF
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = pdfFilename
        a.click()
        URL.revokeObjectURL(url)
        alert('PDF downloaded! Open WhatsApp and attach this file to share with the owner.')
      }
      setShowOptions(false)
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err)
        alert('Could not share PDF. Try the Print option to save as PDF and share manually.')
      }
    } finally {
      setGenerating(false)
    }
  }

  // ── Browser Print ──────────────────────────────────────────
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    const html = printRef.current.innerHTML
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${pdfFilename.replace('.pdf', '')}</title>
          <meta charset="UTF-8"/>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Inter', Arial, sans-serif; font-size: 11px; color: #1e293b; background: white; }
            .bill-page { width: 210mm; min-height: 297mm; margin: 0 auto; background: white; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f8fafc; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
            td, th { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              .bill-page { width: 100%; }
            }
          </style>
        </head>
        <body><div class="bill-page">${html}</div></body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close() }, 700)
    setShowOptions(false)
  }

  // ── Invoice Body HTML ──────────────────────────────────────
  const InvoiceBody = (
    <div
      ref={printRef}
      style={{
        width: '100%', maxWidth: '595px', margin: '0 auto',
        background: 'white',
        fontFamily: "'Inter', Arial, sans-serif",
        fontSize: '11px', color: '#1e293b', position: 'relative',
        padding: '0 0 10px 0'
      }}
    >
      {/* ── HEADER ──────────────────────────────────────────── */}
      <div style={{ background: '#1e3a5f', color: 'white', padding: '14px 20px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '0.5px' }}>
              🐾 {clinic?.clinic_name || 'Animal Clinic'}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '3px', fontStyle: 'italic', letterSpacing: '0.3px' }}>
              Healing paws Animal Clinic
            </div>
            {(clinic?.drug_license_no || clinic?.reg_number) && (
              <div style={{ fontSize: '9px', opacity: 0.7, marginTop: '4px' }}>
                {clinic?.reg_number && `Reg No: ${clinic.reg_number}`}
                {clinic?.drug_license_no && ` | DL: ${clinic.drug_license_no}`}
              </div>
            )}
            {clinic?.gstin && (
              <div style={{ fontSize: '9px', opacity: 0.7, marginTop: '1px', fontWeight: '600' }}>
                GSTIN: {clinic.gstin}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right', minWidth: '150px' }}>
            {doctor ? (
              <>
                <div style={{ fontWeight: '700', fontSize: '13px', color: 'white' }}>
                  Dr. {doctor.name}
                </div>
                {doctor.qualification && (
                  <div style={{ opacity: 0.8, fontSize: '9.5px', color: 'white', marginTop: '2px' }}>
                    {doctor.qualification}
                  </div>
                )}
                {doctor.specialization && (
                  <div style={{ opacity: 0.75, fontSize: '9px', color: 'white' }}>
                    {doctor.specialization}
                  </div>
                )}
                {doctor.reg_number && (
                  <div style={{ opacity: 0.65, fontSize: '9px', color: 'white' }}>
                    Reg No: {doctor.reg_number}
                  </div>
                )}
              </>
            ) : (
              <div style={{ opacity: 0.6, fontSize: '10px', color: 'white' }}>Loading doctor…</div>
            )}
          </div>
        </div>
      </div>

      {/* Wave divider */}
      <div style={{ background: '#1e3a5f', lineHeight: 0 }}>
        <svg viewBox="0 0 500 20" style={{ display: 'block', width: '100%' }} preserveAspectRatio="none">
          <path d="M0,0 C125,20 375,20 500,0 L500,20 L0,20 Z" fill="white" />
        </svg>
      </div>

      {/* ── METADATA BOX ────────────────────────────────────── */}
      <div style={{ padding: '12px 20px 6px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '6px 20px', padding: '10px 14px',
          background: '#f8fafc', border: '1px solid #e2e8f0',
          borderRadius: '8px', marginBottom: '14px',
        }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '11px' }}>
              <span style={{ color: '#64748b', fontWeight: '600', minWidth: '80px' }}>Bill No:</span>
              <span style={{ fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>{bill?.bill_number || '—'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '11px' }}>
              <span style={{ color: '#64748b', fontWeight: '600', minWidth: '80px' }}>Date:</span>
              <span style={{ fontWeight: '600', color: '#0f172a' }}>{billDate}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '11px' }}>
              <span style={{ color: '#64748b', fontWeight: '600', minWidth: '80px' }}>Doctor Name:</span>
              <span style={{ fontWeight: '600', color: '#0f172a' }}>Dr. {doctorName}</span>
            </div>
          </div>
          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '11px' }}>
              <span style={{ color: '#64748b', fontWeight: '600', minWidth: '80px' }}>Pet Owner:</span>
              <span style={{ fontWeight: '600', color: '#0f172a' }}>{ownerName} {ownerPhone !== '—' && `(${ownerPhone})`}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '11px' }}>
              <span style={{ color: '#64748b', fontWeight: '600', minWidth: '80px' }}>Pet Name:</span>
              <span style={{ fontWeight: '600', color: '#0f172a' }}>{petName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '11px' }}>
              <span style={{ color: '#64748b', fontWeight: '600', minWidth: '80px' }}>Payment Mode:</span>
              <span style={{ fontWeight: '700', color: '#1e3a5f' }}>{bill?.payment_mode || 'Cash'}</span>
            </div>
          </div>
        </div>

        {/* ── ITEMS TABLE ─────────────────────────────────────── */}
        <div style={{ margin: '14px 0', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                <th style={{ textAlign: 'left', width: '30px', padding: '8px 10px' }}>#</th>
                <th style={{ textAlign: 'left', width: '90px', padding: '8px 10px' }}>Type</th>
                <th style={{ textAlign: 'left', padding: '8px 10px' }}>Product / Service</th>
                <th style={{ textAlign: 'center', width: '50px', padding: '8px 10px' }}>Qty</th>
                <th style={{ textAlign: 'right', width: '80px', padding: '8px 10px' }}>Rate (₹)</th>
                <th style={{ textAlign: 'right', width: '60px', padding: '8px 10px' }}>Disc %</th>
                <th style={{ textAlign: 'right', width: '90px', padding: '8px 10px' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {(bill?.items || []).map((item, index) => {
                const qty = parseFloat(item.qty) || 0
                const rate = parseFloat(item.rate) || 0
                const discPct = parseFloat(item.discount_pct) || 0
                const amount = (qty * rate) * (1 - discPct / 100)

                return (
                  <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', color: '#64748b' }}>{index + 1}</td>
                    <td style={{ padding: '8px 10px', fontWeight: '600', color: '#475569' }}>
                      {item.line_type === 'Medicine' ? '💊 Medicine' : '🩺 Procedure'}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: '700', color: '#0f172a' }}>
                      {item.description || '—'}
                      {item.hsn_code && <span style={{ fontSize: '8.5px', color: '#94a3b8', marginLeft: '5px', fontWeight: '500' }}>HSN: {item.hsn_code}</span>}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600' }}>{item.qty}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{rate.toFixed(2)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#e11d48', fontWeight: '600' }}>
                      {discPct > 0 ? `${discPct}%` : '0%'}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>
                      {amount.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── GST DETAILS & TOTALS ROW ────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', marginTop: '10px' }}>
          {/* GST Slabs breakdown (if applicable) */}
          <div style={{ flex: 1, maxWidth: '280px' }}>
            {showGstSummary ? (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
                <div style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
                  GST Breakdown Slabs
                </div>
                <table style={{ width: '100%', fontSize: '8.5px' }}>
                  <thead>
                    <tr style={{ color: '#64748b', fontWeight: '600' }}>
                      <th style={{ padding: '2px 4px', textAlign: 'left', background: 'transparent', border: 'none' }}>Rate</th>
                      <th style={{ padding: '2px 4px', textAlign: 'right', background: 'transparent', border: 'none' }}>Taxable (₹)</th>
                      <th style={{ padding: '2px 4px', textAlign: 'right', background: 'transparent', border: 'none' }}>CGST (₹)</th>
                      <th style={{ padding: '2px 4px', textAlign: 'right', background: 'transparent', border: 'none' }}>SGST (₹)</th>
                      <th style={{ padding: '2px 4px', textAlign: 'right', background: 'transparent', border: 'none' }}>Total GST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gstSlabs.map(s => {
                      const cgst = s.taxAmount / 2
                      const sgst = s.taxAmount / 2
                      return (
                        <tr key={s.gstPct} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '4px', fontWeight: '700' }}>{s.gstPct}%</td>
                          <td style={{ padding: '4px', textAlign: 'right' }}>{s.taxable.toFixed(2)}</td>
                          <td style={{ padding: '4px', textAlign: 'right', color: '#64748b' }}>{cgst.toFixed(2)}</td>
                          <td style={{ padding: '4px', textAlign: 'right', color: '#64748b' }}>{sgst.toFixed(2)}</td>
                          <td style={{ padding: '4px', textAlign: 'right', fontWeight: '700', color: '#1e3a5f' }}>{s.taxAmount.toFixed(2)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ fontSize: '9px', color: '#94a3b8', fontStyle: 'italic' }}>
                No tax details included.
              </div>
            )}
          </div>

          {/* Totals Section */}
          <div style={{ width: '220px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span style={{ color: '#475569', fontWeight: '600' }}>Net Taxable:</span>
              <span style={{ fontWeight: '700', fontFamily: 'monospace' }}>₹{(parseFloat(bill?.taxable_amt) || 0).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' }}>
              <span style={{ color: '#475569', fontWeight: '600' }}>GST Total:</span>
              <span style={{ fontWeight: '700', color: '#1e3a5f', fontFamily: 'monospace' }}>+ ₹{(parseFloat(bill?.total_tax) || 0).toFixed(2)}</span>
            </div>
            {parseFloat(bill?.round_off) !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '3px', marginTop: '2px' }}>
                <span style={{ color: '#64748b', fontStyle: 'italic' }}>Round Off:</span>
                <span style={{ fontWeight: '500', color: '#64748b', fontFamily: 'monospace' }}>₹{parseFloat(bill?.round_off).toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>Grand Total:</span>
              <span style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', fontFamily: 'monospace' }}>
                ₹{(parseFloat(bill?.net_payable) || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* ── AMOUNT IN WORDS ──────────────────────────────────── */}
        <div style={{
          marginTop: '16px', padding: '10px 14px',
          background: '#eff6ff', borderLeft: '4px solid #1e3a5f',
          borderRadius: '0 8px 8px 0', fontSize: '10px'
        }}>
          <strong style={{ color: '#1e3a5f', marginRight: '6px' }}>Amount in Words:</strong>
          <span style={{ fontWeight: '600', color: '#1e293b', fontStyle: 'italic', textTransform: 'capitalize' }}>
            {numberToWordsIndian(parseFloat(bill?.net_payable) || 0)}
          </span>
        </div>

        {bill?.notes && (
          <div style={{ marginTop: '10px', fontSize: '9.5px', color: '#64748b', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
            <strong>Remarks:</strong> {bill.notes}
          </div>
        )}
      </div>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <div style={{ marginTop: '24px', lineHeight: 0 }}>
        <svg viewBox="0 0 500 20" style={{ display: 'block', width: '100%' }} preserveAspectRatio="none">
          <path d="M0,20 C125,0 375,0 500,20 L500,20 L0,20 Z" fill="#1e3a5f" />
        </svg>
      </div>
      <div style={{ background: '#1e3a5f', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', fontSize: '10px' }}>
        <div style={{ fontWeight: '600' }}>
          {(clinic?.phone || clinic?.alt_phone) ? '📞 ' : ''}
          {[clinic?.phone, clinic?.alt_phone].filter(Boolean).join('  ·  ')}
        </div>
        <div style={{ fontSize: '9px', opacity: 0.85, textAlign: 'right', maxWidth: '60%' }}>
          {clinicAddress}
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(10,15,30,0.75)' }}>
      {/* ── Share Options Picker ─────────────────────────────── */}
      {showOptions && (
        <div className="absolute inset-0 flex items-center justify-center z-[110]">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-5 w-80 animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-800 text-lg">Share Sales Invoice</h3>

            {/* WhatsApp Share */}
            <button
              onClick={handleWhatsApp}
              disabled={generating}
              className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-semibold py-4 rounded-xl transition-all text-base shadow-lg shadow-green-200"
            >
              {generating
                ? <><Loader2 size={22} className="animate-spin" /> Generating PDF…</>
                : <><MessageCircle size={22} /> Share via WhatsApp</>
              }
            </button>

            {/* Print / Save PDF */}
            <button
              onClick={handlePrint}
              disabled={generating}
              className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-semibold py-4 rounded-xl transition-all text-base shadow-lg shadow-slate-300"
            >
              <Printer size={22} />
              Print / Save PDF
            </button>

            <p className="text-xs text-slate-400 text-center">
              File: <span className="font-mono">{pdfFilename}</span>
            </p>
            <button onClick={() => setShowOptions(false)} className="text-slate-400 hover:text-slate-600 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Preview Container ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText size={17} className="text-indigo-600" />
            <span className="font-semibold text-slate-700 text-sm">Sales Bill Preview</span>
            {bill?.bill_number && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold font-mono">
                {bill.bill_number}
              </span>
            )}
            {doctorName && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                Dr. {doctorName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOptions(true)}
              disabled={generating}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm"
            >
              {generating ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
              {generating ? 'Generating…' : 'Print / Share'}
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* A4 Preview scrollable */}
        <div className="overflow-y-auto flex-1 bg-slate-200 p-4">
          <div style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
            {InvoiceBody}
          </div>
        </div>
      </div>
    </div>
  )
}
