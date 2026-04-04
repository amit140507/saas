from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Measurement, MeasurementGoal
from communications.services import send_whatsapp_message, send_transactional_email
from communications.models import EmailTemplate, WhatsAppTemplate
from django.utils import timezone

@receiver(post_save, sender=Measurement)
def check_measurement_goals(sender, instance, created, **kwargs):
    if not created:
        return

    user = instance.user
    goals = MeasurementGoal.objects.filter(user=user, is_achieved=False)
    
    for goal in goals:
        current_value = getattr(instance, goal.metric, None)
        if current_value is None:
            continue
            
        goal.current_value = current_value
        
        # Check if achieved (Weight could be loss or gain, but let's assume if it hits target exactly or passes it in the direction of the goal)
        # For simplicity, let's assume we compare current vs target.
        # Ideally we'd know if it's a 'decrease' or 'increase' goal.
        # Let's just do a simple comparison for now or assume most are 'lose' for waist/weight and 'gain' for others?
        # Actually, let's just mark as achieved if it meets or exceeds target (or goes below target for weight/waist).
        
        achieved = False
        if goal.metric in ['weight', 'waist']:
            if current_value <= goal.target_value:
                achieved = True
        else:
            if current_value >= goal.target_value:
                achieved = True
                
        if achieved:
            goal.is_achieved = True
            goal.achieved_at = timezone.now()
            
            # Send notification
            send_goal_notification(user, goal)
            
        goal.save()

def send_goal_notification(user, goal):
    # Try to send WhatsApp if template exists
    wa_template = WhatsAppTemplate.objects.filter(name='goal_achieved', is_active=True).first()
    if wa_template:
        components = [
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": user.username},
                    {"type": "text", "text": goal.get_metric_display()},
                    {"type": "text", "text": str(goal.target_value)}
                ]
            }
        ]
        send_whatsapp_message(user, wa_template, components=components)
        
    # Also try Email
    email_template = EmailTemplate.objects.filter(name='Goal Achieved', is_active=True).first()
    if email_template:
        send_transactional_email(user, email_template)
