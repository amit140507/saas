from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum

from users.models import User
from billing.models import Subscription, Product
from orders.models import Order
from communications.models import EmailLog

class DashboardAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        tenant = user.tenant
        
        # Only Tenant Admins/Owners should view business reports
        if not tenant or getattr(user, 'role', None) not in ['admin', 'owner']:
            return Response({"error": "Unauthorized. Must be a tenant admin or owner."}, status=403)
            
        now = timezone.now()
        five_days_from_now = now + timedelta(days=5)
        thirty_days_ago = now - timedelta(days=30)
        
        # 1. Clients
        active_clients = User.objects.filter(tenant=tenant, subscriptions__status='active').distinct()
        inactive_clients = User.objects.filter(tenant=tenant).exclude(id__in=active_clients.values('id'))
        
        # 2. Subscriptions Ending Soon (5 days)
        ending_subs = Subscription.objects.filter(
            tenant=tenant, 
            status='active',
            end_date__gte=now,
            end_date__lte=five_days_from_now
        ).select_related('user', 'product')
        
        # 3. Pending Payments
        pending_orders = Order.objects.filter(tenant=tenant, status='pending').select_related('user')
        
        # 4. MRR (Monthly Recurring Revenue)
        mrr_subs = Subscription.objects.filter(
            tenant=tenant, 
            status='active', 
            product__billing_cycle='monthly'
        )
        mrr = mrr_subs.aggregate(total=Sum('product__price'))['total'] or 0.00
        
        # 5. Churn
        churned_subs = Subscription.objects.filter(
            tenant=tenant,
            status__in=['cancelled', 'expired']
        ).select_related('user', 'product')

        # Return comprehensive data natively sorted for the Next.js frontend
        return Response({
            "kpis": {
                "active_clients_count": active_clients.count(),
                "inactive_clients_count": inactive_clients.count(),
                "mrr": float(mrr),
                "pending_payments_count": pending_orders.count()
            },
            "lists": {
                "active_clients": [{"id": u.id, "username": u.username, "email": u.email} for u in active_clients[:50]],
                "inactive_clients": [{"id": u.id, "username": u.username, "email": u.email} for u in inactive_clients[:50]],
                "expiring_soon": [{
                    "id": sub.id, 
                    "user": sub.user.username, 
                    "product": sub.product.name, 
                    "end_date": sub.end_date
                } for sub in ending_subs],
                "pending_orders": [{
                    "id": o.id, 
                    "user": o.user.username, 
                    "total": str(o.total), 
                    "created_at": o.created_at
                } for o in pending_orders],
                "churn_list": [{
                    "id": sub.id, 
                    "user": sub.user.username, 
                    "product": sub.product.name,
                    "status": sub.status
                } for sub in churned_subs[:50]]
            }
        })

class EmailHistoryView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        tenant = user.tenant
        
        if not tenant or getattr(user, 'role', None) not in ['admin', 'owner']:
            return Response({"error": "Unauthorized"}, status=403)
            
        logs = EmailLog.objects.filter(tenant=tenant).order_by('-sent_at')[:100]
        return Response({
            "email_history": [{
                "id": log.id,
                "recipient": log.recipient_email,
                "subject": log.subject,
                "status": log.status,
                "sent_at": log.sent_at,
                "error": log.error_message
            } for log in logs]
        })
