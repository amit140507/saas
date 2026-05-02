from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError

from .models import MembershipPackage, Membership
from .serializers import (
    MembershipPackageSerializer,
    MembershipSerializer,
    MembershipFreezeActionSerializer,
    MembershipRenewActionSerializer,
    MembershipChangeActionSerializer
)
from .services import MembershipService

class MembershipPackageViewSet(viewsets.ModelViewSet):
    serializer_class = MembershipPackageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MembershipPackage.objects.filter(tenant=self.request.user.tenant_id)

    def perform_create(self, serializer):
        serializer.save(tenant_id=self.request.user.tenant_id)


class MembershipViewSet(viewsets.ModelViewSet):
    serializer_class = MembershipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Membership.objects.filter(tenant=self.request.user.tenant_id)

    def create(self, request, *args, **kwargs):
        # We override create to use our service, ensuring snapshots and dates are handled
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            package = MembershipPackage.objects.get(id=serializer.validated_data['package'].id, tenant=self.request.user.tenant_id)
            membership = MembershipService.create_membership(
                tenant=self.request.user.tenant, # assuming user has a tenant property
                client=serializer.validated_data['client'],
                package=package,
                start_date=serializer.validated_data.get('start_date'),
                order=serializer.validated_data.get('order')
            )
            return Response(MembershipSerializer(membership).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
                    package_id=serializer.validated_data['package_id'],
                    start_date=serializer.validated_data.get('start_date')
                )
                return Response(
                    MembershipSerializer(renewed_membership).data, 
                    status=status.HTTP_201_CREATED
                )
            except ValidationError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
                
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='change-package')
    def change_package(self, request, pk=None):
        membership = self.get_object()
        serializer = MembershipChangeActionSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                updated_membership = MembershipService.change_membership_package(
                    membership=membership,
                    new_package_id=serializer.validated_data['new_package_id']
                )
                return Response(
                    MembershipSerializer(updated_membership).data, 
                    status=status.HTTP_200_OK
                )
            except ValidationError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
                
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
