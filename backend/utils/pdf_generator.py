from fpdf import FPDF
from datetime import date
import os

class PrescriptionPDF(FPDF):
    def header(self):
        # Header logic if needed (logo/border)
        pass

    def footer(self):
        # Position at 1.5 cm from bottom
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(128)
        # Page number
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')
        self.set_text_color(0)

def generate_prescription_pdf(rx, clinic, pet, owner, doctor, items, consultation=None):
    pdf = PrescriptionPDF()
    pdf.add_page()
    
    # 1. Clinic Header
    pdf.set_font('helvetica', 'B', 16)
    pdf.set_text_color(44, 62, 80) # Dark Blue
    pdf.cell(0, 10, clinic.clinic_name, 0, 1, 'C')
    
    pdf.set_font('helvetica', '', 9)
    pdf.set_text_color(0)
    addr = f"{clinic.address1 or ''}, {clinic.address2 or ''}, {clinic.city or clinic.district or ''} - {clinic.pincode or ''}"
    pdf.cell(0, 5, addr, 0, 1, 'C')
    contact = f"Phone: {clinic.phone or ''} | Email: {clinic.email or ''}"
    pdf.cell(0, 5, contact, 0, 1, 'C')
    
    pdf.set_line_width(0.5)
    pdf.set_draw_color(44, 62, 80)
    pdf.line(10, 35, 200, 35)
    pdf.ln(10)
    
    # 2. Prescription Meta
    pdf.set_font('helvetica', 'B', 12)
    pdf.cell(0, 10, "E-PRESCRIPTION", 0, 1, 'C')
    pdf.ln(2)
    
    pdf.set_font('helvetica', '', 10)
    pdf.cell(50, 6, f"Rx No: {rx.rx_no}", 0, 0)
    pdf.cell(0, 6, f"Date: {rx.rx_date}", 0, 1, 'R')
    pdf.ln(4)
    
    # 3. Patient & Doctor Info
    pdf.set_fill_color(245, 247, 250)
    pdf.set_font('helvetica', 'B', 10)
    pdf.cell(95, 8, " PATIENT DETAILS", 1, 0, 'L', True)
    pdf.cell(95, 8, " DOCTOR DETAILS", 1, 1, 'L', True)
    
    pdf.set_font('helvetica', '', 9)
    # Patient Column
    y_start = pdf.get_y()
    pdf.multi_cell(95, 6, f"Pet Name: {pet.name}\nSpecies/Breed: {getattr(pet, 'species_name', 'N/A')} / {getattr(pet, 'breed_name', 'N/A')}\nGender/Age: {pet.gender or 'N/A'} / {pet.age_years or 0}y {pet.age_months or 0}m\nOwner: {owner.name}\nPhone: {owner.phone}", 1, 'L')
    y_patient = pdf.get_y()
    
    # Doctor Column
    pdf.set_xy(105, y_start)
    pdf.multi_cell(95, 6, f"Dr. {doctor.name}\n{doctor.qualification or ''}\n{doctor.specialization or ''}\nReg No: {doctor.reg_number or 'N/A'}", 1, 'L')
    y_doctor = pdf.get_y()
    
    pdf.set_y(max(y_patient, y_doctor) + 5)
    
    # 3.5 Vitals (If available)
    if consultation:
        vitals = []
        if consultation.weight_kg: vitals.append(f"Wt: {consultation.weight_kg}kg")
        if consultation.temp_celsius: vitals.append(f"Temp: {consultation.temp_celsius}°C")
        if consultation.heart_rate: vitals.append(f"HR: {consultation.heart_rate}bpm")
        if consultation.resp_rate: vitals.append(f"RR: {consultation.resp_rate}bpm")
        
        if vitals or consultation.chief_complaint:
            pdf.set_font('helvetica', 'B', 9)
            pdf.set_text_color(44, 62, 80)
            if vitals:
                pdf.cell(0, 6, "Vitals: " + " | ".join(vitals), 0, 1, 'L')
            if consultation.chief_complaint:
                pdf.cell(0, 6, "Chief Complaint: " + consultation.chief_complaint, 0, 1, 'L')
            pdf.ln(2)
            
    pdf.set_y(pdf.get_y() + 5)
    
    # 4. Medicines Table
    pdf.set_font('helvetica', 'B', 10)
    pdf.set_fill_color(44, 62, 80)
    pdf.set_text_color(255)
    pdf.cell(70, 8, " Medicine", 1, 0, 'L', True)
    pdf.cell(30, 8, " Dosage", 1, 0, 'C', True)
    pdf.cell(30, 8, " Frequency", 1, 0, 'C', True)
    pdf.cell(20, 8, " Days", 1, 0, 'C', True)
    pdf.cell(40, 8, " Quantity", 1, 1, 'C', True)
    
    pdf.set_text_color(0)
    pdf.set_font('helvetica', '', 9)
    
    for item in items:
        # Check for page break
        if pdf.get_y() > 250:
            pdf.add_page()
            # Redraw header if needed
            
        pdf.cell(70, 7, f" {item.medicine_name}", "LR", 0)
        pdf.cell(30, 7, f"{item.dose or ''} {item.dosage_form or ''}", "LR", 0, 'C')
        pdf.cell(30, 7, item.frequency or '', "LR", 0, 'C')
        pdf.cell(20, 7, str(item.duration_days or ''), "LR", 0, 'C')
        pdf.cell(40, 7, str(item.quantity or ''), "LR", 1, 'C')
        
        if item.instructions:
            pdf.set_font('helvetica', 'I', 8)
            pdf.set_text_color(100)
            pdf.cell(190, 5, f"    Instructions: {item.instructions}", "LRB", 1)
            pdf.set_text_color(0)
            pdf.set_font('helvetica', '', 9)
        else:
            # Draw bottom line if no instructions
            pdf.cell(190, 0, "", "T", 1)
            
    # 5. Notes
    if rx.notes:
        pdf.ln(5)
        pdf.set_font('helvetica', 'B', 10)
        pdf.cell(0, 8, "Additional Notes / Advice:", 0, 1)
        pdf.set_font('helvetica', '', 9)
        pdf.multi_cell(0, 5, rx.notes)
        
    # 6. Signature Area
    pdf.ln(15)
    pdf.set_y(-50)
    pdf.set_font('helvetica', 'I', 8)
    pdf.cell(0, 5, "This is a computer generated prescription.", 0, 1, 'R')
    pdf.ln(5)
    pdf.set_font('helvetica', 'B', 10)
    pdf.cell(0, 10, f"Dr. {doctor.name}", 0, 1, 'R')
    pdf.set_font('helvetica', '', 8)
    pdf.cell(0, 5, "Authorized Signature", 0, 1, 'R')
    
    return pdf.output()
