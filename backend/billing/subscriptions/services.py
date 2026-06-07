from django.utils import timezone
from datetime import timedelta
from django.core.exceptions import ValidationError
from django.db import transaction
from billing.packages.models import PackagePlan
from billing.packages.serializers import PackagePlanSerializer
from .models import (
    Membership, 
    MembershipFreeze, 
    MembershipSnapshot, 
    MembershipChange
)

class MembershipService:
    
    @staticmethod
    @transaction.atomic
    def create_membership(tenant, client, plan, start_date=None, order=None, status=None, notes=None):
        if not start_date:
            start_date = timezone.now().date()

        if not plan.duration_in_days:
            raise ValidationError("Selected plan must have a duration.")

        base_end_date = start_date + timedelta(days=plan.duration_in_days)
        
        membership = Membership.objects.create(
            tenant=tenant,
            client=client,
            plan=plan,
            order=order,
            start_date=start_date,
            base_end_date=base_end_date,
            extended_end_date=base_end_date,
            status=status or Membership.StatusChoices.ACTIVE,
            notes=notes
        )
        
        # Create snapshot
        package_data = MembershipService._build_plan_snapshot(plan)
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
        max_freezes = membership.plan.package.max_freezes
        if total_frozen_days > max_freezes:
            raise ValidationError(f"Freeze exceeds maximum allowed days for this package ({max_freezes} days).")

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
    def renew_membership(membership: Membership, plan_id: str, start_date=None):
        """
        Renews a membership by creating a new one linked to the old one.
        """
        try:
            plan = PackagePlan.objects.select_related('package').get(id=plan_id, tenant=membership.tenant)
        except PackagePlan.DoesNotExist:
            raise ValidationError("Invalid plan selected for renewal.")

        if not plan.duration_in_days:
            raise ValidationError("Selected plan must have a duration.")

        if not start_date:
            # Default start date is the day after the current membership ends
            start_date = membership.extended_end_date + timedelta(days=1)
            
        base_end_date = start_date + timedelta(days=plan.duration_in_days)

        new_membership = Membership.objects.create(
            tenant=membership.tenant,
            client=membership.client,
            plan=plan,
            start_date=start_date,
            base_end_date=base_end_date,
            extended_end_date=base_end_date,
            status=Membership.StatusChoices.ACTIVE, # Or PENDING if payment is required first
            renewed_from=membership
        )
        
        # Create snapshot
        package_data = MembershipService._build_plan_snapshot(plan)
        MembershipSnapshot.objects.create(
            tenant=membership.tenant,
            membership=new_membership,
            data=package_data
        )
        
        return new_membership

    @staticmethod
    @transaction.atomic
    def change_membership_plan(membership: Membership, new_plan_id: str):
        """
        Upgrades or downgrades a membership to a new plan.
        """
        try:
            new_plan = PackagePlan.objects.select_related('package').get(id=new_plan_id, tenant=membership.tenant)
        except PackagePlan.DoesNotExist:
            raise ValidationError("Invalid plan selected for change.")
            
        old_plan = membership.plan
        price_diff = new_plan.price - old_plan.price
        
        # Track change
        MembershipChange.objects.create(
            tenant=membership.tenant,
            membership=membership,
            from_plan=old_plan,
            to_plan=new_plan,
            price_difference=price_diff
        )
        
        # Update membership
        membership.plan = new_plan
        membership.save()
        
        # Note: Depending on business logic, changing a package mid-cycle might require 
        # prorating, adjusting dates, or updating the snapshot. 
        # Here we just update the reference and track it.
        
        return membership

    @staticmethod
    def _build_plan_snapshot(plan: PackagePlan):
        package_data = PackagePlanSerializer(plan).data
        package_data['package_details'] = {
            'id': str(plan.package_id),
            'name': plan.package.name,
            'description': plan.package.description,
            'max_freezes': plan.package.max_freezes,
            'package_features': [
                {
                    'id': str(package_feature.id),
                    'feature': str(package_feature.feature_id),
                    'feature_details': {
                        'id': str(package_feature.feature_id),
                        'name': package_feature.feature.name,
                        'code': package_feature.feature.code,
                        'description': package_feature.feature.description,
                    },
                }
                for package_feature in plan.package.package_features.select_related('feature')
            ],
        }
        return package_data

    @staticmethod
    def has_feature(membership: Membership, feature_code: str) -> bool:
        """
        Checks if a membership is active and contains a specific feature code.
        Uses the membership snapshot for package defaults so later package edits do
        not change what was originally purchased. Active paid add-ons are checked
        separately against the live membership because they are assigned directly
        to the membership.
        """
        if membership.status != Membership.StatusChoices.ACTIVE:
            return False

        if hasattr(membership, 'snapshot') and membership.snapshot:
            package_data = membership.snapshot.data
            package_details = package_data.get('package_details', {})
            package_features = package_details.get('package_features', package_data.get('package_features', []))
            for pf in package_features:
                feature_details = pf.get('feature_details', {})
                if feature_details.get('code') == feature_code:
                    return True

        elif membership.plan.package.package_features.filter(feature__code=feature_code).exists():
            return True

        return membership.addons.filter(
            status='active',
            addon__addon_features__feature__code=feature_code,
        ).exists()
