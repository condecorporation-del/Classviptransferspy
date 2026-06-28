"""Router principal que agrega todos los routers v1."""

from fastapi import APIRouter

from app.api.v1 import admin, ai, auth, bookings, customers, pricing, stripe

router = APIRouter()

router.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])
router.include_router(customers.router, prefix="/customers", tags=["Customers"])
router.include_router(auth.router, prefix="/auth", tags=["Auth"])
router.include_router(admin.router, prefix="/admin", tags=["Admin"])
router.include_router(pricing.router, prefix="/pricing", tags=["Pricing"])
router.include_router(stripe.router, prefix="/stripe", tags=["Stripe"])
router.include_router(ai.router, prefix="/ai", tags=["AI"])
