from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.mail import EmailMessage
from fpdf import FPDF


def _content_width(pdf):
    return pdf.w - pdf.l_margin - pdf.r_margin


def _clean_text(value):
    text = "" if value is None else str(value)
    return text.encode("latin-1", "replace").decode("latin-1")


def _write_wrapped_line(pdf, text, height=6, indent=0):
    pdf.set_x(pdf.l_margin + indent)
    pdf.multi_cell(_content_width(pdf) - indent, height, _clean_text(text), new_x="LMARGIN", new_y="NEXT")


def _client_name(assignment):
    user = assignment.client.user
    return user.get_full_name() or user.email or str(assignment.client_id)


def create_workout_plan_pdf(assignment):
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font("helvetica", "B", 20)
    pdf.set_text_color(79, 70, 229)
    pdf.cell(0, 15, "Personalized Workout Plan", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    pdf.set_text_color(0, 0, 0)
    pdf.set_font("helvetica", "B", 11)
    pdf.cell(0, 6, _clean_text(f"Client: {_client_name(assignment)}"), new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, _clean_text(f"Plan: {assignment.plan.title}"), new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, _clean_text(f"Status: {assignment.status}"), new_x="LMARGIN", new_y="NEXT")
    pdf.cell(
        0,
        6,
        _clean_text(f"Period: {assignment.start_date} to {assignment.end_date or 'No end date'}"),
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.ln(4)

    if assignment.notes:
        pdf.set_font("helvetica", "B", 12)
        pdf.cell(0, 8, "Coach Notes", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "", 10)
        _write_wrapped_line(pdf, assignment.notes)
        pdf.ln(3)

    days = assignment.workout_days.prefetch_related("exercises__exercise__media").order_by("day_number")
    if not days:
        pdf.set_font("helvetica", "", 10)
        _write_wrapped_line(pdf, "No workout days found for this assignment.")
        return bytes(pdf.output())

    pdf.set_font("helvetica", "B", 16)
    pdf.cell(0, 10, "Workout Schedule", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    for day in days:
        pdf.set_font("helvetica", "B", 12)
        pdf.set_fill_color(238, 242, 255)
        pdf.cell(0, 8, _clean_text(f"Day {day.day_number}: {day.name}"), new_x="LMARGIN", new_y="NEXT", fill=True)

        if day.notes:
            pdf.set_font("helvetica", "", 9)
            _write_wrapped_line(pdf, day.notes)

        exercises = day.exercises.select_related("exercise").order_by("sequence")
        if not exercises:
            pdf.set_font("helvetica", "", 9)
            _write_wrapped_line(pdf, "No exercises planned for this day.", indent=5)
            pdf.ln(3)
            continue

        for exercise in exercises:
            video_url = exercise.video_url or next(
                (media.youtube_url for media in exercise.exercise.media.all() if media.youtube_url),
                "",
            )
            pdf.set_font("helvetica", "B", 10)
            _write_wrapped_line(pdf, f"{exercise.sequence}. {exercise.exercise.name}", height=6)
            pdf.set_font("helvetica", "", 9)
            details = [
                f"Body Part: {exercise.body_part or '-'}",
                f"Type: {exercise.exercise.get_exercise_type_display()}",
                f"Weight: {exercise.weight if exercise.weight is not None else '-'}",
                f"Sets: {exercise.sets}",
                f"Reps: {exercise.reps}",
                f"Rest: {exercise.rest}s",
            ]
            _write_wrapped_line(pdf, " | ".join(details), height=5, indent=5)
            if video_url:
                _write_wrapped_line(pdf, f"Video: {video_url}", height=5, indent=5)
            if exercise.notes:
                _write_wrapped_line(pdf, f"Notes: {exercise.notes}", height=5, indent=5)
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
