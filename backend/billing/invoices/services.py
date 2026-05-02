from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db import transaction
from django.template.loader import render_to_string
import os
from .models import Invoice

class InvoiceService:
    
    @staticmethod
    @transaction.atomic
    def generate_from_order(order):
        """
        Creates a DRAFT invoice from an order.
        """
        if hasattr(order, 'invoice') and order.invoice:
            raise ValidationError("Order already has an invoice.")
            
        invoice = Invoice.objects.create(
            tenant=order.tenant,
            order=order,
            status=Invoice.StatusChoices.DRAFT
        )
        return invoice

    @staticmethod
    def generate_invoice_pdf(invoice: Invoice):
        """
        Generates a PDF for the invoice using WeasyPrint and uploads it.
        """
        try:
            from weasyprint import HTML
        except ImportError:
            raise ValidationError("WeasyPrint is not installed.")

        # Render HTML template (assuming a basic template exists in templates/billing/invoice.html)
        # You should create this template to match your brand design
        try:
            html_string = render_to_string('billing/invoice.html', {'invoice': invoice, 'order': invoice.order})
        except Exception:
            # Fallback simple HTML if template doesn't exist
            html_string = f"<h1>Invoice {invoice.invoice_number}</h1><p>Status: {invoice.status}</p><p>Total: {invoice.order.total_amount}</p>"
        
        # Generate PDF bytes
        html = HTML(string=html_string)
        pdf_bytes = html.write_pdf()
        
        # Here you would integrate with your Cloudflare R2 storage bucket
        # e.g., s3_client.put_object(Bucket=..., Key=..., Body=pdf_bytes)
        # For now, we mock the upload and save a local path or dummy URL
        
        # Mock Upload Logic
        storage_key = f"invoices/{invoice.tenant.id}/{invoice.invoice_number}.pdf"
        mock_pdf_url = f"https://r2.yourdomain.com/{storage_key}"
        
        invoice.pdf_url = mock_pdf_url
        invoice.storage_key = storage_key
        invoice.status = Invoice.StatusChoices.ISSUED
        invoice.generated_at = timezone.now()
        invoice.save()
        
        return invoice

    @staticmethod
    def mark_as_paid(invoice: Invoice):
        if invoice.status == Invoice.StatusChoices.VOID:
            raise ValidationError("Cannot mark a void invoice as paid.")
        invoice.status = Invoice.StatusChoices.PAID
        invoice.save()
        return invoice

    @staticmethod
    def void_invoice(invoice: Invoice):
        invoice.status = Invoice.StatusChoices.VOID
        invoice.save()
        return invoice
