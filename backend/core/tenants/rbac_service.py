from core.tenants.models import OrganizationMember, Role, Permission

def get_member(user, organization):
    if not user.is_authenticated:
        return None
    return OrganizationMember.objects.filter(
        user=user, 
        tenant=organization, 
        status=OrganizationMember.StatusChoices.ACTIVE
    ).first()

def get_user_permissions(user, organization) -> set[str]:
    member = get_member(user, organization)
    if not member or not member.role:
        return set()
    
    # If the member is explicitly marked as owner or the role is an owner role, give all.
    # Alternatively simply rely on role permissions. Let's use role permissions robustly.
    # But as per user spec, owner role has all permissions.
    return set(member.role.permissions.values_list('code', flat=True))

def user_has_permission(user, organization, perm_code: str) -> bool:
    if user.is_superuser:
        return True
    member = get_member(user, organization)
    if not member:
        return False
    if member.is_owner:
        return True
        
    perms = get_user_permissions(user, organization)
    return perm_code in perms

def assign_role(user, organization, role_name: str):
    role = Role.objects.get(tenant=organization, name=role_name)
    member, created = OrganizationMember.objects.get_or_create(
        user=user,
        tenant=organization,
        defaults={'role': role}
    )
    if not created and member.role != role:
        member.role = role
        member.save()
    return member

def create_role_with_permissions(organization, name: str, perm_codes: list[str], is_system=False, is_default=False):
    role, _ = Role.objects.get_or_create(
        tenant=organization, 
        name=name,
        defaults={
            'is_system': is_system,
            'is_default': is_default
        }
    )
    
    perms = Permission.objects.filter(code__in=perm_codes)
    role.permissions.set(perms)
    return role

def seed_default_roles(organization):
    from core.tenants.permission_codes import Perms
    
    # Owner gets all permissions
    all_perm_codes = Perms.all_perms()
    create_role_with_permissions(organization, 'owner', all_perm_codes, is_system=True)
    
    # Trainer gets specific perms
    trainer_perms = [
        Perms.VIEW_CLIENTS, Perms.ASSIGN_PLANS, Perms.MANAGE_WORKOUTS, 
        Perms.MANAGE_DIET, Perms.VIEW_PROGRESS, Perms.MANAGE_PROGRESS
    ]
    create_role_with_permissions(organization, 'trainer', trainer_perms, is_system=True)
    
    # Marketing gets view clients and send comms
    marketing_perms = [Perms.VIEW_CLIENTS, Perms.SEND_COMMUNICATIONS]
    create_role_with_permissions(organization, 'marketing', marketing_perms, is_system=True)
    
    # Client gets view plans and view progress
    client_perms = [Perms.VIEW_PLANS, Perms.VIEW_PROGRESS]
    create_role_with_permissions(organization, 'client', client_perms, is_system=True, is_default=True)
