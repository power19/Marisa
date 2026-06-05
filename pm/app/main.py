from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.v1.routers import owners, units, tenants, leases, rent_charges, payments, statements, maintenance, portal

app = FastAPI(title="Far East PM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(owners.router, prefix="/api/v1")
app.include_router(units.router, prefix="/api/v1")
app.include_router(tenants.router, prefix="/api/v1")
app.include_router(leases.router, prefix="/api/v1")
app.include_router(rent_charges.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(statements.router, prefix="/api/v1")
app.include_router(maintenance.router, prefix="/api/v1")
app.include_router(portal.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
