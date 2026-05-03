from django.db import models
from core.tenants.models import TimeAwareModel
class BaseProfile(TimeAwareModel):
    class SexChoices(models.TextChoices):
        MALE = 'M', 'Male'
        FEMALE = 'F', 'Female'
        OTHER = 'O', 'Other'

    dob = models.DateField(null=True, blank=True)
    sex = models.CharField(max_length=1, choices=SexChoices.choices, null=True, blank=True)
    profile_picture = models.ImageField(upload_to='avatars/', null=True, blank=True)
    date_of_joining = models.DateField(null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)

    class Meta:
        abstract = True
