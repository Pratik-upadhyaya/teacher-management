"""
OTP generation, storage, and delivery for registration verification
(email + phone). Used by the public /accounts/otp/send/ and
/accounts/otp/verify/ endpoints, and checked by teachers.views before
allowing a new teacher application to be created.

Storage: Django's cache framework (LocMemCache by default -- same as
accounts/throttles.py). OTPs are short-lived by nature, so no DB table/
migration is used. NOTE: LocMemCache is per-process -- if this ever runs
behind multiple worker processes, verification state won't be shared
across them. Switch to a shared cache (e.g. Redis) if that becomes the
deployment shape (same caveat as the login throttle).

Delivery: send_email_otp() and send_sms_otp() are the only two functions
that need to change when real credentials/gateways are available:
- Email currently goes through Django's console EmailBackend (prints to
  the runserver console) -- see EMAIL_BACKEND in config/settings.py.
  Swap in real SMTP settings there and this function needs no changes.
- SMS has no gateway configured yet, so send_sms_otp() just logs the
  code server-side. Replace its body with a real API call (Sparrow SMS,
  Aakash SMS, etc.) when an account is set up.
"""
import logging
import random

from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

OTP_LENGTH = 6
OTP_TTL_SECONDS = 5 * 60          # how long a sent code stays valid
VERIFIED_TTL_SECONDS = 30 * 60    # how long a successful verification
                                    # stays valid, so it survives the rest
                                    # of the multi-step registration wizard
MAX_VERIFY_ATTEMPTS = 5           # wrong-code attempts before the code
                                    # is invalidated and a new one is needed


def _code_key(otp_type: str, value: str) -> str:
    return f"otp:code:{otp_type}:{value}"


def _attempts_key(otp_type: str, value: str) -> str:
    return f"otp:attempts:{otp_type}:{value}"


def verified_key(otp_type: str, value: str) -> str:
    return f"otp:verified:{otp_type}:{value}"


def generate_and_store_otp(otp_type: str, value: str) -> str:
    code = f"{random.randint(0, 10**OTP_LENGTH - 1):0{OTP_LENGTH}d}"
    cache.set(_code_key(otp_type, value), code, timeout=OTP_TTL_SECONDS)
    cache.set(_attempts_key(otp_type, value), 0, timeout=OTP_TTL_SECONDS)
    return code


def check_otp(otp_type: str, value: str, submitted_code: str) -> tuple[bool, str]:
    """Returns (success, error_message)."""
    stored_code = cache.get(_code_key(otp_type, value))
    if stored_code is None:
        return False, "This code has expired. Please request a new one."

    attempts = cache.get(_attempts_key(otp_type, value), 0)
    if attempts >= MAX_VERIFY_ATTEMPTS:
        cache.delete(_code_key(otp_type, value))
        return False, "Too many incorrect attempts. Please request a new code."

    if submitted_code.strip() != stored_code:
        cache.set(_attempts_key(otp_type, value), attempts + 1, timeout=OTP_TTL_SECONDS)
        return False, "Incorrect code. Please try again."

    # Correct -- consume the code so it can't be reused, mark verified.
    cache.delete(_code_key(otp_type, value))
    cache.delete(_attempts_key(otp_type, value))
    cache.set(verified_key(otp_type, value), True, timeout=VERIFIED_TTL_SECONDS)
    return True, ""


def is_verified(otp_type: str, value: str) -> bool:
    return bool(cache.get(verified_key(otp_type, value)))


def clear_verified(otp_type: str, value: str) -> None:
    cache.delete(verified_key(otp_type, value))


_SALUTATIONS = {"male": "Mr.", "female": "Mrs."}


def _greeting_en(name_english: str, gender: str) -> str:
    # English paragraph's greeting. Deliberately uses `name_english` (a
    # dedicated plain-text field), not the Devanagari `name` field -- the
    # registration wizard's NepaliInput widget only ever commits
    # transliterated Nepali text and discards the raw English keystrokes,
    # so there's no reliable way to recover an English name from it.
    name_english = (name_english or "").strip()
    if not name_english:
        return "Hello,"
    title = _SALUTATIONS.get((gender or "").strip().lower())
    return f"Hello {title} {name_english}," if title else f"Hello {name_english},"


def _greeting_np(name: str) -> str:
    # Nepali paragraph's greeting, using the wizard's primary (Devanagari)
    # name field.
    name = (name or "").strip()
    return f"नमस्ते {name}," if name else "नमस्ते,"


def send_email_otp(
    email: str, code: str, name: str = "", name_english: str = "", gender: str = ""
) -> None:
    minutes = OTP_TTL_SECONDS // 60
    send_mail(
        subject="Your Teacher Portal verification code / प्रमाणीकरण कोड",
        message=(
            f"{_greeting_np(name)}\n"
            f"तपाईंको प्रमाणीकरण कोड : {code}\n"
            f"यो कोड {minutes} मिनेटमा समाप्त हुनेछ।\n"
            f"यदि तपाईंले यो कोड अनुरोध गर्नुभएको छैन भने, कृपया यो इमेल बेवास्ता गर्नुहोस्।\n\n"
            f"{_greeting_en(name_english, gender)}\n"
            f"Your verification code is: {code}\n"
            f"This code expires in {minutes} minutes.\n"
            f"If you did not request this code, please ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )


def send_sms_otp(phone: str, code: str) -> None:
    # No SMS gateway configured yet. Uses print() (not just logger.info)
    # because Django's default LOGGING config doesn't route custom app
    # loggers to console -- logger.info() alone was silently swallowed
    # here, which would have made the demo/dev fallback invisible.
    # Replace this body with a real gateway call when an SMS provider
    # account is available.
    print(f"[SMS OTP] Would send to {phone}: {code}", flush=True)
    logger.info("[SMS OTP] Would send to %s: %s", phone, code)