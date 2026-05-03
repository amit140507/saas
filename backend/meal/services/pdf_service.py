import io
from fpdf import FPDF
from django.core.mail import EmailMessage
from django.conf import settings


def create_diet_plan_pdf(data):
    """
    Generates a PDF byte string for a diet plan based on provided data.
    """
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    
    # Title
    pdf.set_font("helvetica", "B", 20)
    pdf.set_text_color(79, 70, 229) # Indigo
    pdf.cell(0, 15, "Personalized Diet & Cardio Plan", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    # Header Data
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("helvetica", "B", 11)
    pdf.cell(0, 6, f"Period: {data.get('startDate', 'N/A')} to {data.get('endDate', 'N/A')}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Check-in Date: {data.get('checkInDate', 'N/A')}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Total Cardio: {data.get('totalCardio', '0')} minutes", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Target Macros
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 8, "Target Macros:", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 10)
    macros = f"Calories: {data.get('calories', '0')} kcal | Protein: {data.get('protein', '0')}g | Fat: {data.get('fat', '0')}g | Carbs: {data.get('carbs', '0')}g"
    pdf.cell(0, 6, macros, new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Target Gain/Loss: {data.get('weightGain', '0')}% per week", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    # Cardio Instructions
    pdf.set_font("helvetica", "B", 12)
    pdf.set_text_color(245, 158, 11) # Amber
    pdf.cell(0, 8, "Cardio Instructions", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_text_color(55, 65, 81)
    pdf.set_font("helvetica", "", 9)
    instructions_1 = [
        "1. Complete the Total Cardio Duration: Complete the total amount of cardio minutes assigned.",
        "2. Flexible Session Duration: Choose the duration of each cardio session based on your schedule.",
        "3. Choice of Activity: Select the type of cardio that you enjoy most or that fits your day.",
        "4. Heart Rate Range: Keep your heart rate within the prescribed range for optimal results.",
        "5. Separate Step Goals: Hit your step count independent of your cardio sessions."
    ]
    for ins in instructions_1:
        pdf.multi_cell(0, 5, ins)
    
    pdf.ln(2)

    # Measurement Guidelines
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(0, 8, "Measurement Guidelines:", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 9)
    instructions_2 = [
        "- All weights are of uncooked & raw foods, unless mentioned seperately.",
        "- Measure foods using a food weighing scale.",
        "- Use teaspoon measures for oil: 1/4 tsp=1.25ml, 1/2 tsp=2.5ml, 1 tsp=5ml, 1/2 tbsp=7.5ml, 1 tbsp=15ml",
        "- Salt mentioned is to be used for cooking or mixed with food after cooking."
    ]
    for ins in instructions_2:
        pdf.multi_cell(0, 5, ins)
    
    pdf.ln(8)

    # Meals
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("helvetica", "B", 16)
    pdf.cell(0, 10, "Your Meals", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    meals = data.get("meals", [])
    for idx, meal in enumerate(meals):
        pdf.set_font("helvetica", "B", 12)
        pdf.set_fill_color(238, 242, 255) # light indigo
        pdf.cell(0, 8, f"Meal {idx + 1}: {meal.get('time', 'Anytime')}", new_x="LMARGIN", new_y="NEXT", fill=True)
        
        foods = meal.get("foods", [])
        if foods:
            pdf.set_font("helvetica", "B", 10)
            pdf.cell(0, 6, "Foods:", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("helvetica", "", 10)
            for food in foods:
                pdf.cell(10, 6, "-", new_x="RIGHT")
                pdf.cell(0, 6, f"{food.get('amount', '')} {food.get('unit', '')} {food.get('name', '')}", new_x="LMARGIN", new_y="NEXT")
        
        supps = meal.get("supplements", [])
        if supps:
            pdf.set_font("helvetica", "B", 10)
            pdf.cell(0, 6, "Supplements:", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("helvetica", "", 10)
            for supp in supps:
                pdf.cell(10, 6, "-", new_x="RIGHT")
                pdf.cell(0, 6, f"{supp.get('amount', '')} {supp.get('unit', '')} {supp.get('name', '')}", new_x="LMARGIN", new_y="NEXT")
                
        pdf.ln(5)

    return bytes(pdf.output())


def send_diet_plan_email(client_email, pdf_bytes):
    """
    Sends an email to the client with the attached diet plan PDF.
    """
    msg = EmailMessage(
        'Your Customized Diet Plan',
        'Please find your new personalized diet plan attached.',
        getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@gymsaas.com'),
        [client_email]
    )
    msg.attach('diet_plan.pdf', pdf_bytes, 'application/pdf')
    msg.send(fail_silently=False)
