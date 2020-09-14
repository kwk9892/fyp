from django.core.mail import send_mail
from phase.settings import DEFAULT_FROM_EMAIL
import random

def get_random_colors(n):
    """
    Generate random n colors
    Argument: int
    Returns: list of Hex Color Code
    """
    colors = ["#"+''.join([random.choice('0123456789ABCDEF') for j in range(6)]) for i in range(n)]
    return colors

def send_email(request):
    """
    Send email
    """
    ip_address = request.META.get("REMOTE_ADDR")
    domain = request.META.get('HTTP_HOST')
    email = request.user.email
    msg_content = f"""
    We noticed, you login from this ip address {ip_address}.
    If you didn't do this, reset your password now: <a href="https://insurtek.tech/accounts/password_reset/"
    If this is you, you can safely disregard this message
"""
    send_mail(
        f'New Login from {ip_address}',
        f'{msg_content}',
        DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )