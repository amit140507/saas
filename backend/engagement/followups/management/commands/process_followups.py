"""
Management command: process_followups
TODO: Rebuild using the new Followup model (client-centric, no Subscription dependency).
The old command relied on Subscription and the old FollowUp model.
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Processes pending follow-ups (stub — rebuild with new Followup schema)'

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.WARNING(
                'process_followups: command needs to be rebuilt for the new Followup schema.'
            )
        )
