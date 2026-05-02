from django.utils import timezone
from datetime import timedelta
from django.core.exceptions import ValidationError
from django.db import transaction
from .models import (
    Membership, 
    MembershipPackage, 
    MembershipFreeze, 
    MembershipSnapshot, 
    MembershipChange
)
from .serializers import MembershipPackageSerializer # needed for snapshot

class MembershipService:
    
    @staticmethod
    @transaction.atomic
    def create_membership(tenant, client, package, start_date=None, order=None):
        if not start_date:
            start_date = timezone.now().date()
            
        base_end_date = start_date + timedelta(days=package.duration_days)
        
        membership = Membership.objects.create(
            tenant=tenant,
            client=client,
            package=package,
            order=order,
            start_date=start_date,
            base_end_date=base_end_date,
            extended_end_date=base_end_date,
            status=Membership.StatusChoices.ACTIVE
        )
        
        # Create snapshot
        package_data = MembershipPackageSerializer(package).data
        MembershipSnapshot.objects.create(
            tenant=tenant,
            membership=membership,
            data=package_data
        )
        
        return membership

    @staticmethod
    @transaction.atomic
    def freeze_membership(membership: Membership, freeze_start, freeze_end):
        """
        Freezes a membership, extending the end date by the freeze duration.
        Tracks it in MembershipFreeze.
        """
        if membership.status != Membership.StatusChoices.ACTIVE:
            raise ValidationError("Only active memberships can be frozen.")
        
        if freeze_start >= freeze_end:
            raise ValidationError("Freeze end date must be after start date.")
            
        if freeze_start < timezone.now().date():
            raise ValidationError("Freeze start date cannot be in the past.")

        freeze_duration = (freeze_end - freeze_start).days
        
        # Check against package max freezes
        current_frozen_days = sum(f.days for f in membership.freezes.all())
        total_frozen_days = current_frozen_days + freeze_duration
        if total_frozen_days > membership.package.max_freezes:
            raise ValidationError(f"Freeze exceeds maximum allowed days for this package ({membership.package.max_freezes} days).")

        # Create freeze record
        MembershipFreeze.objects.create(
            tenant=membership.tenant,
            membership=membership,
            start_date=freeze_start,
            end_date=freeze_end,
            days=freeze_duration
        )

        membership.status = Membership.StatusChoices.FROZEN
        # Extend end date
        membership.extended_end_date = membership.extended_end_date + timedelta(days=freeze_duration)
        membership.save()
        
        return membership

    @staticmethod
    @transaction.atomic
    def renew_membership(membership: Membership, package_id: str, start_date=None):
        """
        Renews a membership by creating a new one linked to the old one.
        """
        try:
            package = MembershipPackage.objects.get(id=package_id, tenant=membership.tenant)
        except MembershipPackage.DoesNotExist:
            raise ValidationError("Invalid package selected for renewal.")

        if not start_date:
            # Default start date is the day after the current membership ends
            start_date = membership.extended_end_date + timedelta(days=1)
            
        base_end_date = start_date + timedelta(days=package.duration_days)

        new_membership = Membership.objects.create(
            tenant=membership.tenant,
            client=membership.client,
            package=package,
            start_date=start_date,
            base_end_date=base_end_date,
            extended_end_date=base_end_date,
            status=Membership.StatusChoices.ACTIVE, # Or PENDING if payment is required first
            renewed_from=membership
        )
        
        # Create snapshot
        package_data = MembershipPackageSerializer(package).data
        MembershipSnapshot.objects.create(
            tenant=membership.tenant,
            membership=new_membership,
            data=package_data
        )
        
        return new_membership

    @staticmethod
    @transaction.atomic
    def change_membership_package(membership: Membership, new_package_id: str):
        """
        Upgrades or downgrades a membership to a new package.
        """
        try:
            new_package = MembershipPackage.objects.get(id=new_package_id, tenant=membership.tenant)
        except MembershipPackage.DoesNotExist:
            raise ValidationError("Invalid package selected for change.")
            
        old_package = membership.package
        price_diff = new_package.price - old_package.price
        
        # Track change
        MembershipChange.objects.create(
            tenant=membership.tenant,
            membership=membership,
            from_package=old_package,
            to_package=new_package,
            price_difference=price_diff
        )
        
        # Update membership
        membership.package = new_package
        membership.save()
        
        # Note: Depending on business logic, changing a package mid-cycle might require 
        # prorating, adjusting dates, or updating the snapshot. 
        # Here we just update the reference and track it.
        
        return membership

    @staticmethod
    def has_feature(membership: Membership, feature_code: str) -> bool:
        """
        Checks if a membership is active and contains a specific feature code.
        Best practice: Uses the MembershipSnapshot to ensure we check the features 
        the user actually purchased, rather than the live package which might have changed.
        """
        if membership.status != Membership.StatusChoices.ACTIVE:
            return False

        # Prefer snapshot data to guarantee historical accuracy of purchased features
        if hasattr(membership, 'snapshot') and membership.snapshot:
            package_data = membership.snapshot.data
            package_features = package_data.get('package_features', [])
            for pf in package_features:
                feature_details = pf.get('feature_details', {})
                if feature_details.get('code') == feature_code:
                    return True
            return False

        # Fallback to live package if no snapshot exists (e.g., legacy data)
        return membership.package.package_features.filter(
            feature__code=feature_code
        ).exists()
