import os
import re

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.mail import EmailMessage
from fpdf import FPDF

ACCENT_FALLBACK = (79, 70, 229)
TEXT_DARK = (17, 24, 39)
TEXT_MUTED = (107, 114, 128)
BORDER_MUTED = (229, 231, 235)
SURFACE_SOFT = (248, 250, 252)
LINK_BLUE = (37, 99, 235)


def _content_width(pdf):
    return pdf.w - pdf.l_margin - pdf.r_margin


def _clean_text(value):
    text = "" if value is None else str(value)
    return text.encode("latin-1", "replace").decode("latin-1")


def _write_wrapped_line(pdf, text, height=6, indent=0):
    pdf.set_x(pdf.l_margin + indent)
    pdf.multi_cell(_content_width(pdf) - indent, height, _clean_text(text), new_x="LMARGIN", new_y="NEXT")


def _write_key_value_line(pdf, label, value, height=5, indent=5, font_size=9):
    pdf.set_x(pdf.l_margin + indent)
    pdf.set_font("helvetica", "B", font_size)
    label_text = _clean_text(f"{label}: ")
    label_width = pdf.get_string_width(label_text)
    pdf.cell(label_width, height, label_text)
    pdf.set_font("helvetica", "", font_size)
    pdf.multi_cell(
        _content_width(pdf) - indent - label_width,
        height,
        _clean_text(value),
        new_x="LMARGIN",
        new_y="NEXT",
    )


def _write_key_link_line(pdf, label, value, height=5, indent=5, font_size=9):
    pdf.set_x(pdf.l_margin + indent)
    pdf.set_font("helvetica", "B", font_size)
    _set_rgb(pdf, "set_text_color", TEXT_MUTED)
    label_text = _clean_text(f"{label}: ")
    label_width = pdf.get_string_width(label_text)
    pdf.cell(label_width, height, label_text)
    pdf.set_font("helvetica", "", font_size)
    _set_rgb(pdf, "set_text_color", LINK_BLUE)
    pdf.multi_cell(
        _content_width(pdf) - indent - label_width,
        height,
        _clean_text(value),
        link=value,
        new_x="LMARGIN",
        new_y="NEXT",
    )


def _write_exercise_details(pdf, details, height=5, indent=5, font_size=9):
    start_x = pdf.l_margin + indent
    right_x = pdf.w - pdf.r_margin
    pdf.set_x(start_x)

    for index, (label, value) in enumerate(details):
        if index:
            pdf.set_font("helvetica", "", font_size)
            separator = " | "
            separator_width = pdf.get_string_width(separator)
            if pdf.get_x() + separator_width > right_x:
                pdf.ln(height)
                pdf.set_x(start_x)
            pdf.cell(separator_width, height, separator)

        label_text = _clean_text(f"{label}: ")
        value_text = _clean_text(str(value))
        pdf.set_font("helvetica", "B", font_size)
        label_width = pdf.get_string_width(label_text)
        pdf.set_font("helvetica", "", font_size)
        value_width = pdf.get_string_width(value_text)

        if pdf.get_x() > start_x and pdf.get_x() + label_width + value_width > right_x:
            pdf.ln(height)
            pdf.set_x(start_x)

        pdf.set_font("helvetica", "B", font_size)
        pdf.cell(label_width, height, label_text)
        pdf.set_font("helvetica", "", font_size)
        pdf.cell(value_width, height, value_text)

    pdf.ln(height)


def _primary_muscle_label(workout_exercise):
    primary_muscle = getattr(workout_exercise.exercise, "primary_muscle", None)
    if primary_muscle:
        return getattr(primary_muscle, "name", None) or str(primary_muscle)
    return workout_exercise.body_part or "-"


def _primary_muscle_group_label(workout_exercise):
    primary_muscle = getattr(workout_exercise.exercise, "primary_muscle", None)
    muscle_group = getattr(primary_muscle, "muscle_group", None)
    if muscle_group:
        return getattr(muscle_group, "name", None) or str(muscle_group)
    return workout_exercise.body_part or "Other"


def _ordered_exercises_for_day(day):
    return day.exercises.select_related("exercise__primary_muscle__muscle_group").order_by("sequence")


def _volume_by_muscle_group(days):
    volume = {}
    for day in days:
        if getattr(day, "day_type", "training") != "training":
            continue
        for exercise in _ordered_exercises_for_day(day):
            group_name = _primary_muscle_group_label(exercise)
            volume[group_name] = volume.get(group_name, 0) + (exercise.sets or 0)
    return sorted(volume.items(), key=lambda item: item[0])


def _write_volume_summary(pdf, days, accent):
    volume_items = _volume_by_muscle_group(days)
    if not volume_items:
        return

    pdf.set_font("helvetica", "B", 12)
    _set_rgb(pdf, "set_text_color", TEXT_DARK)
    pdf.cell(0, 7, "Total Volume", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

    columns = 3
    gap = 3
    card_w = (_content_width(pdf) - (gap * (columns - 1))) / columns
    card_h = 14
    row_y = pdf.get_y()

    for index, (group_name, sets) in enumerate(volume_items):
        if index and index % columns == 0:
            row_y += card_h + gap
        if row_y > pdf.h - 35:
            pdf.add_page()
            row_y = pdf.get_y()

        x = pdf.l_margin + ((index % columns) * (card_w + gap))
        y = row_y
        _set_rgb(pdf, "set_fill_color", SURFACE_SOFT)
        _set_rgb(pdf, "set_draw_color", BORDER_MUTED)
        pdf.rect(x, y, card_w, card_h, style="DF")
        _set_rgb(pdf, "set_fill_color", accent)
        pdf.rect(x, y, 1.4, card_h, style="F")
        pdf.set_xy(x + 4, y + 2.2)
        pdf.set_font("helvetica", "B", 8)
        _set_rgb(pdf, "set_text_color", TEXT_MUTED)
        pdf.cell(card_w - 8, 4, _clean_text(group_name.upper()), new_x="LEFT", new_y="NEXT")
        pdf.set_x(x + 4)
        pdf.set_font("helvetica", "B", 10)
        _set_rgb(pdf, "set_text_color", accent)
        pdf.cell(card_w - 8, 5, _clean_text(f"{sets} sets"), new_x="LEFT", new_y="NEXT")

    pdf.set_y(row_y + card_h + 8)


def _write_exercise_summary_line(pdf, workout_exercise):
    pdf.set_font("helvetica", "B", 10)
    _set_rgb(pdf, "set_text_color", TEXT_DARK)
    name = f"{workout_exercise.sequence}. {workout_exercise.exercise.name}"
    muscle = _primary_muscle_label(workout_exercise)
    pdf.cell(_content_width(pdf) * 0.72, 6, _clean_text(name))
    _set_rgb(pdf, "set_text_color", TEXT_MUTED)
    pdf.cell(0, 6, _clean_text(muscle), align="R", new_x="LMARGIN", new_y="NEXT")


def _empty_day_message(day, notes_already_shown=False):
    day_type = getattr(day, "day_type", "training")
    if day_type == "active_recovery":
        return "Active recovery day." if notes_already_shown else day.notes or "Active recovery day."
    if day_type == "off":
        return "Off Day"
    return "No exercises planned for this day."


def _client_name(assignment):
    user = assignment.client.user
    return user.get_full_name() or user.email or str(assignment.client_id)


def _format_date(value):
    if not value:
        return "No end date"
    return value.strftime("%d/%m/%Y") if hasattr(value, "strftime") else str(value)


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


def _set_rgb(pdf, method_name, color):
    getattr(pdf, method_name)(*color)


def _write_metric(pdf, label, value, x, y, width, accent):
    pdf.set_xy(x, y)
    _set_rgb(pdf, "set_text_color", TEXT_MUTED)
    pdf.set_font("helvetica", "B", 7)
    pdf.cell(width, 4, _clean_text(label.upper()), new_x="LEFT", new_y="NEXT")
    pdf.set_x(x)
    _set_rgb(pdf, "set_text_color", accent)
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(width, 6, _clean_text(value), new_x="LEFT", new_y="NEXT")


def _write_header(pdf, assignment, accent):
    tenant = assignment.tenant
    left = pdf.l_margin
    top = 14
    logo_size = 16
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
        initials = "".join(part[:1] for part in (tenant.name or "GYM").split()[:2]).upper()
        pdf.cell(logo_size, 5, _clean_text(initials or "G"), align="C")

    pdf.set_xy(left + logo_size + 5, top + 1)
    _set_rgb(pdf, "set_text_color", TEXT_DARK)
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 6, _clean_text(tenant.name), new_x="LEFT", new_y="NEXT")
    pdf.set_x(left + logo_size + 5)
    _set_rgb(pdf, "set_text_color", TEXT_MUTED)
    pdf.set_font("helvetica", "", 8)
    pdf.cell(0, 5, "Personal training program", new_x="LEFT", new_y="NEXT")

    _set_rgb(pdf, "set_draw_color", BORDER_MUTED)
    pdf.line(left, top + 23, pdf.w - pdf.r_margin, top + 23)
    pdf.set_y(top + 31)


def create_workout_plan_pdf(assignment):
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_margins(15, 15, 15)
    pdf.add_page()

    accent = _brand_color(assignment.tenant)
    _write_header(pdf, assignment, accent)

    _set_rgb(pdf, "set_text_color", TEXT_DARK)
    pdf.set_font("helvetica", "B", 22)
    pdf.cell(0, 11, "Personalized Workout Plan", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

    _set_rgb(pdf, "set_text_color", TEXT_MUTED)
    pdf.set_font("helvetica", "B", 9)
    pdf.cell(0, 6, _clean_text(f"FOR {_client_name(assignment).upper()}"), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    period = f"{_format_date(assignment.start_date)} to {_format_date(assignment.end_date)}"
    card_x = pdf.l_margin
    card_y = pdf.get_y()
    card_w = _content_width(pdf)
    card_h = 18
    _set_rgb(pdf, "set_fill_color", SURFACE_SOFT)
    _set_rgb(pdf, "set_draw_color", BORDER_MUTED)
    pdf.rect(card_x, card_y, card_w, card_h, style="DF")
    _set_rgb(pdf, "set_fill_color", accent)
    pdf.rect(card_x, card_y, 1.6, card_h, style="F")
    _write_metric(pdf, "Period", period, card_x + 6, card_y + 4, card_w - 12, accent)
    pdf.set_y(card_y + card_h + 8)

    if assignment.notes:
        _set_rgb(pdf, "set_fill_color", SURFACE_SOFT)
        _set_rgb(pdf, "set_draw_color", BORDER_MUTED)
        notes_y = pdf.get_y()
        pdf.rect(pdf.l_margin, notes_y, _content_width(pdf), 10, style="DF")
        pdf.set_xy(pdf.l_margin + 5, notes_y + 2)
        _set_rgb(pdf, "set_text_color", TEXT_DARK)
        pdf.set_font("helvetica", "B", 12)
        pdf.cell(0, 6, "Coach Notes", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "", 10)
        _set_rgb(pdf, "set_text_color", TEXT_MUTED)
        _write_wrapped_line(pdf, assignment.notes)
        pdf.ln(5)

    days = list(
        assignment.workout_days.prefetch_related(
            "exercises__exercise__media",
            "exercises__exercise__primary_muscle__muscle_group",
        ).order_by("day_number")
    )
    if not days:
        pdf.set_font("helvetica", "", 10)
        _write_wrapped_line(pdf, "No workout days found for this assignment.")
        return bytes(pdf.output())

    _write_volume_summary(pdf, days, accent)

    for day in days:
        if pdf.get_y() > pdf.h - 45:
            pdf.add_page()

        day_y = pdf.get_y()
        _set_rgb(pdf, "set_fill_color", accent)
        pdf.rect(pdf.l_margin, day_y, _content_width(pdf), 10, style="F")
        pdf.set_font("helvetica", "B", 12)
        pdf.set_text_color(255, 255, 255)
        pdf.set_xy(pdf.l_margin + 4, day_y + 2)
        pdf.cell(0, 6, _clean_text(f"Day {day.day_number}: {day.name}"), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)

        notes_already_shown = bool(day.notes)
        if notes_already_shown:
            pdf.set_font("helvetica", "", 9)
            _set_rgb(pdf, "set_text_color", TEXT_MUTED)
            _write_wrapped_line(pdf, day.notes)
            pdf.ln(1)

        exercises = _ordered_exercises_for_day(day)
        if not exercises:
            pdf.set_font("helvetica", "", 9)
            _set_rgb(pdf, "set_text_color", TEXT_MUTED)
            _write_wrapped_line(pdf, _empty_day_message(day, notes_already_shown), indent=5)
            pdf.ln(3)
            continue

        for exercise in exercises:
            if pdf.get_y() > pdf.h - 30:
                pdf.add_page()

            video_url = exercise.video_url or next(
                (media.youtube_url for media in exercise.exercise.media.all() if media.youtube_url),
                "",
            )
            exercise_y = pdf.get_y()
            _set_rgb(pdf, "set_draw_color", BORDER_MUTED)
            pdf.line(pdf.l_margin, exercise_y, pdf.w - pdf.r_margin, exercise_y)
            pdf.ln(3)

            _write_exercise_summary_line(pdf, exercise)
            pdf.set_font("helvetica", "", 9)
            _set_rgb(pdf, "set_text_color", TEXT_MUTED)
            _write_wrapped_line(pdf, f"{exercise.sets} sets x {exercise.reps} reps . Rest {exercise.rest}s", height=5, indent=5)
            if video_url:
                _write_key_link_line(pdf, "Video", video_url, height=5, indent=5, font_size=9)
            if exercise.notes:
                _write_key_value_line(pdf, "Notes", exercise.notes, height=5, indent=5, font_size=9)
            pdf.ln(2)

        pdf.ln(3)

    return bytes(pdf.output())


def send_workout_plan_email(assignment, pdf_bytes):
    client_email = (assignment.client.user.email or "").strip()
    if not client_email:
        raise ValidationError("Assigned client does not have an email address.")

    message = EmailMessage(
        "Your Customized Workout Plan",
        "Please find your new personalized workout plan attached.",
        getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@gymsaas.com"),
        [client_email],
    )
    message.attach("workout_plan.pdf", pdf_bytes, "application/pdf")
    message.send(fail_silently=False)
