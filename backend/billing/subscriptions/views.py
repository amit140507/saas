from rest_framework import mixins, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError

from billing.packages.models import PackagePlan
from .models import Feature, Membership, PlanDeliveryTask
from .serializers import (
    FeatureSerializer,
    MembershipSerializer,
    PlanDeliveryTaskSerializer,
    MembershipFreezeActionSerializer,
    MembershipRenewActionSerializer,
    MembershipChangeActionSerializer
)
from .services import MembershipService
from core.tenants.permissions import IsTenantMember
from core.tenants.request_context import require_request_tenant

class MembershipViewSet(viewsets.ModelViewSet):
    serializer_class = MembershipSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        tenant = require_request_tenant(self.request)
        return (
            Membership.objects
            .filter(tenant=tenant)
            .select_related('client__org_client__user', 'plan__package', 'order')
            .prefetch_related('freezes', 'addons', 'changes')
            .order_by('-start_date')
        )

    def create(self, request, *args, **kwargs):
        return Response(
            {'error': 'Memberships are created automatically after a paid order is confirmed.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=['post'])
    def freeze(self, request, pk=None):
        membership = self.get_object()
        serializer = MembershipFreezeActionSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                frozen_membership = MembershipService.freeze_membership(
                    membership=membership,
                    freeze_start=serializer.validated_data['freeze_start'],
                    freeze_end=serializer.validated_data['freeze_end']
                )
                return Response(
                    MembershipSerializer(frozen_membership).data, 
                    status=status.HTTP_200_OK
                )
            except ValidationError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def renew(self, request, pk=None):
        membership = self.get_object()
        serializer = MembershipRenewActionSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                renewed_membership = MembershipService.renew_membership(
                    membership=membership,
                    plan_id=serializer.validated_data['plan_id'],
                    start_date=serializer.validated_data.get('start_date')
                )
                return Response(
                    MembershipSerializer(renewed_membership).data, 
                    status=status.HTTP_201_CREATED
                )
            except ValidationError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
                
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='change-plan')
    def change_plan(self, request, pk=None):
        membership = self.get_object()
        serializer = MembershipChangeActionSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                updated_membership = MembershipService.change_membership_plan(
                    membership=membership,
                    new_plan_id=serializer.validated_data['new_plan_id']
                )
                return Response(
                    MembershipSerializer(updated_membership).data, 
                    status=status.HTTP_200_OK
                )
            except ValidationError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
                
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FeatureViewSet(viewsets.ModelViewSet):
    serializer_class = FeatureSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        tenant = require_request_tenant(self.request)
        return Feature.objects.filter(tenant=tenant).order_by('name')

    def perform_create(self, serializer):
        serializer.save(tenant=require_request_tenant(self.request))


class PlanDeliveryTaskViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = PlanDeliveryTaskSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        tenant = require_request_tenant(self.request)
        qs = (
            PlanDeliveryTask.objects
            .filter(tenant=tenant)
            .select_related(
                'client__org_client__user',
                'order',
                'membership',
                'package_plan__package',
                'assigned_to',
            )
            .order_by('due_date', 'created_at')
        )

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        client_id = self.request.query_params.get('client')
        if client_id:
            qs = qs.filter(client_id=client_id)

        membership_id = self.request.query_params.get('membership')
        if membership_id:
            qs = qs.filter(membership_id=membership_id)

        due_date = self.request.query_params.get('due_date')
        if due_date:
            qs = qs.filter(due_date=due_date)

        return qs
