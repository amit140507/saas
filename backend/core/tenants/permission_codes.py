class Perms:
    # Client management
    MANAGE_CLIENTS = "manage_clients"
    VIEW_CLIENTS = "view_clients"
    
    # Plans
    MANAGE_PLANS = "manage_plans"
    ASSIGN_PLANS = "assign_plans"
    VIEW_PLANS = "view_plans"
    
    # Billing / Orders
    MANAGE_ORDERS = "manage_orders"
    VIEW_ORDERS = "view_orders"
    
    # Reports
    VIEW_REPORTS = "view_reports"
    
    # Staff management
    MANAGE_STAFF = "manage_staff"
    
    # Communication
    SEND_COMMUNICATIONS = "send_communications"
    
    # Settings
    MANAGE_SETTINGS = "manage_settings"
    
    # Measurements & Progress
    VIEW_PROGRESS = "view_progress"
    MANAGE_PROGRESS = "manage_progress"
    
    # Workouts & Diet
    MANAGE_WORKOUTS = "manage_workouts"
    MANAGE_DIET = "manage_diet"
    
    # Support
    MANAGE_SUPPORT = "manage_support"

    @classmethod
    def all_perms(cls):
        return [
            value for key, value in vars(cls).items() 
            if not key.startswith('_') and isinstance(value, str)
        ]
