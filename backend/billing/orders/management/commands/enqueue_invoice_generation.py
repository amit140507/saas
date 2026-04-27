from django.core.management.base import BaseCommand

from orders.tasks import enqueue_missing_invoice_tasks


class Command(BaseCommand):
    help = 'Queue Celery tasks to generate invoices for paid orders that lack a ready PDF.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--sync',
            action='store_true',
            help='Run enqueue logic synchronously (still uses .delay per order unless worker is eager).',
        )

    def handle(self, *args, **options):
        if options['sync']:
            result = enqueue_missing_invoice_tasks()
        else:
            result = enqueue_missing_invoice_tasks.delay()
            self.stdout.write(
                self.style.SUCCESS(f'Enqueued periodic task: {result.id}')
            )
            return
        self.stdout.write(
            self.style.SUCCESS(
                f"Enqueued {result.get('enqueued', 0)} invoice generation task(s)."
            )
        )
