import os
import re
from datetime import datetime

from django.conf import settings
from django.core.mail import EmailMessage
from fpdf import FPDF

ACCENT_FALLBACK = (79, 70, 229)
TEXT_DARK = (17, 24, 39)
TEXT_MUTED = (107, 114, 128)
BORDER_MUTED = (229, 231, 235)
SURFACE_SOFT = (248, 250, 252)


def _content_width(pdf):
    return pdf.w - pdf.l_margin - pdf.r_margin


def _clean_text(value):
    text = "" if value is None else str(value)
    return text.encode("latin-1", "replace").decode("latin-1")


def _set_rgb(pdf, method_name, color):
    getattr(pdf, method_name)(*color)


def _write_wrapped_line(pdf, text, height=6, indent=0):
    pdf.set_x(pdf.l_margin + indent)
    pdf.multi_cell(_content_width(pdf) - indent, height, _clean_text(text), new_x="LMARGIN", new_y="NEXT")


def _format_date(value):
    if not value:
        return "No end date"
    if hasattr(value, "strftime"):
        return value.strftime("%d/%m/%Y")
    for date_format in ("%Y-%m-%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(str(value), date_format).strftime("%d/%m/%Y")
        except ValueError:
            continue
    return str(value)


def _brand_color(tenant):
    color = (getattr(tenant, "brand_color", "") or "").strip()
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", color):
        return ACCENT_FALLBACK
    return tuple(int(color[index:index + 2], 16) for index in (1, 3, 5))


def _logo_path(tenant):
    logo = getattr(tenant, "logo", None)
    if not logo:
        return None

    try:
        path = logo.path
    except (NotImplementedError, ValueError, OSError):
        return None

    return path if path and os.path.exists(path) else None


def _tenant_name(tenant):
    return getattr(tenant, "name", None) or "Fitness Studio"


def _write_metric(pdf, label, value, x, y, width, accent):
    pdf.set_xy(x, y)
    _set_rgb(pdf, "set_text_color", TEXT_MUTED)
    pdf.set_font("helvetica", "B", 7)
    pdf.cell(width, 4, _clean_text(label.upper()), new_x="LEFT", new_y="NEXT")
    pdf.set_x(x)
    _set_rgb(pdf, "set_text_color", accent)
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(width, 6, _clean_text(value), new_x="LEFT", new_y="NEXT")


def _write_header(pdf, tenant, accent):
    left = pdf.l_margin
    top = 14
    logo_size = 16
    name = _tenant_name(tenant)
    logo_path = _logo_path(tenant)

    if logo_path:
        try:
            pdf.image(logo_path, x=left, y=top, w=logo_size, h=logo_size, keep_aspect_ratio=True)
        except Exception:
            logo_path = None

    if not logo_path:
        _set_rgb(pdf, "set_fill_color", accent)
        pdf.rect(left, top, logo_size, logo_size, style="F")
        pdf.set_xy(left, top + 4.5)
        pdf.set_font("helvetica", "B", 9)
        pdf.set_text_color(255, 255, 255)
        initials = "".join(part[:1] for part in name.split()[:2]).upper()
        pdf.cell(logo_size, 5, _clean_text(initials or "F"), align="C")

    pdf.set_xy(left + logo_size + 5, top + 1)
    _set_rgb(pdf, "set_text_color", TEXT_DARK)
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 6, _clean_text(name), new_x="LEFT", new_y="NEXT")
    pdf.set_x(left + logo_size + 5)
    _set_rgb(pdf, "set_text_color", TEXT_MUTED)
    pdf.set_font("helvetica", "", 8)
    pdf.cell(0, 5, "Personal nutrition program", new_x="LEFT", new_y="NEXT")

    _set_rgb(pdf, "set_draw_color", BORDER_MUTED)
    pdf.line(left, top + 23, pdf.w - pdf.r_margin, top + 23)
    pdf.set_y(top + 31)


def _client_name(data):
    return data.get("clientName") or data.get("client_name") or "Client"


def _macro_value(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        number = 0
    return int(round(number))


def _format_amount(amount, unit):
    amount_text = str(amount or "").strip()
    unit_text = str(unit or "").strip()
    return f"{amount_text}{unit_text}" if amount_text or unit_text else "-"


def _write_summary_card(pdf, data, accent):
    start_date = _format_date(data.get("startDate") or data.get("start_date"))
    end_date = _format_date(data.get("endDate") or data.get("end_date"))
    check_in = _format_date(data.get("checkInDate") or data.get("check_in_date"))
    cardio = f"{data.get('totalCardio') or data.get('total_cardio') or '0'} minutes"

    card_x = pdf.l_margin
    card_y = pdf.get_y()
    card_w = _content_width(pdf)
    card_h = 24
    _set_rgb(pdf, "set_fill_color", SURFACE_SOFT)
    _set_rgb(pdf, "set_draw_color", BORDER_MUTED)
    pdf.rect(card_x, card_y, card_w, card_h, style="DF")
    _set_rgb(pdf, "set_fill_color", accent)
    pdf.rect(card_x, card_y, 1.6, card_h, style="F")

    column_w = (card_w - 18) / 3
    _write_metric(pdf, "Period", f"{start_date} to {end_date}", card_x + 6, card_y + 5, column_w, accent)
    _write_metric(pdf, "Check-in", check_in, card_x + 8 + column_w, card_y + 5, column_w, accent)
    _write_metric(pdf, "Cardio", cardio, card_x + 10 + (column_w * 2), card_y + 5, column_w, accent)
    pdf.set_y(card_y + card_h + 8)


def _write_target_macros(pdf, data, accent):
    pdf.set_font("helvetica", "B", 12)
    _set_rgb(pdf, "set_text_color", TEXT_DARK)
    pdf.cell(0, 7, "Target Macros", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

    macros = [
        ("Calories", f"{_macro_value(data.get('calories'))} kcal"),
        ("Protein", f"{_macro_value(data.get('protein'))}g"),
        ("Fat", f"{_macro_value(data.get('fat'))}g"),
        ("Carbs", f"{_macro_value(data.get('carbs'))}g"),
        ("Gain/Loss", f"{data.get('weightGain', '0')}% / week"),
    ]
    column_w = _content_width(pdf) / len(macros)
    y = pdf.get_y()

    for index, (label, value) in enumerate(macros):
        _write_metric(pdf, label, value, pdf.l_margin + (column_w * index), y, column_w - 2, accent)

    pdf.set_y(y + 14)
    pdf.ln(3)


def _write_instruction_section(pdf, title, instructions, accent, title_size=12):
    if pdf.get_y() > pdf.h - 58:
        pdf.add_page()

    _set_rgb(pdf, "set_fill_color", SURFACE_SOFT)
    _set_rgb(pdf, "set_draw_color", BORDER_MUTED)
    section_y = pdf.get_y()
    pdf.rect(pdf.l_margin, section_y, _content_width(pdf), 9, style="DF")
    pdf.set_xy(pdf.l_margin + 5, section_y + 1.8)
    _set_rgb(pdf, "set_text_color", accent)
    pdf.set_font("helvetica", "B", title_size)
    pdf.cell(0, 5, _clean_text(title), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    pdf.set_font("helvetica", "", 9)
    _set_rgb(pdf, "set_text_color", TEXT_MUTED)
    for instruction in instructions:
        _write_wrapped_line(pdf, instruction, height=5)
    pdf.ln(4)


def _meal_macro_summary(meal):
    calories = _macro_value(meal.get("calories"))
    protein = _macro_value(meal.get("protein"))
    carbs = _macro_value(meal.get("carbs"))
    fat = _macro_value(meal.get("fat"))
    return f"{calories} kcal | P {protein}g | C {carbs}g | F {fat}g"


def _write_two_column_row(pdf, name, amount, indent=5, height=6):
    left_x = pdf.l_margin + indent
    right_w = 30
    left_w = _content_width(pdf) - indent - right_w
    y = pdf.get_y()

    pdf.set_xy(left_x, y)
    pdf.set_font("helvetica", "", 10)
    _set_rgb(pdf, "set_text_color", TEXT_DARK)
    pdf.cell(left_w, height, _clean_text(name or "-"))
    pdf.set_x(pdf.w - pdf.r_margin - right_w)
    pdf.set_font("helvetica", "B", 10)
    _set_rgb(pdf, "set_text_color", TEXT_MUTED)
    pdf.cell(right_w, height, _clean_text(amount), align="R", new_x="LMARGIN", new_y="NEXT")


def _write_meal_items(pdf, title, items):
    if not items:
        return

    pdf.set_font("helvetica", "B", 10)
    _set_rgb(pdf, "set_text_color", TEXT_DARK)
    pdf.cell(0, 6, title, new_x="LMARGIN", new_y="NEXT")

    for item in items:
        amount = _format_amount(item.get("amount"), item.get("unit"))
        _write_two_column_row(pdf, item.get("name"), amount)

    pdf.ln(2)


def _write_meals(pdf, data, accent):
    meals = data.get("meals", [])
    for index, meal in enumerate(meals):
        if pdf.get_y() > pdf.h - 50:
            pdf.add_page()

        meal_y = pdf.get_y()
        _set_rgb(pdf, "set_fill_color", accent)
        pdf.rect(pdf.l_margin, meal_y, _content_width(pdf), 11, style="F")
        pdf.set_xy(pdf.l_margin + 4, meal_y + 2.2)
        pdf.set_font("helvetica", "B", 12)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(95, 6, _clean_text(f"Meal {index + 1}: {meal.get('time') or 'Anytime'}"))
        pdf.set_font("helvetica", "B", 8)
        pdf.cell(0, 6, _clean_text(_meal_macro_summary(meal)), align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)

        notes = str(meal.get("notes") or "").strip()
        if notes:
            pdf.set_font("helvetica", "", 9)
            _set_rgb(pdf, "set_text_color", TEXT_MUTED)
            _write_wrapped_line(pdf, notes, height=5, indent=5)
            pdf.ln(2)

        foods = meal.get("foods", [])
        supplements = meal.get("supplements", [])
        if not foods and not supplements:
            pdf.set_font("helvetica", "", 9)
            _set_rgb(pdf, "set_text_color", TEXT_MUTED)
            _write_wrapped_line(pdf, "No foods or supplements added.", indent=5)
        else:
            _write_meal_items(pdf, "Foods", foods)
            _write_meal_items(pdf, "Supplements", supplements)

        pdf.ln(4)


def create_diet_plan_pdf(data, tenant=None):
    """
    Generates a PDF byte string for a diet plan based on provided data.
    """
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_margins(15, 15, 15)
    pdf.add_page()

    accent = _brand_color(tenant)
    _write_header(pdf, tenant, accent)

    _set_rgb(pdf, "set_text_color", TEXT_DARK)
    pdf.set_font("helvetica", "B", 22)
    pdf.cell(0, 11, "Personalized Diet Plan", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

    _set_rgb(pdf, "set_text_color", TEXT_MUTED)
    pdf.set_font("helvetica", "B", 9)
    pdf.cell(0, 6, _clean_text(f"For {_client_name(data)}"), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    _write_summary_card(pdf, data, accent)
    _write_target_macros(pdf, data, accent)

    cardio_instructions = [
        "1. Complete the Total Cardio Duration: Complete the total amount of cardio minutes assigned.",
        "2. Flexible Session Duration: Choose the duration of each cardio session based on your schedule.",
        "3. Choice of Activity: Select the type of cardio that you enjoy most or that fits your day.",
        "4. Heart Rate Range: Keep your heart rate within the prescribed range for optimal results.",
        "5. Separate Step Goals: Hit your step count independent of your cardio sessions.",
    ]
    _write_instruction_section(pdf, "Cardio Instructions", cardio_instructions, accent)

    measurement_guidelines = [
        "- All weights are of uncooked & raw foods, unless mentioned separately.",
        "- Measure foods using a food weighing scale.",
        "- Use teaspoon measures for oil: 1/4 tsp=1.25ml, 1/2 tsp=2.5ml, 1 tsp=5ml, 1/2 tbsp=7.5ml, 1 tbsp=15ml.",
        "- Salt mentioned is to be used for cooking or mixed with food after cooking.",
    ]
    _write_instruction_section(pdf, "Measurement Guidelines", measurement_guidelines, accent, title_size=10)
    _write_meals(pdf, data, accent)

    return bytes(pdf.output())


def send_diet_plan_email(client_email, pdf_bytes):
    """
    Sends an email to the client with the attached diet plan PDF.
    """
    msg = EmailMessage(
        'Your Customized Diet Plan',
        'Please find your new personalized diet plan attached.',
        getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@gymsaas.com'),
        [client_email],
    )
    msg.attach('diet_plan.pdf', pdf_bytes, 'application/pdf')
    msg.send(fail_silently=False)
