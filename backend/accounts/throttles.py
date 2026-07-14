from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Rate-limits login attempts by IP address to make brute-forcing
    passwords impractical, without affecting other public endpoints
    (register, etc.) which use the default anon throttle scope.

    Rate is set in REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['login']
    (see config/settings.py). Uses Django's default cache backend
    (LocMemCache) to track attempts -- fine for a single-process/single
    dev-server deployment; if this is ever run behind multiple worker
    processes, the count won't be shared across them and effective
    throughput allowed will multiply by worker count. Switch to a shared
    cache (e.g. Redis) if that becomes the deployment shape.
    """

    scope = "login"


class OtpSendRateThrottle(AnonRateThrottle):
    """Rate-limits OTP send requests by IP -- without this, registration's
    email/phone verification endpoint could be used to spam an arbitrary
    inbox/phone number with codes, or to rack up cost on a paid SMS
    gateway once one is configured. Same LocMemCache caveat as above.
    """

    scope = "otp_send"