from decimal import Decimal, ROUND_HALF_UP

def calculate_line_item(rate, qty, discount_pct, gst_rate, is_interstate: bool) -> dict:
    """
    Calculate all amounts for one bill line item.
    Call this for every line — medicine or procedure.
    
    rate         : unit price excl. GST
    qty          : quantity
    discount_pct : discount percentage (0 if none)
    gst_rate     : GstRate ORM object with gst_percent, cgst_pct, sgst_pct, igst_pct
    is_interstate: True → IGST; False → CGST+SGST
    """
    rate        = Decimal(str(rate))
    qty         = Decimal(str(qty))
    disc_pct    = Decimal(str(discount_pct))

    gross       = (rate * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    disc_amt    = (gross * disc_pct / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    taxable     = gross - disc_amt

    if is_interstate:
        igst_pct = Decimal(str(gst_rate.igst_pct))
        igst_amt = (taxable * igst_pct / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return {
            "discount_amt": float(disc_amt),
            "taxable_amt":  float(taxable),
            "cgst_pct": 0, "cgst_amt": 0,
            "sgst_pct": 0, "sgst_amt": 0,
            "igst_pct": float(igst_pct),
            "igst_amt": float(igst_amt),
            "total_tax":  float(igst_amt),
            "line_total": float(taxable + igst_amt),
        }
    else:
        cgst_pct = Decimal(str(gst_rate.cgst_pct))
        sgst_pct = Decimal(str(gst_rate.sgst_pct))
        cgst_amt = (taxable * cgst_pct / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        sgst_amt = (taxable * sgst_pct / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return {
            "discount_amt": float(disc_amt),
            "taxable_amt":  float(taxable),
            "cgst_pct": float(cgst_pct), "cgst_amt": float(cgst_amt),
            "sgst_pct": float(sgst_pct), "sgst_amt": float(sgst_amt),
            "igst_pct": 0, "igst_amt": 0,
            "total_tax":  float(cgst_amt + sgst_amt),
            "line_total": float(taxable + cgst_amt + sgst_amt),
        }


def calculate_bill_totals(items: list) -> dict:
    """Sum all line items to get bill-level totals."""
    subtotal     = sum(Decimal(str(i["qty"])) * Decimal(str(i["rate"])) for i in items)
    discount_amt = sum(Decimal(str(i["discount_amt"])) for i in items)
    taxable_amt  = sum(Decimal(str(i["taxable_amt"])) for i in items)
    cgst_amt     = sum(Decimal(str(i["cgst_amt"])) for i in items)
    sgst_amt     = sum(Decimal(str(i["sgst_amt"])) for i in items)
    igst_amt     = sum(Decimal(str(i["igst_amt"])) for i in items)
    total_tax    = sum(Decimal(str(i["total_tax"])) for i in items)
    grand_total  = taxable_amt + total_tax
    
    # Round to nearest rupee
    net_payable_rounded = grand_total.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    round_off = net_payable_rounded - grand_total

    return {
        "subtotal":    float(subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        "discount_amt":float(discount_amt.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        "taxable_amt": float(taxable_amt.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        "cgst_amt":    float(cgst_amt.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        "sgst_amt":    float(sgst_amt.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        "igst_amt":    float(igst_amt.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        "total_tax":   float(total_tax.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        "grand_total": float(grand_total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        "round_off":   float(round_off),
        "net_payable": float(net_payable_rounded),
    }
