from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .pdf_generator import create_diet_plan_pdf
import json

class GenerateDietPlanPDFView(APIView):
    permission_classes = [] 

    def post(self, request):
        try:
            data = request.data
            
            # Generate the PDF in memory
            pdf_bytes = create_diet_plan_pdf(data)
            
            email = data.get('client_email')
            
            if email:
                from django.core.mail import EmailMessage
                from django.conf import settings
                msg = EmailMessage(
                    'Your Customized Diet Plan',
                    'Please find your new personalized diet plan attached.',
                    getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@gymsaas.com'),
                    [email]
                )
                msg.attach('diet_plan.pdf', pdf_bytes, 'application/pdf')
                try:
                    msg.send(fail_silently=False)
                except Exception as e:
                    print(f"Failed to send email: {e}")
                
            return Response({"message": "Diet Plan PDF generated and sent successfully."}, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
